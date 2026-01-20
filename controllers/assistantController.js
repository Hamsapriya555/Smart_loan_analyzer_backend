const { debtHealthScore, loanPriority, assistantReply } = require('../utils/finance');

const chat = async (req, res) => {
  try {
    const { monthlyIncome = 0, monthlyExpenses = 0, totalEMI = 0, stressScore: passedScore = null, loans = [], message = '' } = req.body || {};
    if (!message) {
      return res.status(400).json({ success: false, message: 'message is required' });
    }

    // ✅ STRICT INPUT SANITIZATION
    const safeIncome = Number(monthlyIncome) || 0;
    const safeExpenses = Number(monthlyExpenses) || 0;
    const safeEMI = Number(totalEMI) || 0;
    const safeLoans = Array.isArray(loans) ? loans : [];

    // ✅ Check if income data is available
    if (safeIncome === 0) {
      return res.json({ 
        success: true, 
        data: { 
          reply: 'Income data not available yet. Please set your financial information on the Dashboard first.',
          stressScore: 0,
          category: 'Unknown',
          priority: null,
          timestamp: new Date().toISOString()
        } 
      });
    }

    // Use passed stressScore if available (from frontend dashboard), otherwise recalculate
    let stressScore, category;
    if (passedScore !== null && Number.isFinite(passedScore)) {
      stressScore = Number(passedScore);
      category = stressScore >= 70 ? 'Low Stress' : stressScore >= 40 ? 'Moderate Stress' : 'High Stress';
    } else {
      const scoreData = debtHealthScore(safeIncome, safeExpenses, safeLoans);
      stressScore = scoreData.score;
      category = scoreData.category;
    }
    const priority = loanPriority(safeLoans);

    let reply = assistantReply({ 
      monthlyIncome: safeIncome, 
      monthlyExpenses: safeExpenses, 
      loans: safeLoans,
      totalEMI: safeEMI,
      stressScore: stressScore  // Pass pre-calculated stress score from frontend
    }, message);
    
    // ✅ SANITIZE OUTPUT - Replace any NaN, undefined, or invalid values
    reply = String(reply || '')
      .replace(/NaN/g, '0.00')
      .replace(/undefined/g, 'unavailable')
      .replace(/Infinity/g, 'very high');

    return res.json({ 
      success: true, 
      data: { 
        reply: reply || 'Please ask about your financial situation.',
        stressScore: Number.isFinite(stressScore) ? stressScore : 0,
        category: category || 'Unknown',
        priority: priority || null,
        timestamp: new Date().toISOString() 
      } 
    });
  } catch (error) {
    console.error('Assistant chat error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { chat };
