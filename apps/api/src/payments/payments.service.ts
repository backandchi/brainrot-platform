import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Process Telegram Stars payment (1 Star = 10 Coins rate)
   */
  async processTelegramStarsPayment(telegramId: number, starsAmount: number) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
    if (!user) throw new BadRequestException('User not found');

    const coinsToAdd = starsAmount * 10;

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        balanceCoins: { increment: coinsToAdd },
        balanceStars: { increment: starsAmount },
        totalDeposited: { increment: coinsToAdd },
      },
    });

    return {
      success: true,
      coinsAdded: coinsToAdd,
      newBalance: updatedUser.balanceCoins,
    };
  }

  /**
   * Uzbekistan Local Gateway Webhook (MirPay / Checkout.uz)
   */
  async processLocalPaymentWebhook(orderId: string, amountUzs: number, telegramId: number) {
    // Conversion rate: 10,000 UZS = 100 Coins
    const coins = Math.floor(amountUzs / 100);

    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
    if (!user) throw new BadRequestException('User not found');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        balanceCoins: { increment: coins },
        totalDeposited: { increment: coins },
      },
    });

    return { success: true, coinsCredited: coins };
  }
}
