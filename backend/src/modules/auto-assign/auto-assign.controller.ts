import { Controller, Post, Get, UseGuards, Body } from '@nestjs/common';
import { AutoAssignService } from './auto-assign.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { AssignLockerDto } from './dto/assign-locker.dto';

@Controller('api/auto-assign')
@UseGuards(JwtAuthGuard)
export class AutoAssignController {
  constructor(private readonly autoAssignService: AutoAssignService) {}

  @Post('assign')
  async assignLocker(
    @CurrentUser() user: { userId: string },
    @Body() dto: AssignLockerDto,
  ) {
    return this.autoAssignService.assignLockerToUser(user.userId, dto.tariffId);
  }

  @Get('available-count')
  async getAvailableCount() {
    const count = await this.autoAssignService.getAvailableLockersCount();
    return { count };
  }

  @Get('my-rentals')
  async getMyRentals(@CurrentUser() user: { userId: string }) {
    return this.autoAssignService.getUserActiveRentals(user.userId);
  }
}


