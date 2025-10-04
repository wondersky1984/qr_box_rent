# Исправление функции продления аренды

**Дата**: 4 октября 2025  
**Ветка**: `feature/fix-rental-extension`  
**Базовая ветка**: `feature/extend-rental`

## 🐛 Проблемы, которые исправлены

### 1. **Продление аренды не работало**
**Причина**: При webhook от YooKassa в `markPaymentSucceeded()` перезаписывалось поле `payment.payload`, которое содержало важные метаданные (`extendOrderItemId`, `tariffId`, `quantity`). После перезаписи эти данные терялись, и система не могла понять, что платеж был для продления.

**Решение**: Убрали перезапись `payload` в `markPaymentSucceeded()`. Теперь оригинальные метаданные сохраняются и используются для обработки продления.

### 2. **Неправильная оплаченная сумма (paidRub)**
**Причина**: Расчет показывал только базовую цену тарифа, не учитывая оплаты за продления.

**Решение**: Теперь `paidRub` рассчитывается как сумма всех успешных платежей (`SUCCEEDED`):
- Первоначальный платеж за аренду
- Все платежи за продление (`extendOrderItemId`)
- Платежи за погашение задолженности (`settleOrderItemId`)

### 3. **Неправильное оплаченное время**
**Причина**: Время рассчитывалось как разница между `startAt` и `endAt`, что не учитывало продления.

**Решение**: Добавлено новое поле `paidMinutes`, которое рассчитывается из метаданных всех платежей:
- Начальный тариф
- Каждое продление с учетом выбранного тарифа и quantity

### 4. **Автоматическое завершение аренды**
**Причина**: После истечения времени аренда автоматически завершалась и ячейка освобождалась.

**Требование**: Клиент должен продолжать пользоваться ячейкой с начислением задолженности до момента, когда он или менеджер вручную завершит аренду.

**Решение**: Изменена логика `refreshExpiredRentals()`:
- При истечении времени аренда переводится в статус `OVERDUE`
- Ячейка остается `OCCUPIED`
- Задолженность начисляется через `calculateOverdueMeta()`
- Только ручное завершение освобождает ячейку

## 📝 Измененные файлы

### Backend

#### `backend/src/modules/payments/payments.service.ts`
```typescript
async markPaymentSucceeded(paymentId: string, payload?: unknown) {
  // НЕ перезаписываем payload - оригинальные metadata уже сохранены
  const payment = await this.prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'SUCCEEDED',
      // НЕ трогаем payload! Там наши metadata
    },
  });
  // ...
}
```

#### `backend/src/modules/rentals/rentals.service.ts`

**Изменения:**
1. `getUserRentals()` - добавлен расчет `paidRub` и `paidMinutes` из всех платежей
2. `refreshExpiredRentals()` - убрано автоматическое завершение, только перевод в OVERDUE

### Frontend

#### `frontend/src/types/index.ts`
```typescript
export interface Rental extends OrderItem {
  paidRub: number;
  paidMinutes: number; // НОВОЕ ПОЛЕ
  accruedRub: number;
  outstandingRub: number;
  overdueMinutes: number;
  overdueRub: number;
}
```

#### `frontend/src/pages/RentalsPage.tsx`
```typescript
const formatPaidTime = (rental: Rental) => {
  // Используем paidMinutes из backend
  const totalMinutes = rental.paidMinutes || 0;
  // форматирование времени...
}
```

## 🔄 Логика работы продления (после исправлений)

### 1. Пользователь нажимает "Продлить"
- Открывается модальное окно с выбором тарифа и количества
- При подтверждении: `POST /api/order-items/:id/extend`

### 2. Backend создает платеж
```typescript
metadata = {
  orderId: item.orderId,
  extendOrderItemId: item.id,  // ← ключевое поле
  tariffId: tariff.id,
  quantity: quantity.toString(),
}
```
- Метаданные сохраняются в `payment.payload`
- Пользователь перенаправляется на оплату

### 3. Webhook после оплаты
- YooKassa отправляет webhook `payment.succeeded`
- `markPaymentSucceeded()` НЕ трогает `payload`
- Вызывается `handlePaymentSuccess()`

### 4. Обработка продления
```typescript
if (metadata?.extendOrderItemId) {
  await this.handleExtension(metadata);
}
```
- Увеличивается `order.totalRub`
- Обновляется `orderItem.endAt`
- Статус → `ACTIVE`

### 5. Отображение на frontend
- `paidRub` показывает сумму всех платежей
- `paidMinutes` показывает общее оплаченное время
- `accruedRub` = `paidRub` + `overdueRub`
- `outstandingRub` = `overdueRub`

## 🧪 Как тестировать

### 1. Создать новую аренду
```bash
# Арендовать ячейку через UI
# Проверить что paidRub и paidMinutes соответствуют тарифу
```

### 2. Продлить аренду
```bash
# Нажать "Продлить" → выбрать тариф → оплатить
# После webhook проверить:
# - endAt увеличилось на время продления
# - paidRub увеличилось на цену продления
# - paidMinutes увеличилось на время продления
# - order.totalRub обновился
```

### 3. Дождаться истечения времени
```bash
# Подождать пока endAt < now
# Проверить:
# - Статус изменился на OVERDUE
# - Ячейка остается OCCUPIED
# - Начисляется overdueRub
# - Можно продолжать открывать (если нет долга)
```

### 4. Завершить просроченную аренду вручную
```bash
# Нажать "Освободить"
# Если есть долг - сначала "Оплатить долг"
# Проверить что ячейка освобождается
```

## 🔙 Откат на предыдущую версию

```bash
# Вернуться на рабочую версию
cd /home/deploy/qr_box_rent
git checkout feature/extend-rental

# Или на стабильную версию с тегом
git checkout v1.0-working-payment

# Перезапустить
cd /srv/qr_box_rent
docker compose down
docker compose up -d --build
```

## ✅ Чек-лист перед деплоем

- [ ] Локальное тестирование продления
- [ ] Проверка логов при webhook
- [ ] Проверка начисления задолженности
- [ ] Проверка ручного завершения
- [ ] Backup базы данных
- [ ] Создание тега новой версии
- [ ] Деплой на сервер
- [ ] Smoke test на проде

## 📊 Новая модель оплаты

### До исправления:
- Оплачено: только первоначальный платеж
- После истечения времени: автозавершение
- Продление: не работало

### После исправления:
- Оплачено: сумма всех платежей (включая продления)
- После истечения: статус OVERDUE, начисление долга
- Продление: работает корректно
- Время показывается с учетом всех продлений
- Пользователь может пользоваться ячейкой пока не завершит вручную

## 🎯 Следующие шаги

1. Протестировать на локальной машине
2. Создать миграцию если нужно (нет, схема БД не изменилась)
3. Задеплоить на тестовый сервер
4. Протестировать с реальными платежами YooKassa
5. Создать тег `v1.1-working-rental-extension`
6. Задеплоить на продакшн

