const { simulate } = require('../utils/finance');

exports.simulateLoan = async (req, res) => {
  try {
    const { loan, whatIf } = req.body;
    if (!loan || !whatIf) return res.status(400).json({ success: false, message: 'loan and whatIf required' });
    const normalized = {
      amount: Number(loan.amount),
      interestRate: Number(loan.interestRate),
      tenureMonths: Number(loan.tenureMonths || loan.duration),
    };
    const options = {
      extraEMI: Number(whatIf.extraEMI || 0),
      prepayment: Number(whatIf.prepayment || 0),
    };
    const result = simulate(normalized, options);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
