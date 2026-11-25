const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { errorResponse } = require('../utils/response');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authentication token required', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return errorResponse(res, 'Invalid token format', 401);
    }

    if (!process.env.JWT_SECRET) {
      return errorResponse(res, 'Server authentication secret is not configured', 500);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        teamName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      return errorResponse(res, 'User not found or deleted', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Your team account has been disabled by the administrator', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Session expired. Please log in again.', 401);
    }
    return errorResponse(res, 'Invalid or corrupted authentication token', 401);
  }
};

module.exports = authMiddleware;
