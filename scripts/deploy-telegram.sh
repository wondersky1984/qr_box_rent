#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${DEPLOY_PATH:-$HOME/qr_box_rent}"
BRANCH="feature/auto-assign-lockers"

if [ ! -d "$REPO_DIR" ]; then
  echo "Repository directory $REPO_DIR not found" >&2
  exit 1
fi

cd "$REPO_DIR"

echo "[deploy] Pulling latest code from feature/auto-assign-lockers..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "[deploy] Building and restarting containers..."
docker compose down
docker compose up -d --build

echo "[deploy] Running migrations..."
docker compose exec -T app npx prisma db push

echo "[deploy] Testing Telegram OTP API..."
echo "Testing network connectivity to Telegram Gateway API..."
docker compose exec -T app sh -c "wget -q --spider https://gatewayapi.telegram.org && echo '✅ Telegram Gateway API accessible' || echo '❌ Telegram Gateway API not accessible'"

echo "[deploy] Done - Telegram OTP v0.2.0 deployed"
