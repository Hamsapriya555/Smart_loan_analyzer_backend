const express = require('express');
const auth = require('../middleware/authMiddleware');
const { simulateLoan } = require('../controllers/loanSimController');
const router = express.Router();

router.post('/', auth, simulateLoan);

module.exports = router;
