const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class SecurityService {
  constructor() {
    this.fail2banLogPath = '/var/log/fail2ban.log';
    this.authLogPath = '/var/log/auth.log';
  }

  async performSecurityScan() {
    try {
      console.log('Starting security scan...');
      
      const scanResults = {
        timestamp: new Date().toISOString(),
        checks: []
      };
      
      // Check for failed login attempts
      const failedLogins = await this.checkFailedLogins();
      scanResults.checks.push({
        name: 'Failed Login Attempts',
        status: failedLogins.count > 10 ? 'warning' : 'ok',
        details: failedLogins
      });
      
      // Check for suspicious IP addresses
      const suspiciousIPs = await this.checkSuspiciousIPs();
      scanResults.checks.push({
        name: 'Suspicious IP Addresses',
        status: suspiciousIPs.length > 0 ? 'warning' : 'ok',
        details: { count: suspiciousIPs.length, ips: suspiciousIPs }
      });
      
      // Check fail2ban status
      const fail2banStatus = await this.checkFail2banStatus();
      scanResults.checks.push({
        name: 'Fail2Ban Status',
        status: fail2banStatus.active ? 'ok' : 'error',
        details: fail2banStatus
      });
      
      // Check for open ports
      const openPorts = await this.checkOpenPorts();
      scanResults.checks.push({
        name: 'Open Ports',
        status: 'info',
        details: openPorts
      });
      
      // Check SSL certificates
      const sslStatus = await this.checkSSLCertificates();
      scanResults.checks.push({
        name: 'SSL Certificates',
        status: sslStatus.hasExpiring ? 'warning' : 'ok',
        details: sslStatus
      });
      
      // Save scan results
      await this.saveScanResults(scanResults);
      
      console.log('Security scan completed');
      return scanResults;
    } catch (error) {
      console.error('Security scan failed:', error);
      throw error;
    }
  }

  async checkFailedLogins() {
    try {
      if (process.platform !== 'linux') {
        return { count: 0, recent: [], note: 'Linux-only feature' };
      }
      
      // Check auth.log for failed login attempts in the last 24 hours
      const command = `grep "Failed password" ${this.authLogPath} | tail -100`;
      const result = await this.execCommand(command).catch(() => '');
      
      const lines = result.trim().split('\n').filter(line => line.trim());
      const failedAttempts = [];
      
      lines.forEach(line => {
        const ipMatch = line.match(/from (\d+\.\d+\.\d+\.\d+)/);
        const userMatch = line.match(/for (\w+)/);
        const timeMatch = line.match(/^(\w+\s+\d+\s+\d+:\d+:\d+)/);
        
        if (ipMatch && userMatch && timeMatch) {
          failedAttempts.push({
            ip: ipMatch[1],
            user: userMatch[1],
            time: timeMatch[1]
          });
        }
      });
      
      return {
        count: failedAttempts.length,
        recent: failedAttempts.slice(-20), // Last 20 attempts
        lastHour: this.countRecentAttempts(failedAttempts, 1),
        lastDay: this.countRecentAttempts(failedAttempts, 24)
      };
    } catch (error) {
      console.warn('Error checking failed logins:', error.message);
      return { count: 0, recent: [], error: error.message };
    }
  }

  async checkSuspiciousIPs() {
    try {
      if (process.platform !== 'linux') {
        return [];
      }
      
      // Get IPs with high number of failed attempts
      const command = `grep "Failed password" ${this.authLogPath} | grep -oE "from [0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+" | cut -d' ' -f2 | sort | uniq -c | sort -nr | head -10`;
      const result = await this.execCommand(command).catch(() => '');
      
      const suspiciousIPs = [];
      const lines = result.trim().split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        const match = line.trim().match(/(\d+)\s+(\d+\.\d+\.\d+\.\d+)/);
        if (match && parseInt(match[1]) > 5) { // More than 5 failed attempts
          suspiciousIPs.push({
            ip: match[2],
            attempts: parseInt(match[1])
          });
        }
      });
      
      return suspiciousIPs;
    } catch (error) {
      console.warn('Error checking suspicious IPs:', error.message);
      return [];
    }
  }

  async checkFail2banStatus() {
    try {
      if (process.platform !== 'linux') {
        return { active: false, note: 'Linux-only feature' };
      }
      
      // Check if fail2ban is running
      const statusResult = await this.execCommand('systemctl is-active fail2ban').catch(() => 'inactive');
      const isActive = statusResult.trim() === 'active';
      
      let jails = [];
      if (isActive) {
        try {
          const jailsResult = await this.execCommand('fail2ban-client status');
          const jailMatch = jailsResult.match(/Jail list:\s+(.+)/);
          if (jailMatch) {
            const jailNames = jailMatch[1].split(',').map(j => j.trim());
            
            for (const jail of jailNames) {
              try {
                const jailStatus = await this.execCommand(`fail2ban-client status ${jail}`);
                const bannedMatch = jailStatus.match(/Currently banned:\s+(\d+)/);
                const totalMatch = jailStatus.match(/Total banned:\s+(\d+)/);
                
                jails.push({
                  name: jail,
                  currentlyBanned: bannedMatch ? parseInt(bannedMatch[1]) : 0,
                  totalBanned: totalMatch ? parseInt(totalMatch[1]) : 0
                });
              } catch (error) {
                console.warn(`Error getting status for jail ${jail}:`, error.message);
              }
            }
          }
        } catch (error) {
          console.warn('Error getting fail2ban jails:', error.message);
        }
      }
      
      return {
        active: isActive,
        jails: jails
      };
    } catch (error) {
      console.warn('Error checking fail2ban status:', error.message);
      return { active: false, error: error.message };
    }
  }

  async checkOpenPorts() {
    try {
      let command;
      if (process.platform === 'darwin') {
        command = 'netstat -an | grep LISTEN';
      } else if (process.platform === 'linux') {
        command = 'ss -tlnp';
      } else {
        return { ports: [], note: 'Unsupported platform' };
      }
      
      const result = await this.execCommand(command).catch(() => '');
      const ports = [];
      const lines = result.trim().split('\n');
      
      lines.forEach(line => {
        let port, address;
        
        if (process.platform === 'darwin') {
          const match = line.match(/tcp4?\s+\d+\s+\d+\s+([\d.]+|\*)\.(\d+)\s+[\d.*]+\s+LISTEN/);
          if (match) {
            address = match[1] === '*' ? '0.0.0.0' : match[1];
            port = parseInt(match[2]);
          }
        } else {
          const match = line.match(/LISTEN\s+\d+\s+\d+\s+([\d.:*]+):(\d+)/);
          if (match) {
            address = match[1];
            port = parseInt(match[2]);
          }
        }
        
        if (port && port > 0) {
          ports.push({ port, address });
        }
      });
      
      // Remove duplicates and sort
      const uniquePorts = ports.filter((p, index, self) => 
        index === self.findIndex(t => t.port === p.port && t.address === p.address)
      ).sort((a, b) => a.port - b.port);
      
      return {
        ports: uniquePorts,
        count: uniquePorts.length
      };
    } catch (error) {
      console.warn('Error checking open ports:', error.message);
      return { ports: [], error: error.message };
    }
  }

  async checkSSLCertificates() {
    try {
      // This is a simplified check - in a real implementation,
      // you would check actual SSL certificates for your domains
      const certificates = [];
      
      // Example check for common certificate locations
      const certPaths = [
        '/etc/ssl/certs',
        '/etc/letsencrypt/live',
        '/etc/nginx/ssl',
        '/etc/apache2/ssl'
      ];
      
      for (const certPath of certPaths) {
        try {
          if (await this.fileExists(certPath)) {
            const files = await fs.readdir(certPath);
            const certFiles = files.filter(f => f.endsWith('.crt') || f.endsWith('.pem'));
            
            for (const certFile of certFiles.slice(0, 5)) { // Limit to 5 certs per path
              certificates.push({
                path: path.join(certPath, certFile),
                name: certFile,
                location: certPath
              });
            }
          }
        } catch (error) {
          // Ignore errors for individual cert paths
        }
      }
      
      return {
        certificates: certificates,
        count: certificates.length,
        hasExpiring: false, // Would need actual cert parsing to determine
        note: 'Certificate expiration checking requires additional implementation'
      };
    } catch (error) {
      console.warn('Error checking SSL certificates:', error.message);
      return { certificates: [], error: error.message };
    }
  }

  countRecentAttempts(attempts, hours) {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    // This is simplified - would need proper date parsing from log format
    return attempts.length; // Placeholder
  }

  async saveScanResults(results) {
    try {
      const resultsDir = path.join(process.cwd(), 'logs', 'security');
      await fs.mkdir(resultsDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = path.join(resultsDir, `security-scan-${timestamp}.json`);
      
      await fs.writeFile(filePath, JSON.stringify(results, null, 2));
      console.log(`Security scan results saved to: ${filePath}`);
    } catch (error) {
      console.error('Error saving scan results:', error);
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
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

module.exports = new SecurityService();
