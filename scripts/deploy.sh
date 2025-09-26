#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${DEPLOY_PATH:-$HOME/qr_box_rent}"
BRANCH="${DEPLOY_BRANCH:-main}"

if [ ! -d "$REPO_DIR" ]; then
  echo "Repository directory $REPO_DIR not found" >&2
  exit 1
fi

cd "$REPO_DIR"

echo "[deploy] Pulling latest code..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "[deploy] Building and restarting containers..."
docker compose down
# Use build without cache toggle via env if desired
if [ "${DEPLOY_NO_CACHE:-false}" = "true" ]; then
  docker compose build --no-cache
  docker compose up -d
else
  docker compose up -d --build
fi

echo "[deploy] Running migrations..."
docker compose exec -T app npx prisma migrate deploy || docker compose exec -T app npx prisma db push

echo "[deploy] Seeding baseline data..."
docker compose exec -T app npm run seed:prod || true

echo "[deploy] Pruning old images (optional)"
if [ "${DEPLOY_PRUNE:-false}" = "true" ]; then
  docker system prune -af
fi

echo "[deploy] Done"
