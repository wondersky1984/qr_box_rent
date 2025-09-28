export type LockerStatus = 'FREE' | 'HELD' | 'OCCUPIED' | 'FROZEN' | 'OUT_OF_ORDER';
export type Role = 'USER' | 'MANAGER' | 'ADMIN';

export interface Locker {
  id: string;
  number: number;
  status: LockerStatus;
  deviceId?: string | null;
  freezeReason?: string | null;
  freezeUntil?: string | null;
  currentRental?: {
    id: string;
    status: string;
    startAt?: string | null;
    endAt?: string | null;
    order: {
      user: {
        phone: string;
      };
    };
    tariff: {
      name: string;
      code: string;
    };
  } | null;
}

export interface Tariff {
  id: string;
  code: 'HOURLY' | 'DAILY';
  name: string;
  priceRub: number;
  durationMinutes: number;
  active: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string;
  lockerId: string;
  tariffId: string;
  status: 'CREATED' | 'AWAITING_PAYMENT' | 'ACTIVE' | 'OVERDUE' | 'EXPIRED' | 'CLOSED';
  startAt?: string | null;
  endAt?: string | null;
  holdUntil?: string | null;
  locker?: Locker;
  tariff?: Tariff;
}

export interface Order {
  id: string;
  status: 'DRAFT' | 'AWAITING_PAYMENT' | 'PAID' | 'CANCELED';
  totalRub: number;
  items: OrderItem[];
}

export interface Rental extends OrderItem {
  paidRub: number;
  accruedRub: number;
  outstandingRub: number;
  overdueMinutes: number;
  overdueRub: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorType: 'USER' | 'MANAGER' | 'ADMIN' | 'SYSTEM';
  actorId?: string | null;
  action:
    | 'LOCKER_OPEN'
    | 'LOCKER_FREEZE'
    | 'LOCKER_UNFREEZE'
    | 'LOCKER_CREATE'
    | 'LOCKER_UPDATE'
    | 'LOCKER_DELETE'
    | 'TARIFF_CREATE'
    | 'TARIFF_UPDATE'
    | 'TARIFF_DELETE'
    | 'RENTAL_CREATE'
    | 'PAYMENT_CREATE'
    | 'PAYMENT_SUCCEEDED'
    | 'RENTAL_EXTEND'
    | 'AUTH_LOGIN'
    | 'REPORT_VIEW';
  lockerId?: string | null;
  orderId?: string | null;
  orderItemId?: string | null;
  paymentId?: string | null;
  userId?: string | null;
  phone?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ApiResponse<T> {
  data: T;
}

export interface UserSession {
  id: string;
  phone: string;
  role: Role;
}

export * from './admin';
