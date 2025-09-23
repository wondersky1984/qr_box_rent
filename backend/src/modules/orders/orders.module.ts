import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentsModule } from '../payments/payments.module';
import { LockersModule } from '../lockers/lockers.module';
import { TariffsModule } from '../tariffs/tariffs.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, ConfigModule, forwardRef(() => PaymentsModule), LockersModule, TariffsModule, AuditModule],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
