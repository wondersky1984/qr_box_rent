#!/bin/bash

# Скрипт для локальной разработки
# Использование: ./scripts/dev.sh [команда]

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

case "${1:-help}" in
  "install")
    echo "📦 Установка зависимостей..."
    cd backend && npm install
    cd ../frontend && npm install
    echo "✅ Зависимости установлены"
    ;;
  
  "dev")
    echo "🚀 Запуск в режиме разработки..."
    docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
    echo "✅ Приложение запущено на http://localhost:8082"
    ;;
  
  "build")
    echo "🔨 Сборка проекта..."
    cd backend && npm run build
    cd ../frontend && npm run build
    echo "✅ Проект собран"
    ;;
  
  "deploy")
    echo "🚀 Деплой на сервер..."
    git add .
    git commit -m "feat: $(date '+%Y-%m-%d %H:%M:%S') - локальные изменения"
    git push origin main
    echo "✅ Изменения отправлены на сервер"
    ;;
  
  "logs")
    echo "📋 Логи приложения..."
    docker compose logs -f app
    ;;
  
  "stop")
    echo "🛑 Остановка приложения..."
    docker compose down
    echo "✅ Приложение остановлено"
    ;;
  
  "clean")
    echo "🧹 Очистка..."
    docker compose down -v
    docker system prune -f
    echo "✅ Очистка завершена"
    ;;
  
  "status")
    echo "📊 Статус приложения..."
    docker compose ps
    ;;
  
  *)
    echo "🔧 Скрипт для локальной разработки LockBox"
    echo ""
    echo "Использование: ./scripts/dev.sh [команда]"
    echo ""
    echo "Команды:"
    echo "  install  - Установить зависимости"
    echo "  dev      - Запустить в режиме разработки"
    echo "  build    - Собрать проект"
    echo "  deploy   - Отправить изменения на сервер"
    echo "  logs     - Показать логи"
    echo "  stop     - Остановить приложение"
    echo "  clean    - Очистить все"
    echo "  status   - Показать статус"
    echo ""
    echo "Примеры:"
    echo "  ./scripts/dev.sh install"
    echo "  ./scripts/dev.sh dev"
    echo "  ./scripts/dev.sh deploy"
    ;;
esac


