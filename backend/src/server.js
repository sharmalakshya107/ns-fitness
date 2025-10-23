const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration - allow both local and production
const allowedOrigins = [
  'http://localhost:3000',
  'https://ns-fitness.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    console.log('🔍 CORS Request from origin:', origin);
    
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed origins OR is a Vercel preview/deployment URL
    const isAllowed = allowedOrigins.indexOf(origin) !== -1;
    const isVercelDomain = origin && origin.includes('vercel.app');
    const isRenderDomain = origin && origin.includes('onrender.com');
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isAllowed || isVercelDomain || isRenderDomain || isDevelopment) {
      console.log('✅ CORS allowed for:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS blocked for:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Rate limiting (disabled for development)
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use(limiter);

// Compression and logging
app.use(compression());
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'NS Fitness API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/public', require('./routes/public')); // Public routes (no auth required)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/batches', require('./routes/batches'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/notifications', require('./routes/notifications'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 NS Fitness API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
