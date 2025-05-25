const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const { body, validationResult } = require('express-validator');
const { authorize } = require('../middleware/auth');

const router = express.Router();
const execAsync = promisify(exec);

// Get security status
router.get('/status', authorize(['admin', 'security_admin']), async (req, res) => {
  try {
    // Get Fail2Ban status
    const { stdout: fail2banStatus } = await execAsync('fail2ban-client status');
    
    // Get UFW status
    const { stdout: ufwStatus } = await execAsync('ufw status');
    
    // Get last login attempts
    const { stdout: lastLogins } = await execAsync('last -n 10');
    
    // Get current connections
    const { stdout: connections } = await execAsync('ss -tuln');

    const status = {
      fail2ban: {
        status: fail2banStatus.includes('Number of jail') ? 'running' : 'stopped',
        jails: extractJails(fail2banStatus)
      },
      firewall: {
        status: ufwStatus.includes('Status: active') ? 'active' : 'inactive',
        rules: extractFirewallRules(ufwStatus)
      },
      lastLogins: parseLastLogins(lastLogins),
      activeConnections: parseConnections(connections)
    };

    res.json({ success: true, status });
  } catch (error) {
    console.error('Security status fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch security status' });
  }
});

// Get security logs
router.get('/logs', authorize(['admin', 'security_admin']), async (req, res) => {
  try {
    const { lines = 100, type = 'all' } = req.query;
    
    let command;
    switch (type) {
      case 'auth':
        command = `tail -n ${lines} /var/log/auth.log`;
        break;
      case 'fail2ban':
        command = `tail -n ${lines} /var/log/fail2ban.log`;
        break;
      case 'ufw':
        command = `tail -n ${lines} /var/log/ufw.log`;
        break;
      default:
        command = `tail -n ${lines} /var/log/auth.log`;
    }

    const { stdout } = await execAsync(command);
    
    const logs = stdout.split('\n')
      .filter(line => line.trim())
      .map(line => parseLogEntry(line))
      .filter(entry => entry);

    res.json({ success: true, logs });
  } catch (error) {
    console.error('Security logs fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch security logs' });
  }
});

// Get blocked IPs
router.get('/blocked-ips', authorize(['admin', 'security_admin']), async (req, res) => {
  try {
    const { stdout } = await execAsync('fail2ban-client status');
    const jails = extractJails(stdout);
    
    const blockedIPs = [];
    
    for (const jail of jails) {
      try {
        const { stdout: jailStatus } = await execAsync(`fail2ban-client status ${jail}`);
        const ips = extractBannedIPs(jailStatus);
        
        for (const ip of ips) {
          blockedIPs.push({
            ip,
            jail,
            blockedAt: new Date(), // This would need to be parsed from logs for accuracy
            reason: `Blocked by ${jail}`
          });
        }
      } catch (err) {
        console.error(`Error getting status for jail ${jail}:`, err);
      }
    }

    res.json({ success: true, blockedIPs });
  } catch (error) {
    console.error('Blocked IPs fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch blocked IPs' });
  }
});

// Block IP address
router.post('/block-ip', 
  authorize(['admin', 'security_admin']),
  [
    body('ip').isIP(),
    body('jail').isLength({ min: 1 }).optional(),
    body('reason').isLength({ min: 1 }).optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { ip, jail = 'sshd', reason = 'Manual block' } = req.body;

      await execAsync(`fail2ban-client set ${jail} banip ${ip}`);

      // Log the manual block
      const logEntry = `${new Date().toISOString()} Manual block: ${ip} blocked in ${jail} - ${reason}`;
      await execAsync(`echo "${logEntry}" >> /var/log/fail2ban-manual.log`);

      res.json({ 
        success: true, 
        message: `IP ${ip} blocked successfully`,
        details: { ip, jail, reason }
      });

    } catch (error) {
      console.error('IP blocking error:', error);
      res.status(500).json({ success: false, error: 'Failed to block IP address' });
    }
  }
);

// Unblock IP address
router.delete('/unblock-ip/:ip', authorize(['admin', 'security_admin']), async (req, res) => {
  try {
    const { ip } = req.params;
    const { jail = 'sshd' } = req.query;

    await execAsync(`fail2ban-client set ${jail} unbanip ${ip}`);

    res.json({ 
      success: true, 
      message: `IP ${ip} unblocked successfully`
    });

  } catch (error) {
    console.error('IP unblocking error:', error);
    res.status(500).json({ success: false, error: 'Failed to unblock IP address' });
  }
});

// Get firewall rules
router.get('/firewall/rules', authorize(['admin', 'security_admin']), async (req, res) => {
  try {
    const { stdout } = await execAsync('ufw status numbered');
    const rules = parseFirewallRules(stdout);

    res.json({ success: true, rules });
  } catch (error) {
    console.error('Firewall rules fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch firewall rules' });
  }
});

// Add firewall rule
router.post('/firewall/rules', 
  authorize(['admin', 'security_admin']),
  [
    body('action').isIn(['allow', 'deny']),
    body('port').isNumeric().optional(),
    body('protocol').isIn(['tcp', 'udp', 'any']).optional(),
    body('from').isIP().optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { action, port, protocol = 'tcp', from } = req.body;
      
      let command = `ufw ${action}`;
      if (from) command += ` from ${from}`;
      if (port) command += ` to any port ${port}`;
      if (protocol !== 'any') command += ` proto ${protocol}`;

      await execAsync(command);

      res.json({ 
        success: true, 
        message: 'Firewall rule added successfully',
        rule: { action, port, protocol, from }
      });

    } catch (error) {
      console.error('Firewall rule creation error:', error);
      res.status(500).json({ success: false, error: 'Failed to add firewall rule' });
    }
  }
);

// Delete firewall rule
router.delete('/firewall/rules/:ruleNumber', authorize(['admin', 'security_admin']), async (req, res) => {
  try {
    const { ruleNumber } = req.params;

    await execAsync(`ufw --force delete ${ruleNumber}`);

    res.json({ 
      success: true, 
      message: 'Firewall rule deleted successfully'
    });

  } catch (error) {
    console.error('Firewall rule deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete firewall rule' });
  }
});

// Get SSL certificates
router.get('/ssl/certificates', authorize(['admin', 'security_admin']), async (req, res) => {
  try {
    // This would need to be adapted based on your SSL certificate management
    const { stdout } = await execAsync('certbot certificates');
    const certificates = parseSSLCertificates(stdout);

    res.json({ success: true, certificates });
  } catch (error) {
    console.error('SSL certificates fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch SSL certificates' });
  }
});

// Helper functions
function extractJails(fail2banOutput) {
  const jailMatch = fail2banOutput.match(/Jail list:\s+(.+)/);
  return jailMatch ? jailMatch[1].split(',').map(jail => jail.trim()) : [];
}

function extractFirewallRules(ufwOutput) {
  const lines = ufwOutput.split('\n');
  return lines
    .filter(line => line.includes('ALLOW') || line.includes('DENY'))
    .map(line => line.trim());
}

function extractBannedIPs(jailStatus) {
  const bannedMatch = jailStatus.match(/Banned IP list:\s+(.+)/);
  return bannedMatch ? bannedMatch[1].split(' ').filter(ip => ip.trim()) : [];
}

function parseLastLogins(lastOutput) {
  return lastOutput.split('\n')
    .filter(line => line.trim() && !line.includes('wtmp begins'))
    .slice(0, 10)
    .map(line => {
      const parts = line.split(/\s+/);
      return {
        user: parts[0],
        terminal: parts[1],
        ip: parts[2],
        date: parts.slice(3, 7).join(' ')
      };
    });
}

function parseConnections(connectionsOutput) {
  return connectionsOutput.split('\n')
    .filter(line => line.includes(':'))
    .slice(1, 21) // Limit to 20 connections
    .map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        protocol: parts[0],
        localAddress: parts[4],
        state: parts[1]
      };
    });
}

function parseLogEntry(logLine) {
  const match = logLine.match(/^(\w+\s+\d+\s+\d+:\d+:\d+)\s+(\w+)\s+(.+)$/);
  if (match) {
    return {
      timestamp: match[1],
      hostname: match[2],
      message: match[3],
      severity: detectSeverity(match[3])
    };
  }
  return null;
}

function detectSeverity(message) {
  if (message.includes('FAILED') || message.includes('INVALID') || message.includes('BREAK-IN')) {
    return 'error';
  } else if (message.includes('WARNING') || message.includes('POSSIBLE')) {
    return 'warning';
  }
  return 'info';
}

function parseFirewallRules(ufwOutput) {
  const lines = ufwOutput.split('\n');
  return lines
    .filter(line => line.match(/^\[\s*\d+\]/))
    .map(line => {
      const match = line.match(/^\[\s*(\d+)\]\s+(.+)/);
      return {
        number: match[1],
        rule: match[2].trim()
      };
    });
}

function parseSSLCertificates(certbotOutput) {
  const certificates = [];
  const sections = certbotOutput.split('Certificate Name:').slice(1);
  
  sections.forEach(section => {
    const lines = section.split('\n');
    const name = lines[0].trim();
    const domains = lines.find(line => line.includes('Domains:'))?.replace('Domains:', '').trim();
    const expiry = lines.find(line => line.includes('Expiry Date:'))?.replace('Expiry Date:', '').trim();
    
    certificates.push({
      name,
      domains: domains?.split(' ') || [],
      expiry: expiry || 'Unknown'
    });
  });
  
  return certificates;
}

module.exports = router;
