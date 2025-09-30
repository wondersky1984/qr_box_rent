# Telegram OTP Configuration

## Настройка Telegram Gateway API

### 1. Получите Telegram Gateway API токен:

1. **Перейдите на [Telegram Gateway](https://gatewayapi.telegram.org)**
2. **Войдите в свой аккаунт Telegram**
3. **Создайте новый проект** или выберите существующий
4. **Получите Access Token** в настройках проекта

### 2. Настройте переменные окружения:

Добавьте в `docker-compose.yml` или `.env` файл:

```yaml
environment:
  - TELEGRAM_ACCESS_TOKEN=your_telegram_gateway_token_here
```

### 3. Перезапустите qr_box_rent:
```bash
cd /Users/dima/Documents/codex/odata/qr_box_rent
docker compose restart app
```

## Использование

1. **Откройте приложение** - http://localhost:8080
2. **Нажмите "Войти"**
3. **Выберите "Telegram"** в диалоге авторизации
4. **Введите номер телефона** - должен совпадать с Telegram аккаунтом
5. **Получите код в Telegram** - придет сообщение с кодом
6. **Введите код** - авторизация завершена

## Безопасность

- OTP код действителен 5 минут
- Код можно использовать только один раз
- Все попытки логируются
- Rate limiting: не более 3 попыток в минуту
