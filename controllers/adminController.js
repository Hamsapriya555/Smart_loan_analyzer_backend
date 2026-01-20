const User = require('../models/User');
const Loan = require('../models/Loan');
const StressHistory = require('../models/StressHistory');

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.',
    });
  }
};

// Get admin metrics
exports.getMetrics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const totalUsers = await User.countDocuments();
    const totalLoans = await Loan.countDocuments();

    const allUsers = await User.find({}).select('debtRatio stressLevel riskScore');
    const averageDebtRatio = (
      allUsers.reduce((sum, user) => sum + user.debtRatio, 0) / Math.max(totalUsers, 1)
    ).toFixed(4);

    const averageRiskScore = Math.round(
      allUsers.reduce((sum, user) => sum + user.riskScore, 0) / Math.max(totalUsers, 1)
    );

    const stressDistribution = {
      safe: allUsers.filter((u) => u.stressLevel === 'SAFE').length,
      risky: allUsers.filter((u) => u.stressLevel === 'RISKY').length,
      dangerous: allUsers.filter((u) => u.stressLevel === 'DANGEROUS').length,
    };

    const highRiskUsers = await User.find({ stressLevel: 'DANGEROUS' })
      .select('name email debtRatio riskScore stressLevel monthlyIncome')
      .limit(10);

    const loanTypeDistribution = await Loan.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
    ]);

    const activeLoansCount = await Loan.countDocuments({ status: 'ACTIVE' });
    const closedLoansCount = await Loan.countDocuments({ status: 'CLOSED' });

    const totalLoanAmount = await Loan.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);

    const metrics = {
      users: {
        total: totalUsers,
        averageDebtRatio: parseFloat(averageDebtRatio),
        averageRiskScore,
        stressDistribution,
        highRiskUsers,
      },
      loans: {
        total: totalLoans,
        active: activeLoansCount,
        closed: closedLoansCount,
        totalAmount: totalLoanAmount[0]?.total || 0,
        distribution: loanTypeDistribution,
      },
    };

    res.json({
      success: true,
      data: metrics,
      message: 'Admin metrics fetched successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch admin metrics',
    });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const { page = 1, limit = 20, sortBy = 'riskScore', order = 'desc' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const users = await User.find({})
      .select('-password')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments();

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
      message: 'Users fetched successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch users',
    });
  }
};

// Get user details (admin only)
exports.getUserDetails = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const loans = await Loan.find({ userId });
    const stressHistory = await StressHistory.find({ userId }).sort({ month: -1 }).limit(12);

    res.json({
      success: true,
      data: {
        user,
        loans,
        stressHistory,
      },
      message: 'User details fetched successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user details',
    });
  }
};

// Get system analytics
exports.getAnalytics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await StressHistory.aggregate([
      { $match: { month: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$month' } },
          avgDebtRatio: { $avg: '$debtRatio' },
          avgRiskScore: { $avg: '$riskScore' },
          safeCount: {
            $sum: { $cond: [{ $eq: ['$stressLevel', 'SAFE'] }, 1, 0] },
          },
          riskyCount: {
            $sum: { $cond: [{ $eq: ['$stressLevel', 'RISKY'] }, 1, 0] },
          },
          dangerousCount: {
            $sum: { $cond: [{ $eq: ['$stressLevel', 'DANGEROUS'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const analytics = {
      monthlyTrend,
    };

    res.json({
      success: true,
      data: analytics,
      message: 'Analytics fetched successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch analytics',
    });
  }
};

module.exports = {
  getMetrics: exports.getMetrics,
  getAllUsers: exports.getAllUsers,
  getUserDetails: exports.getUserDetails,
  getAnalytics: exports.getAnalytics,
};
