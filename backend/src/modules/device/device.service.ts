import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeviceService {
  private readonly deviceToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Токен для ESP32 устройств (можно добавить в .env)
    this.deviceToken = this.configService.get<string>('DEVICE_TOKEN', 'your-device-token');
  }

  /**
   * Polling endpoint for ESP32 devices
   * Returns pending OPEN commands
   */
  async pollDevice(deviceId: string, token: string): Promise<string | { open: number[] }> {
    // Проверяем токен устройства
    if (!token || token !== this.deviceToken) {
      return 'OK';
    }

    // Ищем PENDING команды для этого устройства
    const pendingCommands = await this.prisma.deviceCommand.findMany({
      where: {
        deviceId,
        status: 'PENDING',
        expiresAt: {
          gte: new Date(), // Не истёкшие
        },
      },
      orderBy: {
        createdAt: 'asc', // Старые команды первыми
      },
    });

    // Если есть команды на открытие
    if (pendingCommands.length > 0) {
      const lockerNumbers = pendingCommands
        .filter((cmd) => cmd.command === 'OPEN')
        .map((cmd) => cmd.lockerNumber);

      // Возвращаем команду открытия
      if (lockerNumbers.length === 1) {
        return `OPEN ${lockerNumbers[0]}`;
      } else if (lockerNumbers.length > 1) {
        return { open: lockerNumbers };
      }
    }

    return 'OK';
  }

  /**
   * ESP32 confirms command execution
   */
  async confirmCommand(deviceId: string, token: string, lockerNumber: number): Promise<void> {
    // Проверяем токен устройства
    if (!token || token !== this.deviceToken) {
      throw new Error('Invalid device token');
    }

    // Находим PENDING команду для этой ячейки
    const command = await this.prisma.deviceCommand.findFirst({
      where: {
        deviceId,
        lockerNumber,
        status: 'PENDING',
      },
    });

    if (!command) {
      throw new Error('Command not found');
    }

    // Отмечаем команду как подтверждённую
    await this.prisma.deviceCommand.update({
      where: { id: command.id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });
  }

  /**
   * Create new OPEN command for locker
   * Called when user needs to open a locker
   */
  async createOpenCommand(deviceId: string, lockerNumber: number): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + 30); // Команда действует 30 секунд

    await this.prisma.deviceCommand.create({
      data: {
        deviceId,
        lockerNumber,
        command: 'OPEN',
        status: 'PENDING',
        expiresAt,
      },
    });
  }

  /**
   * Cleanup expired commands (called by cron)
   */
  async cleanupExpiredCommands(): Promise<number> {
    const result = await this.prisma.deviceCommand.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return result.count;
  }
}


