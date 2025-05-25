const express = require('express');
const nodemailer = require('nodemailer');
const { exec } = require('child_process');
const { promisify } = require('util');
const { body, validationResult } = require('express-validator');
const { authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();
const execAsync = promisify(exec);

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.MAIL_HOST || 'localhost',
    port: process.env.MAIL_PORT || 587,
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD
    }
  });
};

// Get mail domains
router.get('/domains', authorize(['admin', 'mail_admin']), async (req, res) => {
  try {
    // Read virtual domains from Postfix configuration
    const { stdout } = await execAsync('postconf -h virtual_mailbox_domains');
    const domains = stdout.trim().split(/[,\s]+/).filter(domain => domain && domain !== '$myhostname');

    const domainDetails = await Promise.allSettled(
      domains.map(async (domain) => {
        try {
          // Get domain statistics
          const { stdout: accountCount } = await execAsync(`grep -c "^[^#].*@${domain}" /etc/postfix/virtual_mailbox_maps || echo "0"`);
          const { stdout: aliasCount } = await execAsync(`grep -c "^[^#].*@${domain}" /etc/postfix/virtual_alias_maps || echo "0"`);
          
          return {
            name: domain,
            accounts: parseInt(accountCount.trim()) || 0,
            aliases: parseInt(aliasCount.trim()) || 0,
            status: 'active'
          };
        } catch (error) {
          return {
            name: domain,
            accounts: 0,
            aliases: 0,
            status: 'error'
          };
        }
      })
    );

    const formattedDomains = domainDetails
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);

    res.json({ success: true, domains: formattedDomains });
  } catch (error) {
    console.error('Mail domains fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mail domains' });
  }
});

// Add mail domain
router.post('/domains', 
  authorize(['admin', 'mail_admin']),
  [body('domain').isLength({ min: 1 }).matches(/^[a-zA-Z0-9.-]+$/)],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { domain } = req.body;

      // Get current domains
      const { stdout: currentDomains } = await execAsync('postconf -h virtual_mailbox_domains');
      const domains = currentDomains.trim();
      
      if (domains.includes(domain)) {
        return res.status(400).json({ success: false, error: 'Domain already exists' });
      }

      // Add domain to virtual_mailbox_domains
      const newDomains = domains ? `${domains}, ${domain}` : domain;
      await execAsync(`postconf -e "virtual_mailbox_domains = ${newDomains}"`);

      // Reload Postfix configuration
      await execAsync('postfix reload');

      res.status(201).json({ 
        success: true, 
        message: 'Mail domain added successfully',
        domain: { name: domain, accounts: 0, aliases: 0, status: 'active' }
      });

    } catch (error) {
      console.error('Mail domain creation error:', error);
      res.status(500).json({ success: false, error: 'Failed to add mail domain' });
    }
  }
);

// Get mail accounts
router.get('/accounts', authorize(['admin', 'mail_admin']), async (req, res) => {
  try {
    const { domain } = req.query;
    
    let grepPattern = '^[^#]';
    if (domain) {
      grepPattern += `.*@${domain}`;
    }

    const { stdout } = await execAsync(`grep "${grepPattern}" /etc/postfix/virtual_mailbox_maps || echo ""`);
    
    const accounts = stdout.trim().split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [email, mailbox] = line.split(/\s+/);
        const [username, domain] = email.split('@');
        
        return {
          email,
          username,
          domain,
          mailbox,
          status: 'active'
        };
      });

    res.json({ success: true, accounts });
  } catch (error) {
    console.error('Mail accounts fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mail accounts' });
  }
});

// Create mail account
router.post('/accounts', 
  authorize(['admin', 'mail_admin']),
  [
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('quota').isNumeric().optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password, quota = 1024 } = req.body;
      const [username, domain] = email.split('@');

      // Check if account already exists
      const { stdout: existing } = await execAsync(`grep "^${email}" /etc/postfix/virtual_mailbox_maps || echo ""`);
      if (existing.trim()) {
        return res.status(400).json({ success: false, error: 'Mail account already exists' });
      }

      // Hash password using dovecot's doveadm
      const { stdout: hashedPassword } = await execAsync(`doveadm pw -s SHA512-CRYPT -p "${password}"`);
      
      // Add to virtual_mailbox_maps
      await execAsync(`echo "${email} ${domain}/${username}/" >> /etc/postfix/virtual_mailbox_maps`);
      
      // Add to dovecot users file
      await execAsync(`echo "${email}:${hashedPassword.trim()}:::::" >> /etc/dovecot/users`);

      // Set quota if specified
      if (quota) {
        await execAsync(`echo "${email}:storage=${quota}M" >> /etc/dovecot/quota`);
      }

      // Rebuild maps
      await execAsync('postmap /etc/postfix/virtual_mailbox_maps');
      await execAsync('systemctl reload dovecot');
      await execAsync('postfix reload');

      res.status(201).json({ 
        success: true, 
        message: 'Mail account created successfully',
        account: {
          email,
          username,
          domain,
          quota,
          status: 'active'
        }
      });

    } catch (error) {
      console.error('Mail account creation error:', error);
      res.status(500).json({ success: false, error: 'Failed to create mail account' });
    }
  }
);

// Delete mail account
router.delete('/accounts/:email', authorize(['admin', 'mail_admin']), async (req, res) => {
  try {
    const { email } = req.params;

    // Remove from virtual_mailbox_maps
    await execAsync(`sed -i "/^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/d" /etc/postfix/virtual_mailbox_maps`);
    
    // Remove from dovecot users
    await execAsync(`sed -i "/^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/d" /etc/dovecot/users`);
    
    // Remove from quota file
    await execAsync(`sed -i "/^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/d" /etc/dovecot/quota`);

    // Rebuild maps
    await execAsync('postmap /etc/postfix/virtual_mailbox_maps');
    await execAsync('systemctl reload dovecot');
    await execAsync('postfix reload');

    res.json({ success: true, message: 'Mail account deleted successfully' });

  } catch (error) {
    console.error('Mail account deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete mail account' });
  }
});

// Get mail queue
router.get('/queue', authorize(['admin', 'mail_admin']), async (req, res) => {
  try {
    const { stdout } = await execAsync('mailq');
    
    // Parse mailq output
    const lines = stdout.split('\n');
    const queueItems = [];
    let currentItem = null;

    for (const line of lines) {
      if (line.match(/^[A-F0-9]{10,}/)) {
        // New queue item
        if (currentItem) {
          queueItems.push(currentItem);
        }
        const parts = line.split(/\s+/);
        currentItem = {
          id: parts[0],
          size: parts[1],
          date: parts[2] + ' ' + parts[3],
          sender: parts[4] || 'unknown'
        };
      } else if (currentItem && line.trim().includes('@')) {
        // Recipient line
        currentItem.recipient = line.trim();
      } else if (currentItem && line.trim().startsWith('(')) {
        // Status line
        currentItem.status = line.trim();
      }
    }

    if (currentItem) {
      queueItems.push(currentItem);
    }

    // Get queue summary
    const { stdout: queueSummary } = await execAsync('postqueue -p | tail -n 1');
    const totalMatch = queueSummary.match(/(\d+) Kbytes in (\d+) Request/);
    const summary = {
      totalSize: totalMatch ? totalMatch[1] + ' KB' : '0 KB',
      totalItems: totalMatch ? parseInt(totalMatch[2]) : 0
    };

    res.json({ 
      success: true, 
      queue: queueItems,
      summary
    });

  } catch (error) {
    console.error('Mail queue fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mail queue' });
  }
});

// Flush mail queue
router.post('/queue/flush', authorize(['admin', 'mail_admin']), async (req, res) => {
  try {
    await execAsync('postqueue -f');
    res.json({ success: true, message: 'Mail queue flushed successfully' });
  } catch (error) {
    console.error('Mail queue flush error:', error);
    res.status(500).json({ success: false, error: 'Failed to flush mail queue' });
  }
});

// Delete specific mail from queue
router.delete('/queue/:messageId', authorize(['admin', 'mail_admin']), async (req, res) => {
  try {
    const { messageId } = req.params;
    await execAsync(`postsuper -d ${messageId}`);
    res.json({ success: true, message: 'Mail deleted from queue successfully' });
  } catch (error) {
    console.error('Mail queue deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete mail from queue' });
  }
});

// Send test email
router.post('/test', 
  authorize(['admin', 'mail_admin']),
  [
    body('to').isEmail(),
    body('subject').isLength({ min: 1 }),
    body('body').isLength({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { to, subject, body } = req.body;
      const transporter = createTransporter();

      const info = await transporter.sendMail({
        from: process.env.MAIL_USER,
        to,
        subject,
        text: body,
        html: `<p>${body.replace(/\n/g, '<br>')}</p>`
      });

      res.json({ 
        success: true, 
        message: 'Test email sent successfully',
        messageId: info.messageId
      });

    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ success: false, error: 'Failed to send test email' });
    }
  }
);

// Get mail logs
router.get('/logs', authorize(['admin', 'mail_admin']), async (req, res) => {
  try {
    const { lines = 100 } = req.query;
    const { stdout } = await execAsync(`tail -n ${lines} /var/log/mail.log`);
    
    const logEntries = stdout.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/^(\w+\s+\d+\s+\d+:\d+:\d+)\s+(\w+)\s+(\w+):\s+(.*)$/);
        if (match) {
          return {
            timestamp: match[1],
            hostname: match[2],
            service: match[3],
            message: match[4]
          };
        }
        return { raw: line };
      });

    res.json({ success: true, logs: logEntries });

  } catch (error) {
    console.error('Mail logs fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mail logs' });
  }
});

module.exports = router;
