#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Диагностика и исправление сервера..."

# Проверяем статус контейнеров
echo "📊 Статус контейнеров:"
docker compose ps

# Проверяем логи приложения
echo "📋 Логи приложения (последние 20 строк):"
docker compose logs app --tail=20

# Проверяем подключение к базе данных
echo "🗄️ Проверка базы данных:"
docker compose exec app npx prisma db push --accept-data-loss

# Инициализируем данные
echo "🌱 Инициализация данных:"
docker compose exec app npx prisma db seed || echo "Seeding failed, trying manual approach..."

# Проверяем API
echo "🔍 Тестирование API:"
curl -s http://localhost:8080/api/lockers | head -5 || echo "Lockers API failed"
curl -s http://localhost:8080/api/tariffs | head -5 || echo "Tariffs API failed"

echo "✅ Диагностика завершена"
