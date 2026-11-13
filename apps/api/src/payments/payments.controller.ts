import { Controller, Post, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('api/payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('stars/webhook')
  async starsWebhook(@Body() payload: { telegramId: number; starsAmount: number }) {
    return this.paymentsService.processTelegramStarsPayment(payload.telegramId, payload.starsAmount);
  }

  @Post('local/webhook')
  async localWebhook(
    @Body('orderId') orderId: string,
    @Body('amountUzs') amountUzs: number,
    @Body('telegramId') telegramId: number,
  ) {
    return this.paymentsService.processLocalPaymentWebhook(orderId, amountUzs, telegramId);
  }
}
