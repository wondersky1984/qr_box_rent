import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { ManagerLockersController } from './manager.lockers.controller';
import { LockersModule } from '../lockers/lockers.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, LockersModule, AuditModule, AuthModule],
  controllers: [ManagerLockersController],
})
export class ManagerModule {}
