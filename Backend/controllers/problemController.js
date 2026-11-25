const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const { LANGUAGE_TEMPLATES } = require('../services/onlineCompilerService');

/**
 * Public/Team: Get all problems
 * Hidden test cases are never leaked.
 */
const getProblems = async (req, res) => {
  try {
    const userId = req.user?.id;

    const problems = await prisma.problem.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        difficulty: true,
        points: true,
        timeLimit: true,
        memoryLimit: true,
        order: true,
        createdAt: true,
        solves: {
          select: { id: true, userId: true },
        },
        submissions: userId
          ? {
              where: { userId },
              select: { id: true, status: true },
            }
          : false,
      },
    });

    const enriched = problems.map((p) => {
      const isSolved = userId ? p.solves.some((s) => s.userId === userId) : false;
      const isAttempted = userId ? p.submissions.length > 0 : false;
      const totalSolves = p.solves.length;

      return {
        id: p.id,
        title: p.title,
        difficulty: p.difficulty,
        points: p.points,
        timeLimit: p.timeLimit,
        memoryLimit: p.memoryLimit,
        order: p.order,
        totalSolves,
        isSolved,
        isAttempted,
      };
    });

    return successResponse(res, enriched, 'Problems fetched successfully');
  } catch (error) {
    console.error('Error fetching problems:', error);
    return errorResponse(res, 'Failed to fetch problems', 500);
  }
};

/**
 * Public/Team: Get single problem by ID
 * NEVER returns hidden test cases. Only sample test cases (isHidden: false).
 */
const getProblemById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const problem = await prisma.problem.findUnique({
      where: { id },
      include: {
        testCases: {
          where: { isHidden: false }, // CRITICAL: Only sample test cases
          orderBy: { order: 'asc' },
          select: {
            id: true,
            input: true,
            expectedOutput: true,
            order: true,
          },
        },
        solves: userId
          ? {
              where: { userId },
              select: { id: true, awardedPoints: true, firstSolvedAt: true },
            }
          : false,
      },
    });

    if (!problem) {
      return errorResponse(res, 'Problem not found', 404);
    }

    const isSolved = userId ? problem.solves.length > 0 : false;

    const responseData = {
      id: problem.id,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      points: problem.points,
      inputFormat: problem.inputFormat,
      outputFormat: problem.outputFormat,
      constraints: problem.constraints,
      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit,
      order: problem.order,
      sampleTestCases: problem.testCases,
      isSolved,
      solveInfo: isSolved ? problem.solves[0] : null,
      starterTemplates: LANGUAGE_TEMPLATES,
    };

    return successResponse(res, responseData, 'Problem fetched successfully');
  } catch (error) {
    console.error('Error fetching problem details:', error);
    return errorResponse(res, 'Failed to fetch problem details', 500);
  }
};

/**
 * Admin: Get all problems with test case counts and statistics
 */
const adminGetProblems = async (req, res) => {
  try {
    const problems = await prisma.problem.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: {
            testCases: true,
            submissions: true,
            solves: true,
          },
        },
        testCases: {
          select: {
            id: true,
            isHidden: true,
          },
        },
      },
    });

    const enriched = problems.map((p) => {
      const sampleCount = p.testCases.filter((tc) => !tc.isHidden).length;
      const hiddenCount = p.testCases.filter((tc) => tc.isHidden).length;

      return {
        id: p.id,
        title: p.title,
        difficulty: p.difficulty,
        points: p.points,
        timeLimit: p.timeLimit,
        memoryLimit: p.memoryLimit,
        order: p.order,
        createdAt: p.createdAt,
        stats: {
          sampleTestCases: sampleCount,
          hiddenTestCases: hiddenCount,
          totalTestCases: p._count.testCases,
          totalSubmissions: p._count.submissions,
          totalSolves: p._count.solves,
        },
      };
    });

    return successResponse(res, enriched, 'Admin problems fetched successfully');
  } catch (error) {
    console.error('Admin get problems error:', error);
    return errorResponse(res, 'Failed to fetch admin problems', 500);
  }
};

/**
 * Admin: Get single problem by ID with all test cases (for editing)
 */
const adminGetProblemById = async (req, res) => {
  try {
    const { id } = req.params;

    const problem = await prisma.problem.findUnique({
      where: { id },
      include: {
        testCases: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!problem) {
      return errorResponse(res, 'Problem not found', 404);
    }

    return successResponse(res, problem, 'Problem details fetched for admin');
  } catch (error) {
    console.error('Admin get problem error:', error);
    return errorResponse(res, 'Failed to fetch problem', 500);
  }
};

/**
 * Admin: Create a new problem with sample and hidden test cases
 */
const adminCreateProblem = async (req, res) => {
  try {
    const {
      title,
      description,
      difficulty = 'EASY',
      points = 100,
      inputFormat = '',
      outputFormat = '',
      constraints = '',
      timeLimit = 2.0,
      memoryLimit = 256,
      order = 1,
      testCases = [],
    } = req.body;

    if (!title || !description) {
      return errorResponse(res, 'Title and description are required', 400);
    }

    const createdProblem = await prisma.$transaction(async (tx) => {
      const problem = await tx.problem.create({
        data: {
          title: title.trim(),
          description,
          difficulty,
          points: parseInt(points, 10) || 100,
          inputFormat,
          outputFormat,
          constraints,
          timeLimit: parseFloat(timeLimit) || 2.0,
          memoryLimit: parseInt(memoryLimit, 10) || 256,
          order: parseInt(order, 10) || 1,
        },
      });

      if (Array.isArray(testCases) && testCases.length > 0) {
        await tx.testCase.createMany({
          data: testCases.map((tc, index) => ({
            problemId: problem.id,
            input: tc.input ?? '',
            expectedOutput: tc.expectedOutput ?? '',
            isHidden: Boolean(tc.isHidden),
            order: tc.order || index + 1,
          })),
        });
      }

      return await tx.problem.findUnique({
        where: { id: problem.id },
        include: { testCases: true },
      });
    });

    return successResponse(res, createdProblem, 'Problem created successfully', 201);
  } catch (error) {
    console.error('Admin create problem error:', error);
    return errorResponse(res, 'Failed to create problem', 500);
  }
};

/**
 * Admin: Update problem and its test cases
 */
const adminUpdateProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      difficulty,
      points,
      inputFormat,
      outputFormat,
      constraints,
      timeLimit,
      memoryLimit,
      order,
      testCases,
    } = req.body;

    const existing = await prisma.problem.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, 'Problem not found', 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.problem.update({
        where: { id },
        data: {
          ...(title !== undefined && { title: title.trim() }),
          ...(description !== undefined && { description }),
          ...(difficulty !== undefined && { difficulty }),
          ...(points !== undefined && { points: parseInt(points, 10) }),
          ...(inputFormat !== undefined && { inputFormat }),
          ...(outputFormat !== undefined && { outputFormat }),
          ...(constraints !== undefined && { constraints }),
          ...(timeLimit !== undefined && { timeLimit: parseFloat(timeLimit) }),
          ...(memoryLimit !== undefined && { memoryLimit: parseInt(memoryLimit, 10) }),
          ...(order !== undefined && { order: parseInt(order, 10) }),
        },
      });

      // If testCases array provided, replace test cases
      if (Array.isArray(testCases)) {
        await tx.testCase.deleteMany({ where: { problemId: id } });
        if (testCases.length > 0) {
          await tx.testCase.createMany({
            data: testCases.map((tc, index) => ({
              problemId: id,
              input: tc.input ?? '',
              expectedOutput: tc.expectedOutput ?? '',
              isHidden: Boolean(tc.isHidden),
              order: tc.order || index + 1,
            })),
          });
        }
      }

      return await tx.problem.findUnique({
        where: { id },
        include: { testCases: true },
      });
    });

    return successResponse(res, updated, 'Problem updated successfully');
  } catch (error) {
    console.error('Admin update problem error:', error);
    return errorResponse(res, 'Failed to update problem', 500);
  }
};

/**
 * Admin: Delete problem
 */
const adminDeleteProblem = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.problem.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse(res, 'Problem not found', 404);
    }

    await prisma.problem.delete({ where: { id } });

    return successResponse(res, { id }, 'Problem deleted successfully');
  } catch (error) {
    console.error('Admin delete problem error:', error);
    return errorResponse(res, 'Failed to delete problem', 500);
  }
};

module.exports = {
  getProblems,
  getProblemById,
  adminGetProblems,
  adminGetProblemById,
  adminCreateProblem,
  adminUpdateProblem,
  adminDeleteProblem,
};
