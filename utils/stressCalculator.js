/**
 * Centralized Stress Calculation Utility
 * Used across all controllers for consistent stress metrics
 */

const calculateStressMetrics = (monthlyIncome, monthlyExpense, totalLoanEMI) => {
  if (monthlyIncome <= 0) {
    return {
      debtRatio: 0,
      stressLevel: 'DANGEROUS',
      riskScore: 100,
    };
  }

  // Debt Ratio = Total Monthly EMI / Monthly Income
  const debtRatio = totalLoanEMI / monthlyIncome;

  // Determine Stress Level
  let stressLevel;
  if (debtRatio <= 0.3) {
    stressLevel = 'SAFE';
  } else if (debtRatio > 0.3 && debtRatio <= 0.5) {
    stressLevel = 'RISKY';
  } else {
    stressLevel = 'DANGEROUS';
  }

  // Calculate Risk Score (0-100)
  // Factor 1: Debt Ratio (0-50 points)
  const debtRatioScore = Math.min((debtRatio / 0.8) * 50, 50);

  // Factor 2: EMI vs Disposable Income (0-30 points)
  const disposableIncome = monthlyIncome - monthlyExpense;
  let disposableScore = 0;
  if (disposableIncome > 0) {
    disposableScore = Math.max(0, 30 - (disposableIncome / totalLoanEMI) * 30);
  } else {
    disposableScore = 30;
  }

  // Factor 3: Expense Ratio (0-20 points)
  const expenseRatio = monthlyExpense / monthlyIncome;
  const expenseScore = Math.min(expenseRatio * 20, 20);

  const riskScore = Math.round(debtRatioScore + disposableScore + expenseScore);

  return {
    debtRatio: parseFloat(debtRatio.toFixed(4)),
    stressLevel,
    riskScore: Math.min(riskScore, 100),
  };
};

const getStressLevelColor = (stressLevel) => {
  switch (stressLevel) {
    case 'SAFE':
      return '#22c55e'; // green-500
    case 'RISKY':
      return '#eab308'; // yellow-500
    case 'DANGEROUS':
      return '#ef4444'; // red-500
    default:
      return '#6b7280'; // gray-500
  }
};

const getStressSuggestion = (debtRatio, stressLevel, monthlyIncome) => {
  const suggestions = [];

  if (stressLevel === 'SAFE') {
    const maxBorrowable = monthlyIncome * 0.25; // Can borrow up to 25% of income
    suggestions.push({
      title: '✅ Financial Health Good',
      message: `Your debt ratio is healthy at ${(debtRatio * 100).toFixed(1)}%. You can safely borrow up to ₹${Math.round(maxBorrowable)} more.`,
      priority: 'low',
    });
    suggestions.push({
      title: '💡 Maintain Your Discipline',
      message: 'Continue managing your expenses well. Consider building an emergency fund.',
      priority: 'low',
    });
  } else if (stressLevel === 'RISKY') {
    suggestions.push({
      title: '⚠️ Monitor Carefully',
      message: `Your debt ratio is at ${(debtRatio * 100).toFixed(1)}%. Avoid taking new loans.`,
      priority: 'medium',
    });
    suggestions.push({
      title: '🎯 Action Items',
      message: 'Control expenses, increase income if possible, or consider debt consolidation.',
      priority: 'medium',
    });
  } else {
    suggestions.push({
      title: '🚨 Critical Situation',
      message: `Your debt ratio is ${(debtRatio * 100).toFixed(1)}%. This requires immediate action.`,
      priority: 'high',
    });
    suggestions.push({
      title: '💰 Urgent Recommendations',
      message: 'Focus on closing high-interest loans, reduce non-essential spending, increase income, or seek financial counseling.',
      priority: 'high',
    });
  }

  return suggestions;
};

module.exports = {
  calculateStressMetrics,
  getStressLevelColor,
  getStressSuggestion,
};
