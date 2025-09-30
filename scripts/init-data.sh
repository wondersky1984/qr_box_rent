#!/usr/bin/env bash
set -euo pipefail

echo "🌱 Инициализация данных на сервере..."

# Применяем миграции
echo "📊 Применяем миграции..."
docker compose exec app npx prisma db push

# Создаем базовые данные
echo "🏗️ Создаем базовые данные..."

# Создаем ячейки
docker compose exec app npx prisma db execute --stdin << 'EOF'
INSERT INTO "Locker" (id, number, status, "createdAt", "updatedAt") VALUES 
('locker-1', 1, 'FREE', NOW(), NOW()),
('locker-2', 2, 'FREE', NOW(), NOW()),
('locker-3', 3, 'FREE', NOW(), NOW()),
('locker-4', 4, 'FREE', NOW(), NOW()),
('locker-5', 5, 'FREE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
EOF

# Создаем тарифы
docker compose exec app npx prisma db execute --stdin << 'EOF'
INSERT INTO "Tariff" (id, name, "priceRub", "durationMinutes", "createdAt", "updatedAt") VALUES 
('tariff-hourly', 'Почасовая аренда', 100, 60, NOW(), NOW()),
('tariff-daily', 'Дневная аренда', 500, 1440, NOW(), NOW()),
('tariff-weekly', 'Недельная аренда', 2000, 10080, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
EOF

# Проверяем результат
echo "✅ Проверяем результат:"
docker compose exec app npx prisma db execute --stdin << 'EOF'
SELECT 'Lockers:' as info, COUNT(*) as count FROM "Locker"
UNION ALL
SELECT 'Tariffs:', COUNT(*) FROM "Tariff";
EOF

echo "🎉 Инициализация завершена!"
