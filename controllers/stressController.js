const User = require('../models/User');
const Loan = require('../models/Loan');
const StressHistory = require('../models/StressHistory');
const { calculateStressMetrics } = require('../utils/stressCalculator');

/**
 * Get current stress metrics for the logged-in user
 */
exports.getCurrentStress = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user
    const user = await User.findById(userId);

    // Get active loans
    const loans = await Loan.find({ userId, status: 'ACTIVE' });
    const totalEMI = loans.reduce((sum, loan) => sum + loan.monthlyEMI, 0);

    // Calculate stress metrics
    const stressMetrics = calculateStressMetrics(
      user.monthlyIncome,
      user.monthlyExpense,
      totalEMI
    );

    // Update user with latest metrics
    user.debtRatio = stressMetrics.debtRatio;
    user.stressLevel = stressMetrics.stressLevel;
    user.riskScore = stressMetrics.riskScore;
    await user.save();

    res.json({
      success: true,
      data: {
        debtRatio: stressMetrics.debtRatio,
        stressLevel: stressMetrics.stressLevel,
        riskScore: stressMetrics.riskScore,
        monthlyIncome: user.monthlyIncome,
        monthlyExpense: user.monthlyExpense,
        totalEMI,
        disposableIncome: Math.max(user.monthlyIncome - user.monthlyExpense - totalEMI, 0),
      },
      message: 'Current stress metrics',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stress metrics',
    });
  }
};

/**
 * Get stress trend data (last 6-12 months)
 */
exports.getStressTrend = async (req, res) => {
  try {
    const userId = req.user.id;
    const months = parseInt(req.query.months) || 6;

    // Get stress history for past months
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - months);

    const trendData = await StressHistory.find({
      userId,
      month: { $gte: pastDate },
    })
      .sort({ month: 1 })
      .lean();

    // If no history, generate current data
    if (trendData.length === 0) {
      const user = await User.findById(userId);
      const loans = await Loan.find({ userId, status: 'ACTIVE' });
      const totalEMI = loans.reduce((sum, loan) => sum + loan.monthlyEMI, 0);
      const stressMetrics = calculateStressMetrics(
        user.monthlyIncome,
        user.monthlyExpense,
        totalEMI
      );

      return res.json({
        success: true,
        data: [
          {
            month: new Date().toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            debtRatio: stressMetrics.debtRatio,
            stressLevel: stressMetrics.stressLevel,
            riskScore: stressMetrics.riskScore,
            totalEMI,
            monthlyIncome: user.monthlyIncome,
          },
        ],
        message: 'Stress trend data',
      });
    }

    // Format trend data for charts
    const formattedData = trendData.map((item) => ({
      month: item.month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      debtRatio: item.debtRatio,
      stressLevel: item.stressLevel,
      riskScore: item.riskScore,
      totalEMI: item.totalLoanEMI,
      monthlyIncome: item.monthlyIncome,
    }));

    res.json({
      success: true,
      data: formattedData,
      message: 'Stress trend data',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stress trend',
    });
  }
};

/**
 * Get stress analysis with insights
 */
exports.getStressAnalysis = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    const loans = await Loan.find({ userId, status: 'ACTIVE' });
    const totalEMI = loans.reduce((sum, loan) => sum + loan.monthlyEMI, 0);

    const stressMetrics = calculateStressMetrics(
      user.monthlyIncome,
      user.monthlyExpense,
      totalEMI
    );

    // Get stress history
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const stressHistory = await StressHistory.find({
      userId,
      month: { $gte: sixMonthsAgo },
    }).sort({ month: 1 });

    // Generate insights
    const insights = generateStressInsights(
      user,
      loans,
      stressMetrics,
      totalEMI,
      stressHistory
    );

    res.json({
      success: true,
      data: {
        currentMetrics: stressMetrics,
        financialInfo: {
          monthlyIncome: user.monthlyIncome,
          monthlyExpense: user.monthlyExpense,
          totalEMI,
          disposableIncome: Math.max(
            user.monthlyIncome - user.monthlyExpense - totalEMI,
            0
          ),
        },
        loans: {
          count: loans.length,
          total: loans.reduce((sum, l) => sum + l.amount, 0),
          highestInterest: loans.length > 0 
            ? loans.reduce((max, l) => (l.interestRate > max.interestRate ? l : max)).interestRate
            : 0,
        },
        insights,
        trend: stressHistory.map((sh) => ({
          month: sh.month.toLocaleDateString('en-US', { month: 'short' }),
          riskScore: sh.riskScore,
          stressLevel: sh.stressLevel,
        })),
      },
      message: 'Stress analysis complete',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stress analysis',
    });
  }
};

/**
 * Generate text insights based on stress metrics
 */
const generateStressInsights = (user, loans, metrics, totalEMI, history) => {
  const insights = [];

  if (metrics.stressLevel === 'SAFE') {
    insights.push({
      type: 'positive',
      title: '✅ Your Debt is Healthy',
      message: `Your debt-to-income ratio is ${(metrics.debtRatio * 100).toFixed(1)}%, which is in the safe zone (≤30%). You're managing your finances well!`,
    });
    insights.push({
      type: 'info',
      title: '💡 Room for More Borrowing',
      message: `You can safely borrow up to ₹${Math.round(
        user.monthlyIncome * 0.3 - totalEMI
      )} more without entering the risky zone.`,
    });
  } else if (metrics.stressLevel === 'RISKY') {
    insights.push({
      type: 'warning',
      title: '⚠️ Watch Your Debt Levels',
      message: `Your debt ratio is ${(metrics.debtRatio * 100).toFixed(
        1
      )}% (30-50%), which is in the warning zone. Be careful about taking new loans.`,
    });
    insights.push({
      type: 'action',
      title: '🎯 Recommended Actions',
      message: 'Focus on reducing expenses or increasing income. Consider accelerating loan repayment.',
    });
  } else {
    insights.push({
      type: 'danger',
      title: '🚨 Critical Debt Situation',
      message: `Your debt ratio is ${(metrics.debtRatio * 100).toFixed(
        1
      )}% (>50%). This is unsustainable and requires immediate attention.`,
    });
    insights.push({
      type: 'action',
      title: '💰 Urgent Steps',
      message: 'Consider debt consolidation, significantly reduce expenses, or seek financial counseling.',
    });
    if (loans.length > 0) {
      const highestInterest = loans.reduce((max, l) =>
        l.interestRate > max.interestRate ? l : max
      );
      insights.push({
        type: 'action',
        title: '🎯 Prioritize Highest Interest Loan',
        message: `Focus on closing your ${highestInterest.type} loan (${highestInterest.interestRate}% interest) first to reduce burden.`,
      });
    }
  }

  // Add trend insight if history exists
  if (history.length > 1) {
    const latestScore = history[history.length - 1].riskScore;
    const previousScore = history[history.length - 2].riskScore;

    if (latestScore > previousScore) {
      insights.push({
        type: 'warning',
        title: '📈 Stress is Increasing',
        message: `Your stress level increased from ${previousScore} to ${latestScore} points in the last month.`,
      });
    } else if (latestScore < previousScore) {
      insights.push({
        type: 'positive',
        title: '📉 Stress is Decreasing',
        message: `Great progress! Your stress level improved from ${previousScore} to ${latestScore} points.`,
      });
    }
  }

  return insights;
};
