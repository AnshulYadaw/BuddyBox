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
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Email as EmailIcon,
  Domain as DomainIcon,
  Queue as QueueIcon,
  Send as SendIcon,
  AccountCircle as AccountIcon,
  Storage as StorageIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';

const EmailManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [domains, setDomains] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [queue, setQueue] = useState([]);
  const [queueSummary, setQueueSummary] = useState({});
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDomainDialog, setOpenDomainDialog] = useState(false);
  const [openAccountDialog, setOpenAccountDialog] = useState(false);
  const [openTestEmailDialog, setOpenTestEmailDialog] = useState(false);
  const [openLogsDialog, setOpenLogsDialog] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const [domainForm, setDomainForm] = useState({
    domain: ''
  });

  const [accountForm, setAccountForm] = useState({
    email: '',
    password: '',
    quota: 1024
  });

  const [testEmailForm, setTestEmailForm] = useState({
    to: '',
    subject: '',
    body: ''
  });

  useEffect(() => {
    fetchDomains();
    fetchAccounts();
    fetchQueue();
  }, []);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/mail/domains');
      setDomains(response.data.domains || []);
    } catch (error) {
      enqueueSnackbar('Failed to fetch mail domains', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await axios.get('/api/mail/accounts');
      setAccounts(response.data.accounts || []);
    } catch (error) {
      enqueueSnackbar('Failed to fetch mail accounts', { variant: 'error' });
    }
  };

  const fetchQueue = async () => {
    try {
      const response = await axios.get('/api/mail/queue');
      setQueue(response.data.queue || []);
      setQueueSummary(response.data.summary || {});
    } catch (error) {
      enqueueSnackbar('Failed to fetch mail queue', { variant: 'error' });
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await axios.get('/api/mail/logs');
      setLogs(response.data.logs || []);
      setOpenLogsDialog(true);
    } catch (error) {
      enqueueSnackbar('Failed to fetch mail logs', { variant: 'error' });
    }
  };

  const createDomain = async () => {
    try {
      await axios.post('/api/mail/domains', domainForm);
      enqueueSnackbar('Mail domain created successfully', { variant: 'success' });
      setOpenDomainDialog(false);
      setDomainForm({ domain: '' });
      fetchDomains();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to create domain', { variant: 'error' });
    }
  };

  const createAccount = async () => {
    try {
      await axios.post('/api/mail/accounts', accountForm);
      enqueueSnackbar('Mail account created successfully', { variant: 'success' });
      setOpenAccountDialog(false);
      setAccountForm({ email: '', password: '', quota: 1024 });
      fetchAccounts();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to create account', { variant: 'error' });
    }
  };

  const deleteAccount = async (email) => {
    if (window.confirm(`Are you sure you want to delete account ${email}?`)) {
      try {
        await axios.delete(`/api/mail/accounts/${email}`);
        enqueueSnackbar('Mail account deleted successfully', { variant: 'success' });
        fetchAccounts();
      } catch (error) {
        enqueueSnackbar('Failed to delete account', { variant: 'error' });
      }
    }
  };

  const flushQueue = async () => {
    try {
      await axios.post('/api/mail/queue/flush');
      enqueueSnackbar('Mail queue flushed successfully', { variant: 'success' });
      fetchQueue();
    } catch (error) {
      enqueueSnackbar('Failed to flush queue', { variant: 'error' });
    }
  };

  const deleteFromQueue = async (messageId) => {
    try {
      await axios.delete(`/api/mail/queue/${messageId}`);
      enqueueSnackbar('Mail deleted from queue', { variant: 'success' });
      fetchQueue();
    } catch (error) {
      enqueueSnackbar('Failed to delete from queue', { variant: 'error' });
    }
  };

  const sendTestEmail = async () => {
    try {
      await axios.post('/api/mail/test', testEmailForm);
      enqueueSnackbar('Test email sent successfully', { variant: 'success' });
      setOpenTestEmailDialog(false);
      setTestEmailForm({ to: '', subject: '', body: '' });
    } catch (error) {
      enqueueSnackbar('Failed to send test email', { variant: 'error' });
    }
  };

  const StatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <DomainIcon color="primary" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{domains.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Mail Domains
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
              <AccountIcon color="primary" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{accounts.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Mail Accounts
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
              <QueueIcon color="warning" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{queueSummary.totalItems || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Queued Messages
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
              <StorageIcon color="info" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{queueSummary.totalSize || '0 KB'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Queue Size
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
      id={`mail-tabpanel-${index}`}
      aria-labelledby={`mail-tab-${index}`}
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
          Email Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={fetchLogs}
            sx={{ mr: 2 }}
          >
            View Logs
          </Button>
          <Button
            variant="outlined"
            startIcon={<SendIcon />}
            onClick={() => setOpenTestEmailDialog(true)}
            sx={{ mr: 2 }}
          >
            Test Email
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchDomains();
              fetchAccounts();
              fetchQueue();
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <StatsCards />

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Domains" />
            <Tab label="Accounts" />
            <Tab label="Mail Queue" />
          </Tabs>
        </Box>

        {/* Domains Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
            <Typography variant="h6">Mail Domains</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDomainDialog(true)}
            >
              Add Domain
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Domain Name</TableCell>
                  <TableCell>Accounts</TableCell>
                  <TableCell>Aliases</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {domains.map((domain, index) => (
                  <TableRow key={index}>
                    <TableCell>{domain.name}</TableCell>
                    <TableCell>{domain.accounts}</TableCell>
                    <TableCell>{domain.aliases}</TableCell>
                    <TableCell>
                      <Chip 
                        label={domain.status} 
                        color={domain.status === 'active' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Delete Domain">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => console.log('Delete domain:', domain.name)}
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

        {/* Accounts Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
            <Typography variant="h6">Mail Accounts</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenAccountDialog(true)}
            >
              Add Account
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email Address</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Domain</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((account, index) => (
                  <TableRow key={index}>
                    <TableCell>{account.email}</TableCell>
                    <TableCell>{account.username}</TableCell>
                    <TableCell>{account.domain}</TableCell>
                    <TableCell>
                      <Chip 
                        label={account.status} 
                        color={account.status === 'active' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Delete Account">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteAccount(account.email)}
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

        {/* Mail Queue Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
            <Typography variant="h6">Mail Queue</Typography>
            <Button
              variant="outlined"
              color="warning"
              onClick={flushQueue}
              disabled={queue.length === 0}
            >
              Flush Queue
            </Button>
          </Box>
          {queue.length === 0 ? (
            <Alert severity="success">Mail queue is empty</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Message ID</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Sender</TableCell>
                    <TableCell>Recipient</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {queue.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.size}</TableCell>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.sender}</TableCell>
                      <TableCell>{item.recipient}</TableCell>
                      <TableCell>{item.status}</TableCell>
                      <TableCell>
                        <Tooltip title="Delete from Queue">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteFromQueue(item.id)}
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
          )}
        </TabPanel>
      </Card>

      {/* Add Domain Dialog */}
      <Dialog open={openDomainDialog} onClose={() => setOpenDomainDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Mail Domain</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Domain Name"
            type="text"
            fullWidth
            variant="outlined"
            value={domainForm.domain}
            onChange={(e) => setDomainForm({ ...domainForm, domain: e.target.value })}
            placeholder="example.com"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDomainDialog(false)}>Cancel</Button>
          <Button onClick={createDomain} variant="contained">Add Domain</Button>
        </DialogActions>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog open={openAccountDialog} onClose={() => setOpenAccountDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Mail Account</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={accountForm.email}
            onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
            placeholder="user@domain.com"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={accountForm.password}
            onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Quota (MB)"
            type="number"
            fullWidth
            variant="outlined"
            value={accountForm.quota}
            onChange={(e) => setAccountForm({ ...accountForm, quota: parseInt(e.target.value) })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAccountDialog(false)}>Cancel</Button>
          <Button onClick={createAccount} variant="contained">Create Account</Button>
        </DialogActions>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={openTestEmailDialog} onClose={() => setOpenTestEmailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Test Email</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="To"
            type="email"
            fullWidth
            variant="outlined"
            value={testEmailForm.to}
            onChange={(e) => setTestEmailForm({ ...testEmailForm, to: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Subject"
            type="text"
            fullWidth
            variant="outlined"
            value={testEmailForm.subject}
            onChange={(e) => setTestEmailForm({ ...testEmailForm, subject: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Message Body"
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={testEmailForm.body}
            onChange={(e) => setTestEmailForm({ ...testEmailForm, body: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTestEmailDialog(false)}>Cancel</Button>
          <Button onClick={sendTestEmail} variant="contained">Send Email</Button>
        </DialogActions>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={openLogsDialog} onClose={() => setOpenLogsDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Mail Server Logs</DialogTitle>
        <DialogContent>
          <List sx={{ bgcolor: 'background.paper', maxHeight: 400, overflow: 'auto' }}>
            {logs.map((log, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={log.message || log.raw}
                  secondary={log.timestamp && `${log.timestamp} - ${log.service}`}
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

export default EmailManagement;
