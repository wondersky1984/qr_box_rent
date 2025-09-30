#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Проверка сетевого доступа Docker к внешним API..."

echo "1. Проверка доступа к Telegram Gateway API..."
if docker run --rm curlimages/curl curl -s https://gatewayapi.telegram.org/sendVerificationMessage | grep -q "ACCESS_TOKEN_REQUIRED"; then
    echo "✅ Telegram Gateway API доступен"
else
    echo "❌ Telegram Gateway API недоступен"
fi

echo "2. Проверка DNS разрешения..."
if docker run --rm curlimages/curl nslookup gatewayapi.telegram.org; then
    echo "✅ DNS разрешение работает"
else
    echo "❌ Проблемы с DNS"
fi

echo "3. Проверка HTTPS соединения..."
if docker run --rm curlimages/curl curl -I https://gatewayapi.telegram.org; then
    echo "✅ HTTPS соединение работает"
else
    echo "❌ Проблемы с HTTPS"
fi

echo "4. Проверка переменных окружения..."
if docker compose exec app env | grep -q TELEGRAM_ACCESS_TOKEN; then
    echo "✅ Telegram токен настроен"
else
    echo "❌ Telegram токен не найден"
fi

echo "🔍 Проверка завершена"
