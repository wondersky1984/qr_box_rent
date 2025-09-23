import { LockerDriver } from '../locker-driver.interface';

export class MockLockerDriver implements LockerDriver {
  async open(lockerId: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`Mock open locker ${lockerId}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  async status(): Promise<'OPEN' | 'CLOSED' | 'UNKNOWN'> {
    return 'UNKNOWN';
  }
}
