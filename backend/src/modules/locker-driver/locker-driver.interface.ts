export interface LockerDriver {
  open(lockerId: string): Promise<void>;
  status?(lockerId: string): Promise<'OPEN' | 'CLOSED' | 'UNKNOWN'>;
}

export const LOCKER_DRIVER = Symbol('LOCKER_DRIVER');
