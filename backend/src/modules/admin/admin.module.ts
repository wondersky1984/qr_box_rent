import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AdminLockersController } from './admin.lockers.controller';
import { AdminTariffsController } from './admin.tariffs.controller';
import { AdminReportsController } from './admin.reports.controller';
import { LockersModule } from '../lockers/lockers.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, LockersModule, AuditModule],
  controllers: [AdminLockersController, AdminTariffsController, AdminReportsController],
})
export class AdminModule {}
