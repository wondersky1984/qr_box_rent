import { Controller, Post, Body, Get } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ConfigService } from '@nestjs/config';

export class TestPaymentDto {
  amount!: number;
  description?: string;
}

@Controller('api/test/yookassa')
export class YookassaTestController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @Get('config')
  getConfig() {
    return {
      shopId: this.configService.get<string>('app.yookassa.shopId'),
      secretKey: this.configService.get<string>('app.yookassa.secretKey') ? '***configured***' : 'not configured',
      successUrl: this.configService.get<string>('app.yookassa.successUrl'),
      failUrl: this.configService.get<string>('app.yookassa.failUrl'),
      mockPayments: this.configService.get<boolean>('app.yookassa.mockPayments'),
    };
  }

  @Post('create-payment')
  async createTestPayment(@Body() dto: TestPaymentDto) {
    const orderId = 'test-order-' + Date.now();
    const userId = 'test-user';
    const metadata = { test: true, description: dto.description };

    try {
      const result = await this.paymentsService.createPayment(
        orderId,
        dto.amount,
        userId,
        metadata,
      );
      
      return {
        success: true,
        orderId,
        paymentId: result.payment.id,
        confirmationUrl: result.confirmationUrl,
        ykPaymentId: result.payment.ykPaymentId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };
    }
  }
}
