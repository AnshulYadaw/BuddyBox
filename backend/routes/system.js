const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Get system information
router.get('/info', async (req, res) => {
  try {
    const systemInfo = await getSystemInfo();
    res.json({ success: true, systemInfo });
  } catch (error) {
    console.error('Error getting system info:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update system packages
router.post('/update', async (req, res) => {
  try {
    const result = await updateSystem();
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error updating system:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reboot system
router.post('/reboot', async (req, res) => {
  try {
    const { delay = 1 } = req.body; // delay in minutes
    const result = await scheduleReboot(delay);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error scheduling reboot:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get system configuration
router.get('/config', async (req, res) => {
  try {
    const config = await getSystemConfig();
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error getting system config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update system configuration
router.put('/config', async (req, res) => {
  try {
    const { config } = req.body;
    const result = await updateSystemConfig(config);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error updating system config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get installed packages
router.get('/packages', async (req, res) => {
  try {
    const packages = await getInstalledPackages();
    res.json({ success: true, packages });
  } catch (error) {
    console.error('Error getting packages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Install package
router.post('/packages', async (req, res) => {
  try {
    const { packageName } = req.body;
    const result = await installPackage(packageName);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error installing package:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove package
router.delete('/packages/:packageName', async (req, res) => {
  try {
    const { packageName } = req.params;
    const result = await removePackage(packageName);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error removing package:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get crontab entries
router.get('/cron', async (req, res) => {
  try {
    const cronJobs = await getCronJobs();
    res.json({ success: true, cronJobs });
  } catch (error) {
    console.error('Error getting cron jobs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add cron job
router.post('/cron', async (req, res) => {
  try {
    const { schedule, command, description } = req.body;
    const result = await addCronJob(schedule, command, description);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error adding cron job:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove cron job
router.delete('/cron/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await removeCronJob(id);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error removing cron job:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get environment variables
router.get('/env', async (req, res) => {
  try {
    const envVars = getEnvironmentVariables();
    res.json({ success: true, envVars });
  } catch (error) {
    console.error('Error getting environment variables:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions
async function getSystemInfo() {
  const cpuInfo = os.cpus();
  const networkInterfaces = os.networkInterfaces();
  
  // Get kernel version
  const kernelVersion = await execCommand('uname -r').catch(() => 'Unknown');
  
  // Get distribution info
  const distroInfo = await getDistributionInfo();
  
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    kernel: kernelVersion.trim(),
    distribution: distroInfo,
    cpu: {
      model: cpuInfo[0].model,
      cores: cpuInfo.length,
      speed: cpuInfo[0].speed
    },
    memory: {
      total: os.totalmem(),
      free: os.freemem()
    },
    uptime: os.uptime(),
    loadAverage: os.loadavg(),
    networkInterfaces: Object.keys(networkInterfaces).map(name => ({
      name,
      addresses: networkInterfaces[name].filter(addr => !addr.internal)
    })),
    timestamp: Date.now()
  };
}

async function getDistributionInfo() {
  try {
    if (process.platform === 'linux') {
      const releaseInfo = await fs.readFile('/etc/os-release', 'utf8');
      const lines = releaseInfo.split('\n');
      const info = {};
      
      lines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          info[key] = value.replace(/"/g, '');
        }
      });
      
      return {
        name: info.NAME || 'Unknown',
        version: info.VERSION || 'Unknown',
        id: info.ID || 'Unknown'
      };
    }
    
    return {
      name: process.platform,
      version: os.release(),
      id: process.platform
    };
  } catch (error) {
    return {
      name: 'Unknown',
      version: 'Unknown',
      id: 'Unknown'
    };
  }
}

function updateSystem() {
  return new Promise((resolve, reject) => {
    let updateCommand;
    
    if (process.platform === 'linux') {
      // Detect package manager
      updateCommand = 'sudo apt update && sudo apt upgrade -y';
      
      // Check if yum exists (CentOS/RHEL)
      exec('which yum', (error) => {
        if (!error) {
          updateCommand = 'sudo yum update -y';
        }
      });
    } else {
      reject(new Error('System update not supported on this platform'));
      return;
    }
    
    exec(updateCommand, { timeout: 300000 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function scheduleReboot(delayMinutes) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32'
      ? `shutdown /r /t ${delayMinutes * 60}`
      : `sudo shutdown -r +${delayMinutes}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ 
        message: `System reboot scheduled in ${delayMinutes} minute(s)`,
        stdout, 
        stderr 
      });
    });
  });
}

async function getSystemConfig() {
  const config = {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: process.env.LANG || 'en_US.UTF-8',
    hostname: os.hostname(),
    domain: process.env.DOMAIN || 'localhost',
    swapUsage: await getSwapUsage(),
    kernelParameters: await getKernelParameters()
  };
  
  return config;
}

async function updateSystemConfig(config) {
  const results = [];
  
  // Update hostname if changed
  if (config.hostname && config.hostname !== os.hostname()) {
    try {
      await execCommand(`sudo hostnamectl set-hostname ${config.hostname}`);
      results.push('Hostname updated');
    } catch (error) {
      results.push(`Failed to update hostname: ${error.message}`);
    }
  }
  
  // Update timezone if changed
  if (config.timezone) {
    try {
      await execCommand(`sudo timedatectl set-timezone ${config.timezone}`);
      results.push('Timezone updated');
    } catch (error) {
      results.push(`Failed to update timezone: ${error.message}`);
    }
  }
  
  return { results };
}

function getInstalledPackages() {
  return new Promise((resolve, reject) => {
    let command;
    
    if (process.platform === 'linux') {
      // Try apt first
      exec('which apt', (error) => {
        if (!error) {
          command = 'apt list --installed';
        } else {
          // Try yum
          exec('which yum', (yumError) => {
            if (!yumError) {
              command = 'yum list installed';
            } else {
              command = 'dpkg -l';
            }
          });
        }
        
        exec(command, (error, stdout, stderr) => {
          if (error) {
            reject(error);
            return;
          }
          
          const packages = parsePackageList(stdout, command);
          resolve(packages.slice(0, 100)); // Limit to first 100 packages
        });
      });
    } else {
      reject(new Error('Package listing not supported on this platform'));
    }
  });
}

function parsePackageList(output, command) {
  const lines = output.split('\n');
  const packages = [];
  
  if (command.includes('apt list')) {
    lines.slice(1).forEach(line => {
      if (line.trim()) {
        const parts = line.split('/');
        if (parts.length >= 2) {
          const name = parts[0];
          const versionInfo = parts[1].split(' ');
          packages.push({
            name,
            version: versionInfo[0] || 'Unknown',
            architecture: versionInfo[1] || 'Unknown'
          });
        }
      }
    });
  } else if (command.includes('dpkg -l')) {
    lines.forEach(line => {
      if (line.startsWith('ii')) {
        const parts = line.split(/\s+/);
        packages.push({
          name: parts[1],
          version: parts[2],
          architecture: parts[3]
        });
      }
    });
  }
  
  return packages;
}

function installPackage(packageName) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'linux'
      ? `sudo apt install -y ${packageName}`
      : null;
    
    if (!command) {
      reject(new Error('Package installation not supported on this platform'));
      return;
    }
    
    exec(command, { timeout: 300000 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function removePackage(packageName) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'linux'
      ? `sudo apt remove -y ${packageName}`
      : null;
    
    if (!command) {
      reject(new Error('Package removal not supported on this platform'));
      return;
    }
    
    exec(command, { timeout: 300000 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function getCronJobs() {
  try {
    const crontab = await execCommand('crontab -l');
    const jobs = [];
    const lines = crontab.split('\n');
    
    lines.forEach((line, index) => {
      if (line.trim() && !line.startsWith('#')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 6) {
          jobs.push({
            id: index,
            schedule: parts.slice(0, 5).join(' '),
            command: parts.slice(5).join(' '),
            line: line.trim()
          });
        }
      }
    });
    
    return jobs;
  } catch (error) {
    if (error.message.includes('no crontab')) {
      return [];
    }
    throw error;
  }
}

async function addCronJob(schedule, command, description) {
  try {
    const currentCrontab = await execCommand('crontab -l').catch(() => '');
    const newJob = `${schedule} ${command} # ${description || ''}`;
    const newCrontab = currentCrontab ? `${currentCrontab}\n${newJob}` : newJob;
    
    // Write to temporary file
    const tempFile = '/tmp/crontab_temp';
    await fs.writeFile(tempFile, newCrontab);
    
    // Install new crontab
    await execCommand(`crontab ${tempFile}`);
    
    // Clean up
    await fs.unlink(tempFile);
    
    return { message: 'Cron job added successfully' };
  } catch (error) {
    throw new Error(`Failed to add cron job: ${error.message}`);
  }
}

async function removeCronJob(jobId) {
  try {
    const currentCrontab = await execCommand('crontab -l');
    const lines = currentCrontab.split('\n');
    
    // Remove the specified line
    lines.splice(parseInt(jobId), 1);
    
    const newCrontab = lines.join('\n');
    
    // Write to temporary file
    const tempFile = '/tmp/crontab_temp';
    await fs.writeFile(tempFile, newCrontab);
    
    // Install new crontab
    await execCommand(`crontab ${tempFile}`);
    
    // Clean up
    await fs.unlink(tempFile);
    
    return { message: 'Cron job removed successfully' };
  } catch (error) {
    throw new Error(`Failed to remove cron job: ${error.message}`);
  }
}

function getEnvironmentVariables() {
  const envVars = {};
  const sensitiveKeys = ['password', 'secret', 'key', 'token', 'auth'];
  
  Object.keys(process.env).forEach(key => {
    const value = process.env[key];
    const isSensitive = sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
    
    envVars[key] = isSensitive ? '***HIDDEN***' : value;
  });
  
  return envVars;
}

async function getSwapUsage() {
  try {
    if (process.platform === 'linux') {
      const meminfo = await fs.readFile('/proc/meminfo', 'utf8');
      const swapTotal = parseInt(meminfo.match(/SwapTotal:\s+(\d+)/)?.[1] || '0') * 1024;
      const swapFree = parseInt(meminfo.match(/SwapFree:\s+(\d+)/)?.[1] || '0') * 1024;
      const swapUsed = swapTotal - swapFree;
      
      return {
        total: swapTotal,
        used: swapUsed,
        free: swapFree,
        percentage: swapTotal > 0 ? Math.round((swapUsed / swapTotal) * 100) : 0
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function getKernelParameters() {
  try {
    const sysctl = await execCommand('sysctl -a');
    const parameters = {};
    
    sysctl.split('\n').forEach(line => {
      const [key, value] = line.split(' = ');
      if (key && value) {
        parameters[key.trim()] = value.trim();
      }
    });
    
    return parameters;
  } catch (error) {
    return {};
  }
}

function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

module.exports = router;
