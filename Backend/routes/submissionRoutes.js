const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// All submission routes require authentication
router.use(authMiddleware);

// POST /api/submissions/run - Test run custom input (Playground)
router.post('/run', submissionController.runCode);

// POST /api/submissions/submit - Submit solution against hidden test cases
router.post('/submit', submissionController.submitCode);

// GET /api/submissions/my - Submissions of the authenticated team
router.get('/my', submissionController.getMySubmissions);

// GET /api/submissions/admin/all - Admin submission monitoring
router.get('/admin/all', requireAdmin, submissionController.adminGetAllSubmissions);

module.exports = router;
