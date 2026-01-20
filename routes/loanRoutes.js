const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const loanController = require('../controllers/loanController');

// 🔴 STATIC ROUTES FIRST
router.get('/overview', protect, loanController.getLoanOverview);
router.get('/recent', protect, loanController.getRecentLoans);

// 🟢 CRUD
router.get('/', protect, loanController.getLoans);
router.post('/', protect, loanController.createLoan);
router.put('/:id', protect, loanController.updateLoan);
router.delete('/:id', protect, loanController.deleteLoan);



module.exports = router;
