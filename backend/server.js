const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const winston = require('winston');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'buddybox-server' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*"]
    }
  }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
if (process.env.ENABLE_RATE_LIMITING === 'true') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use('/api/', limiter);
}

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Authentication middleware
const authMiddleware = require('./middleware/auth');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dns', authMiddleware, require('./routes/dns'));
app.use('/api/mail', authMiddleware, require('./routes/mail'));
app.use('/api/security', authMiddleware, require('./routes/security'));
app.use('/api/database', authMiddleware, require('./routes/database'));
app.use('/api/monitoring', authMiddleware, require('./routes/monitoring'));
app.use('/api/system', authMiddleware, require('./routes/system'));
app.use('/api/backup', authMiddleware, require('./routes/backup'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('../package.json').version
  });
});

// Socket.io for real-time monitoring
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Join monitoring room
  socket.join('monitoring');
  
  // Send initial system stats
  const systemService = require('./services/systemService');
  systemService.getSystemStats().then(stats => {
    socket.emit('system-stats', stats);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Scheduled tasks
if (process.env.NODE_ENV === 'production') {
  // System monitoring every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const systemService = require('./services/systemService');
      const stats = await systemService.getSystemStats();
      io.to('monitoring').emit('system-stats', stats);
    } catch (error) {
      logger.error('Error in system monitoring cron:', error);
    }
  });

  // Daily backup at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      const backupService = require('./services/backupService');
      await backupService.performDailyBackup();
      logger.info('Daily backup completed successfully');
    } catch (error) {
      logger.error('Error in daily backup:', error);
    }
  });

  // Security scan every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const securityService = require('./services/securityService');
      await securityService.performSecurityScan();
    } catch (error) {
      logger.error('Error in security scan:', error);
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`🚀 BuddyBox server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, io, logger };
