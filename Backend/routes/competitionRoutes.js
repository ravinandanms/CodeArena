const express = require('express');
const router = express.Router();
const competitionController = require('../controllers/competitionController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// GET /api/competition - Get current competition status & timer (Public/Team)
router.get('/', competitionController.getCompetition);

// Admin competition management
router.put('/admin/settings', authMiddleware, requireAdmin, competitionController.adminUpdateCompetition);
router.post('/admin/start', authMiddleware, requireAdmin, competitionController.adminStartCompetition);
router.post('/admin/end', authMiddleware, requireAdmin, competitionController.adminEndCompetition);

module.exports = router;
