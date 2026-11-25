const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const { getCurrentCompetition } = require('../services/competitionService');

/**
 * Get Current Competition Details & Timer
 */
const getCompetition = async (req, res) => {
  try {
    const comp = await getCurrentCompetition();
    return successResponse(res, comp, 'Competition details fetched');
  } catch (error) {
    console.error('Get competition error:', error);
    return errorResponse(res, 'Failed to fetch competition details', 500);
  }
};

/**
 * Admin: Configure or Update Competition Settings
 */
const adminUpdateCompetition = async (req, res) => {
  try {
    const { name, description, duration } = req.body;
    let comp = await prisma.competition.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!comp) {
      comp = await prisma.competition.create({
        data: {
          name: name || 'CodeSprint 2026',
          description,
          duration: parseInt(duration, 10) || 120,
          status: 'UPCOMING',
        },
      });
    } else {
      const updateData = {};
      if (name) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description;
      if (duration) updateData.duration = parseInt(duration, 10);

      comp = await prisma.competition.update({
        where: { id: comp.id },
        data: updateData,
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('competition_settings_update', comp);
    }

    return successResponse(res, comp, 'Competition settings updated');
  } catch (error) {
    console.error('Update competition error:', error);
    return errorResponse(res, 'Failed to update competition', 500);
  }
};

/**
 * Admin: Start Competition
 */
const adminStartCompetition = async (req, res) => {
  try {
    let comp = await prisma.competition.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!comp) {
      comp = await prisma.competition.create({
        data: {
          name: 'CodeSprint 2026',
          duration: 120,
          status: 'UPCOMING',
        },
      });
    }

    const durationMinutes = comp.duration || 120;
    const now = new Date();
    const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const updated = await prisma.competition.update({
      where: { id: comp.id },
      data: {
        status: 'ACTIVE',
        startTime: now,
        endTime: endTime,
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('competition_status_update', {
        status: 'ACTIVE',
        startTime: now,
        endTime: endTime,
        duration: durationMinutes,
      });
    }

    return successResponse(res, updated, 'Competition started successfully!');
  } catch (error) {
    console.error('Start competition error:', error);
    return errorResponse(res, 'Failed to start competition', 500);
  }
};

/**
 * Admin: End Competition
 */
const adminEndCompetition = async (req, res) => {
  try {
    const comp = await prisma.competition.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!comp) {
      return errorResponse(res, 'No competition found', 404);
    }

    const updated = await prisma.competition.update({
      where: { id: comp.id },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('competition_status_update', {
        status: 'COMPLETED',
        endTime: new Date(),
      });
    }

    return successResponse(res, updated, 'Competition ended successfully');
  } catch (error) {
    console.error('End competition error:', error);
    return errorResponse(res, 'Failed to end competition', 500);
  }
};

module.exports = {
  getCompetition,
  adminUpdateCompetition,
  adminStartCompetition,
  adminEndCompetition,
};
