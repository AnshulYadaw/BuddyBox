const os = require('os');
const { exec } = require('child_process');
const fs = require('fs').promises;

class SystemService {
  async getSystemStats() {
    try {
      const cpuInfo = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      
      // Get CPU usage
      const cpuUsage = await this.getCpuUsage();
      
      // Get load average
      const loadAvg = os.loadavg();
      
      // Get disk usage
      const diskUsage = await this.getDiskUsage();
      
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
        disk: diskUsage,
        uptime: os.uptime(),
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      throw error;
    }
  }

  async getCpuUsage() {
    return new Promise((resolve) => {
      const startMeasure = this.cpuAverage();
      
      setTimeout(() => {
        const endMeasure = this.cpuAverage();
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);
        
        resolve(percentageCPU);
      }, 1000);
    });
  }

  cpuAverage() {
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
    
    return {
      idle: idle,
      total: total
    };
  }

  async getDiskUsage() {
    try {
      if (process.platform === 'darwin') {
        // macOS
        const result = await this.execCommand('df -h /');
        const lines = result.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          return {
            total: parts[1],
            used: parts[2],
            available: parts[3],
            usage: parts[4]
          };
        }
      } else if (process.platform === 'linux') {
        // Linux
        const result = await this.execCommand('df -h /');
        const lines = result.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          return {
            total: parts[1],
            used: parts[2],
            available: parts[3],
            usage: parts[4]
          };
        }
      }
      
      return {
        total: 'N/A',
        used: 'N/A',
        available: 'N/A',
        usage: 'N/A'
      };
    } catch (error) {
      console.error('Error getting disk usage:', error);
      return {
        total: 'Error',
        used: 'Error',
        available: 'Error',
        usage: 'Error'
      };
    }
  }

  async getProcessList() {
    try {
      let command;
      if (process.platform === 'darwin' || process.platform === 'linux') {
        command = 'ps aux';
      } else {
        command = 'tasklist';
      }
      
      const result = await this.execCommand(command);
      return this.parseProcessList(result);
    } catch (error) {
      console.error('Error getting process list:', error);
      return [];
    }
  }

  parseProcessList(output) {
    const lines = output.trim().split('\n');
    const processes = [];
    
    if (process.platform === 'darwin' || process.platform === 'linux') {
      // Skip header line
      for (let i = 1; i < lines.length && i < 51; i++) { // Limit to 50 processes
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length >= 11) {
          processes.push({
            user: parts[0],
            pid: parts[1],
            cpu: parts[2],
            memory: parts[3],
            vsz: parts[4],
            rss: parts[5],
            tty: parts[6],
            stat: parts[7],
            start: parts[8],
            time: parts[9],
            command: parts.slice(10).join(' ')
          });
        }
      }
    }
    
    return processes;
  }

  async getNetworkStats() {
    try {
      const interfaces = os.networkInterfaces();
      const stats = [];
      
      Object.keys(interfaces).forEach(name => {
        const iface = interfaces[name];
        iface.forEach(config => {
          if (!config.internal) {
            stats.push({
              interface: name,
              address: config.address,
              family: config.family,
              mac: config.mac
            });
          }
        });
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting network stats:', error);
      return [];
    }
  }

  async execCommand(command) {
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
}

module.exports = new SystemService();
