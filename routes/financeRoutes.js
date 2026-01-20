const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { analyze, updateProfile, getStressTrend } = require('../controllers/financeController');

router.post('/analyze', auth, analyze);
router.post('/profile', auth, updateProfile);
router.get('/stress-trend', auth, getStressTrend);

module.exports = router;
