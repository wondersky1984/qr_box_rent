import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, ActorType } from '@prisma/client';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('api/admin/tariffs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminTariffsController {
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  @Get()
  list() {
    return this.prisma.tariff.findMany({ orderBy: { createdAt: 'asc' } });
  }

  @Post()
  async create(@Body() dto: CreateTariffDto, @CurrentUser() user: { userId: string }) {
    const tariff = await this.prisma.tariff.create({
      data: {
        code: dto.code,
        name: dto.name,
        priceRub: dto.priceRub,
        durationMinutes: dto.durationMinutes,
        active: dto.active ?? true,
      },
    });

    await this.auditService.createLog({
      actorType: ActorType.ADMIN,
      actorId: user.userId,
      action: 'TARIFF_CREATE',
      metadata: { tariffId: tariff.id, code: tariff.code },
    });

    return tariff;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTariffDto, @CurrentUser() user: { userId: string }) {
    const tariff = await this.prisma.tariff.update({
      where: { id },
      data: dto,
    });

    await this.auditService.createLog({
      actorType: ActorType.ADMIN,
      actorId: user.userId,
      action: 'TARIFF_UPDATE',
      metadata: { tariffId: id },
    });

    return tariff;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    await this.prisma.tariff.delete({ where: { id } });
    await this.auditService.createLog({
      actorType: ActorType.ADMIN,
      actorId: user.userId,
      action: 'TARIFF_DELETE',
      metadata: { tariffId: id },
    });
    return { success: true };
  }
}
