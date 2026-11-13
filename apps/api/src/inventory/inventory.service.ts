import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getUserInventory(userId: string) {
    return this.prisma.inventoryItem.findMany({
      where: {
        userId,
        status: 'INVENTORY',
      },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Sell a single item from inventory for coins
   */
  async sellItem(userId: string, inventoryItemId: string) {
    const invItem = await this.prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, userId, status: 'INVENTORY' },
      include: { item: true },
    });
    if (!invItem) throw new NotFoundException('Item not found in inventory');

    const sellPrice = Number(invItem.item.priceCoins);

    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { balanceCoins: { increment: sellPrice } },
      }),
      this.prisma.inventoryItem.delete({
        where: { id: inventoryItemId },
      }),
    ]);

    return {
      success: true,
      soldPrice: sellPrice,
      newBalance: user.balanceCoins,
    };
  }

  /**
   * Sell all items in inventory in one click ("Sell All" button)
   */
  async sellAllItems(userId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { userId, status: 'INVENTORY' },
      include: { item: true },
    });

    if (items.length === 0) {
      throw new BadRequestException('Sotish uchun inventarda personajlar yo\'q');
    }

    const totalCoins = items.reduce((sum, i) => sum + Number(i.item.priceCoins), 0);
    const itemIds = items.map((i) => i.id);

    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { balanceCoins: { increment: totalCoins } },
      }),
      this.prisma.inventoryItem.deleteMany({
        where: { id: { in: itemIds } },
      }),
    ]);

    return {
      success: true,
      countSold: items.length,
      totalCoins,
      newBalance: user.balanceCoins,
    };
  }

  /**
   * Staking a Brainrot into the Farm room slot for passive income
   */
  async stakeToFarm(userId: string, inventoryItemId: string, plotIndex: number) {
    if (plotIndex < 0 || plotIndex > 15) {
      throw new BadRequestException('Fermadagi slot indeksi noto\'g\'ri (0-15)');
    }

    const invItem = await this.prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, userId, status: 'INVENTORY' },
      include: { item: true },
    });
    if (!invItem) throw new NotFoundException('Item not available in inventory');

    // Check if plot is occupied
    const existingPlot = await this.prisma.farmPlot.findUnique({
      where: { userId_plotIndex: { userId, plotIndex } },
    });
    if (existingPlot) {
      throw new BadRequestException('Ushbu xona/slot allaqachon band');
    }

    const [farmPlot] = await this.prisma.$transaction([
      this.prisma.farmPlot.create({
        data: {
          userId,
          plotIndex,
          inventoryItemId,
          lastHarvestAt: new Date(),
        },
        include: {
          inventoryItem: { include: { item: true } },
        },
      }),
      this.prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { status: 'FARM_STAKED' },
      }),
    ]);

    return {
      success: true,
      farmPlot,
    };
  }

  /**
   * Unstake a Brainrot from the Farm back to the Inventory
   */
  async unstakeFromFarm(userId: string, plotIndex: number) {
    const plot = await this.prisma.farmPlot.findUnique({
      where: { userId_plotIndex: { userId, plotIndex } },
      include: { inventoryItem: { include: { item: true } } },
    });
    if (!plot) throw new NotFoundException('Ushbu slotda personaj yo\'q');

    // First collect pending yield
    const now = new Date();
    const elapsedHours = (now.getTime() - plot.lastHarvestAt.getTime()) / (1000 * 60 * 60);
    const earnedCoins = elapsedHours * Number(plot.inventoryItem.item.yieldPerHour);

    await this.prisma.$transaction([
      this.prisma.farmPlot.delete({
        where: { id: plot.id },
      }),
      this.prisma.inventoryItem.update({
        where: { id: plot.inventoryItemId },
        data: { status: 'INVENTORY' },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { balanceCoins: { increment: Math.max(0, earnedCoins) } },
      }),
    ]);

    return {
      success: true,
      earnedCoins: Number(earnedCoins.toFixed(2)),
    };
  }

  /**
   * Harvest all farm plots and collect accrued passive yield coins
   */
  async harvestFarm(userId: string) {
    const plots = await this.prisma.farmPlot.findMany({
      where: { userId },
      include: {
        inventoryItem: { include: { item: true } },
      },
    });

    if (plots.length === 0) {
      throw new BadRequestException('Fermangizda hech qanday personaj joylashtirilmagan');
    }

    const now = new Date();
    let totalHarvestCoins = 0;
    const plotUpdates: any[] = [];

    for (const p of plots) {
      const elapsedHours = (now.getTime() - p.lastHarvestAt.getTime()) / (1000 * 60 * 60);
      const yieldRate = Number(p.inventoryItem.item.yieldPerHour);
      const earned = elapsedHours * yieldRate;
      totalHarvestCoins += earned;

      plotUpdates.push(
        this.prisma.farmPlot.update({
          where: { id: p.id },
          data: { lastHarvestAt: now },
        }),
      );
    }

    totalHarvestCoins = Number(totalHarvestCoins.toFixed(2));

    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { balanceCoins: { increment: totalHarvestCoins } },
      }),
      ...plotUpdates,
    ]);

    return {
      success: true,
      harvestedCoins: totalHarvestCoins,
      newBalance: user.balanceCoins,
    };
  }
}
