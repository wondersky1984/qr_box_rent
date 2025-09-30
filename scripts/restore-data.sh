#!/bin/bash

# Скрипт для восстановления базовых данных после сброса базы

echo "🔄 Восстанавливаем базовые данные..."

# Выполняем SQL скрипт
ssh -i ~/.ssh/cursor_deploy deploy@62.113.36.37 "cd qr_box_rent && docker compose exec app npx prisma db execute --stdin" < backend/scripts/seed.sql

echo "✅ Базовые данные восстановлены!"
echo "📦 Ячейки: 20 штук"
echo "💰 Тарифы: Почасовой (200₽), Дневной (2000₽)"
echo "👤 Админы: +70000000003, +79191461438"
echo "⚙️ Настройки: Льготный период 15 мин (час), 2 часа (день)"


