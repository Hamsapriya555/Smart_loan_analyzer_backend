const { emi, totalInterest, loanEndDate, debtHealthScore, loanPriority } = require('../utils/financeCalculations');
const User = require('../models/User');
const Loan = require('../models/Loan');

exports.analyze = async (req, res) => {
  try {
    const { monthlyIncome, monthlyExpenses, loans } = req.body;
    if (monthlyIncome == null || monthlyExpenses == null || !Array.isArray(loans)) {
      return res.status(400).json({ success: false, message: 'monthlyIncome, monthlyExpenses, and loans[] required' });
    }

    const normalized = loans.map(l => ({
      id: l.id || l._id,
      name: l.name || l.type || 'Loan',
      amount: Number(l.amount),
      interestRate: Number(l.interestRate),
      tenureMonths: Number(l.tenureMonths || l.duration),
      startDate: l.startDate || new Date(),
    }));

    const calc = normalized.map(l => ({
      ...l,
      emi: emi(l.amount, l.interestRate, l.tenureMonths),
      totalInterest: totalInterest(l.amount, l.interestRate, l.tenureMonths),
      endDate: loanEndDate(l.startDate, l.tenureMonths),
    }));

    const score = debtHealthScore(monthlyIncome, monthlyExpenses, calc);
    const priority = loanPriority(calc);

    res.json({ success: true, data: { loans: calc, score, priority } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// POST /api/finance/profile - update logged-in user's financial snapshot
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { monthlyIncome, monthlyExpenses, totalEMI, debtHealthScore } = req.body || {};
    const update = {};
    if (monthlyIncome != null) update.monthlyIncome = Number(monthlyIncome);
    if (monthlyExpenses != null) update.monthlyExpenses = Number(monthlyExpenses);
    if (totalEMI != null) update.totalEMI = Number(totalEMI);
    if (debtHealthScore != null) update.debtHealthScore = Math.max(0, Math.min(100, Number(debtHealthScore)));

    const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    return res.json({ success: true, data: { user } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// GET /api/finance/stress-trend - compute monthly stress trend from user's loans
exports.getStressTrend = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await User.findById(userId).select('monthlyIncome');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const monthlyIncome = Number(user.monthlyIncome || 0);
    const loans = await Loan.find({ userId }).select('amount interestRate tenureMonths startDate');

    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: d.toLocaleString('en-US', { month: 'short' }) });
    }

    const trend = months.map((m, idx) => {
      const ref = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 15);
      let totalEmi = 0;
      loans.forEach(l => {
        const start = new Date(l.startDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + Number(l.tenureMonths || 0));
        if (ref >= start && ref <= end) {
          totalEmi += emi(Number(l.amount), Number(l.interestRate), Number(l.tenureMonths));
        }
      });
      const stress = monthlyIncome > 0 ? (totalEmi / monthlyIncome) * 100 : 0;
      return { month: m.label, emi: Number(totalEmi.toFixed(2)), income: monthlyIncome, stress: Number(stress.toFixed(2)) };
    });

    return res.json({ success: true, data: trend });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
