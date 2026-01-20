const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const {
  getDashboard,
  updateSimulation,
  updateFinancialInfo,
} = require('../controllers/dashboardController');

// GET /api/dashboard
router.get('/', auth, getDashboard);

// PUT /api/dashboard/financial-info
router.put('/financial-info', auth, updateFinancialInfo);

// PUT /api/dashboard/simulation
router.put('/simulation', auth, updateSimulation);

module.exports = router;
