const prisma = require('../config/database');
const { getCurrentCompetition } = require('./competitionService');

/**
 * Record a submission and award points for passed test cases
 * Tracks penalty time = seconds from contest start to submission
 * Uses Prisma transaction with unique constraint on [userId, problemId]
 */
async function processSubmissionResult({
  userId,
  problemId,
  sourceCode,
  language,
  verdict,
  passedTestCases,
  totalTestCases,
  executionTime,
  compilerOutput,
}) {
  // 1. Fetch Problem & Competition details outside of transaction to avoid timeout
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    select: { id: true, title: true, difficulty: true, points: true },
  });

  const problemPoints = problem?.points || 100;

  // Calculate score based on number of passed test cases
  let earnedPoints = 0;
  if (totalTestCases > 0 && passedTestCases > 0) {
    if (passedTestCases === totalTestCases) {
      earnedPoints = problemPoints;
    } else {
      // Partial points proportional to passed test cases
      earnedPoints = Math.round((problemPoints / totalTestCases) * passedTestCases);
    }
  }

  // Determine final submission status
  let finalStatus = verdict;
  if (verdict === 'ACCEPTED') {
    finalStatus = 'ACCEPTED';
  } else if (passedTestCases > 0 && passedTestCases < totalTestCases) {
    finalStatus = 'PARTIALLY_ACCEPTED';
  }

  // Compute Penalty Time from competition start
  const comp = await getCurrentCompetition();
  const contestStart = comp?.startTime || comp?.createdAt || new Date();
  const now = new Date();
  const penaltySeconds = Math.max(0, Math.floor((now.getTime() - new Date(contestStart).getTime()) / 1000));

  return await prisma.$transaction(
    async (tx) => {
      // 2. Always record submission in history
      const submission = await tx.submission.create({
        data: {
          userId,
          problemId,
          sourceCode,
          language,
          status: finalStatus,
          passedTestCases,
          totalTestCases,
          executionTime,
          compilerOutput,
        },
        include: {
          problem: {
            select: { id: true, title: true, difficulty: true, points: true },
          },
          user: {
            select: { id: true, username: true, teamName: true },
          },
        },
      });

      let isScoreIncrease = false;
      let netPointsAwarded = 0;
      let currentBestPoints = 0;

      // 3. Update or Create ProblemSolve record
      if (earnedPoints > 0) {
        const existingSolve = await tx.problemSolve.findUnique({
          where: {
            userId_problemId: {
              userId,
              problemId,
            },
          },
        });

        if (!existingSolve) {
          // First time earning points on this problem
          await tx.problemSolve.create({
            data: {
              userId,
              problemId,
              awardedPoints: earnedPoints,
              passedTestCases,
              totalTestCases,
              penaltySeconds,
              firstSolvedAt: now,
            },
          });
          isScoreIncrease = true;
          netPointsAwarded = earnedPoints;
          currentBestPoints = earnedPoints;
        } else if (earnedPoints > existingSolve.awardedPoints) {
          // Improved score on this problem! Update points and penalty time
          netPointsAwarded = earnedPoints - existingSolve.awardedPoints;
          await tx.problemSolve.update({
            where: {
              userId_problemId: {
                userId,
                problemId,
              },
            },
            data: {
              awardedPoints: earnedPoints,
              passedTestCases: Math.max(existingSolve.passedTestCases, passedTestCases),
              totalTestCases,
              penaltySeconds,
              firstSolvedAt: now,
            },
          });
          isScoreIncrease = true;
          currentBestPoints = earnedPoints;
        } else {
          // Solution passed fewer or equal test cases than previous best
          currentBestPoints = existingSolve.awardedPoints;
        }
      }

      return {
        submission,
        isScoreIncrease,
        awardedPoints: netPointsAwarded,
        earnedPoints,
        currentBestPoints,
        penaltySeconds,
      };
    },
    {
      maxWait: 10000,
      timeout: 30000,
    }
  );
}

/**
 * Calculate dynamic leaderboard:
 * Primary: Highest total points (DESC)
 * Tie-Breaker: Lowest penalty time (ASC) -> one with less penalty time wins!
 * Hidden from contestants, but visible to admin
 */
async function getDynamicLeaderboard() {
  // Fetch all registered teams (Role: TEAM)
  const teams = await prisma.user.findMany({
    where: {
      role: 'TEAM',
    },
    select: {
      id: true,
      username: true,
      teamName: true,
      isActive: true,
      createdAt: true,
      solvedProblems: {
        select: {
          problemId: true,
          awardedPoints: true,
          passedTestCases: true,
          totalTestCases: true,
          penaltySeconds: true,
          firstSolvedAt: true,
          problem: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              points: true,
            },
          },
        },
      },
      submissions: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  // Calculate scores, solves, and total penalty time
  const computed = teams.map((team) => {
    const totalPoints = team.solvedProblems.reduce((sum, sp) => sum + sp.awardedPoints, 0);
    // Solved completely (100% test cases)
    const solvedCount = team.solvedProblems.filter(
      (sp) => sp.awardedPoints === sp.problem.points || (sp.totalTestCases > 0 && sp.passedTestCases === sp.totalTestCases)
    ).length;
    // Partially solved
    const partialCount = team.solvedProblems.filter(
      (sp) => sp.awardedPoints > 0 && sp.awardedPoints < sp.problem.points
    ).length;

    const totalSubmissions = team.submissions.length;
    const acceptedSubmissions = team.submissions.filter((s) => s.status === 'ACCEPTED').length;

    // Total penalty time = sum of penaltySeconds of all scored problems
    const totalPenaltySeconds = team.solvedProblems.reduce((sum, sp) => sum + (sp.penaltySeconds || 0), 0);

    // Last solve time
    let lastSolvedAt = null;
    if (team.solvedProblems.length > 0) {
      const timestamps = team.solvedProblems.map((sp) => new Date(sp.firstSolvedAt).getTime());
      lastSolvedAt = new Date(Math.max(...timestamps));
    }

    return {
      id: team.id,
      username: team.username,
      teamName: team.teamName,
      isActive: team.isActive,
      totalPoints,
      solvedCount,
      partialCount,
      totalSubmissions,
      acceptedSubmissions,
      totalPenaltySeconds,
      // Formatted penalty string (e.g. "14m 20s" or "1h 12m")
      penaltyFormatted: formatPenalty(totalPenaltySeconds),
      lastSolvedAt,
      solvedProblems: team.solvedProblems.map((sp) => ({
        problemId: sp.problemId,
        title: sp.problem.title,
        difficulty: sp.problem.difficulty,
        points: sp.awardedPoints,
        maxPoints: sp.problem.points,
        passedTestCases: sp.passedTestCases,
        totalTestCases: sp.totalTestCases,
        penaltySeconds: sp.penaltySeconds,
        solvedAt: sp.firstSolvedAt,
      })),
      createdAt: team.createdAt,
    };
  });

  // Sort teams:
  // 1. Highest total points (DESC)
  // 2. Lowest total penalty seconds (ASC) -> TIE BREAKER!
  // 3. Registered earlier (ASC)
  computed.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    // Tie breaker: less penalty time wins!
    if (a.totalPenaltySeconds !== b.totalPenaltySeconds) {
      return a.totalPenaltySeconds - b.totalPenaltySeconds;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Assign ranks
  let currentRank = 1;
  const ranked = computed.map((team, index) => {
    if (index > 0) {
      const prev = computed[index - 1];
      const samePoints = prev.totalPoints === team.totalPoints;
      const samePenalty = prev.totalPenaltySeconds === team.totalPenaltySeconds;

      if (!samePoints || !samePenalty) {
        currentRank = index + 1;
      }
    }
    return {
      rank: currentRank,
      ...team,
    };
  });

  return ranked;
}

function formatPenalty(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

module.exports = {
  processSubmissionResult,
  getDynamicLeaderboard,
  formatPenalty,
};
