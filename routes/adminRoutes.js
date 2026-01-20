const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getMetrics, getAllUsers, getUserDetails, getAnalytics } = require('../controllers/adminController');

// All routes require authentication
router.use(auth);

// GET /api/admin/metrics
router.get('/metrics', getMetrics);

// GET /api/admin/users
router.get('/users', getAllUsers);

// GET /api/admin/users/:userId
router.get('/users/:userId', getUserDetails);

// GET /api/admin/analytics
router.get('/analytics', getAnalytics);

module.exports = router;
