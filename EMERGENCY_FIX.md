# 🚨 СРОЧНОЕ ИСПРАВЛЕНИЕ СЕРВЕРА

## Проблема:
- Сайт загружается, но API возвращает 500 ошибки
- Версия 0.1.5 (должна быть 0.2.0)
- Нет ячеек и тарифов в базе данных
- Авто-деплой падает

## СРОЧНОЕ РЕШЕНИЕ:

### 1. Подключиться к серверу:
```bash
ssh root@45.12.74.108
cd /root/qr_box_rent
```

### 2. Остановить все контейнеры:
```bash
docker compose down
```

### 3. Очистить и пересобрать:
```bash
docker system prune -af
docker compose up -d --build
```

### 4. Инициализировать базу данных:
```bash
# Применить миграции
docker compose exec app npx prisma db push

# Создать ячейки
docker compose exec app npx prisma db execute --stdin << 'EOF'
INSERT INTO "Locker" (id, number, status, "createdAt", "updatedAt") VALUES 
('locker-1', 1, 'FREE', NOW(), NOW()),
('locker-2', 2, 'FREE', NOW(), NOW()),
('locker-3', 3, 'FREE', NOW(), NOW()),
('locker-4', 4, 'FREE', NOW(), NOW()),
('locker-5', 5, 'FREE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
EOF

# Создать тарифы
docker compose exec app npx prisma db execute --stdin << 'EOF'
INSERT INTO "Tariff" (id, name, "priceRub", "durationMinutes", "createdAt", "updatedAt") VALUES 
('tariff-hourly', 'Почасовая аренда', 100, 60, NOW(), NOW()),
('tariff-daily', 'Дневная аренда', 500, 1440, NOW(), NOW()),
('tariff-weekly', 'Недельная аренда', 2000, 10080, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
EOF
```

### 5. Проверить результат:
```bash
# Проверить API
curl http://localhost:8080/api/lockers
curl http://localhost:8080/api/tariffs

# Проверить версию
curl http://localhost:8080 | grep "Версия"
```

## Ожидаемый результат:
- ✅ API возвращает ячейки и тарифы
- ✅ Версия обновилась до 0.2.0
- ✅ Сайт полностью функционален
- ✅ Telegram OTP работает
