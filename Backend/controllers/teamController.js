const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Admin: Get all registered teams with statistics
 */
const adminGetTeams = async (req, res) => {
  try {
    const teams = await prisma.user.findMany({
      where: { role: 'TEAM' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        teamName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        solvedProblems: {
          select: {
            problemId: true,
            awardedPoints: true,
            passedTestCases: true,
            totalTestCases: true,
            penaltySeconds: true,
            firstSolvedAt: true,
            problem: {
              select: { title: true, difficulty: true, points: true },
            },
          },
        },
        _count: {
          select: {
            submissions: true,
            solvedProblems: true,
          },
        },
      },
    });

    const enriched = teams.map((team) => {
      const totalPoints = team.solvedProblems.reduce((sum, sp) => sum + sp.awardedPoints, 0);
      const totalPenaltySeconds = team.solvedProblems.reduce((sum, sp) => sum + (sp.penaltySeconds || 0), 0);

      const hrs = Math.floor(totalPenaltySeconds / 3600);
      const mins = Math.floor((totalPenaltySeconds % 3600) / 60);
      const secs = totalPenaltySeconds % 60;
      const penaltyFormatted = hrs > 0 ? `${hrs}h ${mins}m ${secs}s` : mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

      return {
        id: team.id,
        username: team.username,
        teamName: team.teamName,
        isActive: team.isActive,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        totalPoints,
        totalPenaltySeconds,
        penaltyFormatted,
        solvedCount: team._count.solvedProblems,
        submissionCount: team._count.submissions,
        solvedProblems: team.solvedProblems,
      };
    });

    return successResponse(res, enriched, 'Teams fetched successfully');
  } catch (error) {
    console.error('Admin get teams error:', error);
    return errorResponse(res, 'Failed to fetch teams', 500);
  }
};

/**
 * Admin: Manually Add a Team
 */
const adminCreateTeam = async (req, res) => {
  try {
    const { teamName, username, password } = req.body;

    if (!teamName || !username || !password) {
      return errorResponse(res, 'teamName, username, and password are required', 400);
    }

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedTeamName = teamName.trim();

    if (password.length < 6) {
      return errorResponse(res, 'Password must be at least 6 characters long', 400);
    }

    // Check unique username
    const existing = await prisma.user.findFirst({
      where: {
        username: { equals: trimmedUsername, mode: 'insensitive' },
      },
    });

    if (existing) {
      return errorResponse(res, 'Username already exists', 409);
    }

    const existingTeam = await prisma.user.findFirst({
      where: {
        teamName: { equals: trimmedTeamName, mode: 'insensitive' },
      },
    });

    if (existingTeam) {
      return errorResponse(res, 'Team name already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const team = await prisma.user.create({
      data: {
        teamName: trimmedTeamName,
        username: trimmedUsername,
        password: hashedPassword,
        role: 'TEAM',
        isActive: true,
      },
      select: {
        id: true,
        teamName: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('team_registered', team);
    }

    return successResponse(res, team, 'Team created successfully', 201);
  } catch (error) {
    console.error('Admin create team error:', error);
    return errorResponse(res, 'Failed to create team', 500);
  }
};

/**
 * Admin: Update Team Name or Username
 */
const adminUpdateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { teamName, username } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== 'TEAM') {
      return errorResponse(res, 'Team not found', 404);
    }

    const updateData = {};

    if (teamName && teamName.trim() !== existing.teamName) {
      const trimmedTeamName = teamName.trim();
      const duplicateTeam = await prisma.user.findFirst({
        where: {
          id: { not: id },
          teamName: { equals: trimmedTeamName, mode: 'insensitive' },
        },
      });
      if (duplicateTeam) {
        return errorResponse(res, 'Team name already taken', 409);
      }
      updateData.teamName = trimmedTeamName;
    }

    if (username && username.trim().toLowerCase() !== existing.username) {
      const trimmedUsername = username.trim().toLowerCase();
      const duplicateUser = await prisma.user.findFirst({
        where: {
          id: { not: id },
          username: { equals: trimmedUsername, mode: 'insensitive' },
        },
      });
      if (duplicateUser) {
        return errorResponse(res, 'Username already taken', 409);
      }
      updateData.username = trimmedUsername;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        teamName: true,
        username: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return successResponse(res, updated, 'Team updated successfully');
  } catch (error) {
    console.error('Admin update team error:', error);
    return errorResponse(res, 'Failed to update team', 500);
  }
};

/**
 * Admin: Reset Team Password
 */
const adminResetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return errorResponse(res, 'New password must be at least 6 characters long', 400);
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== 'TEAM') {
      return errorResponse(res, 'Team not found', 404);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return successResponse(res, { id }, 'Team password reset successfully');
  } catch (error) {
    console.error('Admin reset password error:', error);
    return errorResponse(res, 'Failed to reset team password', 500);
  }
};

/**
 * Admin: Toggle Team Active Status (Enable / Disable)
 */
const adminToggleTeamStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== 'TEAM') {
      return errorResponse(res, 'Team not found', 404);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !existing.isActive },
      select: {
        id: true,
        username: true,
        teamName: true,
        isActive: true,
      },
    });

    return successResponse(
      res,
      updated,
      `Team account ${updated.isActive ? 'enabled' : 'disabled'} successfully`
    );
  } catch (error) {
    console.error('Admin toggle team status error:', error);
    return errorResponse(res, 'Failed to toggle team status', 500);
  }
};

/**
 * Admin: Delete Team
 */
const adminDeleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== 'TEAM') {
      return errorResponse(res, 'Team not found', 404);
    }

    await prisma.user.delete({ where: { id } });

    const io = req.app.get('io');
    if (io) {
      io.emit('team_deleted', { id });
    }

    return successResponse(res, { id }, 'Team deleted successfully');
  } catch (error) {
    console.error('Admin delete team error:', error);
    return errorResponse(res, 'Failed to delete team', 500);
  }
};

/**
 * Admin: Get specific team's detailed profile and submission history
 */
const adminGetTeamDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const team = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        teamName: true,
        isActive: true,
        createdAt: true,
        solvedProblems: {
          include: {
            problem: {
              select: { id: true, title: true, difficulty: true, points: true },
            },
          },
        },
        submissions: {
          orderBy: { createdAt: 'desc' },
          include: {
            problem: {
              select: { id: true, title: true, difficulty: true },
            },
          },
        },
      },
    });

    if (!team) {
      return errorResponse(res, 'Team not found', 404);
    }

    return successResponse(res, team, 'Team details fetched');
  } catch (error) {
    console.error('Admin get team details error:', error);
    return errorResponse(res, 'Failed to fetch team details', 500);
  }
};

module.exports = {
  adminGetTeams,
  adminCreateTeam,
  adminUpdateTeam,
  adminResetPassword,
  adminToggleTeamStatus,
  adminDeleteTeam,
  adminGetTeamDetails,
};
