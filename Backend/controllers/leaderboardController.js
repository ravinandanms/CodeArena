const { successResponse, errorResponse } = require('../utils/response');
const { getDynamicLeaderboard } = require('../services/scoringService');

/**
 * Get dynamic real-time leaderboard
 */
const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await getDynamicLeaderboard();
    return successResponse(res, leaderboard, 'Leaderboard fetched successfully');
  } catch (error) {
    console.error('Leaderboard error:', error);
    return errorResponse(res, 'Failed to fetch leaderboard', 500);
  }
};

module.exports = {
  getLeaderboard,
};
