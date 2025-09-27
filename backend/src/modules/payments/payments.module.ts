import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsUserController } from './payments-user.controller';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [PrismaModule, ConfigModule, AuditModule, forwardRef(() => OrdersModule)],
  providers: [PaymentsService],
  controllers: [PaymentsController, PaymentsUserController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
