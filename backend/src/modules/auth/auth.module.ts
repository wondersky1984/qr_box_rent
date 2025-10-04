import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TelegramOtpService } from './telegram-otp.service';
import { TelegramOtpController } from './telegram-otp.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwt.accessSecret'),
        signOptions: {
          expiresIn: config.get<string>('app.jwt.accessTtl'),
        },
      }),
    }),
  ],
  providers: [AuthService, TelegramOtpService, JwtStrategy, RefreshStrategy],
  controllers: [AuthController, TelegramOtpController],
  exports: [AuthService, JwtStrategy, RefreshStrategy, PassportModule],
})
export class AuthModule {}
