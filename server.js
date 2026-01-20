require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: true, // allow all origins in development
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true,
}));
app.use(express.json());

// Explicit OPTIONS handler for CORS preflight
app.options('*', cors());

// MongoDB Connection with retry
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-loan-analyzer';

const connectWithRetry = async (attempt = 1) => {
  try {
    await mongoose.connect(MONGO_URI, { autoIndex: true });
    console.log('MongoDB connected successfully');
  } catch (err) {
    const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
    console.error(`MongoDB connection error (attempt ${attempt}): ${err.message}. Retrying in ${Math.round(
      delay / 1000
    )}s...`);
    setTimeout(() => connectWithRetry(attempt + 1), delay);
  }
};
connectWithRetry();

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Loan & Debt Stress Analyzer Backend API',
  });
});

// Routes - standardized feature set only
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/finance', require('./routes/financeRoutes'));
app.use('/api/loan', require('./routes/loanRoutes'));
app.use('/api/loan/simulate', require('./routes/loanSimRoutes'));
app.use('/api/assistant', require('./routes/assistantRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Test route
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
