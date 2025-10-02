#!/usr/bin/env bash
set -euo pipefail

echo "🌱 Инициализация данных на сервере..."

# Применяем миграции
echo "📊 Применяем миграции..."
docker compose exec app npx prisma db push

# Создаем базовые данные
echo "🏗️ Создаем базовые данные..."

# Создаем ячейки
echo "📦 Создаем ячейки..."
docker compose exec -T app npx prisma db seed

# Проверяем результат
echo "✅ Проверяем результат:"
docker compose exec -T app npx prisma db execute --stdin << 'EOF'
SELECT 'Lockers:' as info, COUNT(*) as count FROM "Locker"
UNION ALL
SELECT 'Tariffs:', COUNT(*) FROM "Tariff";
EOF

echo "🎉 Инициализация завершена!"
