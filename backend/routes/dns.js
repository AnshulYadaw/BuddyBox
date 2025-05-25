const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { authorize } = require('../middleware/auth');

const router = express.Router();
const execAsync = promisify(exec);

// PowerDNS API configuration
const POWERDNS_API_URL = process.env.POWERDNS_API_URL || 'http://localhost:8081';
const POWERDNS_API_KEY = process.env.POWERDNS_API_KEY || '';

const powerdnsHeaders = {
  'X-API-Key': POWERDNS_API_KEY,
  'Content-Type': 'application/json'
};

// Get all DNS zones
router.get('/zones', authorize(['admin', 'dns_admin']), async (req, res) => {
  try {
    const response = await axios.get(`${POWERDNS_API_URL}/api/v1/servers/localhost/zones`, {
      headers: powerdnsHeaders
    });

    const zones = response.data.map(zone => ({
      id: zone.id,
      name: zone.name,
      type: zone.kind,
      serial: zone.serial,
      records: zone.rrsets?.length || 0,
      lastCheck: zone.last_check,
      dnssec: zone.dnssec
    }));

    res.json({ success: true, zones });
  } catch (error) {
    console.error('DNS zones fetch error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch DNS zones',
      details: error.response?.data?.error || error.message
    });
  }
});

// Get specific zone details
router.get('/zones/:zoneName', authorize(['admin', 'dns_admin']), async (req, res) => {
  try {
    const { zoneName } = req.params;
    
    const response = await axios.get(`${POWERDNS_API_URL}/api/v1/servers/localhost/zones/${zoneName}`, {
      headers: powerdnsHeaders
    });

    const zone = response.data;
    const formattedZone = {
      id: zone.id,
      name: zone.name,
      type: zone.kind,
      serial: zone.serial,
      records: zone.rrsets || [],
      dnssec: zone.dnssec,
      soaEdit: zone.soa_edit,
      lastCheck: zone.last_check
    };

    res.json({ success: true, zone: formattedZone });
  } catch (error) {
    console.error('DNS zone fetch error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch DNS zone details',
      details: error.response?.data?.error || error.message
    });
  }
});

// Create new DNS zone
router.post('/zones', 
  authorize(['admin', 'dns_admin']),
  [
    body('name').isLength({ min: 1 }).matches(/^[a-zA-Z0-9.-]+$/),
    body('type').isIn(['Native', 'Master', 'Slave']),
    body('nameservers').isArray().optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, type, nameservers = [] } = req.body;

      const zoneData = {
        name: name.endsWith('.') ? name : `${name}.`,
        kind: type,
        nameservers: nameservers.length > 0 ? nameservers : [`ns1.${name}.`, `ns2.${name}.`],
        rrsets: [
          {
            name: name.endsWith('.') ? name : `${name}.`,
            type: 'SOA',
            records: [{
              content: `ns1.${name}. admin.${name}. 1 10800 3600 604800 3600`,
              disabled: false
            }]
          }
        ]
      };

      const response = await axios.post(`${POWERDNS_API_URL}/api/v1/servers/localhost/zones`, zoneData, {
        headers: powerdnsHeaders
      });

      res.status(201).json({ 
        success: true, 
        message: 'DNS zone created successfully',
        zone: response.data
      });

    } catch (error) {
      console.error('DNS zone creation error:', error.response?.data || error.message);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create DNS zone',
        details: error.response?.data?.error || error.message
      });
    }
  }
);

// Update DNS records
router.put('/zones/:zoneName/records', 
  authorize(['admin', 'dns_admin']),
  [
    body('rrsets').isArray()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { zoneName } = req.params;
      const { rrsets } = req.body;

      const response = await axios.patch(
        `${POWERDNS_API_URL}/api/v1/servers/localhost/zones/${zoneName}`,
        { rrsets },
        { headers: powerdnsHeaders }
      );

      res.json({ 
        success: true, 
        message: 'DNS records updated successfully'
      });

    } catch (error) {
      console.error('DNS records update error:', error.response?.data || error.message);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update DNS records',
        details: error.response?.data?.error || error.message
      });
    }
  }
);

// Delete DNS zone
router.delete('/zones/:zoneName', authorize(['admin', 'dns_admin']), async (req, res) => {
  try {
    const { zoneName } = req.params;

    await axios.delete(`${POWERDNS_API_URL}/api/v1/servers/localhost/zones/${zoneName}`, {
      headers: powerdnsHeaders
    });

    res.json({ 
      success: true, 
      message: 'DNS zone deleted successfully'
    });

  } catch (error) {
    console.error('DNS zone deletion error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete DNS zone',
      details: error.response?.data?.error || error.message
    });
  }
});

// DNS propagation check
router.get('/propagation/:domain/:recordType', async (req, res) => {
  try {
    const { domain, recordType } = req.params;
    
    // List of public DNS servers to check
    const dnsServers = [
      '8.8.8.8',      // Google
      '1.1.1.1',      // Cloudflare
      '208.67.222.222', // OpenDNS
      '9.9.9.9'       // Quad9
    ];

    const results = await Promise.allSettled(
      dnsServers.map(async (server) => {
        const { stdout } = await execAsync(`dig @${server} ${domain} ${recordType} +short`);
        return {
          server,
          result: stdout.trim(),
          status: 'resolved'
        };
      })
    );

    const propagationResults = results.map((result, index) => ({
      server: dnsServers[index],
      status: result.status === 'fulfilled' ? 'success' : 'error',
      result: result.status === 'fulfilled' ? result.value.result : result.reason?.message,
      consistent: true // Will be calculated below
    }));

    // Check consistency
    const uniqueResults = new Set(propagationResults.map(r => r.result));
    const isConsistent = uniqueResults.size <= 1;

    propagationResults.forEach(result => {
      result.consistent = isConsistent;
    });

    res.json({ 
      success: true, 
      domain,
      recordType,
      consistent: isConsistent,
      results: propagationResults
    });

  } catch (error) {
    console.error('DNS propagation check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check DNS propagation'
    });
  }
});

// Get DNS statistics
router.get('/stats', authorize(['admin', 'dns_admin']), async (req, res) => {
  try {
    const response = await axios.get(`${POWERDNS_API_URL}/api/v1/servers/localhost/statistics`, {
      headers: powerdnsHeaders
    });

    const stats = response.data;
    const formattedStats = {
      queries: stats.find(s => s.name === 'udp-queries')?.value || 0,
      answers: stats.find(s => s.name === 'udp-answers')?.value || 0,
      cacheHits: stats.find(s => s.name === 'packetcache-hit')?.value || 0,
      cacheMisses: stats.find(s => s.name === 'packetcache-miss')?.value || 0,
      uptime: stats.find(s => s.name === 'uptime')?.value || 0
    };

    res.json({ success: true, stats: formattedStats });

  } catch (error) {
    console.error('DNS stats fetch error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch DNS statistics'
    });
  }
});

module.exports = router;
