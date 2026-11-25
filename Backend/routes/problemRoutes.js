const express = require('express');
const router = express.Router();
const problemController = require('../controllers/problemController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

// Public / Team routes (Protected by auth to attach team solve state)
router.get('/', authMiddleware, problemController.getProblems);
router.get('/:id', authMiddleware, problemController.getProblemById);

// Admin Problem Management routes
router.get('/admin/all', authMiddleware, requireAdmin, problemController.adminGetProblems);
router.get('/admin/:id', authMiddleware, requireAdmin, problemController.adminGetProblemById);
router.post('/admin', authMiddleware, requireAdmin, problemController.adminCreateProblem);
router.put('/admin/:id', authMiddleware, requireAdmin, problemController.adminUpdateProblem);
router.delete('/admin/:id', authMiddleware, requireAdmin, problemController.adminDeleteProblem);

module.exports = router;
