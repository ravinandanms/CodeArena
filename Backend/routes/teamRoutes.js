const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// All team management routes require Admin privileges
router.use(authMiddleware, requireAdmin);

// GET /api/admin/teams - List all dynamically registered teams
router.get('/', teamController.adminGetTeams);

// POST /api/admin/teams - Admin manually add team
router.post('/', teamController.adminCreateTeam);

// GET /api/admin/teams/:id - Admin view team details and submissions
router.get('/:id', teamController.adminGetTeamDetails);

// PUT /api/admin/teams/:id - Admin edit team details
router.put('/:id', teamController.adminUpdateTeam);

// PUT /api/admin/teams/:id/reset-password - Admin reset team password
router.put('/:id/reset-password', teamController.adminResetPassword);

// PATCH /api/admin/teams/:id/toggle-status - Admin toggle active/disable
router.patch('/:id/toggle-status', teamController.adminToggleTeamStatus);

// DELETE /api/admin/teams/:id - Admin delete team
router.delete('/:id', teamController.adminDeleteTeam);

module.exports = router;
