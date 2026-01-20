const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smart-loan-analyzer-secret-key-2024';

function sign(user) {
  try {
    if (!user || !user._id) {
      throw new Error('Invalid user object for token signing');
    }
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    return token;
  } catch (err) {
    console.error('Token signing error:', err);
    throw err;
  }
}

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }
    
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    
    // Create user and wait for it to be fully saved
    const user = await User.create({ 
      name, 
      email: email.toLowerCase(), 
      password 
    });
    
    console.log('User created successfully:', user._id);
    
    // Generate token
    const token = sign(user);
    console.log('Token generated:', token ? 'Success' : 'Failed');
    
    if (!token) {
      return res.status(500).json({ success: false, message: 'Failed to generate token' });
    }
    
    res.status(201).json({ 
      success: true, 
      data: { 
        token, 
        user: { 
          id: user._id, 
          name: user.name, 
          email: user.email 
        } 
      } 
    });
  } catch (e) {
    console.error('Registration error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password required' });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const token = sign(user);
    console.log('Login - Token generated:', token ? 'Success' : 'Failed');
    
    if (!token) {
      return res.status(500).json({ success: false, message: 'Failed to generate token' });
    }
    
    res.json({ 
      success: true, 
      data: { 
        token, 
        user: { 
          id: user._id, 
          name: user.name, 
          email: user.email 
        } 
      } 
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json({ success: true, data: user });
};
