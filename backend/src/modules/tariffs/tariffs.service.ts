import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TariffCode } from '@prisma/client';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';

@Injectable()
export class TariffsService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive() {
    return this.prisma.tariff.findMany({ where: { active: true }, orderBy: { priceRub: 'asc' } });
  }

  async listAll() {
    return this.prisma.tariff.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getTariffById(id: string) {
    const tariff = await this.prisma.tariff.findUnique({ where: { id } });
    if (!tariff) {
      throw new NotFoundException('Tariff not found');
    }
    return tariff;
  }

  async getDefaultTariff() {
    const hourly = await this.prisma.tariff.findFirst({ where: { code: TariffCode.HOURLY, active: true } });
    if (hourly) {
      return hourly;
    }
    const any = await this.prisma.tariff.findFirst({ where: { active: true } });
    if (!any) {
      throw new BadRequestException('Нет доступных тарифов');
    }
    return any;
  }

  async create(dto: CreateTariffDto) {
    const isCodeUsed = await this.prisma.tariff.findFirst({ where: { code: dto.code } });
    if (isCodeUsed) {
      throw new BadRequestException('Код тарифа уже используется');
    }
    return this.prisma.tariff.create({ data: dto });
  }

  async update(id: string, dto: UpdateTariffDto) {
    await this.getTariffById(id);
    if (dto.code) {
      const existing = await this.prisma.tariff.findFirst({ where: { code: dto.code, id: { not: id } } });
      if (existing) {
        throw new BadRequestException('Код тарифа уже используется');
      }
    }
    return this.prisma.tariff.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.getTariffById(id);
    await this.prisma.tariff.delete({ where: { id } });
    return { success: true };
  }
}
