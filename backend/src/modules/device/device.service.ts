import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  async pollDevice(deviceId: string, token: string): Promise<string | { open: number[] }> {
    // Проверяем токен (можно добавить более сложную логику)
    if (!token || token !== 'your-device-token') {
      return 'OK';
    }

    // Находим ячейки, которые нужно открыть для этого устройства
    const lockersToOpen = await this.prisma.locker.findMany({
      where: {
        deviceId,
        status: 'OCCUPIED',
        orderItems: {
          some: {
            status: 'ACTIVE',
            order: {
              status: 'PAID',
            },
          },
        },
      },
      include: {
        orderItems: {
          where: {
            status: 'ACTIVE',
          },
          include: {
            order: true,
          },
        },
      },
    });

    // Если есть ячейки для открытия
    if (lockersToOpen.length > 0) {
      const lockerNumbers = lockersToOpen.map(locker => locker.number);
      
      // Возвращаем команду открытия
      if (lockerNumbers.length === 1) {
        return `OPEN ${lockerNumbers[0]}`;
      } else {
        return { open: lockerNumbers };
      }
    }

    return 'OK';
  }

  async markLockerAsOpened(lockerId: string) {
    // Отмечаем, что ячейка была открыта
    await this.prisma.locker.update({
      where: { id: lockerId },
      data: {
        // Можно добавить поле lastOpenedAt или другую логику
      },
    });
  }
}


