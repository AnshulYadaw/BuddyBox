import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  Security as SecurityIcon,
  Shield as ShieldIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
  Lock as LockIcon,
  PublicOff as PublicOffIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';

const SecurityPanel = () => {
  const [tabValue, setTabValue] = useState(0);
  const [bannedIPs, setBannedIPs] = useState([]);
  const [firewallRules, setFirewallRules] = useState([]);
  const [fail2banJails, setFail2banJails] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [openBanDialog, setOpenBanDialog] = useState(false);
  const [openRuleDialog, setOpenRuleDialog] = useState(false);
  const [openLogsDialog, setOpenLogsDialog] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const [banForm, setBanForm] = useState({
    ip: '',
    jail: 'sshd',
    duration: 3600
  });

  const [ruleForm, setRuleForm] = useState({
    port: '',
    protocol: 'tcp',
    action: 'allow',
    from: 'any',
    to: 'any'
  });

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchBannedIPs(),
        fetchFirewallRules(),
        fetchFail2banJails(),
        fetchSecurityStats()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBannedIPs = async () => {
    try {
      const response = await axios.get('/api/security/banned-ips');
      setBannedIPs(response.data.ips || []);
    } catch (error) {
      enqueueSnackbar('Failed to fetch banned IPs', { variant: 'error' });
    }
  };

  const fetchFirewallRules = async () => {
    try {
      const response = await axios.get('/api/security/firewall');
      setFirewallRules(response.data.rules || []);
    } catch (error) {
      enqueueSnackbar('Failed to fetch firewall rules', { variant: 'error' });
    }
  };

  const fetchFail2banJails = async () => {
    try {
      const response = await axios.get('/api/security/fail2ban/jails');
      setFail2banJails(response.data.jails || []);
    } catch (error) {
      enqueueSnackbar('Failed to fetch Fail2Ban jails', { variant: 'error' });
    }
  };

  const fetchSecurityStats = async () => {
    try {
      const response = await axios.get('/api/security/stats');
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Failed to fetch security stats:', error);
    }
  };

  const fetchSecurityLogs = async () => {
    try {
      const response = await axios.get('/api/security/logs');
      setSecurityLogs(response.data.logs || []);
      setOpenLogsDialog(true);
    } catch (error) {
      enqueueSnackbar('Failed to fetch security logs', { variant: 'error' });
    }
  };

  const banIP = async () => {
    try {
      await axios.post('/api/security/ban-ip', banForm);
      enqueueSnackbar('IP banned successfully', { variant: 'success' });
      setOpenBanDialog(false);
      setBanForm({ ip: '', jail: 'sshd', duration: 3600 });
      fetchBannedIPs();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to ban IP', { variant: 'error' });
    }
  };

  const unbanIP = async (ip, jail) => {
    try {
      await axios.post('/api/security/unban-ip', { ip, jail });
      enqueueSnackbar('IP unbanned successfully', { variant: 'success' });
      fetchBannedIPs();
    } catch (error) {
      enqueueSnackbar('Failed to unban IP', { variant: 'error' });
    }
  };

  const addFirewallRule = async () => {
    try {
      await axios.post('/api/security/firewall', ruleForm);
      enqueueSnackbar('Firewall rule added successfully', { variant: 'success' });
      setOpenRuleDialog(false);
      setRuleForm({ port: '', protocol: 'tcp', action: 'allow', from: 'any', to: 'any' });
      fetchFirewallRules();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to add firewall rule', { variant: 'error' });
    }
  };

  const deleteFirewallRule = async (ruleId) => {
    try {
      await axios.delete(`/api/security/firewall/${ruleId}`);
      enqueueSnackbar('Firewall rule deleted successfully', { variant: 'success' });
      fetchFirewallRules();
    } catch (error) {
      enqueueSnackbar('Failed to delete firewall rule', { variant: 'error' });
    }
  };

  const toggleJail = async (jailName, enabled) => {
    try {
      await axios.post(`/api/security/fail2ban/jails/${jailName}/toggle`, { enabled });
      enqueueSnackbar(`Jail ${enabled ? 'enabled' : 'disabled'} successfully`, { variant: 'success' });
      fetchFail2banJails();
    } catch (error) {
      enqueueSnackbar('Failed to toggle jail status', { variant: 'error' });
    }
  };

  const StatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <PublicOffIcon color="error" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{bannedIPs.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Banned IPs
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <ShieldIcon color="primary" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{firewallRules.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Firewall Rules
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <LockIcon color="warning" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{fail2banJails.filter(j => j.enabled).length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Jails
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <WarningIcon color="info" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{stats.totalBlocks || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Blocks
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const TabPanel = ({ children, value, index, ...other }) => (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`security-tabpanel-${index}`}
      aria-labelledby={`security-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Security Panel
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={fetchSecurityLogs}
            sx={{ mr: 2 }}
          >
            View Logs
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchSecurityData}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <StatsCards />

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Banned IPs" />
            <Tab label="Firewall" />
            <Tab label="Fail2Ban" />
          </Tabs>
        </Box>

        {/* Banned IPs Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
            <Typography variant="h6">Banned IP Addresses</Typography>
            <Button
              variant="contained"
              startIcon={<BlockIcon />}
              onClick={() => setOpenBanDialog(true)}
            >
              Ban IP
            </Button>
          </Box>
          {bannedIPs.length === 0 ? (
            <Alert severity="success">No IPs are currently banned</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>IP Address</TableCell>
                    <TableCell>Jail</TableCell>
                    <TableCell>Ban Time</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bannedIPs.map((ban, index) => (
                    <TableRow key={index}>
                      <TableCell>{ban.ip}</TableCell>
                      <TableCell>
                        <Chip label={ban.jail} size="small" />
                      </TableCell>
                      <TableCell>{ban.banTime}</TableCell>
                      <TableCell>{ban.reason || 'Manual ban'}</TableCell>
                      <TableCell>
                        <Tooltip title="Unban IP">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => unbanIP(ban.ip, ban.jail)}
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Firewall Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
            <Typography variant="h6">Firewall Rules</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenRuleDialog(true)}
            >
              Add Rule
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rule #</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Port</TableCell>
                  <TableCell>Protocol</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {firewallRules.map((rule, index) => (
                  <TableRow key={index}>
                    <TableCell>{rule.id || index + 1}</TableCell>
                    <TableCell>
                      <Chip 
                        label={rule.action} 
                        color={rule.action === 'allow' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{rule.port}</TableCell>
                    <TableCell>{rule.protocol}</TableCell>
                    <TableCell>{rule.from}</TableCell>
                    <TableCell>{rule.to}</TableCell>
                    <TableCell>
                      <Tooltip title="Delete Rule">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteFirewallRule(rule.id || index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Fail2Ban Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Fail2Ban Jails
          </Typography>
          <List>
            {fail2banJails.map((jail, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={jail.name}
                  secondary={`Filter: ${jail.filter} | Log Path: ${jail.logPath}`}
                />
                <ListItemSecondaryAction>
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" sx={{ mr: 2 }}>
                      {jail.currentlyBanned} banned
                    </Typography>
                    <Chip 
                      label={jail.enabled ? 'Active' : 'Inactive'}
                      color={jail.enabled ? 'success' : 'default'}
                      size="small"
                      sx={{ mr: 2 }}
                    />
                    <Switch
                      checked={jail.enabled}
                      onChange={(e) => toggleJail(jail.name, e.target.checked)}
                    />
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </TabPanel>
      </Card>

      {/* Ban IP Dialog */}
      <Dialog open={openBanDialog} onClose={() => setOpenBanDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ban IP Address</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="IP Address"
            type="text"
            fullWidth
            variant="outlined"
            value={banForm.ip}
            onChange={(e) => setBanForm({ ...banForm, ip: e.target.value })}
            placeholder="192.168.1.1"
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>Jail</InputLabel>
            <Select
              value={banForm.jail}
              onChange={(e) => setBanForm({ ...banForm, jail: e.target.value })}
              label="Jail"
            >
              <MenuItem value="sshd">SSH</MenuItem>
              <MenuItem value="apache-auth">Apache Auth</MenuItem>
              <MenuItem value="apache-badbots">Apache Bad Bots</MenuItem>
              <MenuItem value="postfix">Postfix</MenuItem>
              <MenuItem value="dovecot">Dovecot</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Duration (seconds)"
            type="number"
            fullWidth
            variant="outlined"
            value={banForm.duration}
            onChange={(e) => setBanForm({ ...banForm, duration: parseInt(e.target.value) })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBanDialog(false)}>Cancel</Button>
          <Button onClick={banIP} variant="contained" color="error">Ban IP</Button>
        </DialogActions>
      </Dialog>

      {/* Add Firewall Rule Dialog */}
      <Dialog open={openRuleDialog} onClose={() => setOpenRuleDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Firewall Rule</DialogTitle>
        <DialogContent>
          <FormControl fullWidth variant="outlined" sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Action</InputLabel>
            <Select
              value={ruleForm.action}
              onChange={(e) => setRuleForm({ ...ruleForm, action: e.target.value })}
              label="Action"
            >
              <MenuItem value="allow">Allow</MenuItem>
              <MenuItem value="deny">Deny</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Port"
            type="text"
            fullWidth
            variant="outlined"
            value={ruleForm.port}
            onChange={(e) => setRuleForm({ ...ruleForm, port: e.target.value })}
            placeholder="80, 443, or 22:25"
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>Protocol</InputLabel>
            <Select
              value={ruleForm.protocol}
              onChange={(e) => setRuleForm({ ...ruleForm, protocol: e.target.value })}
              label="Protocol"
            >
              <MenuItem value="tcp">TCP</MenuItem>
              <MenuItem value="udp">UDP</MenuItem>
              <MenuItem value="any">Any</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="From"
            type="text"
            fullWidth
            variant="outlined"
            value={ruleForm.from}
            onChange={(e) => setRuleForm({ ...ruleForm, from: e.target.value })}
            placeholder="IP address or 'any'"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="To"
            type="text"
            fullWidth
            variant="outlined"
            value={ruleForm.to}
            onChange={(e) => setRuleForm({ ...ruleForm, to: e.target.value })}
            placeholder="IP address or 'any'"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRuleDialog(false)}>Cancel</Button>
          <Button onClick={addFirewallRule} variant="contained">Add Rule</Button>
        </DialogActions>
      </Dialog>

      {/* Security Logs Dialog */}
      <Dialog open={openLogsDialog} onClose={() => setOpenLogsDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Security Logs</DialogTitle>
        <DialogContent>
          <List sx={{ bgcolor: 'background.paper', maxHeight: 400, overflow: 'auto' }}>
            {securityLogs.map((log, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={log.message || log.raw}
                  secondary={log.timestamp && `${log.timestamp} - ${log.level || 'INFO'}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLogsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecurityPanel;
