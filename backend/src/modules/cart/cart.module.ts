import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { LockersModule } from '../lockers/lockers.module';
import { TariffsModule } from '../tariffs/tariffs.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, LockersModule, TariffsModule, ConfigModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
