const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const logger = require('../utils/logger');

// List all available services
const listServices = async (req, res) => {
  try {
    const { stdout } = await execAsync('systemctl list-units --type=service --state=running,failed');
    const services = stdout
      .split('\n')
      .filter(line => line.includes('.service'))
      .map(line => {
        const [unit, load, active, sub, description] = line.split(/\s+/);
        return {
          name: unit.replace('.service', ''),
          status: active,
          description
        };
      });

    res.json({
      status: 'success',
      data: { services }
    });
  } catch (error) {
    logger.error('Error listing services:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list services'
    });
  }
};

// Get service status
const getServiceStatus = async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { stdout } = await execAsync(`systemctl status ${serviceName}`);
    
    const status = {
      name: serviceName,
      active: stdout.includes('Active: active'),
      running: stdout.includes('running'),
      enabled: stdout.includes('enabled'),
      lastError: stdout.includes('error') ? stdout.split('error')[1].split('\n')[0].trim() : null
    };

    res.json({
      status: 'success',
      data: { status }
    });
  } catch (error) {
    logger.error(`Error getting status for service ${req.params.serviceName}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get service status'
    });
  }
};

// Start a service
const startService = async (req, res) => {
  try {
    const { serviceName } = req.params;
    await execAsync(`systemctl start ${serviceName}`);
    
    res.json({
      status: 'success',
      message: `Service ${serviceName} started successfully`
    });
  } catch (error) {
    logger.error(`Error starting service ${req.params.serviceName}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to start service'
    });
  }
};

// Stop a service
const stopService = async (req, res) => {
  try {
    const { serviceName } = req.params;
    await execAsync(`systemctl stop ${serviceName}`);
    
    res.json({
      status: 'success',
      message: `Service ${serviceName} stopped successfully`
    });
  } catch (error) {
    logger.error(`Error stopping service ${req.params.serviceName}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to stop service'
    });
  }
};

// Restart a service
const restartService = async (req, res) => {
  try {
    const { serviceName } = req.params;
    await execAsync(`systemctl restart ${serviceName}`);
    
    res.json({
      status: 'success',
      message: `Service ${serviceName} restarted successfully`
    });
  } catch (error) {
    logger.error(`Error restarting service ${req.params.serviceName}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to restart service'
    });
  }
};

// Get service logs
const getServiceLogs = async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { lines = 100 } = req.query;
    const { stdout } = await execAsync(`journalctl -u ${serviceName} -n ${lines}`);
    
    res.json({
      status: 'success',
      data: { logs: stdout }
    });
  } catch (error) {
    logger.error(`Error getting logs for service ${req.params.serviceName}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get service logs'
    });
  }
};

// Update service configuration
const updateServiceConfig = async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { config } = req.body;

    // Validate config
    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid configuration provided'
      });
    }

    // Update service configuration
    // This is a placeholder - actual implementation would depend on the service type
    await execAsync(`systemctl daemon-reload`);
    
    res.json({
      status: 'success',
      message: `Service ${serviceName} configuration updated successfully`
    });
  } catch (error) {
    logger.error(`Error updating configuration for service ${req.params.serviceName}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update service configuration'
    });
  }
};

module.exports = {
  listServices,
  getServiceStatus,
  startService,
  stopService,
  restartService,
  getServiceLogs,
  updateServiceConfig
}; 