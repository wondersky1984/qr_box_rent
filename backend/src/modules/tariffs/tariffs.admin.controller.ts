import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { TariffsService } from './tariffs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';

@Controller('api/admin/tariffs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminTariffsController {
  constructor(private readonly tariffsService: TariffsService) {}

  @Get()
  list() {
    return this.tariffsService.listAll();
  }

  @Post()
  create(@Body() dto: CreateTariffDto) {
    return this.tariffsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTariffDto) {
    return this.tariffsService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tariffsService.delete(id);
  }
}
