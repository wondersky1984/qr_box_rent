import { registerAs } from '@nestjs/config';

type AppConfig = {
  port: number;
  baseUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  yookassa: {
    shopId: string;
    secretKey: string;
    webhookSecret?: string;
    successUrl: string;
    failUrl: string;
    mockPayments: boolean;
  };
  lockers: {
    holdMinutes: number;
  };
  auth: {
    staticPassword: string;
  };
  cookies: {
    secure: boolean;
  };
  telegram: {
    accessToken: string;
  };
};

export default registerAs<AppConfig>('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3000',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-too',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '1h',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },
  yookassa: {
    shopId: process.env.YOOKASSA_SHOP_ID ?? '',
    secretKey: process.env.YOOKASSA_SECRET_KEY ?? '',
    webhookSecret: process.env.YOOKASSA_WEBHOOK_SECRET,
    successUrl: `${process.env.BASE_URL ?? 'http://localhost:5173'}/payment/success`,
    failUrl: `${process.env.BASE_URL ?? 'http://localhost:5173'}/payment/fail`,
    mockPayments: process.env.MOCK_PAYMENTS === 'true',
  },
  lockers: {
    holdMinutes: parseInt(process.env.LOCKER_HOLD_MINUTES ?? '10', 10),
  },
  auth: {
    staticPassword: process.env.STATIC_LOGIN_PASSWORD ?? '1234',
  },
  cookies: {
    secure: process.env.COOKIE_SECURE === 'true',
  },
  telegram: {
    accessToken: process.env.TELEGRAM_ACCESS_TOKEN ?? '',
  },
}));
