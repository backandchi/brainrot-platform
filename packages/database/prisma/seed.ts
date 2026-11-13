import { PrismaClient, Rarity } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Brainrot Platform Database...');

  // 1. Seed Brainrot Characters (with realistic rarities, prices, glow colors, and yield rates)
  const brainrots = [
    {
      name: 'Noobini Pizzanini',
      slug: 'noobini-pizzanini',
      rarity: Rarity.COMMON,
      priceCoins: 15.0,
      yieldPerHour: 0.5,
      imageUrl: '/pets/noobini-pizzanini.webp',
      glowColor: '#3b82f6', // Blue
    },
    {
      name: 'Skibidi Toilet',
      slug: 'skibidi-toilet',
      rarity: Rarity.COMMON,
      priceCoins: 35.0,
      yieldPerHour: 1.2,
      imageUrl: '/pets/skibidi-toilet.webp',
      glowColor: '#3b82f6', // Blue
    },
    {
      name: 'Grimace Shake',
      slug: 'grimace-shake',
      rarity: Rarity.RARE,
      priceCoins: 85.0,
      yieldPerHour: 3.5,
      imageUrl: '/pets/grimace-shake.webp',
      glowColor: '#10b981', // Green
    },
    {
      name: 'Mewing Cat',
      slug: 'mewing-cat',
      rarity: Rarity.RARE,
      priceCoins: 150.0,
      yieldPerHour: 6.0,
      imageUrl: '/pets/mewing-cat.webp',
      glowColor: '#06b6d4', // Cyan
    },
    {
      name: 'Baby Gronk',
      slug: 'baby-gronk',
      rarity: Rarity.EPIC,
      priceCoins: 350.0,
      yieldPerHour: 15.0,
      imageUrl: '/pets/baby-gronk.webp',
      glowColor: '#a855f7', // Purple
    },
    {
      name: 'Rizzler Supreme',
      slug: 'rizzler-supreme',
      rarity: Rarity.EPIC,
      priceCoins: 750.0,
      yieldPerHour: 35.0,
      imageUrl: '/pets/rizzler-supreme.webp',
      glowColor: '#c084fc', // Purple glow
    },
    {
      name: 'Sigma GigaChad',
      slug: 'sigma-gigachad',
      rarity: Rarity.LEGENDARY,
      priceCoins: 2000.0,
      yieldPerHour: 100.0,
      imageUrl: '/pets/sigma-gigachad.webp',
      glowColor: '#eab308', // Gold / Tillarang
    },
    {
      name: 'Tungsten Titan',
      slug: 'tungsten-titan',
      rarity: Rarity.MYTHIC,
      priceCoins: 5000.0,
      yieldPerHour: 300.0,
      imageUrl: '/pets/tungsten-titan.webp',
      glowColor: '#ef4444', // Red
    },
    {
      name: 'Trallalero Secret OG',
      slug: 'trallalero-og',
      rarity: Rarity.SECRET,
      priceCoins: 15000.0,
      yieldPerHour: 1000.0,
      imageUrl: '/pets/hydra-serpent-galaxy.webp',
      glowColor: '#ec4899', // Rainbow / OG Secret Glow
    },
  ];

  const createdItems: Record<string, any> = {};

  for (const b of brainrots) {
    const item = await prisma.item.upsert({
      where: { slug: b.slug },
      update: b,
      create: b,
    });
    createdItems[b.slug] = item;
  }
  console.log(`Created ${brainrots.length} Brainrot Items.`);

  // 2. Seed Cases
  const casesData = [
    {
      name: 'Starter Case',
      slug: 'starter-case',
      category: 'linear',
      priceCoins: 25.0,
      imageUrl: '/cases/starter-case.webp',
      rtpPercentage: 95.0,
      items: [
        { slug: 'noobini-pizzanini', weight: 65, dropChance: 65.0 },
        { slug: 'skibidi-toilet', weight: 25, dropChance: 25.0 },
        { slug: 'grimace-shake', weight: 8, dropChance: 8.0 },
        { slug: 'sigma-gigachad', weight: 2, dropChance: 2.0 },
      ],
    },
    {
      name: 'Sigma Case',
      slug: 'sigma-case',
      category: 'thematic',
      priceCoins: 150.0,
      imageUrl: '/cases/gold-case.webp',
      rtpPercentage: 94.0,
      items: [
        { slug: 'skibidi-toilet', weight: 45, dropChance: 45.0 },
        { slug: 'grimace-shake', weight: 30, dropChance: 30.0 },
        { slug: 'baby-gronk', weight: 15, dropChance: 15.0 },
        { slug: 'sigma-gigachad', weight: 8, dropChance: 8.0 },
        { slug: 'tungsten-titan', weight: 2, dropChance: 2.0 },
      ],
    },
    {
      name: 'All-In Rich Case',
      slug: 'rich-case',
      category: 'allin',
      priceCoins: 800.0,
      imageUrl: '/cases/rich-case.webp',
      rtpPercentage: 96.0,
      items: [
        { slug: 'baby-gronk', weight: 40, dropChance: 40.0 },
        { slug: 'rizzler-supreme', weight: 35, dropChance: 35.0 },
        { slug: 'sigma-gigachad', weight: 18, dropChance: 18.0 },
        { slug: 'trallalero-og', weight: 7, dropChance: 7.0 },
      ],
    },
    {
      name: 'OG Secret Mythic Case',
      slug: 'og-case',
      category: 'rarity',
      priceCoins: 3500.0,
      imageUrl: '/cases/og-case.webp',
      rtpPercentage: 97.0,
      items: [
        { slug: 'sigma-gigachad', weight: 55, dropChance: 55.0 },
        { slug: 'tungsten-titan', weight: 35, dropChance: 35.0 },
        { slug: 'trallalero-og', weight: 10, dropChance: 10.0 },
      ],
    },
  ];

  for (const c of casesData) {
    const createdCase = await prisma.case.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        category: c.category,
        priceCoins: c.priceCoins,
        imageUrl: c.imageUrl,
        rtpPercentage: c.rtpPercentage,
      },
      create: {
        name: c.name,
        slug: c.slug,
        category: c.category,
        priceCoins: c.priceCoins,
        imageUrl: c.imageUrl,
        rtpPercentage: c.rtpPercentage,
      },
    });

    for (const ci of c.items) {
      const item = createdItems[ci.slug];
      if (item) {
        await prisma.caseItem.upsert({
          where: {
            caseId_itemId: {
              caseId: createdCase.id,
              itemId: item.id,
            },
          },
          update: {
            weight: ci.weight,
            dropChance: ci.dropChance,
          },
          create: {
            caseId: createdCase.id,
            itemId: item.id,
            weight: ci.weight,
            dropChance: ci.dropChance,
          },
        });
      }
    }
  }
  console.log(`Created ${casesData.length} Cases with items.`);

  // 3. Seed Starter Quests
  const quests = [
    {
      title: 'Kanalga a\'zo bo\'lish',
      description: 'Rasmiy Telegram kanalimizga obuna bo\'ling va 50 coin oling',
      actionType: 'SUBSCRIBE_TELEGRAM',
      targetCount: 1,
      rewardCoins: 50.0,
      channelIdOrLink: '@FarmBrainrots_news',
    },
    {
      title: 'Birinchi keysni ochish',
      description: 'Istalgan bitta keysni oching',
      actionType: 'OPEN_CASES',
      targetCount: 1,
      rewardCoins: 25.0,
    },
    {
      title: 'Fermani ishga tushirish',
      description: 'Kamida bitta Brainrotni fermangizga joylang',
      actionType: 'STAKE_FARM',
      targetCount: 1,
      rewardCoins: 30.0,
    },
    {
      title: '3 ta do\'stni taklif qilish',
      description: 'O\'z referal havolangiz orqali 3 ta do\'stingizni taklif qiling',
      actionType: 'INVITE_3_FRIENDS',
      targetCount: 3,
      rewardCoins: 150.0,
    },
  ];

  for (const q of quests) {
    await prisma.quest.create({ data: q });
  }
  console.log(`Created ${quests.length} Quests.`);
  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
