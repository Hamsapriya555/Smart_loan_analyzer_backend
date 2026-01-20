const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    method: {
      type: String,
      enum: ['AUTO_DEBIT', 'UPI', 'NET_BANKING', 'CARD', 'CASH', 'OTHER'],
      default: 'OTHER',
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'PENDING'],
      default: 'SUCCESS',
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, loanId: 1, date: -1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
