import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting WePlay-Pro Phase 1 Clean Reset Database Seeding...');

  // 1. Authentic WePlay Titles (Matching Screenshot)
  const titlesData = [
    {
      name: 'All Eyes On',
      rarityTier: 'MYTHIC',
      bgGradientStart: '#8A2387',
      bgGradientEnd: '#E94057',
      textColor: '#FFFFFF',
      iconUrl: '👑',
      minLevel: 25,
      isActive: true,
    },
    {
      name: 'Richie Rich',
      rarityTier: 'LEGENDARY',
      bgGradientStart: '#FFD700',
      bgGradientEnd: '#FF8C00',
      textColor: '#FFFFFF',
      iconUrl: '👑',
      minLevel: 10,
      isActive: true,
    },
    {
      name: 'High Noble',
      rarityTier: 'EPIC',
      bgGradientStart: '#1D4ED8',
      bgGradientEnd: '#38BDF8',
      textColor: '#FFFFFF',
      iconUrl: '🐆',
      minLevel: 15,
      isActive: true,
    },
    {
      name: 'VIP Premium VIP',
      rarityTier: 'RARE',
      bgGradientStart: '#44403C',
      bgGradientEnd: '#78716C',
      textColor: '#FFFFFF',
      iconUrl: '💎',
      minLevel: 5,
      isActive: true,
    },
    {
      name: 'JF ✈️ جت',
      rarityTier: 'EPIC',
      bgGradientStart: '#0F172A',
      bgGradientEnd: '#334155',
      textColor: '#FFFFFF',
      iconUrl: '✈️',
      minLevel: 20,
      isActive: true,
    },
    {
      name: 'Shining King',
      rarityTier: 'LEGENDARY',
      bgGradientStart: '#7C3AED',
      bgGradientEnd: '#A855F7',
      textColor: '#FFFFFF',
      iconUrl: '👑',
      minLevel: 30,
      isActive: true,
    },
    {
      name: 'Noble',
      rarityTier: 'RARE',
      bgGradientStart: '#292524',
      bgGradientEnd: '#57534E',
      textColor: '#FFFFFF',
      iconUrl: '🦁',
      minLevel: 10,
      isActive: true,
    },
    {
      name: 'Dream Weaver',
      rarityTier: 'EPIC',
      bgGradientStart: '#6366F1',
      bgGradientEnd: '#A855F7',
      textColor: '#FFFFFF',
      iconUrl: '🌪️',
      minLevel: 18,
      isActive: true,
    },
    {
      name: 'Gold Overlord',
      rarityTier: 'MYTHIC',
      bgGradientStart: '#831843',
      bgGradientEnd: '#BE185D',
      textColor: '#FFFFFF',
      iconUrl: '💰',
      minLevel: 50,
      isActive: true,
    },
    {
      name: 'PK King',
      rarityTier: 'LEGENDARY',
      bgGradientStart: '#991B1B',
      bgGradientEnd: '#EF4444',
      textColor: '#FFFFFF',
      iconUrl: '🏆',
      minLevel: 40,
      isActive: true,
    },
    {
      name: 'PK Eternal Crown',
      rarityTier: 'MYTHIC',
      bgGradientStart: '#78350F',
      bgGradientEnd: '#D97706',
      textColor: '#FFFFFF',
      iconUrl: '👑',
      minLevel: 60,
      isActive: true,
    },
    {
      name: 'Best Player',
      rarityTier: 'LEGENDARY',
      bgGradientStart: '#B45309',
      bgGradientEnd: '#F59E0B',
      textColor: '#FFFFFF',
      iconUrl: '🤵',
      minLevel: 35,
      isActive: true,
    },
  ];

  const createdTitles: Record<string, any> = {};
  for (const t of titlesData) {
    const title = await prisma.title.upsert({
      where: { name: t.name },
      update: t,
      create: t,
    });
    createdTitles[t.name] = title;
  }
  console.log(`[Seed] Seeded ${Object.keys(createdTitles).length} authentic Titles.`);

  // 2. Authentic WePlay Badges (Matching Screenshot)
  const badgesData = [
    { name: 'Castle Guard', category: 'HONOR', shape: 'SHIELD', badgeBgColor: '#DC2626', iconUrl: '🏰', minLevel: 1 },
    { name: 'Shooting Star', category: 'EVENT', shape: 'RIBBON', badgeBgColor: '#F59E0B', iconUrl: '⭐', minLevel: 5 },
    { name: 'Aviation Ace', category: 'ACTIVITY', shape: 'HEXAGON', badgeBgColor: '#0284C7', iconUrl: '✈️', minLevel: 10 },
    { name: 'Violet Crest', category: 'WEALTH', shape: 'WINGS', badgeBgColor: '#7C3AED', iconUrl: '💎', minLevel: 20 },
    { name: 'Imperial Crown', category: 'HONOR', shape: 'LAUREL', badgeBgColor: '#2563EB', iconUrl: '👑', minLevel: 30 },
    { name: 'Rocket Master', category: 'GAMING', shape: 'SHIELD', badgeBgColor: '#EA580C', iconUrl: '🚀', minLevel: 15 },
    { name: 'Speed Cruiser', category: 'ACTIVITY', shape: 'HEXAGON', badgeBgColor: '#E11D48', iconUrl: '🏎️', minLevel: 25 },
    { name: 'Golden Compass', category: 'TALENT', shape: 'WINGS', badgeBgColor: '#CA8A04', iconUrl: '🧭', minLevel: 40 },
    { name: 'Fortune Sack', category: 'WEALTH', shape: 'LAUREL', badgeBgColor: '#EAB308', iconUrl: '💰', minLevel: 50 },
  ];

  const createdBadges: Record<string, any> = {};
  for (const b of badgesData) {
    const badge = await prisma.badge.upsert({
      where: { name: b.name },
      update: b,
      create: b,
    });
    createdBadges[b.name] = badge;
  }
  console.log(`[Seed] Seeded ${Object.keys(createdBadges).length} authentic Badges.`);

  // 3. Superadmin Account (Level 88, 8-Digit ID: 48941316 from Screenshot)
  const adminEmail = 'admin@weplay.pro';
  const adminUsername = 'superadmin';
  const rawAdminPassword = 'AdminPassword123!';
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash(rawAdminPassword, salt);

  const superadmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      displayId: '48941316',
      username: adminUsername,
      role: Role.superadmin,
      passwordHash: adminPasswordHash,
      coinsBalance: 1000000n,
      charmPoints: 200000n,
      expPoints: 125000n,
      activeLevel: 88,
      blessingPoints: 8888n,
      signature: 'WePlay Official Platform Architect & Master 👑',
      region: 'Pakistan',
      gender: 'MALE',
      isBanned: false,
    },
    create: {
      displayId: '48941316',
      username: adminUsername,
      email: adminEmail,
      role: Role.superadmin,
      passwordHash: adminPasswordHash,
      coinsBalance: 1000000n,
      charmPoints: 200000n,
      expPoints: 125000n,
      activeLevel: 88,
      blessingPoints: 8888n,
      signature: 'WePlay Official Platform Architect & Master 👑',
      region: 'Pakistan',
      gender: 'MALE',
      isBanned: false,
    },
  });
  console.log(`[Seed] Superadmin configured: ${superadmin.email} (ID: ${superadmin.displayId}, Level: ${superadmin.activeLevel})`);

  // 4. Initial Families ("NARCOS" & "TJFONIX")
  const narcosFamily = await prisma.family.upsert({
    where: { name: 'NARCOS' },
    update: {
      badgeTag: 'NARCOS',
      badgeBgColor: '#7928CA',
      badgeTextColor: '#FFFFFF',
      level: 5,
      ownerId: superadmin.id,
    },
    create: {
      name: 'NARCOS',
      badgeTag: 'NARCOS',
      badgeBgColor: '#7928CA',
      badgeTextColor: '#FFFFFF',
      level: 5,
      ownerId: superadmin.id,
    },
  });

  const tjfonixFamily = await prisma.family.upsert({
    where: { name: 'TJFONIX' },
    update: {
      badgeTag: 'TJFONIX',
      badgeBgColor: '#0070F3',
      badgeTextColor: '#FFFFFF',
      level: 4,
      ownerId: superadmin.id,
    },
    create: {
      name: 'TJFONIX',
      badgeTag: 'TJFONIX',
      badgeBgColor: '#0070F3',
      badgeTextColor: '#FFFFFF',
      level: 4,
      ownerId: superadmin.id,
    },
  });

  // Assign Superadmin to TJFONIX family (matches user's screenshot)
  await prisma.user.update({
    where: { id: superadmin.id },
    data: { familyId: tjfonixFamily.id },
  });
  console.log(`[Seed] Seeded Families: NARCOS and TJFONIX`);

  // 5. Equip Superadmin Title & Badges
  const allEyesOn = createdTitles['All Eyes On'];
  if (allEyesOn) {
    await prisma.userTitle.upsert({
      where: {
        userId_titleId: {
          userId: superadmin.id,
          titleId: allEyesOn.id,
        },
      },
      update: { isEquipped: true },
      create: {
        userId: superadmin.id,
        titleId: allEyesOn.id,
        isEquipped: true,
      },
    });
  }

  // Grant all badges to superadmin
  for (const b of Object.values(createdBadges)) {
    await prisma.userBadge.upsert({
      where: {
        userId_badgeId: {
          userId: superadmin.id,
          badgeId: b.id,
        },
      },
      update: {},
      create: {
        userId: superadmin.id,
        badgeId: b.id,
      },
    });
  }

  // Purge any soft-deleted demo records before seeding
  await prisma.user.deleteMany({
    where: {
      isDeleted: true,
    },
  });

  // 6. Demo Players
  const demoUsers = [
    {
      displayId: '10293847',
      username: 'player_one',
      email: 'player1@weplay.pro',
      password: 'password123',
      coinsBalance: 15000n,
      charmPoints: 3500n,
      expPoints: 8000n,
      activeLevel: 25,
      blessingPoints: 500n,
      familyId: narcosFamily.id,
      gender: 'MALE',
      signature: 'Party gamer looking for voice rooms! 🎮',
    },
    {
      displayId: '59382014',
      username: 'player_two',
      email: 'player2@weplay.pro',
      password: 'password123',
      coinsBalance: 5000n,
      charmPoints: 600n,
      expPoints: 2000n,
      activeLevel: 12,
      familyId: tjfonixFamily.id,
      gender: 'FEMALE',
      signature: 'Singing and talking all night ✨',
    },
  ];

  for (const du of demoUsers) {
    const passwordHash = await bcrypt.hash(du.password, salt);
    const user = await prisma.user.upsert({
      where: { email: du.email },
      update: {
        displayId: du.displayId,
        username: du.username,
        passwordHash,
        coinsBalance: du.coinsBalance,
        charmPoints: du.charmPoints,
        expPoints: du.expPoints,
        activeLevel: du.activeLevel,
        blessingPoints: du.blessingPoints,
        familyId: du.familyId,
        gender: du.gender,
        signature: du.signature,
      },
      create: {
        displayId: du.displayId,
        username: du.username,
        email: du.email,
        passwordHash,
        role: Role.user,
        coinsBalance: du.coinsBalance,
        charmPoints: du.charmPoints,
        expPoints: du.expPoints,
        activeLevel: du.activeLevel,
        blessingPoints: du.blessingPoints,
        familyId: du.familyId,
        gender: du.gender,
        signature: du.signature,
      },
    });

    if (du.username === 'player_one' && createdTitles['Richie Rich']) {
      await prisma.userTitle.upsert({
        where: {
          userId_titleId: {
            userId: user.id,
            titleId: createdTitles['Richie Rich'].id,
          },
        },
        update: { isEquipped: true },
        create: {
          userId: user.id,
          titleId: createdTitles['Richie Rich'].id,
          isEquipped: true,
        },
      });
    }
  }

  console.log('[Seed] Demo players created successfully.');
  console.log('====================================================');
  console.log('Superadmin Login: admin@weplay.pro / AdminPassword123! (ID: 48941316)');
  console.log('Player 1 Login  : player1@weplay.pro / password123 (ID: 10293847)');
  console.log('Player 2 Login  : player2@weplay.pro / password123 (ID: 59382014)');
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
