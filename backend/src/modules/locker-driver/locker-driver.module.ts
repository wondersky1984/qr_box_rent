import { Global, Module } from '@nestjs/common';
import { LOCKER_DRIVER } from './locker-driver.interface';
import { MockLockerDriver } from './drivers/mock-locker.driver';

@Global()
@Module({
  providers: [
    {
      provide: LOCKER_DRIVER,
      useClass: MockLockerDriver,
    },
  ],
  exports: [LOCKER_DRIVER],
})
export class LockerDriverModule {}
