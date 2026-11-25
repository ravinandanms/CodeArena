const { errorResponse } = require('../utils/response');

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return errorResponse(res, 'Access denied. Administrator privileges required.', 403);
  }
  next();
};

const requireTeam = (req, res, next) => {
  if (!req.user || req.user.role !== 'TEAM') {
    return errorResponse(res, 'Access denied. Team privileges required.', 403);
  }
  next();
};

module.exports = {
  requireAdmin,
  requireTeam,
};
