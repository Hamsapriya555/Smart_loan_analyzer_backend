const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/assistantController');
const auth = require('../middleware/authMiddleware');

router.post('/chat', auth, chat);

module.exports = router;
