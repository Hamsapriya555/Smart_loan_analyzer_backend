const User = require('../models/User');
const Loan = require('../models/Loan');
const { calculateStressMetrics, getStressSuggestion } = require('../utils/stressCalculator');

// Get smart suggestions based on user's financial profile
exports.getSuggestions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const loans = await Loan.find({ userId: req.user.id, status: 'ACTIVE' });

    const totalEMI = loans.reduce((sum, loan) => sum + loan.monthlyEMI, 0);
    const stressMetrics = calculateStressMetrics(
      user.monthlyIncome,
      user.monthlyExpense,
      totalEMI
    );

    const suggestions = getStressSuggestion(
      stressMetrics.debtRatio,
      stressMetrics.stressLevel,
      user.monthlyIncome
    );

    // Add loan-specific suggestions
    if (loans.length > 0) {
      // Find highest interest loan
      const highestInterestLoan = loans.reduce((max, loan) =>
        loan.interestRate > max.interestRate ? loan : max
      );

      suggestions.push({
        title: '💡 Reduce Highest Interest Loan',
        message: `Your ${highestInterestLoan.type} at ${highestInterestLoan.interestRate}% is costing you the most. Consider paying extra towards this.`,
        priority: stressMetrics.stressLevel === 'DANGEROUS' ? 'high' : 'medium',
      });
    }

    // Expense-based suggestions
    const expenseRatio = user.monthlyExpense / user.monthlyIncome;
    if (expenseRatio > 0.6) {
      suggestions.push({
        title: '🛒 Reduce Expenses',
        message: `Your expenses are ${(expenseRatio * 100).toFixed(0)}% of income. Aim to reduce to under 60%.`,
        priority: 'high',
      });
    }

    // Income-based suggestions
    if (stressMetrics.debtRatio > 0.4) {
      suggestions.push({
        title: '📈 Increase Income',
        message: 'Consider taking additional income sources to reduce debt pressure.',
        priority: 'medium',
      });
    }

    // Savings suggestions
    const disposableIncome = user.monthlyIncome - user.monthlyExpense - totalEMI;
    if (disposableIncome > 0) {
      suggestions.push({
        title: '💰 Build Emergency Fund',
        message: `You have ₹${Math.round(disposableIncome)} disposable income monthly. Build a 6-month emergency fund.`,
        priority: 'low',
      });
    }

    res.json({
      success: true,
      data: {
        stressMetrics,
        suggestions,
        disposableIncome: Math.max(disposableIncome, 0),
      },
      message: 'Suggestions generated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get suggestions',
    });
  }
};

// Get financial insights
exports.getInsights = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const loans = await Loan.find({ userId: req.user.id });

    const activeLoans = loans.filter((l) => l.status === 'ACTIVE');
    const closedLoans = loans.filter((l) => l.status === 'CLOSED');

    const totalBorrowed = activeLoans.reduce((sum, loan) => sum + loan.amount, 0);
    const totalRepaid = closedLoans.reduce((sum, loan) => sum + loan.amount, 0);
    const totalInterestPaid = closedLoans.reduce((sum, loan) => sum + loan.totalInterest, 0);

    const insights = {
      totalBorrowed,
      totalRepaid,
      totalInterestPaid,
      averageInterestRate:
        activeLoans.length > 0
          ? (activeLoans.reduce((sum, loan) => sum + loan.interestRate, 0) / activeLoans.length).toFixed(2)
          : 0,
      loanDiversity: {
        homeLoans: activeLoans.filter((l) => l.type === 'Home Loan').length,
        carLoans: activeLoans.filter((l) => l.type === 'Car Loan').length,
        personalLoans: activeLoans.filter((l) => l.type === 'Personal Loan').length,
        educationLoans: activeLoans.filter((l) => l.type === 'Education Loan').length,
      },
      financialHealth: {
        monthlyIncome: user.monthlyIncome,
        monthlyExpense: user.monthlyExpense,
        monthlyEMI: activeLoans.reduce((sum, loan) => sum + loan.monthlyEMI, 0),
        disposableIncome: Math.max(
          user.monthlyIncome - user.monthlyExpense - activeLoans.reduce((sum, loan) => sum + loan.monthlyEMI, 0),
          0
        ),
      },
    };

    res.json({
      success: true,
      data: insights,
      message: 'Insights generated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get insights',
    });
  }
};
