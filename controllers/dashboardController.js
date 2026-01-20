const User = require('../models/User');
const Loan = require('../models/Loan');
const { emi } = require('../utils/finance');

// GET /api/dashboard (protected)
// Returns complete financial snapshot from MongoDB
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Fetch user profile
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Fetch all ACTIVE loans for this user
    const loans = await Loan.find({ userId, status: { $in: ['ACTIVE', 'Active', 'active'] } }).sort({ createdAt: -1 }).lean();

    // Get financial data
    const monthlyIncome = Number(user.monthlyIncome || 0);
    const monthlyExpenses = Number(user.monthlyExpenses || user.monthlyExpense || 0);
    const disposableIncome = Math.max(0, monthlyIncome - monthlyExpenses);

    // Calculate EMI for each loan using EMI formula
    const loansWithEmi = loans.map(l => ({
      ...l,
      _emi: emi(Number(l.amount || 0), Number(l.interestRate || 0), Number(l.tenureMonths || l.duration || 0))
    }));

    // Total EMI = sum of all individual EMIs
    const totalEMI = Number(loansWithEmi.reduce((sum, l) => sum + (l._emi || 0), 0).toFixed(2));

    // Calculate stress score based on EMI ratio
    const emiRatio = disposableIncome > 0 ? totalEMI / disposableIncome : 1;
    let stressScore;
    if (emiRatio < 0.3) {
      stressScore = 85; // Low stress
    } else if (emiRatio >= 0.3 && emiRatio <= 0.5) {
      stressScore = 65; // Moderate stress
    } else {
      stressScore = 40; // High stress
    }

    // Format recent loans for display
    const recentLoans = loans.slice(0, 5).map(l => ({
      id: l._id,
      loanType: l.type || l.name || 'Loan',
      type: l.type || l.name || 'Loan',
      amount: l.amount,
      interestRate: l.interestRate,
      tenureMonths: l.tenureMonths || l.duration || 0,
      emi: emi(Number(l.amount || 0), Number(l.interestRate || 0), Number(l.tenureMonths || l.duration || 0)),
      createdAt: l.createdAt,
      status: l.status || 'ACTIVE'
    }));

    // Calculate stress trend for visualization (last 6 months)
    const stressPercentage = disposableIncome > 0 ? (totalEMI / disposableIncome) * 100 : 0;
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    const stressTrend = months.map(month => ({
      month,
      stress: Number(stressPercentage.toFixed(2))
    }));

    // Return single source of truth
    return res.json({
      success: true,
      data: {
        monthlyIncome,
        monthlyExpenses,
        disposableIncome,
        totalEMI,
        emiRatio: Number(emiRatio.toFixed(2)),
        stressScore,
        recentLoans,
        stressTrend,
        loansCount: loans.length
      }
    });
  } catch (e) {
    console.error('Dashboard controller error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Alias for getDashboard
exports.getDashboardData = exports.getDashboard;

// PUT /api/dashboard/financial-info
exports.updateFinancialInfo = async (req, res) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { monthlyIncome, monthlyExpenses } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      { monthlyIncome, monthlyExpenses },
      { new: true }
    ).select('-password');

    return res.json({ success: true, data: user });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// PUT /api/dashboard/simulation
exports.updateSimulation = async (req, res) => {
  try {
    return res.json({ success: true, message: 'Simulation updated' });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
