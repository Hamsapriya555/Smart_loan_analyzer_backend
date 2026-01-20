const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getSuggestions, getInsights } = require('../controllers/suggestionsController');

// GET /api/suggestions
router.get('/', auth, getSuggestions);

// GET /api/suggestions/insights
router.get('/insights', auth, getInsights);

module.exports = router;
