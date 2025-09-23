import { PrismaClient, TariffCode, Role, LockerStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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
      priceRub: 600,
      durationMinutes: 24 * 60,
    },
  });

  const existingLockers = await prisma.locker.count();
  if (existingLockers === 0) {
    const lockers = Array.from({ length: 24 }).map((_, index) => ({
      number: index + 1,
      status: index % 10 === 0 ? LockerStatus.FROZEN : index % 7 === 0 ? LockerStatus.OUT_OF_ORDER : LockerStatus.FREE,
      freezeReason: index % 10 === 0 ? 'Demo freeze' : null,
    }));
    await prisma.locker.createMany({ data: lockers });
  }

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
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
