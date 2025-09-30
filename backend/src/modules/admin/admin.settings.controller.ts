import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SettingsService } from '../settings/settings.service';

@Controller('api/admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Post('grace-period')
  async setGracePeriod(@Body() body: { tariffCode: 'HOURLY' | 'DAILY'; minutes: number }) {
    await this.settingsService.setGracePeriodMinutes(body.tariffCode, body.minutes);
    return { success: true };
  }
}


