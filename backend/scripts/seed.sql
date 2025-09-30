-- Создание пользователей
INSERT INTO "User" (id, phone, role, "createdAt", "updatedAt") VALUES 
('227dd50e-77f8-476b-91fa-38655057d9da', '+79191461438', 'ADMIN', NOW(), NOW()),
('70000000003', '+70000000003', 'ADMIN', NOW(), NOW())
ON CONFLICT (phone) DO NOTHING;

-- Создание ячеек
INSERT INTO "Locker" (id, number, status, "createdAt", "updatedAt") VALUES 
(gen_random_uuid(), 1, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 2, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 3, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 4, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 5, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 6, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 7, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 8, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 9, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 10, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 11, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 12, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 13, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 14, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 15, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 16, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 17, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 18, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 19, 'FREE', NOW(), NOW()),
(gen_random_uuid(), 20, 'FREE', NOW(), NOW())
ON CONFLICT (number) DO NOTHING;

-- Создание тарифов
INSERT INTO "Tariff" (id, code, name, "priceRub", "durationMinutes", active, "createdAt", "updatedAt") VALUES 
(gen_random_uuid(), 'HOURLY', 'Почасовой', 200, 60, true, NOW(), NOW()),
(gen_random_uuid(), 'DAILY', 'Дневной', 1000, 1440, true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Создание настроек
INSERT INTO "Settings" (id, key, value, "createdAt", "updatedAt") VALUES 
(gen_random_uuid(), 'grace_period_hourly', '15', NOW(), NOW()),
(gen_random_uuid(), 'grace_period_daily', '120', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;