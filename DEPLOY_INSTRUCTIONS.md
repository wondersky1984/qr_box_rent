# Инструкции для деплоя Telegram OTP v0.2.0

## 1. Подключение к серверу
```bash
ssh -i ~/.ssh/cursor_deploy deploy@62.113.36.37
```

## 2. Обновление кода
```bash
cd qr_box_rent
git fetch origin
git checkout main
git pull origin main
```

## 3. Проверка сетевого доступа Docker
```bash
# Проверяем доступ к Telegram Gateway API
docker run --rm curlimages/curl curl -v https://gatewayapi.telegram.org/sendVerificationMessage
```

## 4. Обновление приложения
```bash
# Останавливаем старые контейнеры
docker compose down

# Собираем и запускаем новые
docker compose up -d --build

# Применяем миграции базы данных
docker compose exec app npx prisma db push
```

## 5. Проверка Telegram токена
```bash
# Проверяем, что токен передается в контейнер
docker compose exec app env | grep TELEGRAM
```

## 6. Тестирование API
```bash
# Тестируем отправку OTP
curl -X POST http://localhost:8080/api/auth/telegram-otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+79991234567"}'
```

## 7. Проверка логов
```bash
# Смотрим логи приложения
docker compose logs app --tail=20
```

## 8. Настройка Telegram токена (если нужно)
Добавить в docker-compose.yml:
```yaml
environment:
  - TELEGRAM_ACCESS_TOKEN=your_telegram_gateway_token_here
```

## Ожидаемый результат:
- ✅ Приложение обновлено до версии 0.2.0
- ✅ Telegram OTP API работает
- ✅ Доступ к Telegram Gateway API из Docker
- ✅ Двойная авторизация (пароль + Telegram)
