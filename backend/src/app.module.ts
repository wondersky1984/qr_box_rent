import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './core/prisma/prisma.module';
import configuration from './config/configuration';
import validationSchema from './config/validation';
import { AuthModule } from './modules/auth/auth.module';
import { LockersModule } from './modules/lockers/lockers.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RentalsModule } from './modules/rentals/rentals.module';
import { ManagerModule } from './modules/manager/manager.module';
import { AdminModule } from './modules/admin/admin.module';
import { TariffsModule } from './modules/tariffs/tariffs.module';
import { AuditModule } from './modules/audit/audit.module';
import { LockerDriverModule } from './modules/locker-driver/locker-driver.module';
import { RolesGuard } from './common/guards/roles.guard';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
      },
    }),
    PrismaModule,
    LockerDriverModule,
    AuditModule,
    HealthModule,
    TariffsModule,
    AuthModule,
    LockersModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    RentalsModule,
    ManagerModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
