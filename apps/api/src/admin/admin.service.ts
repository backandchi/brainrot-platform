import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Rarity } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // BRAINROT ITEMS CRUD
  // ==========================================
  async getAllItems() {
    return this.prisma.item.findMany({
      orderBy: { priceCoins: 'asc' },
    });
  }

  async createBrainrotItem(data: {
    name: string;
    slug: string;
    rarity: Rarity;
    priceCoins: number;
    yieldPerHour: number;
    imageUrl: string;
    glowColor: string; // e.g. '#eab308' for Gold, '#ef4444' for Red, etc.
  }) {
    const existing = await this.prisma.item.findUnique({ where: { slug: data.slug } });
    if (existing) throw new BadRequestException('Bu slug bilan personaj allaqachon mavjud');

    return this.prisma.item.create({
      data: {
        name: data.name,
        slug: data.slug,
        rarity: data.rarity,
        priceCoins: data.priceCoins,
        yieldPerHour: data.yieldPerHour,
        imageUrl: data.imageUrl,
        glowColor: data.glowColor || '#3b82f6',
      },
    });
  }

  async updateBrainrotItem(id: string, data: any) {
    return this.prisma.item.update({
      where: { id },
      data,
    });
  }

  async deleteBrainrotItem(id: string) {
    return this.prisma.item.delete({ where: { id } });
  }

  // ==========================================
  // CASES CRUD
  // ==========================================
  async createCase(data: {
    name: string;
    slug: string;
    category?: string;
    priceCoins: number;
    imageUrl: string;
    rtpPercentage?: number;
    items: { itemId: string; weight: number; dropChance: number }[];
  }) {
    const existing = await this.prisma.case.findUnique({ where: { slug: data.slug } });
    if (existing) throw new BadRequestException('Bu slug bilan keys allaqachon mavjud');

    return this.prisma.case.create({
      data: {
        name: data.name,
        slug: data.slug,
        category: data.category || 'thematic',
        priceCoins: data.priceCoins,
        imageUrl: data.imageUrl,
        rtpPercentage: data.rtpPercentage || 95.0,
        items: {
          create: data.items.map((i) => ({
            itemId: i.itemId,
            weight: i.weight,
            dropChance: i.dropChance,
          })),
        },
      },
      include: { items: { include: { item: true } } },
    });
  }

  async updateCaseRtp(caseId: string, rtpPercentage: number) {
    return this.prisma.case.update({
      where: { id: caseId },
      data: { rtpPercentage },
    });
  }

  // ==========================================
  // PENDING TRADES LIST
  // ==========================================
  async getPendingTrades() {
    return this.prisma.tradeRequest.findMany({
      where: { status: { in: ['PENDING', 'APPROVED'] } },
      include: {
        user: true,
        items: { include: { item: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
