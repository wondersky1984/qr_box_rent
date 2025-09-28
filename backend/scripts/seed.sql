-- Скрипт для восстановления базовых данных
-- Выполняется после сброса базы данных

-- Создаем ячейки
INSERT INTO "Locker" (id, number, status, "createdAt", "updatedAt") VALUES
('locker-1', 1, 'FREE', NOW(), NOW()),
('locker-2', 2, 'FREE', NOW(), NOW()),
('locker-3', 3, 'FREE', NOW(), NOW()),
('locker-4', 4, 'FREE', NOW(), NOW()),
('locker-5', 5, 'FREE', NOW(), NOW()),
('locker-6', 6, 'FREE', NOW(), NOW()),
('locker-7', 7, 'FREE', NOW(), NOW()),
('locker-8', 8, 'FREE', NOW(), NOW()),
('locker-9', 9, 'FREE', NOW(), NOW()),
('locker-10', 10, 'FREE', NOW(), NOW()),
('locker-11', 11, 'FREE', NOW(), NOW()),
('locker-12', 12, 'FREE', NOW(), NOW()),
('locker-13', 13, 'FREE', NOW(), NOW()),
('locker-14', 14, 'FREE', NOW(), NOW()),
('locker-15', 15, 'FREE', NOW(), NOW()),
('locker-16', 16, 'FREE', NOW(), NOW()),
('locker-17', 17, 'FREE', NOW(), NOW()),
('locker-18', 18, 'FREE', NOW(), NOW()),
('locker-19', 19, 'FREE', NOW(), NOW()),
('locker-20', 20, 'FREE', NOW(), NOW());

-- Создаем тарифы
INSERT INTO "Tariff" (id, code, name, "priceRub", "durationMinutes", active, "createdAt", "updatedAt") VALUES
('tariff-hourly', 'HOURLY', 'Почасовой', 200, 60, true, NOW(), NOW()),
('tariff-daily', 'DAILY', 'Дневной', 2000, 1440, true, NOW(), NOW());

-- Создаем админа
INSERT INTO "User" (id, phone, role, "createdAt", "updatedAt") VALUES
('admin-1', '+70000000003', 'ADMIN', NOW(), NOW()),
('admin-2', '+79191461438', 'ADMIN', NOW(), NOW());

-- Создаем настройки льготного периода
INSERT INTO "Settings" (id, key, value, "createdAt", "updatedAt") VALUES
('setting-1', 'grace_period_hourly_minutes', '15', NOW(), NOW()),
('setting-2', 'grace_period_daily_minutes', '120', NOW(), NOW());
