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
  const { monthlyIncome, monthlyExpenses, loans } = state;
  const dh = debtHealthScore(monthlyIncome, monthlyExpenses, loans);
  const priority = loanPriority(loans);
  const text = message.toLowerCase();
  if (/emi|interest|payment/.test(text)) {
    if (!loans.length) return 'No loans found. EMI calculation requires loan details.';
    const totalEMI = dh.totalEMI;
    return `Your total monthly EMI is ${totalEMI.toFixed(2)}. This is ${((totalEMI / monthlyIncome) * 100).toFixed(1)}% of your income. Keep EMIs under 30-35% for financial health.`;
  }
  if (/debt.*score|health.*score/.test(text)) {
    return `Your debt health score is ${dh.score} (${dh.category}). Total EMI: ${dh.totalEMI.toFixed(2)}, Disposable income: ${(monthlyIncome - monthlyExpenses).toFixed(2)}. Higher score means better debt management.`;
  }
  if (/loan.*priority|which.*first|pay.*off/.test(text)) {
    if (!priority) return 'No loans found. Nothing to prioritize.';
    return `Prioritize paying off the loan with highest interest rate: ${priority.loan.name || 'Loan'} at ${priority.loan.interestRate}%. This saves the most on interest.`;
  }
  if (/what.*if|simulation|scenario/.test(text)) {
    return 'What-if simulations show how extra payments or prepayments affect loan tenure and interest. For example, paying extra ₹1000/month on a ₹5L loan at 10% for 5 years can save ₹50,000 in interest and reduce tenure by 1 year.';
  }
  if (/tip|advice|reduce.*debt|save.*money/.test(text)) {
    return 'General debt reduction tips: 1) Pay more than minimum on high-interest loans. 2) Avoid new debt. 3) Increase income or cut expenses. 4) Build emergency fund. 5) Consolidate if rates are lower.';
  }
  // If none match, assume outside finance
  return 'I can help only with loan, EMI, and debt-related guidance.';
}

function portfolioSimulation(loans, newIncome, newExpenses, emiAdjustment) {
  // Calculate current total EMI
  const currentTotalEMI = loans.reduce((sum, l) => sum + emi(l.amount, l.interestRate, l.tenureMonths), 0);
  // New total EMI = current + adjustment
  const newTotalEMI = Math.max(0, currentTotalEMI + emiAdjustment);
  // Calculate interest saved: rough estimate based on extra payments
  const totalInterest = loans.reduce((sum, l) => sum + totalInterest(l.amount, l.interestRate, l.tenureMonths), 0);
  const interestSaved = emiAdjustment > 0 ? Math.min(totalInterest * 0.1, totalInterest) : 0; // cap at 10% of total interest
  // New debt-free date: proportional reduction in tenure
  const totalMonths = loans.reduce((sum, l) => sum + l.tenureMonths, 0) / loans.length; // average tenure
  const reduction = emiAdjustment / currentTotalEMI;
  const newMonths = totalMonths * (1 - Math.min(reduction, 0.5)); // max 50% reduction
  const newDebtFreeDate = loanEndDate(new Date(), newMonths);
  // Updated debt score
  const updatedScore = debtHealthScore(newIncome, newExpenses, loans).score;
  return {
    interestSaved: Number(interestSaved.toFixed(2)),
    newDebtFreeDate,
    updatedDebtScore: updatedScore
  };
}

module.exports = { emi, totalInterest, loanEndDate, debtHealthScore, loanPriority, simulate, assistantReply, portfolioSimulation };
