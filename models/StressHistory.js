const mongoose = require('mongoose');

const StressHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    monthlyIncome: {
      type: Number,
      required: true,
    },
    monthlyExpense: {
      type: Number,
      required: true,
    },
    totalLoanEMI: {
      type: Number,
      required: true,
    },
    debtRatio: {
      type: Number,
      required: true,
    },
    stressLevel: {
      type: String,
      enum: ['SAFE', 'RISKY', 'DANGEROUS'],
      required: true,
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    month: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Index for efficient querying
StressHistorySchema.index({ userId: 1, month: -1 });

module.exports = mongoose.model('StressHistory', StressHistorySchema);
