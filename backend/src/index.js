const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const dnsRoutes = require('./routes/dns');
const webServerRoutes = require('./routes/webServer');
const databaseRoutes = require('./routes/database');
const mailRoutes = require('./routes/mail');
const monitoringRoutes = require('./routes/monitoring');
const userRoutes = require('./routes/users');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  })
);

// Body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/dns', dnsRoutes);
app.use('/api/webserver', webServerRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Don't exit the process in production, just log the error
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

module.exports = app; // For testing purposes 