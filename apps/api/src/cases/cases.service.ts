import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class CasesService {
  constructor(private prisma: PrismaService) {}

  async getAllCases() {
    return this.prisma.case.findMany({
      where: { isActive: true },
      include: {
        items: {
          include: { item: true },
          orderBy: { item: { priceCoins: 'asc' } },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async getCaseBySlug(slug: string) {
    const c = await this.prisma.case.findUnique({
      where: { slug },
      include: {
        items: {
          include: { item: true },
        },
      },
    });
    if (!c) throw new NotFoundException('Case not found');
    return c;
  }

  /**
   * Opens a case using Provably Fair weighted RNG & creates the horizontal roulette strip
   */
  async openCase(userId: string, caseSlug: string, userClientSeed?: string) {
    const c = await this.getCaseBySlug(caseSlug);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new BadRequestException('User not found');

    const casePrice = Number(c.priceCoins);
    const userBalance = Number(user.balanceCoins);

    if (userBalance < casePrice) {
      throw new BadRequestException('Tangalar yetarli emas! Hisobingizni to\'ldiring.');
    }

    if (!c.items || c.items.length === 0) {
      throw new BadRequestException('Kase ichida personajlar mavjud emas.');
    }

    // Provably Fair Seeds
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const clientSeed = userClientSeed || crypto.randomBytes(16).toString('hex');
    const combinedSeed = `${serverSeed}:${clientSeed}`;
    const hash = crypto.createHash('sha256').update(combinedSeed).digest('hex');

    // Calculate total weights
    const totalWeight = c.items.reduce((sum, ci) => sum + ci.weight, 0);

    // Derive deterministic roll from SHA-256 hash (first 8 hex chars -> float 0..1)
    const subHash = hash.substring(0, 8);
    const randomInt = parseInt(subHash, 16);
    const roll = (randomInt / 0xffffffff) * totalWeight;

    // Pick winning item
    let currentWeight = 0;
    let winningCaseItem = c.items[0];

    for (const ci of c.items) {
      currentWeight += ci.weight;
      if (roll <= currentWeight) {
        winningCaseItem = ci;
        break;
      }
    }

    const wonItem = winningCaseItem.item;

    // Execute transaction: deduct coins, add inventory item, record game session
    const [updatedUser, inventoryItem] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          balanceCoins: { decrement: casePrice },
        },
      }),
      this.prisma.inventoryItem.create({
        data: {
          userId,
          itemId: wonItem.id,
          status: 'INVENTORY',
          acquiredFrom: 'CASE_OPEN',
        },
        include: { item: true },
      }),
      this.prisma.gameSession.create({
        data: {
          userId,
          gameType: 'CASE_OPEN',
          betAmount: casePrice,
          winAmount: wonItem.priceCoins,
          multiplier: Number(wonItem.priceCoins) / casePrice,
          serverSeed,
          clientSeed,
          sha256Hash: hash,
          gameDataJson: JSON.stringify({
            caseSlug,
            wonItemId: wonItem.id,
            wonItemName: wonItem.name,
          }),
        },
      }),
    ]);

    // Build 50-item roulette reel for smooth 60fps GSAP animation
    // Winning item is placed at slot 38 (reel index 38)
    const WINNING_SLOT_INDEX = 38;
    const reelItems: any[] = [];
    const allItems = c.items.map((ci) => ci.item);

    for (let i = 0; i < 50; i++) {
      if (i === WINNING_SLOT_INDEX) {
        reelItems.push(wonItem);
      } else {
        const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
        reelItems.push(randomItem);
      }
    }

    return {
      success: true,
      winningIndex: WINNING_SLOT_INDEX,
      wonItem,
      inventoryItemId: inventoryItem.id,
      newBalance: updatedUser.balanceCoins,
      reelItems,
      fairness: {
        serverSeed,
        clientSeed,
        hash,
      },
    };
  }
}
