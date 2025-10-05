# Интеграция ESP32 с Backend

## Описание

Система использует механизм команд через таблицу `DeviceCommand` для управления физическими ячейками. ESP32 периодически опрашивает сервер на наличие команд и подтверждает их выполнение.

---

## API Endpoints для ESP32

### 1. Polling (Опрос команд)

**GET** `/api/device/poll?device_id=ESP32_001&token=SECRET`

**Описание**: ESP32 периодически (каждые 3-5 секунд) вызывает этот endpoint для получения команд.

**Query Parameters**:
- `device_id` (string, required) - Идентификатор устройства (например: `ESP32_001`)
- `token` (string, required) - Токен безопасности устройства

**Ответы**:

1. **Нет команд**:
   ```
   OK
   ```

2. **Одна ячейка для открытия**:
   ```
   OPEN 5
   ```

3. **Несколько ячеек для открытия**:
   ```json
   {
     "open": [5, 12, 18]
   }
   ```

---

### 2. Confirm (Подтверждение выполнения)

**POST** `/api/device/confirm?device_id=ESP32_001&token=SECRET`

**Описание**: ESP32 вызывает этот endpoint после успешного открытия ячейки.

**Query Parameters**:
- `device_id` (string, required) - Идентификатор устройства
- `token` (string, required) - Токен безопасности устройства

**Body** (JSON):
```json
{
  "locker_number": 5
}
```

**Ответы**:

1. **Успешно**:
   ```
   OK
   ```

2. **Ошибка**:
   ```
   Invalid device token
   ```
   или
   ```
   Command not found
   ```

---

## Пример кода для ESP32 (Arduino/C++)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Конфигурация
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://your-server.com";
const char* deviceId = "ESP32_001";
const char* deviceToken = "your-device-token";

// Интервал опроса (миллисекунды)
const unsigned long pollInterval = 5000; // 5 секунд
unsigned long lastPollTime = 0;

void setup() {
  Serial.begin(115200);
  
  // Подключение к WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
  
  // Инициализация пинов для управления ячейками
  initializeLockers();
}

void loop() {
  unsigned long currentTime = millis();
  
  // Опрос сервера каждые 5 секунд
  if (currentTime - lastPollTime >= pollInterval) {
    lastPollTime = currentTime;
    pollServer();
  }
}

void pollServer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected");
    return;
  }

  HTTPClient http;
  String url = String(serverUrl) + "/api/device/poll?device_id=" + deviceId + "&token=" + deviceToken;
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String response = http.getString();
    Serial.println("Response: " + response);
    
    // Обработка ответа
    if (response == "OK") {
      // Нет команд
      return;
    } else if (response.startsWith("OPEN ")) {
      // Одна ячейка для открытия
      int lockerNumber = response.substring(5).toInt();
      openLocker(lockerNumber);
      confirmCommand(lockerNumber);
    } else if (response.startsWith("{")) {
      // JSON ответ с несколькими ячейками
      DynamicJsonDocument doc(1024);
      deserializeJson(doc, response);
      JsonArray openArray = doc["open"];
      
      for (int lockerNumber : openArray) {
        openLocker(lockerNumber);
        confirmCommand(lockerNumber);
      }
    }
  } else {
    Serial.printf("HTTP GET failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

void confirmCommand(int lockerNumber) {
  HTTPClient http;
  String url = String(serverUrl) + "/api/device/confirm?device_id=" + deviceId + "&token=" + deviceToken;
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  String payload = "{\"locker_number\":" + String(lockerNumber) + "}";
  int httpCode = http.POST(payload);
  
  if (httpCode == HTTP_CODE_OK) {
    Serial.println("Command confirmed for locker " + String(lockerNumber));
  } else {
    Serial.printf("Confirm failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

void openLocker(int lockerNumber) {
  Serial.println("Opening locker: " + String(lockerNumber));
  
  // ⚠️ ЗДЕСЬ ВАША ЛОГИКА ОТКРЫТИЯ ЯЧЕЙКИ
  // Например, активация реле на определённом пине:
  
  // int relayPin = getRelayPinForLocker(lockerNumber);
  // digitalWrite(relayPin, HIGH);
  // delay(1000); // Держать открытым 1 секунду
  // digitalWrite(relayPin, LOW);
}

void initializeLockers() {
  // Инициализация пинов для всех ячеек
  // Настройте пины в зависимости от вашей схемы подключения
}
```

---

## Настройка Backend

### 1. Переменные окружения (.env)

Добавьте токен для ESP32 устройств:

```env
DEVICE_TOKEN=your-secret-device-token-here
```

### 2. Настройка ячеек

В базе данных каждая ячейка должна иметь `deviceId`:

```sql
UPDATE "Locker" SET "deviceId" = 'ESP32_001' WHERE "number" BETWEEN 1 AND 12;
UPDATE "Locker" SET "deviceId" = 'ESP32_002' WHERE "number" BETWEEN 13 AND 24;
```

---

## Как это работает

### Процесс открытия ячейки:

1. **Пользователь/Менеджер/Админ** нажимает кнопку "Открыть ячейку"
2. **Backend** создаёт запись в таблице `DeviceCommand`:
   - `deviceId`: "ESP32_001"
   - `lockerNumber`: 5
   - `command`: "OPEN"
   - `status`: "PENDING"
   - `expiresAt`: текущее время + 30 секунд

3. **ESP32** при следующем опросе получает команду:
   - GET `/api/device/poll` → `OPEN 5`

4. **ESP32** открывает ячейку физически (реле, серво, и т.д.)

5. **ESP32** подтверждает выполнение:
   - POST `/api/device/confirm` с `{"locker_number": 5}`

6. **Backend** обновляет статус команды:
   - `status`: "PENDING" → "CONFIRMED"
   - `confirmedAt`: текущее время

### Очистка истёкших команд:

Каждую минуту cron job проверяет команды со статусом `PENDING`, у которых `expiresAt` < текущее время, и меняет их статус на `EXPIRED`.

---

## Схема таблицы DeviceCommand

```prisma
model DeviceCommand {
  id            String        @id @default(uuid())
  deviceId      String        // ESP32_001, ESP32_002, etc.
  lockerNumber  Int           // Number of locker to open
  command       String        // "OPEN"
  status        CommandStatus @default(PENDING) // PENDING | CONFIRMED | EXPIRED
  createdAt     DateTime      @default(now())
  confirmedAt   DateTime?     // When ESP32 confirmed receipt
  expiresAt     DateTime      // Usually +30 seconds from creation
  
  @@index([deviceId, status])
  @@index([status, expiresAt])
}

enum CommandStatus {
  PENDING
  CONFIRMED
  EXPIRED
}
```

---

## Безопасность

1. **Токен устройства**: Используйте длинный случайный токен (минимум 32 символа)
2. **HTTPS**: В продакшене обязательно используйте HTTPS для защиты токена
3. **Ротация токенов**: Периодически меняйте токен и обновляйте прошивку ESP32
4. **Rate limiting**: Настройте ограничение частоты запросов на backend

---

## Отладка

### Проверка команд в базе данных:

```sql
SELECT * FROM "DeviceCommand" WHERE "status" = 'PENDING';
```

### Создание тестовой команды вручную:

```sql
INSERT INTO "DeviceCommand" ("id", "deviceId", "lockerNumber", "command", "status", "expiresAt")
VALUES (gen_random_uuid(), 'ESP32_001', 5, 'OPEN', 'PENDING', NOW() + INTERVAL '30 seconds');
```

### Логи backend:

```bash
docker compose logs -f app
```

### Симуляция ESP32 через curl:

```bash
# Опрос
curl "http://localhost:3000/api/device/poll?device_id=ESP32_001&token=your-device-token"

# Подтверждение
curl -X POST "http://localhost:3000/api/device/confirm?device_id=ESP32_001&token=your-device-token" \
  -H "Content-Type: application/json" \
  -d '{"locker_number": 5}'
```

---

## Дальнейшие улучшения

1. **Статус ячейки от ESP32**: Добавить endpoint для отправки статуса ячейки (открыта/закрыта)
2. **Диагностика**: Endpoint для проверки связи с ESP32
3. **OTA Updates**: Обновление прошивки ESP32 через сервер
4. **Множественные команды**: Очередь команд для одной ячейки
5. **Приоритеты команд**: Срочные команды (безопасность, пожар, и т.д.)

---

## Контакты для поддержки

При возникновении проблем с интеграцией обратитесь к команде разработки.
