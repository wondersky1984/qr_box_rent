# 🚀 Разработка LockBox

## Быстрый старт

### 1. Установка зависимостей
```bash
./scripts/dev.sh install
```

### 2. Запуск в режиме разработки
```bash
./scripts/dev.sh dev
```

### 3. Быстрый деплой изменений
```bash
./scripts/dev.sh deploy
# или
./scripts/quick-deploy.sh "описание изменений"
```

## 📁 Структура проекта

```
qr_box_rent/
├── backend/          # NestJS API сервер
│   ├── src/
│   │   ├── modules/  # Модули приложения
│   │   │   ├── admin/     # Админ панель
│   │   │   ├── auth/      # Аутентификация
│   │   │   ├── lockers/   # Управление ячейками
│   │   │   └── ...
│   │   └── ...
│   └── prisma/       # Схема базы данных
├── frontend/         # React приложение
│   ├── src/
│   │   ├── components/  # React компоненты
│   │   ├── pages/      # Страницы
│   │   ├── services/    # API сервисы
│   │   └── ...
├── scripts/          # Скрипты разработки
└── docker-compose.yml
```

## 🔧 Команды разработки

| Команда | Описание |
|---------|----------|
| `./scripts/dev.sh install` | Установить зависимости |
| `./scripts/dev.sh dev` | Запустить локально |
| `./scripts/dev.sh build` | Собрать проект |
| `./scripts/dev.sh deploy` | Деплой на сервер |
| `./scripts/dev.sh logs` | Показать логи |
| `./scripts/dev.sh stop` | Остановить |
| `./scripts/dev.sh clean` | Очистить все |

## 🌐 Доступные URL

- **Локально**: http://localhost:8082
- **Продакшн**: http://box.getski.me:8082
- **API**: http://box.getski.me:8082/api/

## 🔄 Workflow разработки

1. **Делаете изменения** в коде
2. **Тестируете локально** (опционально)
3. **Деплоите** командой `./scripts/quick-deploy.sh "описание"`
4. **GitHub Actions** автоматически обновляет сервер

## 📝 Полезные команды

### Backend разработка
```bash
cd backend
npm run dev        # Запуск в режиме разработки
npm run build      # Сборка
npm run test       # Тесты
```

### Frontend разработка
```bash
cd frontend
npm run dev        # Запуск в режиме разработки
npm run build      # Сборка
npm run preview    # Предварительный просмотр
```

### База данных
```bash
# Миграции
npx prisma migrate dev

# Генерация клиента
npx prisma generate

# Просмотр данных
npx prisma studio
```

## 🐛 Отладка

### Логи приложения
```bash
./scripts/dev.sh logs
```

### Статус контейнеров
```bash
./scripts/dev.sh status
```

### Очистка и перезапуск
```bash
./scripts/dev.sh clean
./scripts/dev.sh dev
```

## 🚀 Деплой

### Автоматический (рекомендуется)
```bash
./scripts/quick-deploy.sh "описание изменений"
```

### Ручной
```bash
git add .
git commit -m "описание изменений"
git push origin main
```

## 📋 Чек-лист перед деплоем

- [ ] Код протестирован локально
- [ ] Нет ошибок в консоли
- [ ] Все зависимости установлены
- [ ] Коммит имеет понятное описание
- [ ] Изменения не ломают существующий функционал

## 🔗 Полезные ссылки

- **GitHub**: https://github.com/wondersky1984/qr_box_rent
- **Продакшн**: http://box.getski.me:8082
- **API Docs**: http://box.getski.me:8082/api/
