const mongoose = require('mongoose');

const SimulationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    newIncome: {
      type: Number,
      required: true,
    },
    newExpenses: {
      type: Number,
      required: true,
    },
    adjustEMI: {
      type: Number,
      required: true,
    },
    stressScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Simulation', SimulationSchema);
