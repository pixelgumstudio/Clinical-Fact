# Clinical Fact API — Backend Handoff Guide

This document exists because the Postman collection tells you *what* to call, not *why* it exists or *what happens on the server* when you call it. Read this once, top to bottom, before touching the code — it will save you hours of guessing.

Clinical Fact turns raw study material (audio, PDF, images, YouTube videos, text) into AI-generated notes, then lets users quiz themselves, drill flashcards, or chat with the material. This is the Express/MongoDB API that powers the mobile app (and eventually the web app).

---

## 1. Tech Stack & Project Layout

- **Runtime:** Node.js + Express, written in TypeScript
- **Database:** MongoDB via Mongoose
- **Queue/Jobs:** BullMQ + Redis (used for YouTube audio transcription fallback), plus a lightweight custom "Job" pattern (Mongo-backed) for note generation and chat replies — explained in §4.
- **File storage:** MinIO (S3-compatible) via `storage.service.ts`
- **AI:** Google Gemini (`gemini.service.ts`) for note/quiz/flashcard generation, OCR, and translation; Vertex AI / Gemini embeddings for chat RAG; Qdrant/Pinecone as the vector DB (`vectorDb.service.ts`)
- **Auth:** Custom JWT (access + refresh tokens), plus Google/Apple OAuth
- **Payments:** RevenueCat (mobile IAP), verified via webhook

```
src/
  config/         env validation, Google OAuth client, quota limits
  controllers/    request handlers — one file per resource
  middleware/     auth, admin auth, rate limiting, file upload validation, error logging
  models/         Mongoose schemas
  routes/         Express routers — maps HTTP verb+path → controller function
  services/       business logic & third-party integrations (AI, storage, transcription, etc.)
  queue/          BullMQ queue definition for YouTube audio transcription
  worker/         background workers (transcription, YouTube session keep-alive)
  utils/          small helpers (JWT signing, response envelope, password validation)
```

**Request flow for almost every endpoint:** `routes/*.routes.ts` → (middleware: auth, rate limit, upload) → `controllers/*.controller.ts` → `services/*.service.ts` → `models/*.ts` (Mongo).

Start reading a feature from its route file — it's the shortest path to understanding what's public vs. authenticated, and which controller function owns it.

---

## 2. Running It Locally

```bash
npm run dev          # nodemon + ts-node, reads .env, starts on PORT (default 3002)
npm run worker        # standalone transcription worker (only needed if you're not running it in-process)
npm test              # jest
npm run seed:referral # seeds demo referral partner codes (see §7.11)
```

`src/config/env.ts` validates required env vars **at boot** and will crash the process if missing:
- `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET` — hard requirements.
- `REDIS_URL`, `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY`, `ADMIN_API_KEY`, `YOUTUBE_COOKIE` — optional, but entire features silently degrade without them (uploads, admin panel, YouTube scraping).

The `.env` file already in this folder has working values for local dev — copy it, don't commit secrets from it elsewhere.

---

## 3. The Response Envelope (mostly)

Most endpoints return:

```json
{ "success": true,  "message": "...", "data": { ... } }
{ "success": false, "message": "...", "code": "VALIDATION_ERROR" }
```

via the `successResponse()` / `errorResponse()` helpers in `utils/response.ts`. **This is not universal** — several controllers (quiz, flashcard, chat, upload, folder's `updateFolder`) hand-roll their own `res.json({...})` shape instead of using the helper. When wiring up a new frontend consumer, check the actual controller, don't assume the envelope — this inconsistency is a known wart, not a bug you introduced.

Paginated list endpoints add a `pagination` object: `{ page, limit, total, pages }` (admin routes also add `hasMore`).

---

## 4. The Async "Job" Pattern (important — several endpoints depend on this)

AI generation (note creation from file/audio/PDF, chat replies) can take 10–60+ seconds. Rather than holding the HTTP connection open, these endpoints:

1. Validate the request and check quota **synchronously**.
2. Create a `Job` document (`models/Job.ts`) with `status: 'processing'`, get back a `jobId`.
3. Respond immediately with **`202 Accepted`** and `{ jobId }`.
4. Do the actual AI/transcription work in a detached `(async () => {...})()` IIFE that runs *after* the response is sent.
5. When it finishes, it updates the `Job` document (`status: 'completed'|'failed'`, `result`, `error`).

The client is expected to either:
- **Poll** `GET /api/v1/jobs/:jobId` until `status` isn't `processing`, or
- **Subscribe** to `GET /api/v1/jobs/:jobId/stream` (Server-Sent Events) which pushes the update the moment it happens.

**Gotcha:** the SSE stream (`job.controller.ts::streamJobStatus`) uses a MongoDB **change stream**, which only works against a MongoDB **replica set** (not a standalone `mongod`). If SSE silently never fires locally, check whether your local Mongo is running as a replica set.

**Gotcha:** `Job` documents auto-delete after 30 minutes (TTL index on `createdAt`) — don't expect to poll a job from yesterday.

Endpoints using this pattern: `POST /notes/generate` (non-text sources), `POST /chat/:sessionId/message`, `POST /youtube/generate-note` (only when falling back to audio transcription).

---

## 5. Authentication

Two completely separate mechanisms exist — don't confuse them:

### 5.1 User auth (JWT)
- `Authorization: Bearer <accessToken>` header, verified by the `authenticate` middleware (`middleware/auth.ts`).
- Access tokens are short-lived; refresh tokens are long-lived, **hashed and stored** on the `User` document (`refreshTokenHashes[]`), and **rotated** on every use (`POST /auth/refresh`) — the old hash is deleted and a new one issued. If a refresh token is presented that isn't in the DB (already used, or revoked), the server treats it as a **possible token-replay attack** and wipes *all* sessions for that user, forcing a full re-login.
- `authenticate` attaches `req.user` with `_id`, `email`, `subscription`, `freeUsage`, `bonusCredits`, etc. — controllers read quota/subscription straight off this object without re-querying the DB (see §6).
- Some routes accept the token via `?token=` query param instead of the header (used for the SSE endpoint, since `EventSource` can't set custom headers from the browser/RN).

### 5.2 Admin auth (`x-admin-key` header)
- Totally unrelated to JWT. `middleware/adminAuth.ts` just compares `x-admin-key` header against `process.env.ADMIN_API_KEY`. No user context, no roles — it's a single shared secret for the whole `/api/v1/admin/*` surface (used by an internal admin dashboard, not the mobile app).

---

## 6. Subscriptions, Free-Tier Quotas & Rate Limits

These are three **independent** systems that all gate the same AI endpoints — easy to conflate, so here's each one:

### 6.1 Subscription tiers
`User.subscription` is `'FREE'` or `'PRO'`, set at signup and flipped by the RevenueCat webhook (§7.14) or manually via the admin panel (`PATCH /admin/users/:id/plan`).

### 6.2 Free-tier quota (lifetime, per feature)
`config/quota.config.ts`:
```ts
FREE_TIER_LIMITS = { notes: 1, quizzes: 1, flashcards: 1, chats: 1 }
```
Yes — **one free generation per feature, ever**, tracked in `User.freeUsage.<feature>.count`. `quota.service.ts` exposes:
- `checkQuota(user, feature)` — synchronous, throws `QuotaExceededError` if a FREE user has used their 1 free slot **and** has no `bonusCredits` left. PRO users always pass.
- `incrementQuota(userId, feature)` — called **only after** the content is successfully created (never before), so a failed generation doesn't burn the user's one shot. It first consumes the free slot, then falls back to decrementing `bonusCredits` (credits granted some other way, e.g. promotions — not exposed via any endpoint in this codebase currently).

When quota is exceeded, the endpoint returns **`402 Payment Required`** with `{ success: false, quotaExceeded: true, feature, message }` — the mobile app is expected to show an upsell screen on this specific status code.

### 6.3 Rate limiting (separate from quota — this is anti-abuse, not monetization)
`middleware/rateLimiter.ts`, all keyed by `user:<id>` when authenticated, else `ip:<address>` (so one busy account on shared Wi-Fi can't lock out everyone else):
- **Global**: 500 req / 15 min on all of `/api/v1/*`.
- **Auth**: 5 req / 15 min, IP-keyed only, on login/register/OTP endpoints (deliberately IP-keyed so an attacker can't dodge it by cycling accounts).
- **AI generation**: 10 req / 15 min for FREE users, 50 req / 15 min for PRO — applied to note/quiz/flashcard/chat generation and all upload-with-processing endpoints. The limiter peeks at the JWT's `subscription` claim to pick the tier, without a DB call.

All rate limiters are **no-ops when `NODE_ENV=test`**.

---

## 7. Endpoint Reference

Base path for everything below is `/api/v1` unless noted. "Auth" column: **Public**, **User** (JWT), or **Admin** (`x-admin-key`).

### 7.1 Health & Root
| Method & Path | Auth | What it does |
|---|---|---|
| `GET /health`, `GET /api/v1/health` | Public | Liveness probe — returns status/timestamp/env. Used by uptime monitors. |
| `GET /`, `GET /api/v1` | Public | Just a friendly "hello, here's the API name" — not meaningful for the client app. |

### 7.2 Auth — `auth.routes.ts` / `auth.controller.ts`

| Method & Path | Auth | What it does |
|---|---|---|
| `POST /auth/register` | Public | Email/password signup. Validates password strength, rejects duplicate email/username, hashes the password (Mongoose `pre('save')` hook), auto-generates a unique referral code (`my_referral_code`), and returns the user + a fresh token pair. |
| `POST /auth/login` | Public | Email/password login. Returns 401 with an identical message for "no such email" and "wrong password" — deliberately vague to avoid leaking which emails are registered. |
| `POST /auth/google` | Public | Accepts either a Google **ID token** (verified against Google's public keys) or an **access token** (verified by calling Google's userinfo endpoint). Creates the user on first sign-in, links `googleId` to an existing email account otherwise. Returns `needsProfileSetup: !hasCompletedSignup` so the client knows whether to show the onboarding flow. |
| `POST /auth/apple` | Public | Same idea for Sign in with Apple. **Important:** Apple only sends the user's email on the *very first* sign-in — subsequent calls omit it, so the client must cache and re-send `email` in the body as a fallback (`clientEmail` in the code). |
| `POST /auth/refresh-token` (legacy) / `POST /auth/refresh` (canonical) | Public (needs valid refresh token in body) | Rotates tokens — see §5.1 for the replay-detection behavior. Both paths do the exact same thing; keep both wired up, older mobile app builds may still call the legacy path. |
| `GET /auth/me` | User | Returns the current user's full profile. Also **lazily backfills** `my_referral_code` if a legacy user doesn't have one yet, and generates a fresh 7-day presigned MinIO URL for the avatar on every call (so a stale URL never gets returned even if the underlying signed URL from a previous request expired). |
| `PUT /auth/profile` | User | Updates `name`/`username`/`preferredLanguage`. Checks username uniqueness first. |
| `POST /auth/profile/picture` | User | Multipart upload (`file` field). Validates it's an image, deletes the old avatar from MinIO if one exists, uploads the new one, stores the MinIO **key** (not a URL) on the user, and returns a presigned URL valid for 7 days. |
| `POST /auth/complete-signup` | User | Called at the end of the onboarding questionnaire — saves `goals`/`contentTypes`/`reviewStyle`/`frustrations`/`referralSource` and flips `hasCompletedSignup: true`. |
| `POST /auth/skip-signup` | User | Same flag flip, but the user chose "skip" — no preference data is saved. |
| `POST /auth/check-username`, `GET /auth/check-username/:username` | Public | Validates format (3–20 chars, alphanumeric+underscore), rejects a hardcoded reserved-word list (`admin`, `root`, `test`, etc.), and checks DB uniqueness. Both verbs exist for historical reasons — same logic either way. |
| `DELETE /auth/account` | User | **Permanently and irreversibly** deletes the user plus every Note, Quiz, FlashcardSet, ChatSession, Folder, and File they own, in parallel. There is no soft-delete or grace period for this one — it's a hard delete used for GDPR-style account removal. |

### 7.3 OTP (email one-time-passcode login) — `otp.routes.ts` / `otp.controller.ts`

Used as a passwordless alternative to email/password. All OTPs are 10 minutes, max 5 verification attempts before the code is invalidated and the user must request a new one.

| Method & Path | Auth | What it does |
|---|---|---|
| `POST /otp/send` | Public | The **unified** entry point — works whether the email belongs to a new or existing user. Prefer this one for new integrations. |
| `POST /otp/send/signup`, `/otp/send-signup` | Public | Signup-specific: 400s if the email is already registered. Two paths, same handler. |
| `POST /otp/send/login`, `/otp/send-login` | Public | Login-specific: 404s if no account exists for that email. Two paths, same handler. |
| `POST /otp/verify/signup` | Public | Verifies the code; if the user doesn't exist yet, creates them (`authProvider: 'local'`, email auto-verified) and returns tokens + `needsProfileSetup: true`. If a user with that email *already* exists (e.g. they retried after a partial failure), it just logs them in instead of erroring. |
| `POST /otp/verify/login` | Public | Verifies the code for an existing user, marks `isEmailVerified: true`, returns tokens. |
| `POST /otp/resend` | Public | Deletes the previous OTP for `{email, type}` and issues a new one. |

**App Review backdoor:** the account whose email matches `APP_REVIEW_EMAIL` (defaults to `appreview@clinicalfact.app`) always gets/needs `APP_REVIEW_OTP_CODE` (defaults to `000000`) instead of a random code, and no email is actually sent for it — see `email.service.ts` (`isAppReviewEmail`, `generateOTP`) and `otp.controller.ts`. This exists so Apple's reviewer has a stable login path without needing a real inbox; that exact email/code pair is given to Apple directly in the App Review Information notes. Don't "fix" this into always sending real email — it's intentional.

### 7.4 User device tokens — `user.routes.ts` (logic lives inline in the route file, not a separate controller)

For push notifications.

| Method & Path | Auth | What it does |
|---|---|---|
| `POST /user/device-tokens` | User | Registers (or refreshes) a push token for this device. Body: `{ token, platform: 'ios'\|'android'\|'web', deviceName? }`. If the same token already exists for the user it just updates the timestamp/platform rather than duplicating. |
| `GET /user/device-tokens` | User | Lists the user's registered devices (platform, name, registration date — not the raw token). |
| `DELETE /user/device-tokens/:token` | User | Unregisters one device (e.g. on logout). |

### 7.5 Notes — `note.routes.ts` / `note.controller.ts`

The core resource. A Note always has a `sourceType` (`audio`/`video`/`text`/`pdf`/`image`/`youtube`) and a `processingStatus` that tracks where it is in the AI pipeline.

| Method & Path | Auth | What it does |
|---|---|---|
| `POST /notes/generate` | User | **The most complex endpoint in the codebase.** Accepts either a file upload (`file` field, audio or PDF) or raw `content` text, plus `sourceType`. See the dedicated walkthrough below. |
| `POST /notes` | User | Creates a note directly from already-prepared `{title, content, sourceType, folderId}` — no AI generation, no file. Used for manual/pasted notes. |
| `GET /notes` | User | Lists the user's notes, optionally filtered by `folderId`/`sourceType`. |
| `GET /notes/search` | User | Full-text search (Mongo text index on title/content/transcriptText) via `?q=`, with optional `sourceType`/`folderId`/`tags` filters. |
| `GET /notes/:noteId` | User | Fetch one note. |
| `PUT /notes/:noteId` | User | Update title/content/folder. |
| `PUT /notes/:noteId/enhance` | User | Re-runs the AI note-generation prompt against the note's *existing* content to improve formatting/structure. Requires the note to already have content. Synchronous (no job pattern) — the AI call blocks the request. |
| `PUT /notes/:noteId/translate` | User | Translates the note into `targetLanguage` (optional `sourceLanguage` hint). |
| `PUT /notes/:noteId/retranscribe` | User | **Not implemented.** Returns `501 Not Implemented` with an explanatory message — it validates that the note is audio/video and has a `sourceFileUrl`, but the actual re-transcription logic is a documented TODO in the code. Don't be surprised the endpoint "does nothing." |
| `POST /notes/:noteId/move` | User | Moves a note to a different folder, or to root if `folderId` is `null`/omitted. |
| `DELETE /notes/:noteId` | User | Deletes a note. |
| `POST /notes/:noteId/share` | User | Toggles public sharing. When enabling, generates a `shareableLink` token and returns the full public URL. |
| `GET /notes/shared/:shareableLink` | **Public** | Fetches a shared note's public-facing fields (title/content/sourceType/dates only — no owner info). This is the only note-reading endpoint that doesn't require auth. |
| `POST /notes/shared/:shareableLink/save` | User | Clones a shared note into the *calling* user's own note library. |
| `POST /notes/:noteId/export` | User | Returns export-ready `{title, textContent, htmlContent, filename}` for a note — this doesn't generate a file itself, it just prepares content the client renders/downloads (PDF/DOCX generation for notes isn't implemented server-side the way it is for quizzes/flashcards — see §7.6/§7.7). `exportType` body param: `'transcript'` or `'full'`/`'summary'`. |

**Walkthrough: `POST /notes/generate`** — read this before touching note creation:
1. Checks quota synchronously; 402s immediately if exhausted.
2. **Text source with no file** → handled **synchronously**, note is created and the request returns `201` directly (no job).
3. **Everything else (file upload)** → the uploaded file buffer is written to a temp file on disk *before* responding, specifically so the multer buffer isn't held in memory across the whole async generation lifetime. The endpoint then creates a `Job`, responds `202` with `{jobId}`, and does the real work in a detached async block:
   - **Audio:** uploads to MinIO (non-fatal if it fails), creates a placeholder Note (`processingStatus: 'transcribing'`), runs the full Whisper transcription pipeline, and finalizes the note.
   - **PDF:** extracts text via `pdf.service`. If extraction yields fewer than 50 real words (common for scanned/image PDFs), it **automatically falls back to Gemini Vision OCR** on the raw PDF bytes before giving up with a user-facing "this looks like a scanned PDF" error.
   - **YouTube/other text-based sources:** runs straight through `noteGenerationService`.
   - Auto-titling: if the client-supplied title looks like a raw filename (`IMG_1234.jpg`, `recording.mp3`, or literally `"Untitled Note"`), the AI-generated title overrides it. A real user-typed title is always preserved.
   - Quota is only incremented **after** the note is successfully persisted — a failed generation never burns the user's free slot.
   - On completion (success or failure) a push notification is queued via `notification.service`, and the temp file is always cleaned up in a `finally` block.

### 7.6 Uploads & file processing — `upload.routes.ts` / `upload.controller.ts`

Generic file storage plus three specialized "upload + immediately extract" endpoints. All of these are **separate** from `POST /notes/generate` — they exist so the client can preview extracted content (e.g. in the chat-from-document flow) before deciding whether to turn it into a Note.

| Method & Path | Auth | What it does |
|---|---|---|
| `POST /upload` | User | Generic file upload to MinIO, no processing. Stores a `File` record. |
| `POST /upload/image-ocr` | User | Uploads an image and runs OCR **synchronously** (the request blocks until Tesseract/Gemini OCR finishes) — returns extracted text + confidence directly in the response. |
| `GET /upload/image-ocr/:fileId/status` | User | Polling endpoint — largely redundant since OCR above is synchronous, but kept for consistency with the PDF/audio status endpoints. |
| `POST /upload/audio-transcribe` | User | Uploads audio; transcription runs **in the background** (fire-and-forget, no job pattern, no immediate response value beyond `status: 'processing'`) — client must poll the status endpoint below. Plan-based size limit enforced here (§8.1). |
| `GET /upload/audio/:fileId/status` | User | Poll for transcription completion; returns a text preview once done. |
| `POST /upload/pdf-extract` | User | Uploads a PDF; text extraction runs in the background. Detects scanned vs. text-based PDFs. |
| `GET /upload/pdf/:fileId/status` | User | Poll for extraction completion. |
| `POST /upload/youtube-transcript` | User | Fetches a YouTube transcript by URL (no file upload) — synchronous, also best-effort fetches video metadata. |
| `GET /upload/:fileId` | User | File metadata. |
| `GET /upload/:fileId/url` | User | Presigned download URL, 1 hour expiry. |
| `DELETE /upload/:fileId` | User | Deletes from MinIO + DB. |
| `GET /upload` | User | Paginated file listing, optional `fileType` filter. |

**Note:** these background-processing endpoints (`audio-transcribe`, `pdf-extract`) do **not** use the `Job`/SSE pattern from §4 — they use ad-hoc polling against the `File` document's `uploadStatus`/`metadata` fields instead. Two different async patterns exist in this codebase for historical reasons; don't assume they're interchangeable.

### 7.7 Flashcards — `flashcard.routes.ts` / `flashcard.controller.ts`

| Method & Path | Auth | What it does |
|---|---|---|
| `POST /flashcards/generate`, `POST /flashcards` | User | Generates a flashcard set from an existing note. Body: `{noteId, cardCount (1–100, default 20), difficulty, focusTopics[], targetLanguage?}`. Requires note content ≥ 100 characters. Language resolution order: explicit `targetLanguage` → note's own `studyLanguage` → user's `studyLanguage` → user's `preferredLanguage` → `'en'`. Quota-gated (`flashcards` feature). |
| `GET /flashcards` | User | Lists sets, optional `?noteId=` filter. |
| `GET /flashcards/:setId` | User | One set with all cards. |
| `PUT /flashcards/:setId/cards/:cardId` | User | Edit a single card's front/back/color/mastered flag. |
| `POST /flashcards/:setId/cards/:cardId/review` | User | Records a study review — increments `reviewCount`, stamps `lastReviewedAt`, recalculates the set's `masteredCards` count. |
| `GET /flashcards/:setId/statistics` | User | Mastery percentage, total/average reviews. |
| `GET /flashcards/:setId/export/questions` | User | Downloads the front-side-only version as a file. `?format=pdf\|txt\|docx`. Streams the file directly (`Content-Disposition: attachment`), not wrapped in the JSON envelope. |
| `GET /flashcards/:setId/export/answers` | User | Same, but includes the back/answer side. |
| `DELETE /flashcards/:setId` | User | Deletes the set. |

### 7.8 Quizzes — `quiz.routes.ts` / `quiz.controller.ts`

| Method & Path | Auth | What it does |
|---|---|---|
| `POST /quizzes/generate`, `POST /quizzes` | User | Generates a quiz from a note. `quizType` selects the generation strategy: `'standard'` (configurable `questionCount`/`difficulty`/`questionTypes`), `'practice'`, or `'comprehensive'` — the latter two ignore most of the tuning params and use their own preset prompts. Same language-resolution chain as flashcards. Quota-gated (`quizzes`). |
| `GET /quizzes` | User | Paginated list, sortable. |
| `GET /quizzes/note/:noteId` | User | Quizzes generated from a specific note. (`GET /quizzes/note` with no ID returns a `400` on purpose — it's a route-ordering guard, not a real endpoint.) |
| `GET /quizzes/:id` | User | One quiz, with options normalized to `{id, text}` objects (older stored quizzes may have plain string arrays — the controller normalizes on the fly for both old and new data). |
| `POST /quizzes/:id/submit` | User | Grades the quiz against a submitted `answers[]` array (matched by index, string-compared against `correctAnswer`), persists the result on the quiz document, and returns a per-question breakdown + score. Can be called more than once — it overwrites the previous attempt each time (no attempt history). |
| `GET /quizzes/:quizId/export/questions` | User | File download, `?format=pdf\|txt\|docx`. |
| `GET /quizzes/:quizId/export/answers` | User | File download including correct answers + explanations. |
| `DELETE /quizzes/:id` | User | Deletes the quiz. |

### 7.9 Chat (RAG over a note or document) — `chat.routes.ts` / `chat.controller.ts`

Chat sessions are backed by a vector DB — the source document is chunked and embedded so the AI can answer grounded questions instead of hallucinating from nothing.

| Method & Path | Auth | What it does |
|---|---|---|
| `POST /chat/create-from-note`, `POST /chat` | User | Creates a chat session grounded in an existing Note. **Smart resume:** if a session already exists for that `noteId`, it's returned as-is instead of creating a duplicate — call this endpoint idempotently. Kicks off embedding in the background (`embeddingStatus: 'processing'` → `'completed'`/`'failed'`); you cannot send a message until embedding finishes. Quota-gated (`chats`). |
| `POST /chat/create-from-document` | User | Same, but grounded in an uploaded `File` (PDF or image) instead of a Note — extracts text (reusing cached OCR from the upload step if present), runs it through the same AI note-structuring pass used for notes, then embeds it. |
| `GET /chat` | User | Paginated session list, optional `folderId` filter. |
| `GET /chat/:sessionId` | User | One session with full message history. |
| `POST /chat/:sessionId/message` | User | Sends a user message and gets an AI reply. Uses the **job pattern** (§4): the user's message is saved synchronously (so a refresh never loses it), then a `202 + jobId` is returned while the AI call + retrieval happens in the background. `deepResearch: true` in the body enables a more thorough (slower) retrieval mode. Will `400` if embedding isn't `'completed'` yet. |
| `PUT /chat/:sessionId/move-to-folder` | User | Moves session to a folder (validates the folder exists and belongs to the user first). |
| `GET /chat/:sessionId/statistics` | User | Message counts, embedding status, chunk count. |
| `PUT /chat/:sessionId` | User | Renames the session. |
| `DELETE /chat/:sessionId` | User | Deletes the session **and** its vector-DB embeddings (`chatService.deleteSession`) — don't delete the Mongo doc directly elsewhere, it'll leak vectors. |

### 7.10 Folders — `folder.routes.ts` / `folder.controller.ts`

Simple organizational containers for notes or chats (`folderType: 'note' | 'chat'`).

| Method & Path | Auth | What it does |
|---|---|---|
| `POST /folders` | User | Create. |
| `GET /folders` | User | List, optional `?folderType=` filter. |
| `PUT /folders/:folderId` | User | Rename/recolor. **Note:** returns the folder object directly, *not* wrapped in `{success, data}` — inconsistent with every other endpoint in this file, worth knowing before you write a client that assumes the envelope. |
| `DELETE /folders/:folderId` | User | Soft delete. |

### 7.11 Referrals — `referral.routes.ts` / `referral.controller.ts`

Two referral mechanisms coexist: **partner codes** (marketing codes like `DEMO`/`PROMO`, tracked in `ReferralPartner`) and **user-to-user codes** (every user gets an auto-generated `my_referral_code`).

| Method & Path | Auth | What it does |
|---|---|---|
| `POST /referrals/validate` | Public | Checks a code against both partner codes and user codes, returns `{valid, type: 'partner'|'user'}`. Used at onboarding, before the user has an account, so it must stay public. |
| `POST /referrals/apply` | User | Attaches a code to the calling user (`referred_by_partner` or `referred_by_user`). Only applies once — uses `{$exists: false}` in the query filter so re-calling it is a silent no-op, not an error. Blocks self-referral. |
| `GET /referrals/friends` | User | Paginated list of users this user has referred, for a "your friends" screen. |

**Local dev gotcha:** a fresh database has zero partner codes, so `/referrals/validate` will always return `valid: false` for any marketing code until you run `npm run seed:referral`, which seeds `DEMO`, `PROMO`, `TECHBRO`, `EARLY`.

### 7.12 Admin — `admin.routes.ts` / `admin.controller.ts`

Everything here requires the `x-admin-key` header (§5.2), not a user JWT — these are dashboard/ops endpoints, not part of the mobile app's surface.

| Method & Path | What it does |
|---|---|
| `GET /admin/stats` | Dashboard headline numbers: user/note/content totals, signups & note-creation trend over the last 30 days, source-type breakdown, transcription queue counts. |
| `GET /admin/users` | Searchable/filterable/sortable user list (by email/name/username, plan, signup date range, last-active bucket, onboarding-questionnaire answers). Enriches each row with a note count. |
| `GET /admin/users/:id` | One user's full profile plus their recent notes/flashcard sets/quizzes. |
| `PATCH /admin/users/:id/plan` | Manually force a user's `subscription` to `FREE`/`PRO` — bypasses RevenueCat entirely, useful for support/comps. |
| `PATCH /admin/users/:id/ban` | Sets `isBanned`. **Note: nothing in the codebase currently checks `isBanned` to actually block a banned user's requests** — this flag is set but not yet enforced anywhere in the auth middleware. If you're asked to "make banning actually work," that's the gap to close. |
| `GET /admin/content` | Paginated moderation view of all notes across all users, filterable by processing status/source type. |
| `GET /admin/revenue` | PRO user counts, month-over-month PRO signups, most recent PRO conversions. This is a proxy for revenue (counts, not actual $ from RevenueCat) — treat it as directional, not a finance source of truth. |
| `GET /admin/queue` | Live BullMQ transcription queue depth + active/waiting job details. |
| `GET /admin/feedback` | Lists in-app feedback submissions (see §7.13), filterable by sentiment/date. |
| `GET /admin/referrals/summary` | Per-partner aggregate: referral counts, FREE vs PRO split, conversion rate, commission owed (flat `$1000` per paid conversion — hardcoded in the aggregation, check with product before trusting this number for real payouts). |
| `GET /admin/referrals/:id/users` | Users attributed to one partner. |
| `POST /admin/referrals` | Create a new partner code. |
| `PATCH /admin/referrals/:id` | Edit name/description/active status. |
| `DELETE /admin/referrals/:id` | Blocked (`400`) if the partner already has paid conversions — deactivate instead of deleting to preserve the revenue trail. |

### 7.13 Feedback — `feedback.routes.ts` / `feedback.controller.ts`

| Method & Path | Auth | What it does |
|---|---|---|
| `POST /internal-feedback` | User | In-app "rate this note" prompt. Body: `{noteId?, isPositive, comment?}`. Only **negative** feedback is persisted to the `Feedback` collection (positive taps aren't stored as records — they just update the review-prompt cadence below). Also drives an app-store-review-prompt throttle: tracks `promptsThisYear`/`lastPromptedDate` on the user so they aren't nagged repeatedly, and sets `hasOptedOut: true` the moment they give negative feedback once. |

### 7.14 Jobs (poll/stream for async work) — `job.routes.ts` / `job.controller.ts`

See §4 for the full pattern explanation.

| Method & Path | Auth | What it does |
|---|---|---|
| `GET /jobs/:jobId` | User | One-shot status check: `{jobId, status, result, error}`. Scoped to the calling user — you can't peek at someone else's job by guessing the ID. |
| `GET /jobs/:jobId/stream` | User | Server-Sent Events. If the job is already done, sends one event and closes immediately. Otherwise opens a MongoDB change stream on that specific job document and pushes an event the instant it updates, plus a `:` heartbeat comment every 15s to keep the connection alive through proxies/load balancers. Cleans up the change stream and interval on client disconnect (`req.on('close')`). |

### 7.15 YouTube — `youtube.routes.ts` / `youtube.controller.ts`

| Method & Path | Auth | What it does |
|---|---|---|
| `POST /youtube/info` | Public | Video metadata (title, thumbnail, duration) via YouTube's API. |
| `POST /youtube/transcript` | Public | Fetches the transcript directly (fast path — no note creation). |
| `POST /youtube/check-transcript` | Public | Cheap boolean check — "does this video have a transcript available" — without returning the transcript itself. |
| `POST /youtube/full-data` | Public | Info + transcript combined in one call. |
| `POST /youtube/generate-note` | User | Creates a Note from a YouTube URL. Runs a **3-tier fallback** to get text: (1) `youtube-transcript` scraping library, (2) `yt-dlp` subtitle download if (1) fails (bypasses some bot-detection), (3) if both fail, queues a full **audio download + Whisper transcription** job via BullMQ (`queue/transcription.queue.ts`) and returns `202` immediately — this is the slow path, can take minutes for a long video. If tier 1 or 2 succeeds, the whole thing is synchronous and returns `201` with the finished note. |
| `GET /youtube/note-status/:noteId` | User | Poll target for the tier-3 async path above — checks the Note's own `processingStatus`, not the Job collection (this flow predates the generic Job pattern and was never migrated to it). |

### 7.16 Webhooks — `webhook.routes.ts` / `webhook.controller.ts`

Mounted at `/webhooks` (**not** under `/api/v1`), and deliberately registered in `server.ts` **before** the global rate limiter and JSON body-size middleware, since third-party webhook senders shouldn't be subject to user-facing rate limits.

| Method & Path | Auth | What it does |
|---|---|---|
| `POST /webhooks/revenuecat` | Shared-secret (`Authorization` header must equal `REVENUECAT_WEBHOOK_SECRET`, if that env var is set — **if it's unset, the endpoint accepts any request with only a warning logged**, so make sure it's set in production) | Keeps `User.subscription` in sync with the real subscription state. `INITIAL_PURCHASE`/`RENEWAL`/`UNCANCELLATION` → `PRO`. Only `EXPIRATION` → `FREE` (a `CANCELLATION` or `BILLING_ISSUE` event does **not** downgrade immediately — the user keeps PRO until the paid period actually lapses and RC fires `EXPIRATION`, which is correct behavior for "cancelled but still in a paid period," not a bug). On `INITIAL_PURCHASE`, if the subscriber has a `referral_code` attribute set (passed from the client SDK), it also records a `ReferralConversion` and bumps the partner's revenue/conversion counters. Always responds `200` even on internal errors — returning anything else makes RevenueCat retry-hammer the endpoint. |

---

## 8. Things That Will Bite You

1. **The response envelope is not consistent.** `successResponse()`/`errorResponse()` exist but roughly a third of controllers (quiz, flashcard, chat, upload, folder update) hand-roll `res.json({success, data, ...})` instead. Don't assume shape — check the controller.
2. **Free tier quota is extremely small on purpose during early testing:** `{notes: 1, quizzes: 1, flashcards: 1, chats: 1}` in `config/quota.config.ts`. If you're testing generation flows locally and keep hitting `402 quotaExceeded`, that's why — bump the limits locally or set the test user's `subscription` to `PRO` via the admin endpoint.
3. **Two different async patterns exist:** the `Job`/SSE pattern (§4, used by notes/chat) vs. ad-hoc `uploadStatus` polling on the `File` model (used by the upload endpoints). They are not interchangeable and don't share code.
4. **`PUT /notes/:noteId/retranscribe` is a stub** — returns `501`, does not retranscribe anything.
5. **`isBanned` is not enforced.** Setting it via the admin panel doesn't currently block the banned user's requests anywhere in the middleware chain.
6. **SSE job streaming requires a MongoDB replica set** (change streams don't work on standalone Mongo). If it's not working locally, that's the first thing to check.
7. **Legacy/duplicate routes are intentional, not dead code.** `POST /chat` and `POST /chat/create-from-note` are the same handler; same for `/flashcards` + `/flashcards/generate`, `/quizzes` + `/quizzes/generate`, `/auth/refresh-token` (legacy) + `/auth/refresh` (canonical), and the several OTP alias paths. These exist because older mobile app builds in the wild still call the old paths — don't delete them without confirming minimum supported app version.
8. **Audio file size limits are plan-based**, enforced *after* multer already buffered the file in memory (`middleware/uploadMiddleware.ts::validateFileSize`) — FREE and PRO currently share the same 100MB cap in code, but the plumbing for differentiating them is already in place (`AUDIO_SIZE_LIMITS`), suggesting this is mid-migration; check with the team before assuming the numbers are final.
9. **A fresh database has no referral partner codes** — run `npm run seed:referral` or `/referrals/validate` will always report marketing codes as invalid (previously reported as a bug, now understood as a seeding-order issue — see `referral-code-bug` project notes if you have access to them).
10. **`req.user` fields you can trust without a DB round-trip:** `authenticate` middleware attaches `subscription`, `freeUsage`, `bonusCredits`, `studyLanguage`, `preferredLanguage` directly onto `req.user` from the DB lookup it already does — controllers rely on this being fresh-enough (it's a per-request lookup, not cached), so don't "optimize" it away.

---

## 9. Data Models (quick reference)

| Model | Key fields worth knowing |
|---|---|
| `User` | `subscription`, `freeUsage`/`bonusCredits` (quota), `refreshTokenHashes[]` (active sessions), `my_referral_code`/`referred_by_user`/`referred_by_partner`, `deviceTokens[]` (push), `isBanned` (not enforced — see §8.5). |
| `Note` | `sourceType`, `processingStatus` (state machine: `pending`→…→`completed`/`failed`), `extractedContent` (raw, used for RAG) vs `content` (AI-enhanced, shown to user), `isShared`/`shareableLink`, soft-deleted via `deletedAt`. |
| `Quiz` | Embedded `questions[]` with `correctAnswer` as a string (compared via `.toString()` on submit — keep answer values stringifiable), `userAnswers`/`correctAnswers` from the last submit (attempts are overwritten, not versioned). |
| `FlashcardSet` | Embedded `cards[]`, each with `mastered`/`reviewCount`/`lastReviewedAt` — this is the spaced-repetition state, currently just a boolean + counter, no actual scheduling algorithm. |
| `ChatSession` | `embeddingStatus` gates whether `sendMessage` will work; `sourceType` is `note`/`image`/`document`/`pdf`; messages are embedded, not a separate collection. |
| `Folder` | `folderType: 'note' | 'chat'` — a folder is scoped to one or the other, not shared. |
| `Job` | Transient — 30 minute TTL. `type: 'note_generation' | 'chat_message'`. This is *not* a general task queue, just a status board for the two async controller flows in §4. |
| `File` | Generic upload record; `metadata.ocrText` doubles as the cache for both OCR and audio-transcription text output (checked by the chat-from-document flow before re-extracting). |
| `ReferralPartner` / `ReferralConversion` | Marketing referral codes and the conversions attributed to them (see §7.11/§7.16). |
| `Feedback` | Only negative in-app feedback is stored (§7.13). |
| `OTP` | Short-lived, `type: 'signup'|'login'`, `attempts` counter. |

---

## 10. Where to Go Next

- `TESTING.md` in this folder documents the test setup.
- The Postman collection is still useful for *trying* requests — this doc is for understanding *why* they behave the way they do. Use both together.
- If something here turns out to be stale (routes change faster than docs), trust the route files over this document, and please update this file in the same PR.
