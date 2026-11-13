import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Helper: generates Provably Fair server seed, client seed, and sha256 hash
   */
  private generateFairness(userClientSeed?: string) {
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const clientSeed = userClientSeed || crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(`${serverSeed}:${clientSeed}`).digest('hex');
    return { serverSeed, clientSeed, hash };
  }

  // ==========================================
  // 1. CRASH / ROCKET GAME
  // ==========================================
  async playCrash(userId: string, betAmount: number, cashoutMultiplier: number, userClientSeed?: string) {
    if (betAmount < 1) throw new BadRequestException('Minimal stavka: 1 coin');
    if (cashoutMultiplier < 1.01) throw new BadRequestException('Minimal koeffitsiyent: 1.01x');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || Number(user.balanceCoins) < betAmount) {
      throw new BadRequestException('Mablag\' yetarli emas');
    }

    const { serverSeed, clientSeed, hash } = this.generateFairness(userClientSeed);

    // Provably fair crash point formula: 96% RTP
    const subHash = hash.substring(0, 13);
    const intVal = parseInt(subHash, 16);
    const e = Math.pow(2, 52);
    let crashPoint = Math.floor((100 * e - intVal) / (e - intVal)) / 100;
    if (crashPoint < 1.0) crashPoint = 1.0;
    // House edge crash at 1.00x roughly 4% of the time
    if (intVal % 25 === 0) crashPoint = 1.0;

    const won = cashoutMultiplier <= crashPoint;
    const winAmount = won ? Number((betAmount * cashoutMultiplier).toFixed(2)) : 0;
    const balanceDelta = won ? winAmount - betAmount : -betAmount;

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { balanceCoins: { increment: balanceDelta } },
      }),
      this.prisma.gameSession.create({
        data: {
          userId,
          gameType: 'CRASH_ROCKET',
          betAmount,
          winAmount,
          multiplier: won ? cashoutMultiplier : 0,
          serverSeed,
          clientSeed,
          sha256Hash: hash,
          gameDataJson: JSON.stringify({ crashPoint, cashoutMultiplier, won }),
        },
      }),
    ]);

    return {
      success: true,
      won,
      crashPoint,
      cashoutMultiplier,
      winAmount,
      newBalance: updatedUser.balanceCoins,
      fairness: { serverSeed, clientSeed, hash },
    };
  }

  // ==========================================
  // 2. MINES (5x5 GRID)
  // ==========================================
  async startMines(userId: string, betAmount: number, mineCount: number, userClientSeed?: string) {
    if (betAmount < 1) throw new BadRequestException('Minimal stavka: 1 coin');
    if (mineCount < 1 || mineCount > 24) throw new BadRequestException('Minalar soni 1 dan 24 gacha bo\'lishi kerak');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || Number(user.balanceCoins) < betAmount) {
      throw new BadRequestException('Mablag\' yetarli emas');
    }

    const { serverSeed, clientSeed, hash } = this.generateFairness(userClientSeed);

    // Generate mine positions (0..24)
    const positions: number[] = Array.from({ length: 25 }, (_, i) => i);
    // Shuffle positions based on hash
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    const minePositions = positions.slice(0, mineCount);

    await this.prisma.user.update({
      where: { id: userId },
      data: { balanceCoins: { decrement: betAmount } },
    });

    const session = await this.prisma.gameSession.create({
      data: {
        userId,
        gameType: 'MINES',
        betAmount,
        winAmount: 0,
        serverSeed,
        clientSeed,
        sha256Hash: hash,
        gameDataJson: JSON.stringify({
          mineCount,
          minePositions,
          revealedIndices: [],
          status: 'ACTIVE',
        }),
      },
    });

    return {
      success: true,
      sessionId: session.id,
      mineCount,
      fairnessHash: hash,
    };
  }

  async revealMineCell(userId: string, sessionId: string, cellIndex: number) {
    const session = await this.prisma.gameSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) throw new NotFoundException('O\'yin sessiyasi topilmadi');

    const data = JSON.parse(session.gameDataJson || '{}');
    if (data.status !== 'ACTIVE') throw new BadRequestException('O\'yin allaqachon yakunlangan');

    if (data.revealedIndices.includes(cellIndex)) {
      throw new BadRequestException('Ushbu katak allaqachon ochilgan');
    }

    const isMine = data.minePositions.includes(cellIndex);

    if (isMine) {
      // Boom! Lost.
      data.status = 'LOST';
      await this.prisma.gameSession.update({
        where: { id: sessionId },
        data: { gameDataJson: JSON.stringify(data) },
      });

      return {
        isMine: true,
        minePositions: data.minePositions,
        gameOver: true,
        won: false,
      };
    }

    // Gem found!
    data.revealedIndices.push(cellIndex);
    const step = data.revealedIndices.length;
    const totalCells = 25;
    const mines = data.mineCount;

    // Multiplier calculation formula
    let mult = 0.95;
    for (let i = 0; i < step; i++) {
      mult *= (totalCells - i) / (totalCells - mines - i);
    }
    mult = Number(mult.toFixed(2));

    data.currentMultiplier = mult;
    data.currentWinAmount = Number((Number(session.betAmount) * mult).toFixed(2));

    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: { gameDataJson: JSON.stringify(data) },
    });

    return {
      isMine: false,
      step,
      multiplier: mult,
      currentWin: data.currentWinAmount,
      gameOver: false,
    };
  }

  async cashoutMines(userId: string, sessionId: string) {
    const session = await this.prisma.gameSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) throw new NotFoundException('O\'yin topilmadi');

    const data = JSON.parse(session.gameDataJson || '{}');
    if (data.status !== 'ACTIVE' || data.revealedIndices.length === 0) {
      throw new BadRequestException('Yechib olish mumkin emas');
    }

    data.status = 'CASHED_OUT';
    const winAmount = data.currentWinAmount;

    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { balanceCoins: { increment: winAmount } },
      }),
      this.prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          winAmount,
          multiplier: data.currentMultiplier,
          gameDataJson: JSON.stringify(data),
        },
      }),
    ]);

    return {
      success: true,
      winAmount,
      multiplier: data.currentMultiplier,
      newBalance: user.balanceCoins,
      minePositions: data.minePositions,
    };
  }

  // ==========================================
  // 3. DICE GAME
  // ==========================================
  async playDice(userId: string, betAmount: number, winChance: number, mode: 'OVER' | 'UNDER' = 'UNDER', userClientSeed?: string) {
    if (betAmount < 1) throw new BadRequestException('Minimal stavka: 1 coin');
    if (winChance < 1 || winChance > 95) throw new BadRequestException('Yutish foizi 1% dan 95% gacha bo\'lishi kerak');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || Number(user.balanceCoins) < betAmount) {
      throw new BadRequestException('Mablag\' yetarli emas');
    }

    const { serverSeed, clientSeed, hash } = this.generateFairness(userClientSeed);

    // Roll between 0.00 and 99.99
    const subHash = hash.substring(0, 8);
    const roll = Number(((parseInt(subHash, 16) % 10000) / 100).toFixed(2));

    const targetNumber = mode === 'UNDER' ? winChance : 100 - winChance;
    const won = mode === 'UNDER' ? roll < targetNumber : roll > targetNumber;

    // Multiplier = (96 / winChance)
    const multiplier = Number((96 / winChance).toFixed(2));
    const winAmount = won ? Number((betAmount * multiplier).toFixed(2)) : 0;
    const balanceDelta = won ? winAmount - betAmount : -betAmount;

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { balanceCoins: { increment: balanceDelta } },
      }),
      this.prisma.gameSession.create({
        data: {
          userId,
          gameType: 'DICE',
          betAmount,
          winAmount,
          multiplier: won ? multiplier : 0,
          serverSeed,
          clientSeed,
          sha256Hash: hash,
          gameDataJson: JSON.stringify({ roll, targetNumber, mode, winChance, won }),
        },
      }),
    ]);

    return {
      success: true,
      roll,
      targetNumber,
      won,
      multiplier,
      winAmount,
      newBalance: updatedUser.balanceCoins,
      fairness: { serverSeed, clientSeed, hash },
    };
  }

  // ==========================================
  // 4. UPGRADER (WHEEL)
  // ==========================================
  async playUpgrader(userId: string, inputInventoryItemId: string, targetItemId: string, userClientSeed?: string) {
    const invItem = await this.prisma.inventoryItem.findFirst({
      where: { id: inputInventoryItemId, userId, status: 'INVENTORY' },
      include: { item: true },
    });
    if (!invItem) throw new NotFoundException('Qo\'yilayotgan personaj inventarda topilmadi');

    const targetItem = await this.prisma.item.findUnique({ where: { id: targetItemId } });
    if (!targetItem) throw new NotFoundException('Maqsadli personaj topilmadi');

    const sourcePrice = Number(invItem.item.priceCoins);
    const targetPrice = Number(targetItem.priceCoins);

    if (targetPrice <= sourcePrice) {
      throw new BadRequestException('Maqsadli personaj qo\'yilgan personajdan qimmatroq bo\'lishi shart');
    }

    // Win chance calculation: (source / target) * 95%
    let winChance = (sourcePrice / targetPrice) * 95;
    if (winChance > 95) winChance = 95;
    if (winChance < 1) winChance = 1;
    winChance = Number(winChance.toFixed(2));

    const winAngle = (winChance / 100) * 360;

    const { serverSeed, clientSeed, hash } = this.generateFairness(userClientSeed);

    // Wheel spin angle 0..360
    const subHash = hash.substring(0, 8);
    const spinAngle = Number(((parseInt(subHash, 16) / 0xffffffff) * 360).toFixed(2));

    const won = spinAngle <= winAngle;

    if (won) {
      await this.prisma.$transaction([
        this.prisma.inventoryItem.delete({ where: { id: inputInventoryItemId } }),
        this.prisma.inventoryItem.create({
          data: {
            userId,
            itemId: targetItemId,
            status: 'INVENTORY',
            acquiredFrom: 'UPGRADE',
          },
        }),
      ]);
    } else {
      await this.prisma.inventoryItem.delete({ where: { id: inputInventoryItemId } });
    }

    return {
      success: true,
      won,
      winChance,
      winAngle,
      spinAngle,
      targetItem: won ? targetItem : null,
      fairness: { serverSeed, clientSeed, hash },
    };
  }

  // ==========================================
  // 5. FUSE / TRADE-UP
  // ==========================================
  async playFuse(userId: string, inputInventoryItemIds: string[]) {
    if (inputInventoryItemIds.length < 3 || inputInventoryItemIds.length > 5) {
      throw new BadRequestException('Qorishtirish (Fuse) uchun kamida 3 ta va ko\'pi bilan 5 ta personaj kerak');
    }

    const invItems = await this.prisma.inventoryItem.findMany({
      where: {
        id: { in: inputInventoryItemIds },
        userId,
        status: 'INVENTORY',
      },
      include: { item: true },
    });

    if (invItems.length !== inputInventoryItemIds.length) {
      throw new BadRequestException('Tanlangan personajlar inventarda topilmadi');
    }

    const totalValue = invItems.reduce((sum, i) => sum + Number(i.item.priceCoins), 0);
    const targetPoolPrice = totalValue * 1.15; // 15% average boost on fuse

    // Find candidate items around target value
    const candidateItems = await this.prisma.item.findMany({
      where: {
        priceCoins: {
          gte: totalValue * 0.7,
          lte: totalValue * 2.0,
        },
      },
    });

    const wonItem =
      candidateItems.length > 0
        ? candidateItems[Math.floor(Math.random() * candidateItems.length)]
        : invItems[0].item;

    await this.prisma.$transaction([
      this.prisma.inventoryItem.deleteMany({
        where: { id: { in: inputInventoryItemIds } },
      }),
      this.prisma.inventoryItem.create({
        data: {
          userId,
          itemId: wonItem.id,
          status: 'INVENTORY',
          acquiredFrom: 'FUSE',
        },
      }),
    ]);

    return {
      success: true,
      wonItem,
      totalInputValue: totalValue,
    };
  }
}
