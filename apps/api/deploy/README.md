# Deploying the API

Every push to `main` that touches `apps/api/`, `packages/{shared,types,validation}/`,
or the root workspace files triggers `.github/workflows/deploy.yml`:

1. **Build** — GitHub Actions builds `apps/api/Dockerfile` and pushes the image to
   GitHub Container Registry: `ghcr.io/pixelgumstudio/clinical-fact-api:latest`.
2. **Deploy** — Actions SSHes into the VPS and runs
   `docker compose -f docker-compose.prod.yml pull && up -d`, which pulls the new
   image and restarts just the `api` container. Redis and Qdrant (unrelated to the
   code change) are left running.

MongoDB and file storage are **not** part of this stack — they're external managed
services (Atlas, R2) configured entirely through `apps/api/.env` on the server.

## One-time server setup

1. Provision a VPS (Ubuntu/Debian) and run `apps/api/deploy/setup-server.sh` on it
   (installs Docker + cloudflared, clones the repo to `/opt/clinical-fact`).
2. Create `MongoDB Atlas` cluster (free M0 tier is fine to start) → grab the
   connection string. Atlas clusters are replica sets out of the box, which the
   API's SSE job-status endpoint requires (a standalone `mongod` can't open a
   change stream).
3. Create a `Cloudflare R2` bucket → generate an S3 API token (Account →
   R2 → Manage API Tokens). `storage.service.ts` uses the `minio` SDK, which
   speaks plain S3 API, so R2 is a drop-in: point `MINIO_ENDPOINT` at your R2
   S3 endpoint (`<account-id>.r2.cloudflarestorage.com`), `MINIO_USE_SSL=true`,
   `MINIO_PORT=443`, and use the R2 access/secret key pair.
4. Write `${DEPLOY_PATH}/apps/api/.env` on the server (never commit this file):

   ```
   MONGODB_URI=<atlas connection string>
   JWT_SECRET=<random secret>
   JWT_REFRESH_SECRET=<random secret>

   MINIO_ENDPOINT=<account-id>.r2.cloudflarestorage.com
   MINIO_PORT=443
   MINIO_USE_SSL=true
   MINIO_ACCESS_KEY=<r2 access key>
   MINIO_SECRET_KEY=<r2 secret key>
   MINIO_BUCKET=clinicalfact-uploads

   # REDIS_URL / QDRANT_URL are already set by docker-compose.prod.yml —
   # don't put them in .env or the compose file's override wins anyway.

   ADMIN_API_KEY=...
   YOUTUBE_COOKIE=...
   # ...plus any other keys the API reads (Gemini, OAuth, RevenueCat, etc.)
   ```

5. Set up the Cloudflare Tunnel (no inbound ports opened on the VPS):

   ```
   cloudflared tunnel login
   cloudflared tunnel create clinical-fact-api
   cloudflared tunnel route dns clinical-fact-api api.yourdomain.com
   ```

   `/etc/cloudflared/config.yml`:

   ```yaml
   tunnel: clinical-fact-api
   credentials-file: /root/.cloudflared/<tunnel-id>.json
   ingress:
     - hostname: api.yourdomain.com
       service: http://localhost:5000
     - service: http_status:404
   ```

   Then `cloudflared service install` to run it as a systemd service.

6. First manual deploy: `cd /opt/clinical-fact/apps/api && docker compose -f docker-compose.prod.yml up -d`.

## GitHub Actions secrets

Add these under repo Settings → Secrets and variables → Actions:

| Secret              | Value                                                         |
| -------------------- | -------------------------------------------------------------- |
| `DEPLOY_HOST`         | VPS IP or hostname                                              |
| `DEPLOY_USER`         | SSH user (needs docker permissions)                             |
| `DEPLOY_SSH_KEY`      | Private key for that user (add the matching public key to the server's `~/.ssh/authorized_keys`) |
| `DEPLOY_PORT`         | SSH port, if not 22 (optional)                                  |
| `DEPLOY_PATH`         | `/opt/clinical-fact/apps/api` (where `docker-compose.prod.yml` lives) |
| `HEALTH_CHECK_URL`    | `https://api.yourdomain.com/health` (optional, enables the post-deploy check) |

`GITHUB_TOKEN` (used to push to GHCR) is provided automatically — no setup needed.
The first time the workflow runs, make the `clinical-fact-api` package public
under the repo's Packages tab, or the VPS will need its own GHCR pull credentials.

## Manual redeploy

```
ssh <user>@<host>
cd /opt/clinical-fact/apps/api
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```
