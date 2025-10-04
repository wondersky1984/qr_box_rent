import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { RentalsService } from './rentals.service';
import { RentalsController } from './rentals.controller';
import { PaymentsModule } from '../payments/payments.module';
import { TariffsModule } from '../tariffs/tariffs.module';
import { LockersModule } from '../lockers/lockers.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, PaymentsModule, TariffsModule, LockersModule, AuthModule],
  providers: [RentalsService],
  controllers: [RentalsController],
  exports: [RentalsService],
})
export class RentalsModule {}
