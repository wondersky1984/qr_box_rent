import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSetting(key: string, defaultValue?: string): Promise<string> {
    const setting = await this.prisma.settings.findUnique({
      where: { key },
    });
    return setting?.value ?? defaultValue ?? '';
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async getGracePeriodMinutes(tariffCode: 'HOURLY' | 'DAILY'): Promise<number> {
    const defaultMinutes = tariffCode === 'HOURLY' ? 15 : 120; // 15 мин для часовых, 2 часа для дневных
    const settingKey = `grace_period_${tariffCode.toLowerCase()}_minutes`;
    const value = await this.getSetting(settingKey, defaultMinutes.toString());
    return parseInt(value, 10) || defaultMinutes;
  }

  async setGracePeriodMinutes(tariffCode: 'HOURLY' | 'DAILY', minutes: number): Promise<void> {
    const settingKey = `grace_period_${tariffCode.toLowerCase()}_minutes`;
    await this.setSetting(settingKey, minutes.toString());
  }

  async getAllSettings(): Promise<Record<string, string>> {
    const settings = await this.prisma.settings.findMany();
    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);
  }
}


