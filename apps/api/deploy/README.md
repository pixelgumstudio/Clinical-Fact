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

This server also hosts another project (`notedrill-*`), whose own `nginx`
container already owns host ports 80/443/5000. That nginx container reaches
its backend by Docker DNS name on its `notedrill_notedrill-network` network,
not via host ports — so rather than running a second nginx, this stack's
`api` container also joins that same external network, reachable there as
`clinicalfact-api:5000`, and we add a new server block to the existing shared
`nginx.conf`. Everything here is otherwise namespaced (compose project name
`clinicalfact`, `clinicalfact-*` container names, its own network/volumes) to
avoid colliding with the other project. See step 5.

## One-time server setup

1. Provision a VPS (Ubuntu/Debian) and run `apps/api/deploy/setup-server.sh` on it
   (installs Docker, clones the repo to `/opt/clinical-fact`). nginx is assumed
   to already be installed, since the other project on this box uses it.
2. Create `MongoDB Atlas` cluster (free M0 tier is fine to start) → grab the
   connection string. Atlas clusters are replica sets out of the box, which the
   API's SSE job-status endpoint requires (a standalone `mongod` can't open a
   change stream).
3. Create a `Cloudflare R2` bucket → generate an S3 API token (Account →
   R2 → Manage API Tokens). `storage.service.ts` uses the `minio` SDK, which
   speaks plain S3 API, so R2 is a drop-in: point `MINIO_ENDPOINT` at your R2
   S3 endpoint (`<account-id>.r2.cloudflarestorage.com`), `MINIO_USE_SSL=true`,
   `MINIO_PORT=443`, and use the R2 access/secret key pair.
4. Set up the Google Cloud project used for Vertex AI embeddings
   (`embedding.vertexai.service.ts`, via `chat.service.ts`) and the
   Translation API (`translation.service.ts`, used by note translation).
   These are separate from the OAuth client IDs used for Google Sign-In —
   both can live in the same GCP project, but need their own setup:

   - In the GCP project's console, enable **Vertex AI API** and
     **Cloud Translation API** (APIs & Services → Enable APIs).
   - IAM & Admin → Service Accounts → Create Service Account. Grant it:
     - `Vertex AI User` (`roles/aiplatform.user`)
     - `Cloud Translation API User` (`roles/cloudtranslate.user`)
   - Open the service account → Keys → Add Key → JSON. This downloads a
     key file — rename it `google-credentials.json` and place it at
     `${DEPLOY_PATH}/apps/api/google-credentials.json` on the server
     (`scp` it up; never commit it — it's already in `.gitignore` and
     `.dockerignore`). `docker-compose.prod.yml` mounts this path
     read-only into the container, since it can't be baked into the image.
   - Note the **Project ID** shown on the console dashboard (not the
     project number, and not necessarily the display name) — that's the
     value for `GOOGLE_PROJECT_ID` below.
5. Write `${DEPLOY_PATH}/apps/api/.env` on the server (never commit this file):

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

   # Web client ID from Google Cloud Console (the "Clinicalfact" web app
   # OAuth client) - must match EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in the
   # mobile app's eas.json, since that's the audience Android's Google
   # Sign-In idToken is issued for. Without this set, googleAuth() skips
   # audience verification entirely instead of failing loudly.
   GOOGLE_CLIENT_ID=370250130816-rm73ltjdbgiiqdh5q433q9h26nl1lapc.apps.googleusercontent.com

   # Vertex AI + Translation API - see step 4 above for how to get these.
   # GOOGLE_APPLICATION_CREDENTIALS is a path *inside the container*
   # (WORKDIR is /app/apps/api there), matching the volume mount in
   # docker-compose.prod.yml - not a path on the host.
   GOOGLE_PROJECT_ID=<GCP project ID from the console dashboard>
   GOOGLE_LOCATION=us-central1
   GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json

   ADMIN_API_KEY=...
   YOUTUBE_COOKIE=...
   # ...plus any other keys the API reads (OPENAI_API_KEY, GROQ_API_KEY, TAVILY_API_KEY, OAuth, RevenueCat, etc.)
   ```

6. Point DNS for the API's subdomain at the VPS IP (DNS-only/grey-cloud if on
   Cloudflare, matching how `api.notedrill.com` is set up — this box's other
   site uses Let's Encrypt at the origin, not Cloudflare edge TLS).

   Then edit the other project's shared `/var/www/Notedrill/nginx.conf` on
   the host (it's bind-mounted into `notedrill-nginx`, so the container picks
   up changes on reload — no rebuild needed):

   - Add an ACME challenge location to the existing catch-all `server { listen 80; server_name _; ... }`
     block, above its `location /`:

     ```nginx
     location /.well-known/acme-challenge/ {
         root /var/www/certbot;
     }
     ```

   - Test and reload: `docker exec notedrill-nginx nginx -t && docker exec notedrill-nginx nginx -s reload`
   - Issue the cert: `certbot certonly --webroot -w /var/www/certbot -d <api-subdomain>`
   - Add a new upstream + HTTPS server block (mirroring the existing
     `api.notedrill.com` block), referencing our container by the Docker DNS
     name it gets on the shared network:

     ```nginx
     upstream clinicalfact_backend {
         server clinicalfact-api:5000;
         keepalive 32;
     }

     server {
         listen 443 ssl http2;
         server_name <api-subdomain>;

         ssl_certificate /etc/letsencrypt/live/<api-subdomain>/fullchain.pem;
         ssl_certificate_key /etc/letsencrypt/live/<api-subdomain>/privkey.pem;
         ssl_protocols TLSv1.2 TLSv1.3;
         ssl_ciphers HIGH:!aNULL:!MD5;
         ssl_prefer_server_ciphers on;
         ssl_session_cache shared:SSL:10m;
         ssl_session_timeout 10m;

         location /health {
             proxy_pass http://clinicalfact_backend;
             proxy_http_version 1.1;
             proxy_set_header Connection "";
             access_log off;
         }

         location / {
             proxy_pass http://clinicalfact_backend;
             proxy_http_version 1.1;
             proxy_set_header Upgrade $http_upgrade;
             proxy_set_header Connection 'upgrade';
             proxy_set_header Host $host;
             proxy_set_header X-Real-IP $remote_addr;
             proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
             proxy_set_header X-Forwarded-Proto $scheme;
             proxy_cache_bypass $http_upgrade;

             # job-status SSE endpoint needs long-lived, unbuffered connections
             proxy_buffering off;
             proxy_connect_timeout 300s;
             proxy_send_timeout 300s;
             proxy_read_timeout 3600s;
         }
     }
     ```

   - Test and reload again: `docker exec notedrill-nginx nginx -t && docker exec notedrill-nginx nginx -s reload`

   The cert must be issued (previous bullet) *before* adding this block —
   nginx refuses to load a config referencing `ssl_certificate` files that
   don't exist yet.

7. First manual deploy: `cd /opt/clinical-fact/apps/api && docker compose -f docker-compose.prod.yml up -d`.

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
