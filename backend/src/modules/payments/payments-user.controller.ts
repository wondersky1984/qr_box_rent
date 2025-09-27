import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller('api/payments')
@UseGuards(JwtAuthGuard)
export class PaymentsUserController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':paymentId/confirm')
  async confirm(@Param('paymentId') paymentId: string, @CurrentUser() user: { userId: string }) {
    await this.paymentsService.confirmPaymentForUser(paymentId, user.userId);
    return { success: true };
  }
}
