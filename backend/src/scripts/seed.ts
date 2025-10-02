import { PrismaClient, TariffCode, Role, LockerStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Создаем тарифы
  console.log('📦 Creating tariffs...');
  await prisma.tariff.upsert({
    where: { code: TariffCode.HOURLY },
    update: {},
    create: {
      code: TariffCode.HOURLY,
      name: 'Почасовой',
      priceRub: 200,
      durationMinutes: 60,
    },
  });

  await prisma.tariff.upsert({
    where: { code: TariffCode.DAILY },
    update: {},
    create: {
      code: TariffCode.DAILY,
      name: 'Суточный',
      priceRub: 1000,
      durationMinutes: 24 * 60,
    },
  });

  // Создаем ячейки если их нет
  console.log('🔒 Creating lockers...');
  const existingLockers = await prisma.locker.count();
  if (existingLockers === 0) {
    const lockersData = [];
    for (let i = 1; i <= 24; i++) {
      lockersData.push({
        number: i,
        status: i % 10 === 0 ? LockerStatus.FROZEN : i % 7 === 0 ? LockerStatus.OUT_OF_ORDER : LockerStatus.FREE,
        freezeReason: i % 10 === 0 ? 'Техническое обслуживание' : null,
      });
    }
    await prisma.locker.createMany({ data: lockersData });
    console.log(`✅ Created ${lockersData.length} lockers`);
  } else {
    console.log(`✅ Found ${existingLockers} existing lockers`);
  }

  // Создаем пользователей
  console.log('👥 Creating users...');
  await prisma.user.upsert({
    where: { phone: '+70000000001' },
    update: { role: Role.USER },
    create: { phone: '+70000000001', role: Role.USER },
  });

  await prisma.user.upsert({
    where: { phone: '+70000000002' },
    update: { role: Role.MANAGER },
    create: { phone: '+70000000002', role: Role.MANAGER },
  });

  await prisma.user.upsert({
    where: { phone: '+70000000003' },
    update: { role: Role.ADMIN },
    create: { phone: '+70000000003', role: Role.ADMIN },
  });

  // Создаем настройки льготного периода
  console.log('⚙️ Creating settings...');
  await prisma.settings.upsert({
    where: { key: 'grace_period_hourly_minutes' },
    update: { value: '15' },
    create: { key: 'grace_period_hourly_minutes', value: '15' },
  });

  await prisma.settings.upsert({
    where: { key: 'grace_period_daily_minutes' },
    update: { value: '120' },
    create: { key: 'grace_period_daily_minutes', value: '120' },
  });

  console.log('✅ Database seeding completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Database seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
