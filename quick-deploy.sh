#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Быстрый деплой LockBox"

# Обновляем код
echo "📥 Обновляем код..."
git fetch origin
git checkout main
git pull origin main

# Проверяем сеть
echo "🌐 Проверяем сетевой доступ..."
if docker run --rm curlimages/curl curl -s https://gatewayapi.telegram.org/sendVerificationMessage | grep -q "ACCESS_TOKEN_REQUIRED"; then
    echo "✅ Telegram Gateway API доступен"
else
    echo "❌ Telegram Gateway API недоступен - будет использован mock режим"
fi

# Перезапускаем приложение
echo "🔄 Перезапускаем приложение..."
docker compose down
docker compose up -d --build

# Применяем миграции
echo "🗄️ Применяем миграции..."
docker compose exec app npx prisma db push

# Проверяем статус
echo "✅ Проверяем статус..."
docker compose ps

echo "🎉 Деплой завершен!"
echo "📱 LockBox доступен на http://localhost:8080"
