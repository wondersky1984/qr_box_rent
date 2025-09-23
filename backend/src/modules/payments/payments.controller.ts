import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsWebhookDto } from './dto/payments-webhook.dto';

@Controller('api/yookassa')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() dto: PaymentsWebhookDto, @Headers('x-yookassa-signature') signature?: string) {
    await this.paymentsService.handleWebhook(dto, signature);
    return { received: true };
  }
}
