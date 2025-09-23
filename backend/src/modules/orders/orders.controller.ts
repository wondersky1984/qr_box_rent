import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('api/orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post(':id/pay')
  pay(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.ordersService.createPayment(id, user.userId);
  }

  @Post(':id/confirm')
  confirmMock(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.ordersService.confirmMockPayment(id, user.userId);
  }
}
