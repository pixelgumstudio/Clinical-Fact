#!/usr/bin/env bash
# One-time VPS bootstrap for Clinical Fact API deployment.
# Run this once, manually, over SSH on a fresh Ubuntu/Debian VPS:
#   curl -fsSL https://raw.githubusercontent.com/pixelgumstudio/Clinical-Fact/main/apps/api/deploy/setup-server.sh | bash
# or copy the repo over first and run it locally on the server.
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/clinical-fact}"
REPO_URL="${REPO_URL:-https://github.com/pixelgumstudio/Clinical-Fact.git}"

echo "==> Installing Docker + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker "${SUDO_USER:-$USER}" || true
fi

echo "==> Installing cloudflared"
if ! command -v cloudflared >/dev/null 2>&1; then
  ARCH=$(dpkg --print-architecture)
  curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}.deb" -o /tmp/cloudflared.deb
  dpkg -i /tmp/cloudflared.deb
  rm /tmp/cloudflared.deb
fi

echo "==> Cloning repo to ${DEPLOY_PATH}"
if [ ! -d "${DEPLOY_PATH}/.git" ]; then
  git clone "${REPO_URL}" "${DEPLOY_PATH}"
else
  echo "    already cloned, skipping"
fi

echo ""
echo "==> Bootstrap done. Remaining manual steps:"
echo "  1. Create ${DEPLOY_PATH}/apps/api/.env with production values"
echo "     (see apps/api/deploy/README.md for the checklist)."
echo "  2. Log into Cloudflare and create the tunnel:"
echo "       cloudflared tunnel login"
echo "       cloudflared tunnel create clinical-fact-api"
echo "       cloudflared tunnel route dns clinical-fact-api api.yourdomain.com"
echo "     Then create /etc/cloudflared/config.yml routing to http://localhost:5000"
echo "     and run: cloudflared service install"
echo "  3. First deploy:"
echo "       cd ${DEPLOY_PATH}/apps/api && docker compose -f docker-compose.prod.yml up -d"
echo "  4. Add the GitHub Actions secrets listed in deploy/README.md so pushes"
echo "     to main auto-deploy from then on."
