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

This server also hosts another project behind nginx, so this stack is fully
namespaced to avoid colliding with it: compose project name `clinicalfact`,
container names prefixed `clinicalfact-*`, its own Docker network/volumes, and
the `api` container only binds to `127.0.0.1:5001` (not the `5000` the other
project uses). nginx is what fronts both — see step 5.

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

5. Add an nginx server block for the API's subdomain, proxying to the
   container's host port (`5001`). Drop this in
   `/etc/nginx/sites-available/api.yourdomain.com` and symlink it into
   `sites-enabled` (adjust to however the other project's config is
   structured if it differs):

   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:5001;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;

           # job-status SSE endpoint needs a long-lived, unbuffered connection
           proxy_buffering off;
           proxy_read_timeout 3600s;
       }
   }
   ```

   Then `sudo nginx -t && sudo systemctl reload nginx`.

   For TLS: if the other project already gets its certs via Certbot, run
   `sudo certbot --nginx -d api.yourdomain.com` to add this host to the same
   setup. If instead it relies on Cloudflare's proxy (orange-cloud DNS) for
   TLS, just point `api.yourdomain.com`'s DNS record at the VPS IP with the
   proxy toggle on, the same way the other project's record is set up — no
   nginx TLS config needed in that case, Cloudflare terminates it at the edge.

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
