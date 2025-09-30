# 🔧 Исправление сервера box.getski.me

## Проблема:
- API возвращает 500 ошибки
- Нет ячеек в базе данных
- Авто-деплой завершился с ошибкой

## Решение:

### 1. Подключиться к серверу:
```bash
ssh -i ~/.ssh/cursor_deploy deploy@62.113.36.37
cd qr_box_rent
```

### 2. Проверить статус:
```bash
docker compose ps
docker compose logs app --tail=20
```

### 3. Исправить базу данных:
```bash
# Применить миграции
docker compose exec app npx prisma db push

# Инициализировать данные
chmod +x scripts/init-data.sh
./scripts/init-data.sh
```

### 4. Перезапустить приложение:
```bash
docker compose restart app
```

### 5. Проверить API:
```bash
curl http://localhost:8080/api/lockers
curl http://localhost:8080/api/tariffs
```

## Ожидаемый результат:
- ✅ API возвращает данные ячеек и тарифов
- ✅ Авто-назначение работает
- ✅ Telegram OTP доступен
- ✅ Приложение полностью функционально

## Если проблемы остаются:
1. Проверить логи: `docker compose logs app`
2. Проверить базу: `docker compose exec app npx prisma studio`
3. Пересобрать: `docker compose up -d --build`
