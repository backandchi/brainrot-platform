import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class TradesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verify Roblox username and fetch avatar headshot via Roblox Open API
   */
  async verifyRobloxUser(username: string) {
    try {
      const res = await axios.post('https://users.roblox.com/v1/usernames/users', {
        usernames: [username],
        excludeBannedUsers: true,
      });

      const users = res.data.data;
      if (!users || users.length === 0) {
        throw new BadRequestException('Roblox foydalanuvchisi topilmadi');
      }

      const robloxUser = users[0];
      const thumbRes = await axios.get(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxUser.id}&size=150x150&format=Png&isCircular=true`,
      );

      const avatarUrl = thumbRes.data.data[0]?.imageUrl || '';

      return {
        id: robloxUser.id,
        name: robloxUser.name,
        displayName: robloxUser.displayName,
        avatarUrl,
      };
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Roblox API bilan ulanishda xatolik: ' + e.message);
    }
  }

  /**
   * User requests a DEPOSIT with Roblox Brainrots (max 5 items, enforces 1-hour cooldown)
   */
  async createDepositRequest(userId: string, robloxUsername: string, itemIds: string[]) {
    if (itemIds.length < 1 || itemIds.length > 5) {
      throw new BadRequestException('Bitta depozitda 1 tadan 5 tagacha Brainrot topshirish mumkin');
    }

    // Check 1-hour cooldown for user
    const recentTrade = await this.prisma.tradeRequest.findFirst({
      where: {
        userId,
        type: 'DEPOSIT',
        status: { in: ['EXPIRED', 'CANCELLED'] },
        cooldownUntil: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentTrade && recentTrade.cooldownUntil) {
      const minutesLeft = Math.ceil(
        (recentTrade.cooldownUntil.getTime() - Date.now()) / (1000 * 60),
      );
      throw new BadRequestException(
        `Qayta so'rov yuborish uchun cheklov mavjud! Qolgan vaqt: ${minutesLeft} daqiqa.`,
      );
    }

    const trade = await this.prisma.tradeRequest.create({
      data: {
        userId,
        type: 'DEPOSIT',
        robloxUsername,
        status: 'PENDING',
        items: {
          create: itemIds.map((itemId) => ({ itemId })),
        },
      },
      include: {
        items: { include: { item: true } },
      },
    });

    return {
      success: true,
      message: 'Depozit so\'rovi qabul qilindi. Admin tekshiruvini kuting.',
      trade,
    };
  }

  /**
   * User requests a WITHDRAWAL of a Brainrot to Roblox (enforces 1-hour cooldown per item)
   */
  async createWithdrawRequest(userId: string, robloxUsername: string, inventoryItemId: string) {
    const invItem = await this.prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, userId, status: 'INVENTORY' },
      include: { item: true },
    });
    if (!invItem) {
      throw new NotFoundException('Chiqarib olinadigan personaj inventarda topilmadi');
    }

    // Check 1-hour cooldown
    const recentTrade = await this.prisma.tradeRequest.findFirst({
      where: {
        userId,
        type: 'WITHDRAW',
        status: { in: ['EXPIRED', 'CANCELLED'] },
        cooldownUntil: { gt: new Date() },
      },
    });

    if (recentTrade && recentTrade.cooldownUntil) {
      const minutesLeft = Math.ceil(
        (recentTrade.cooldownUntil.getTime() - Date.now()) / (1000 * 60),
      );
      throw new BadRequestException(
        `Ushbu personaj bo'yicha qayta so'rov 1 soat ichida yuborilgan! Qolgan vaqt: ${minutesLeft} daqiqa.`,
      );
    }

    // Freeze item in inventory
    const [trade] = await this.prisma.$transaction([
      this.prisma.tradeRequest.create({
        data: {
          userId,
          type: 'WITHDRAW',
          robloxUsername,
          status: 'PENDING',
          items: {
            create: {
              itemId: invItem.itemId,
              inventoryItemId: invItem.id,
            },
          },
        },
        include: { items: { include: { item: true } } },
      }),
      this.prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { status: 'WITHDRAW_PENDING' },
      }),
    ]);

    return {
      success: true,
      message: 'Chiqarib olish so\'rovi yuborildi. Admin server linkini kuting.',
      trade,
    };
  }

  /**
   * Admin approves trade and provides VIP Server link with 5-minute countdown deadline
   */
  async adminApproveTrade(tradeId: string, serverLink: string) {
    const trade = await this.prisma.tradeRequest.findUnique({ where: { id: tradeId } });
    if (!trade) throw new NotFoundException('So\'rov topilmadi');

    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    const updated = await this.prisma.tradeRequest.update({
      where: { id: tradeId },
      data: {
        status: 'APPROVED',
        serverLink,
        expiresAt: fiveMinutesFromNow,
      },
      include: { items: { include: { item: true } }, user: true },
    });

    return {
      success: true,
      message: 'So\'rov tasdiqlandi. Foydalanuvchiga 5 daqiqalik taymer ishga tushirildi.',
      trade: updated,
    };
  }

  /**
   * Get Trade status and verify 5-minute expiry
   */
  async getTradeStatus(tradeId: string) {
    const trade = await this.prisma.tradeRequest.findUnique({
      where: { id: tradeId },
      include: { items: { include: { item: true } } },
    });
    if (!trade) throw new NotFoundException('So\'rov topilmadi');

    // Auto-check 5-minute expiration
    if (trade.status === 'APPROVED' && trade.expiresAt && new Date() > trade.expiresAt) {
      const cooldown = new Date(Date.now() + 60 * 60 * 1000); // 1-hour anti-spam cooldown
      const expiredTrade = await this.prisma.tradeRequest.update({
        where: { id: tradeId },
        data: {
          status: 'EXPIRED',
          serverLink: null, // close link
          cooldownUntil: cooldown,
        },
      });

      // If it was withdraw, unfreeze item back to inventory
      if (trade.type === 'WITHDRAW') {
        const tradeItem = trade.items[0];
        if (tradeItem?.inventoryItemId) {
          await this.prisma.inventoryItem.update({
            where: { id: tradeItem.inventoryItemId },
            data: { status: 'INVENTORY' },
          });
        }
      }

      return {
        ...expiredTrade,
        message: 'Vaqt o\'tib ketdi — havola yopildi. Adminga murojaat qiling.',
      };
    }

    return trade;
  }

  /**
   * Admin completes trade (in Roblox trade confirmed)
   */
  async adminCompleteTrade(tradeId: string) {
    const trade = await this.prisma.tradeRequest.findUnique({
      where: { id: tradeId },
      include: { items: { include: { item: true } } },
    });
    if (!trade) throw new NotFoundException('Trade topilmadi');

    if (trade.type === 'DEPOSIT') {
      // Credit total coins of deposited Brainrots to user balance
      const totalCoins = trade.items.reduce((sum, ti) => sum + Number(ti.item.priceCoins), 0);
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: trade.userId },
          data: { balanceCoins: { increment: totalCoins } },
        }),
        this.prisma.tradeRequest.update({
          where: { id: tradeId },
          data: { status: 'COMPLETED' },
        }),
      ]);
    } else {
      // Withdraw: delete inventory item permanently
      const tradeItem = trade.items[0];
      if (tradeItem?.inventoryItemId) {
        await this.prisma.inventoryItem.delete({
          where: { id: tradeItem.inventoryItemId },
        });
      }
      await this.prisma.tradeRequest.update({
        where: { id: tradeId },
        data: { status: 'COMPLETED' },
      });
    }

    return {
      success: true,
      message: 'Treyd muvaffaqiyatli yakunlandi!',
    };
  }
}
