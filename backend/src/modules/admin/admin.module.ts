import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AdminLockersController } from './admin.lockers.controller';
import { LockersModule } from '../lockers/lockers.module';

@Module({
  imports: [PrismaModule, LockersModule],
  controllers: [AdminLockersController],
})
export class AdminModule {}
