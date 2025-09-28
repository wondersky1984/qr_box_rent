#!/bin/bash

# Быстрый деплой - коммит и пуш с автоматическим сообщением
# Использование: ./scripts/quick-deploy.sh [сообщение]

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Получаем сообщение коммита
MESSAGE="${1:-feat: $(date '+%Y-%m-%d %H:%M:%S') - автоматические изменения}"

echo "🚀 Быстрый деплой..."
echo "📝 Сообщение: $MESSAGE"

# Проверяем статус git
if [ -n "$(git status --porcelain)" ]; then
    echo "📦 Добавляем изменения..."
    git add .
    
    echo "💾 Коммитим изменения..."
    git commit -m "$MESSAGE"
    
    echo "📤 Отправляем на сервер..."
    git push origin main
    
    echo "✅ Деплой завершен!"
    echo "🌐 Приложение будет обновлено автоматически через GitHub Actions"
    echo "🔗 Ссылка: http://box.getski.me:8082"
else
    echo "ℹ️  Нет изменений для коммита"
fi
