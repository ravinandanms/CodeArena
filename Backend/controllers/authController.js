const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      teamName: user.teamName,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
};

/**
 * Team Registration
 * Allows any team to dynamically sign up with no hardcoded limits
 */
const register = async (req, res) => {
  try {
    const { teamName, username, password, confirmPassword } = req.body;

    // 1. Validation
    if (!teamName || !username || !password || !confirmPassword) {
      return errorResponse(res, 'All fields are required (teamName, username, password, confirmPassword)', 400);
    }

    const trimmedTeamName = teamName.trim();
    const trimmedUsername = username.trim().toLowerCase();

    if (trimmedTeamName.length < 2) {
      return errorResponse(res, 'Team name must be at least 2 characters long', 400);
    }

    if (trimmedUsername.length < 3) {
      return errorResponse(res, 'Username must be at least 3 characters long', 400);
    }

    if (password.length < 6) {
      return errorResponse(res, 'Password must be at least 6 characters long', 400);
    }

    if (password !== confirmPassword) {
      return errorResponse(res, 'Passwords do not match', 400);
    }

    // 2. Check if username or teamName exists
    const existingUsername = await prisma.user.findFirst({
      where: {
        username: {
          equals: trimmedUsername,
          mode: 'insensitive',
        },
      },
    });

    if (existingUsername) {
      return errorResponse(res, 'Username already taken. Please choose another username.', 409);
    }

    const existingTeamName = await prisma.user.findFirst({
      where: {
        teamName: {
          equals: trimmedTeamName,
          mode: 'insensitive',
        },
      },
    });

    if (existingTeamName) {
      return errorResponse(res, 'Team name already registered. Please choose another team name.', 409);
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create user with TEAM role
    const newUser = await prisma.user.create({
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

    // 5. Generate JWT token
    const token = generateToken(newUser);

    // Broadcast new team registration event via socket if attached
    const io = req.app.get('io');
    if (io) {
      io.emit('team_registered', {
        id: newUser.id,
        teamName: newUser.teamName,
        username: newUser.username,
        createdAt: newUser.createdAt,
      });
    }

    return successResponse(
      res,
      {
        user: newUser,
        token,
      },
      'Team registered successfully! Welcome to CodeArena.',
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse(res, 'Registration failed due to server error', 500);
  }
};

/**
 * Universal Login for Teams and Admin
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return errorResponse(res, 'Username and password are required', 400);
    }

    const trimmedUsername = username.trim().toLowerCase();

    // Find user (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: trimmedUsername,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      return errorResponse(res, 'Invalid username or password', 401);
    }

    // Check account status
    if (!user.isActive) {
      return errorResponse(res, 'Your team account has been disabled by the administrator', 403);
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid username or password', 401);
    }

    const token = generateToken(user);

    return successResponse(
      res,
      {
        user: {
          id: user.id,
          username: user.username,
          teamName: user.teamName,
          role: user.role,
          isActive: user.isActive,
        },
        token,
      },
      'Login successful'
    );
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 'Login failed due to server error', 500);
  }
};

/**
 * Get Current Authenticated User
 */
const getMe = async (req, res) => {
  try {
    return successResponse(res, { user: req.user });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch user profile', 500);
  }
};

module.exports = {
  register,
  login,
  getMe,
};
