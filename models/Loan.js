const mongoose = require('mongoose');

const LoanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, default: 'Loan' },
    name: { type: String, default: 'Loan' },
    amount: { type: Number, required: true, min: 0 },
    interestRate: { type: Number, required: true, min: 0 },
    tenureMonths: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['ACTIVE', 'Active', 'active', 'PAID', 'Paid', 'paid', 'PENDING', 'Pending', 'pending'], default: 'ACTIVE' },
    startDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Loan', LoanSchema);
