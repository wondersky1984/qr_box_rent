import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TariffCode, Role, LockerStatus } from '@prisma/client';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.seedDatabase();
    } catch (error) {
      this.logger.error('Failed to seed database', error);
    }
  }

  async seedDatabase() {
    this.logger.log('🌱 Checking database for initial data...');

    // Проверяем, есть ли тарифы
    const tariffsCount = await this.prisma.tariff.count();
    if (tariffsCount === 0) {
      await this.seedTariffs();
    } else {
      this.logger.log(`✅ Found ${tariffsCount} existing tariffs`);
    }

    // Проверяем, есть ли ячейки
    const lockersCount = await this.prisma.locker.count();
    if (lockersCount === 0) {
      await this.seedLockers();
    } else {
      this.logger.log(`✅ Found ${lockersCount} existing lockers`);
    }

    // Проверяем, есть ли пользователи
    const usersCount = await this.prisma.user.count();
    if (usersCount === 0) {
      await this.seedUsers();
    } else {
      this.logger.log(`✅ Found ${usersCount} existing users`);
    }

    // Проверяем, есть ли настройки
    const settingsCount = await this.prisma.settings.count();
    if (settingsCount === 0) {
      await this.seedSettings();
    } else {
      this.logger.log(`✅ Found ${settingsCount} existing settings`);
    }

    this.logger.log('✅ Database initialization completed');
  }

  private async seedTariffs() {
    this.logger.log('📦 Creating tariffs...');

    await this.prisma.tariff.upsert({
      where: { code: TariffCode.HOURLY },
      update: {},
      create: {
        code: TariffCode.HOURLY,
        name: 'Почасовой',
        priceRub: 200,
        durationMinutes: 60,
      },
    });

    await this.prisma.tariff.upsert({
      where: { code: TariffCode.DAILY },
      update: {},
      create: {
        code: TariffCode.DAILY,
        name: 'Суточный',
        priceRub: 1000,
        durationMinutes: 24 * 60,
      },
    });

    this.logger.log('✅ Tariffs created');
  }

  private async seedLockers() {
    this.logger.log('🔒 Creating lockers...');

    const lockersData = [];
    for (let i = 1; i <= 24; i++) {
      lockersData.push({
        number: i,
        status: i % 10 === 0 ? LockerStatus.FROZEN : i % 7 === 0 ? LockerStatus.OUT_OF_ORDER : LockerStatus.FREE,
        freezeReason: i % 10 === 0 ? 'Техническое обслуживание' : null,
      });
    }

    await this.prisma.locker.createMany({ data: lockersData });
    this.logger.log(`✅ Created ${lockersData.length} lockers`);
  }

  private async seedUsers() {
    this.logger.log('👥 Creating users...');

    await this.prisma.user.upsert({
      where: { phone: '+70000000001' },
      update: { role: Role.USER },
      create: { phone: '+70000000001', role: Role.USER },
    });

    await this.prisma.user.upsert({
      where: { phone: '+70000000002' },
      update: { role: Role.MANAGER },
      create: { phone: '+70000000002', role: Role.MANAGER },
    });

    await this.prisma.user.upsert({
      where: { phone: '+70000000003' },
      update: { role: Role.ADMIN },
      create: { phone: '+70000000003', role: Role.ADMIN },
    });

    this.logger.log('✅ Users created');
  }

  private async seedSettings() {
    this.logger.log('⚙️ Creating settings...');

    await this.prisma.settings.upsert({
      where: { key: 'grace_period_hourly_minutes' },
      update: { value: '15' },
      create: { key: 'grace_period_hourly_minutes', value: '15' },
    });

    await this.prisma.settings.upsert({
      where: { key: 'grace_period_daily_minutes' },
      update: { value: '120' },
      create: { key: 'grace_period_daily_minutes', value: '120' },
    });

    this.logger.log('✅ Settings created');
  }
}

