const prisma = require('../config/database');

/**
 * Get the current primary competition and evaluate server-authoritative timer
 */
async function getCurrentCompetition() {
  let comp = await prisma.competition.findFirst({
    where: {
      status: {
        in: ['ACTIVE', 'UPCOMING', 'COMPLETED'],
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!comp) {
    // If no competition exists at all, create a default one
    comp = await prisma.competition.create({
      data: {
        name: 'CodeSprint 2026',
        description: 'College-level Code Sprint Coding Competition',
        duration: 120, // 2 hours default
        status: 'ACTIVE',
        startTime: new Date(),
        endTime: new Date(Date.now() + 120 * 60 * 1000),
      },
    });
  }

  const now = new Date();

  // If marked ACTIVE but endTime has passed, auto-complete it
  if (comp.status === 'ACTIVE' && comp.endTime && now > new Date(comp.endTime)) {
    comp = await prisma.competition.update({
      where: { id: comp.id },
      data: { status: 'COMPLETED' },
    });
  }

  // Calculate remaining time in seconds
  let remainingSeconds = 0;
  if (comp.status === 'ACTIVE' && comp.endTime) {
    const diffMs = new Date(comp.endTime).getTime() - now.getTime();
    remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
  } else if (comp.status === 'UPCOMING') {
    remainingSeconds = comp.duration * 60;
  }

  return {
    ...comp,
    remainingSeconds,
    serverTime: now.toISOString(),
    isSubmissionAllowed: comp.status === 'ACTIVE' && remainingSeconds > 0,
  };
}

module.exports = {
  getCurrentCompetition,
};
