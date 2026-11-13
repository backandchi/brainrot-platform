import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validates Telegram Mini App initData using HMAC-SHA256
   */
  async validateTelegramInitData(initData: string, referrerCode?: string) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    if (!hash) {
      throw new UnauthorizedException('Missing hash parameter');
    }

    // Sort parameters alphabetically
    const paramsList: string[] = [];
    urlParams.sort();
    urlParams.forEach((val, key) => {
      paramsList.push(`${key}=${val}`);
    });
    const dataCheckString = paramsList.join('\n');

    // Create secret key from bot token
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) {
      throw new UnauthorizedException('Invalid Telegram initData signature');
    }

    const userJson = urlParams.get('user');
    if (!userJson) {
      throw new UnauthorizedException('User data missing from initData');
    }

    const tgUser = JSON.parse(userJson);
    const telegramId = BigInt(tgUser.id);

    let user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      let referrerId: string | undefined = undefined;
      if (referrerCode) {
        const referrer = await this.prisma.user.findUnique({
          where: { referralCode: referrerCode },
        });
        if (referrer) {
          referrerId = referrer.id;
          // Reward referrer with initial referral bonus
          await this.prisma.user.update({
            where: { id: referrer.id },
            data: {
              balanceCoins: { increment: 50.0 },
              referralEarnings: { increment: 50.0 },
            },
          });
        }
      }

      user = await this.prisma.user.create({
        data: {
          telegramId,
          username: tgUser.username || null,
          firstName: tgUser.first_name || null,
          lastName: tgUser.last_name || null,
          avatarUrl: tgUser.photo_url || null,
          balanceCoins: 100.0, // Welcome bonus coins!
          referrerId,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          username: tgUser.username || user.username,
          firstName: tgUser.first_name || user.firstName,
          lastName: tgUser.last_name || user.lastName,
          avatarUrl: tgUser.photo_url || user.avatarUrl,
        },
      });
    }

    const payload = { sub: user.id, telegramId: user.telegramId.toString(), role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      accessToken: token,
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        robloxUsername: user.robloxUsername,
        balanceCoins: user.balanceCoins,
        balanceStars: user.balanceStars,
        role: user.role,
        referralCode: user.referralCode,
      },
    };
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        inventory: {
          where: { status: 'INVENTORY' },
          include: { item: true },
        },
        farmPlots: {
          include: {
            inventoryItem: {
              include: { item: true },
            },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    return {
      ...user,
      telegramId: user.telegramId.toString(),
    };
  }

  async updateRobloxUsername(userId: string, robloxUsername: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { robloxUsername },
    });
  }
}
