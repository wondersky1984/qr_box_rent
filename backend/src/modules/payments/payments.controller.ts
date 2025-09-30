import { Body, Controller, Headers, HttpCode, Post, Get } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsWebhookDto } from './dto/payments-webhook.dto';
import { ConfigService } from '@nestjs/config';

@Controller('api/yookassa')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() dto: PaymentsWebhookDto, @Headers('x-yookassa-signature') signature?: string) {
    await this.paymentsService.handleWebhook(dto, signature);
    return { received: true };
  }

  @Get('test/config')
  getTestConfig() {
    return {
      shopId: this.configService.get<string>('app.yookassa.shopId'),
      secretKey: this.configService.get<string>('app.yookassa.secretKey') ? '***configured***' : 'not configured',
      successUrl: this.configService.get<string>('app.yookassa.successUrl'),
      failUrl: this.configService.get<string>('app.yookassa.failUrl'),
      mockPayments: this.configService.get<boolean>('app.yookassa.mockPayments'),
    };
  }

  @Post('test/create-payment')
  async createTestPayment(@Body() body: { amount: number; description?: string }) {
    const orderId = 'test-order-' + Date.now();
    const userId = 'test-user';
    const metadata = { test: true, description: body.description };

    try {
      const result = await this.paymentsService.createPayment(
        orderId,
        body.amount,
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

  @Post('create-test')
  async createTestPaymentDirect(@Body() body: { 
    orderId: string; 
    amount: number; 
    userId: string; 
    description?: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      const result = await this.paymentsService.createPayment(
        body.orderId,
        body.amount,
        body.userId,
        body.metadata || { test: true, description: body.description },
      );
      
      return {
        success: true,
        orderId: body.orderId,
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
