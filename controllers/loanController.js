const Loan = require('../models/Loan');

// ✅ GET ALL LOANS
exports.getLoans = async (req, res) => {
  const loans = await Loan.find({ userId: req.user._id });
  res.status(200).json({ success: true, data: loans });
};

// ✅ CREATE LOAN (FIXED userId)
exports.createLoan = async (req, res) => {
  const { type, amount, interestRate, duration } = req.body;

  const loan = await Loan.create({
    userId: req.user._id,
    type: type || 'Loan',
    name: type || 'Loan',
    amount,
    interestRate,
    tenureMonths: duration,
    status: 'ACTIVE'
  });

  res.status(201).json({ success: true, data: loan });
};

// ✅ UPDATE LOAN
exports.updateLoan = async (req, res) => {
  const loan = await Loan.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.body,
    { new: true }
  );

  if (!loan) {
    return res.status(404).json({ message: 'Loan not found' });
  }

  res.json({ success: true, data: loan });
};

// ✅ DELETE LOAN
exports.deleteLoan = async (req, res) => {
  const loan = await Loan.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!loan) {
    return res.status(404).json({ message: 'Loan not found' });
  }

  res.json({ success: true, message: 'Loan deleted' });
};

// 📊 OVERVIEW
exports.getLoanOverview = async (req, res) => {
  const loans = await Loan.find({ userId: req.user._id });

  const totalLoan = loans.reduce((sum, l) => sum + l.amount, 0);
  const totalEMI = loans.reduce((sum, l) => sum + (l.monthlyEMI || 0), 0);

  res.json({
    success: true,
    data: { totalLoan, totalEMI, count: loans.length },
  });
};

// 🕒 RECENT LOANS
exports.getRecentLoans = async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 5;
  const loans = await Loan.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit);

  res.json({ success: true, data: loans });
};
