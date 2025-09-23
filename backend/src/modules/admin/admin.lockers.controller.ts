import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateLockerDto } from './dto/create-locker.dto';
import { UpdateLockerDto } from './dto/update-locker.dto';
import { LockersService } from '../lockers/lockers.service';

@Controller('api/admin/lockers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminLockersController {
  constructor(private readonly prisma: PrismaService, private readonly lockersService: LockersService) {}

  @Get()
  list() {
    return this.lockersService.getLockers();
  }

  @Post()
  async create(@Body() dto: CreateLockerDto) {
    return this.prisma.locker.create({
      data: {
        number: dto.number,
        deviceId: dto.deviceId,
        status: dto.status ?? 'FREE',
      },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLockerDto) {
    await this.lockersService.getLocker(id);
    return this.prisma.locker.update({
      where: { id },
      data: dto,
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.prisma.locker.delete({ where: { id } });
    return { success: true };
  }
}
