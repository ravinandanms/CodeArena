const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const {
  LANGUAGE_COMPILER_MAP,
  executeCode,
  classifyVerdict,
  compareOutput,
} = require('../services/onlineCompilerService');
const { processSubmissionResult, getDynamicLeaderboard } = require('../services/scoringService');
const { getCurrentCompetition } = require('../services/competitionService');

/**
 * Run source code against custom input (Playground testing)
 * Also checks if custom input matches any sample test case for instant verification
 */
const runCode = async (req, res) => {
  try {
    const { sourceCode, language, customInput = '', problemId } = req.body;

    if (!sourceCode || !language) {
      return errorResponse(res, 'Source code and language are required', 400);
    }

    const compiler = LANGUAGE_COMPILER_MAP[language.toLowerCase()];
    if (!compiler) {
      return errorResponse(
        res,
        `Unsupported language: ${language}. Supported: python, cpp, c, java, javascript`,
        400
      );
    }

    // Execute via OnlineCompiler.io
    const result = await executeCode(compiler, sourceCode, customInput, 10);

    // If problemId provided, check if customInput matches any sample test case
    let sampleMatch = null;
    if (problemId) {
      const sampleCase = await prisma.testCase.findFirst({
        where: {
          problemId,
          isHidden: false,
        },
      });

      if (sampleCase) {
        const isMatch = compareOutput(result.output, sampleCase.expectedOutput);
        sampleMatch = {
          sampleInput: sampleCase.input,
          expectedOutput: sampleCase.expectedOutput,
          isMatch,
        };
      }
    }

    return successResponse(
      res,
      {
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        executionTime: result.executionTime,
        status: result.status,
        memory: result.memory,
        sampleMatch,
      },
      'Code executed successfully'
    );
  } catch (error) {
    console.error('Run code error:', error);
    return errorResponse(res, 'Code execution failed', 500);
  }
};

/**
 * Submit solution for judging against all test cases (both sample and hidden)
 * Runs all test cases to award score for every test case that runs successfully!
 */
const submitCode = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sourceCode, language, problemId } = req.body;

    if (!sourceCode || !language || !problemId) {
      return errorResponse(res, 'sourceCode, language, and problemId are required', 400);
    }

    // 1. Verify Competition Status
    const comp = await getCurrentCompetition();
    if (req.user.role !== 'ADMIN') {
      if (comp.status === 'UPCOMING') {
        return errorResponse(res, 'Competition has not started yet. Submissions are disabled.', 403);
      }
      if (comp.status === 'COMPLETED' || comp.remainingSeconds <= 0) {
        return errorResponse(res, 'Competition has ended. Submissions are no longer accepted.', 403);
      }
    }

    // 2. Fetch Problem & Test Cases
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        testCases: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!problem) {
      return errorResponse(res, 'Problem not found', 404);
    }

    if (problem.testCases.length === 0) {
      return errorResponse(res, 'Problem has no test cases configured. Please contact administrator.', 400);
    }

    const compiler = LANGUAGE_COMPILER_MAP[language.toLowerCase()];
    if (!compiler) {
      return errorResponse(res, `Unsupported language: ${language}`, 400);
    }

    // 3. Server-side Execution Against All Test Cases
    const totalTestCases = problem.testCases.length;
    let passedTestCases = 0;
    let maxExecutionTime = 0;
    let finalCompilerOutput = '';
    const caseResults = [];
    let hasCompilationError = false;

    for (let i = 0; i < problem.testCases.length; i++) {
      const tc = problem.testCases[i];
      const runResult = await executeCode(compiler, sourceCode, tc.input, problem.timeLimit);

      maxExecutionTime = Math.max(maxExecutionTime, runResult.executionTime || 0);

      const tcVerdict = classifyVerdict(runResult, tc.expectedOutput, problem.timeLimit);

      if (tcVerdict === 'COMPILATION_ERROR') {
        hasCompilationError = true;
        finalCompilerOutput = runResult.error || 'Compilation Error';
        caseResults.push({
          order: tc.order,
          isHidden: tc.isHidden,
          status: 'COMPILATION_ERROR',
          executionTime: 0,
          error: runResult.error,
        });
        // If compilation fails, subsequent test cases will also fail compilation
        break;
      }

      if (tcVerdict === 'ACCEPTED') {
        passedTestCases++;
        caseResults.push({
          order: tc.order,
          isHidden: tc.isHidden,
          status: 'ACCEPTED',
          executionTime: runResult.executionTime,
        });
      } else {
        if (!finalCompilerOutput) {
          finalCompilerOutput = runResult.error || (tcVerdict === 'WRONG_ANSWER' ? 'Wrong answer on test case' : tcVerdict);
        }
        caseResults.push({
          order: tc.order,
          isHidden: tc.isHidden,
          status: tcVerdict,
          executionTime: runResult.executionTime,
          // Only disclose inputs/outputs for sample test cases
          ...(tc.isHidden
            ? {}
            : {
                sampleInput: tc.input,
                expectedOutput: tc.expectedOutput,
                actualOutput: runResult.output,
              }),
        });
      }
    }

    // Determine initial verdict
    let overallVerdict = 'WRONG_ANSWER';
    if (hasCompilationError) {
      overallVerdict = 'COMPILATION_ERROR';
    } else if (passedTestCases === totalTestCases) {
      overallVerdict = 'ACCEPTED';
    } else if (passedTestCases > 0) {
      overallVerdict = 'PARTIALLY_ACCEPTED';
    }

    // 4. Record Submission & Award Points Atomically (Score per passed testcase + Penalty time)
    const result = await processSubmissionResult({
      userId,
      problemId,
      sourceCode,
      language,
      verdict: overallVerdict,
      passedTestCases,
      totalTestCases,
      executionTime: maxExecutionTime,
      compilerOutput: finalCompilerOutput,
    });

    // 5. Emit Real-time Socket.IO Events
    const io = req.app.get('io');
    if (io) {
      // Broadcast submission event for admin monitor and live feed
      io.emit('new_submission', {
        id: result.submission.id,
        teamName: req.user.teamName,
        problemTitle: problem.title,
        difficulty: problem.difficulty,
        language,
        status: result.submission.status,
        passedTestCases,
        totalTestCases,
        executionTime: maxExecutionTime,
        createdAt: result.submission.createdAt,
      });

      // If team's score increased on this problem, broadcast updated leaderboard!
      if (result.isScoreIncrease) {
        const updatedLeaderboard = await getDynamicLeaderboard();
        io.emit('leaderboard_update', updatedLeaderboard);
        if (result.submission.status === 'ACCEPTED') {
          io.emit('first_solve_alert', {
            teamName: req.user.teamName,
            problemTitle: problem.title,
            points: result.earnedPoints,
          });
        }
      }
    }

    return successResponse(
      res,
      {
        submissionId: result.submission.id,
        status: result.submission.status,
        passedTestCases,
        totalTestCases,
        earnedPoints: result.earnedPoints,
        awardedPoints: result.awardedPoints,
        currentBestPoints: result.currentBestPoints,
        maxProblemPoints: problem.points,
        isScoreIncrease: result.isScoreIncrease,
        executionTime: maxExecutionTime,
        compilerOutput: finalCompilerOutput,
        caseResults,
        createdAt: result.submission.createdAt,
      },
      `Verdict: ${result.submission.status} (${passedTestCases}/${totalTestCases} passed)`
    );
  } catch (error) {
    console.error('Submission error:', error);
    return errorResponse(res, 'Submission evaluation failed', 500);
  }
};

/**
 * Get submissions for the authenticated team
 */
const getMySubmissions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { problemId } = req.query;

    const submissions = await prisma.submission.findMany({
      where: {
        userId,
        ...(problemId && { problemId }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        problem: {
          select: { id: true, title: true, difficulty: true, points: true },
        },
      },
    });

    return successResponse(res, submissions, 'My submissions fetched');
  } catch (error) {
    console.error('Get my submissions error:', error);
    return errorResponse(res, 'Failed to fetch submissions', 500);
  }
};

/**
 * Admin: Get all submissions with filtering
 */
const adminGetAllSubmissions = async (req, res) => {
  try {
    const { problemId, userId, status, limit = 100 } = req.query;

    const submissions = await prisma.submission.findMany({
      where: {
        ...(problemId && { problemId }),
        ...(userId && { userId }),
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      include: {
        user: {
          select: { id: true, username: true, teamName: true },
        },
        problem: {
          select: { id: true, title: true, difficulty: true, points: true },
        },
      },
    });

    return successResponse(res, submissions, 'Admin submissions fetched');
  } catch (error) {
    console.error('Admin get submissions error:', error);
    return errorResponse(res, 'Failed to fetch submissions', 500);
  }
};

module.exports = {
  runCode,
  submitCode,
  getMySubmissions,
  adminGetAllSubmissions,
};
