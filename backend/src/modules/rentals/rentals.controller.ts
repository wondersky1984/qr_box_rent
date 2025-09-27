import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { ExtendRentalDto } from './dto/extend-rental.dto';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Get('me/rentals')
  getMyRentals(@CurrentUser() user: { userId: string }) {
    return this.rentalsService.getUserRentals(user.userId);
  }

  @Post('order-items/:id/extend')
  extend(@Param('id') id: string, @CurrentUser() user: { userId: string }, @Body() dto: ExtendRentalDto) {
    return this.rentalsService.extendRental(id, user.userId, dto);
  }

  @Post('order-items/:id/settle')
  settle(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.rentalsService.settleOverdue(id, user.userId);
  }

  @Post('order-items/:id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.rentalsService.completeRental(id, user.userId);
  }
}
