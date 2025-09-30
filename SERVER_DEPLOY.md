# 🚀 Деплой Telegram OTP на сервер

## Быстрый деплой (выполнить на сервере):

```bash
# 1. Подключиться к серверу
ssh root@45.12.74.108

# 2. Перейти в директорию проекта
cd /root/qr_box_rent

# 3. Выполнить быстрый деплой
chmod +x quick-deploy.sh
./quick-deploy.sh
```

## Ручной деплой:

```bash
# 1. Обновить код
git fetch origin
git checkout feature/auto-assign-lockers
git pull origin feature/auto-assign-lockers

# 2. Проверить сетевой доступ
docker run --rm curlimages/curl curl -s https://gatewayapi.telegram.org/sendVerificationMessage

# 3. Перезапустить приложение
docker compose down
docker compose up -d --build

# 4. Применить миграции
docker compose exec app npx prisma db push

# 5. Проверить статус
docker compose ps
```

## Проверка работы:

```bash
# Тест отправки OTP
curl -X POST http://localhost:8080/api/auth/telegram-otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+79991234567"}'

# Проверка логов
docker compose logs app --tail=10
```

## Ожидаемый результат:
- ✅ Версия 0.2.0 развернута
- ✅ Telegram OTP API работает
- ✅ Доступ к Telegram Gateway API
- ✅ Двойная авторизация (пароль + Telegram)

## Если проблемы с сетью:
- Система автоматически переключится на mock режим
- OTP коды будут генерироваться локально
- Проверьте логи для получения кодов
