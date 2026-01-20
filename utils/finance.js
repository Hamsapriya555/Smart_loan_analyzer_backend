// Centralized financial calculation logic
function emi(amount, annualRate, tenureMonths) {
  const r = (annualRate / 12) / 100;
  if (r === 0) return tenureMonths > 0 ? amount / tenureMonths : 0;
  const e = amount * r * Math.pow(1 + r, tenureMonths) / (Math.pow(1 + r, tenureMonths) - 1);
  return Number(e.toFixed(2));
}

function totalInterest(amount, annualRate, tenureMonths) {
  const e = emi(amount, annualRate, tenureMonths);
  const totalPaid = e * tenureMonths;
  return Number((totalPaid - amount).toFixed(2));
}

function loanEndDate(startDate, tenureMonths) {
  const d = new Date(startDate || Date.now());
  d.setMonth(d.getMonth() + tenureMonths);
  return d;
}

function debtHealthScore(monthlyIncome, monthlyExpenses, loans) {
  const disposable = Math.max(0, monthlyIncome - monthlyExpenses);
  const totalEMI = loans.reduce((sum, l) => sum + emi(l.amount, l.interestRate, l.tenureMonths), 0);
  const ratio = disposable > 0 ? totalEMI / disposable : 1;
  // Base score from ratio (0 when ratio>=1, 100 when ratio=0)
  let score = Math.max(0, 100 - Math.min(1, ratio) * 100);
  // Penalty for number of loans beyond 1
  const penalty = Math.max(0, loans.length - 1) * 5;
  score = Math.max(0, score - penalty);
  let category = 'Safe';
  if (score < 40) category = 'High Risk';
  else if (score < 70) category = 'Moderate';
  return { score: Math.round(score), category, totalEMI: Number(totalEMI.toFixed(2)) };
}

function loanPriority(loans) {
  if (!loans.length) return null;
  // Prioritize by highest interest rate; tie-breaker by highest EMI/impact
  const withEmi = loans.map(l => ({ ...l, _emi: emi(l.amount, l.interestRate, l.tenureMonths) }));
  withEmi.sort((a, b) => b.interestRate - a.interestRate || b._emi - a._emi);
  const top = withEmi[0];
  return { id: top._id || top.id || null, reason: 'Highest interest rate and EMI impact', suggestion: 'Prioritize extra payments here to reduce total interest.', loan: top };
}

function simulate({ amount, interestRate, tenureMonths }, { extraEMI = 0, prepayment = 0 }) {
  // Simple what-if: either increase EMI by extraEMI per month or one-time prepayment now
  // Return interest saved and new debt-free date estimation
  const baseEmi = emi(amount, interestRate, tenureMonths);
  const r = (interestRate / 12) / 100;

  // Apply prepayment immediately to principal
  let principal = Math.max(0, amount - prepayment);
  let months = 0;
  let interestPaid = 0;
  const pay = baseEmi + extraEMI;
  if (r === 0) {
    months = Math.ceil(principal / pay);
    interestPaid = 0;
  } else {
    while (principal > 0 && months < 1200) { // guard max 100 years
      const interest = principal * r;
      let principalPay = Math.min(principal, pay - interest);
      if (principalPay <= 0) {
        // Payment not enough to cover interest; break to avoid infinite loop
        principalPay = 0;
        months = 1200; // force exit
        break;
      }
      principal -= principalPay;
      interestPaid += interest;
      months++;
    }
  }
  const newEndDate = loanEndDate(new Date(), months);

  // Baseline interest for comparison
  const baseInterest = totalInterest(amount, interestRate, tenureMonths);
  const interestSaved = Math.max(0, Number((baseInterest - interestPaid).toFixed(2)));
  return { months, newEndDate, interestSaved, newEmi: Number(pay.toFixed(2)) };
}

function assistantReply(state, message) {
  const { monthlyIncome, monthlyExpenses, loans, totalEMI: passedEMI, stressScore: passedScore } = state;
  
  // Use pre-calculated values from frontend if available, otherwise recalculate
  let score, category, totalEMI;
  if (passedScore !== undefined && passedScore !== null) {
    score = passedScore;
    category = score >= 70 ? 'Low Stress' : score >= 40 ? 'Moderate Stress' : 'High Stress';
  } else {
    const dh = debtHealthScore(monthlyIncome, monthlyExpenses, loans);
    score = dh.score;
    category = dh.category;
    totalEMI = dh.totalEMI;
  }
  
  totalEMI = passedEMI !== undefined ? Number(passedEMI) : totalEMI;
  
  const priority = loanPriority(loans);
  const text = message.toLowerCase();
  if (/new loan|take.*loan|another loan/.test(text)) {
    if (score >= 75) return `Stress score ${score} (${category}). With EMI to income well-managed, a small new loan may be acceptable if necessary. Keep total EMI under 30% of disposable income.`;
    if (score >= 50) return `Stress score ${score} (${category}). Consider avoiding new loans until you reduce existing EMIs below 30–35% of disposable income.`;
    return `Stress score ${score} (${category}). Avoid taking a new loan now. Focus on reducing current debt first.`;
  }
  if (/which.*loan.*(close|pay|first)|priorit/i.test(text)) {
    if (!priority) return 'No loans found. Nothing to prioritize.';
    return `Prioritize the loan with highest interest: ${priority.loan.name || priority.loan.type || 'Loan'} at ${priority.loan.interestRate}%. This reduces total interest fastest.`;
  }
  if (/explain|score|why/.test(text)) {
    return `Your stress score is ${score} (${category}). Total EMI is ${Number(totalEMI || 0).toFixed(2)}, compared to disposable income ${(monthlyIncome - monthlyExpenses).toFixed(2)}. More loans increase risk; focus on the highest-interest loan first.`;
  }
  return `Based on your profile, stress score is ${score} (${category}). ${priority ? 'Prioritize highest-interest loan at ' + priority.loan.interestRate + '%.' : ''} Ask about simulations or whether to take new loans.`;
}

module.exports = { emi, totalInterest, loanEndDate, debtHealthScore, loanPriority, simulate, assistantReply };
