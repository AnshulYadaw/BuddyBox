const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Get system statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getSystemStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get running processes
router.get('/processes', async (req, res) => {
  try {
    const processes = await getRunningProcesses();
    res.json({ success: true, processes });
  } catch (error) {
    console.error('Error getting processes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get system services status
router.get('/services', async (req, res) => {
  try {
    const services = await getSystemServices();
    res.json({ success: true, services });
  } catch (error) {
    console.error('Error getting services:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Control system service
router.post('/services/:serviceName/:action', async (req, res) => {
  try {
    const { serviceName, action } = req.params;
    const validActions = ['start', 'stop', 'restart', 'reload'];
    
    if (!validActions.includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    const result = await controlService(serviceName, action);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error controlling service:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Kill process
router.delete('/processes/:pid', async (req, res) => {
  try {
    const { pid } = req.params;
    const { force } = req.query;
    
    const result = await killProcess(pid, force === 'true');
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error killing process:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get disk usage
router.get('/disk', async (req, res) => {
  try {
    const diskInfo = await getDiskUsage();
    res.json({ success: true, diskInfo });
  } catch (error) {
    console.error('Error getting disk usage:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get network statistics
router.get('/network', async (req, res) => {
  try {
    const networkStats = await getNetworkStats();
    res.json({ success: true, networkStats });
  } catch (error) {
    console.error('Error getting network stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get system logs
router.get('/logs/:logType', async (req, res) => {
  try {
    const { logType } = req.params;
    const { lines = 100 } = req.query;
    
    const logs = await getSystemLogs(logType, parseInt(lines));
    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions
async function getSystemStats() {
  const cpuInfo = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  // Get CPU usage
  const cpuUsage = await getCpuUsage();
  
  // Get load average
  const loadAvg = os.loadavg();
  
  return {
    cpu: {
      cores: cpuInfo.length,
      model: cpuInfo[0].model,
      usage: cpuUsage,
      loadAvg: loadAvg
    },
    memory: {
      total: totalMem,
      used: usedMem,
      free: freeMem,
      usage: Math.round((usedMem / totalMem) * 100)
    },
    uptime: os.uptime(),
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    timestamp: Date.now()
  };
}

function getCpuUsage() {
  return new Promise((resolve) => {
    const cpus = os.cpus();
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
    
    for (const cpu of cpus) {
      user += cpu.times.user;
      nice += cpu.times.nice;
      sys += cpu.times.sys;
      idle += cpu.times.idle;
      irq += cpu.times.irq;
    }
    
    const total = user + nice + sys + idle + irq;
    const usage = Math.round(((total - idle) / total) * 100);
    
    resolve(usage);
  });
}

function getRunningProcesses() {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32' 
      ? 'tasklist /fo csv' 
      : 'ps aux --no-headers';
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      try {
        let processes = [];
        
        if (process.platform === 'win32') {
          const lines = stdout.trim().split('\n').slice(1); // Skip header
          processes = lines.map(line => {
            const cols = line.split('","').map(col => col.replace(/"/g, ''));
            return {
              name: cols[0],
              pid: cols[1],
              sessionName: cols[2],
              sessionNumber: cols[3],
              memUsage: cols[4]
            };
          });
        } else {
          const lines = stdout.trim().split('\n');
          processes = lines.map(line => {
            const cols = line.trim().split(/\s+/);
            return {
              user: cols[0],
              pid: cols[1],
              cpu: cols[2],
              mem: cols[3],
              vsz: cols[4],
              rss: cols[5],
              tty: cols[6],
              stat: cols[7],
              start: cols[8],
              time: cols[9],
              command: cols.slice(10).join(' ')
            };
          });
        }
        
        resolve(processes.slice(0, 50)); // Limit to top 50 processes
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

function getSystemServices() {
  return new Promise((resolve, reject) => {
    const services = [
      'nginx', 'apache2', 'mysql', 'postgresql', 'redis-server',
      'ssh', 'postfix', 'dovecot', 'bind9', 'fail2ban'
    ];
    
    const serviceChecks = services.map(service => checkServiceStatus(service));
    
    Promise.allSettled(serviceChecks)
      .then(results => {
        const serviceStatuses = results.map((result, index) => ({
          name: services[index],
          status: result.status === 'fulfilled' ? result.value : 'unknown',
          error: result.status === 'rejected' ? result.reason.message : null
        }));
        resolve(serviceStatuses);
      });
  });
}

function checkServiceStatus(serviceName) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32'
      ? `sc query "${serviceName}"`
      : `systemctl is-active ${serviceName}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve('inactive');
        return;
      }
      
      if (process.platform === 'win32') {
        resolve(stdout.includes('RUNNING') ? 'active' : 'inactive');
      } else {
        resolve(stdout.trim() === 'active' ? 'active' : 'inactive');
      }
    });
  });
}

function controlService(serviceName, action) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32'
      ? `net ${action} "${serviceName}"`
      : `sudo systemctl ${action} ${serviceName}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function killProcess(pid, force = false) {
  return new Promise((resolve, reject) => {
    const signal = force ? 'SIGKILL' : 'SIGTERM';
    const command = process.platform === 'win32'
      ? `taskkill ${force ? '/F' : ''} /PID ${pid}`
      : `kill ${force ? '-9' : '-15'} ${pid}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function getDiskUsage() {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32'
      ? 'wmic logicaldisk get size,freespace,caption'
      : 'df -h';
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      try {
        let diskInfo = [];
        
        if (process.platform === 'win32') {
          const lines = stdout.trim().split('\n').slice(1);
          diskInfo = lines.map(line => {
            const cols = line.trim().split(/\s+/);
            const total = parseInt(cols[2]);
            const free = parseInt(cols[1]);
            const used = total - free;
            
            return {
              filesystem: cols[0],
              size: formatBytes(total),
              used: formatBytes(used),
              available: formatBytes(free),
              usage: Math.round((used / total) * 100) + '%',
              mountpoint: cols[0]
            };
          });
        } else {
          const lines = stdout.trim().split('\n').slice(1);
          diskInfo = lines.map(line => {
            const cols = line.trim().split(/\s+/);
            return {
              filesystem: cols[0],
              size: cols[1],
              used: cols[2],
              available: cols[3],
              usage: cols[4],
              mountpoint: cols[5]
            };
          });
        }
        
        resolve(diskInfo);
      } catch (parseError) {
        reject(parseError);
      }
    });
  });
}

function getNetworkStats() {
  return new Promise((resolve, reject) => {
    const networkInterfaces = os.networkInterfaces();
    const stats = [];
    
    Object.keys(networkInterfaces).forEach(interfaceName => {
      const interfaces = networkInterfaces[interfaceName];
      interfaces.forEach(iface => {
        if (!iface.internal) {
          stats.push({
            interface: interfaceName,
            address: iface.address,
            family: iface.family,
            mac: iface.mac,
            internal: iface.internal
          });
        }
      });
    });
    
    resolve(stats);
  });
}

function getSystemLogs(logType, lines) {
  return new Promise((resolve, reject) => {
    let logPath;
    
    switch (logType) {
      case 'system':
        logPath = '/var/log/syslog';
        break;
      case 'auth':
        logPath = '/var/log/auth.log';
        break;
      case 'mail':
        logPath = '/var/log/mail.log';
        break;
      case 'nginx':
        logPath = '/var/log/nginx/error.log';
        break;
      case 'apache':
        logPath = '/var/log/apache2/error.log';
        break;
      default:
        reject(new Error('Invalid log type'));
        return;
    }
    
    const command = `tail -n ${lines} ${logPath}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      const logLines = stdout.trim().split('\n').map(line => ({
        timestamp: extractTimestamp(line),
        message: line,
        level: extractLogLevel(line)
      }));
      
      resolve(logLines);
    });
  });
}

function extractTimestamp(logLine) {
  const timestampMatch = logLine.match(/^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/);
  return timestampMatch ? timestampMatch[1] : '';
}

function extractLogLevel(logLine) {
  if (logLine.includes('ERROR') || logLine.includes('error')) return 'error';
  if (logLine.includes('WARN') || logLine.includes('warning')) return 'warning';
  if (logLine.includes('INFO') || logLine.includes('info')) return 'info';
  return 'debug';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
