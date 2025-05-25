const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  listServices,
  getServiceStatus,
  startService,
  stopService,
  restartService,
  getServiceLogs,
  updateServiceConfig
} = require('../controllers/service');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Service management routes
router.get('/', authorize('admin', 'superadmin'), listServices);
router.get('/:serviceName/status', getServiceStatus);
router.post('/:serviceName/start', authorize('admin', 'superadmin'), startService);
router.post('/:serviceName/stop', authorize('admin', 'superadmin'), stopService);
router.post('/:serviceName/restart', authorize('admin', 'superadmin'), restartService);
router.get('/:serviceName/logs', authorize('admin', 'superadmin'), getServiceLogs);
router.put('/:serviceName/config', authorize('admin', 'superadmin'), updateServiceConfig);

module.exports = router; 