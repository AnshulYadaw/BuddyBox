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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Storage as StorageIcon,
  AccountCircle as AccountIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  ExpandMore as ExpandMoreIcon,
  TableChart as TableIcon,
  Assessment as AssessmentIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/theme-github';

const DatabaseManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [databases, setDatabases] = useState([]);
  const [tables, setTables] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [openDatabaseDialog, setOpenDatabaseDialog] = useState(false);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [openQueryDialog, setOpenQueryDialog] = useState(false);
  const [openBackupDialog, setOpenBackupDialog] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 10;');
  const [databaseForm, setDatabaseForm] = useState({
    name: '',
    owner: 'postgres',
    encoding: 'UTF8'
  });

  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'user',
    databases: []
  });

  const [backupForm, setBackupForm] = useState({
    database: '',
    format: 'custom',
    compression: true
  });

  useEffect(() => {
    fetchDatabaseData();
  }, []);

  const fetchDatabaseData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDatabases(),
        fetchUsers(),
        fetchStats()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabases = async () => {
    try {
      const response = await axios.get('/api/database/databases');
      setDatabases(response.data.databases || []);
    } catch (error) {
      enqueueSnackbar('Failed to fetch databases', { variant: 'error' });
    }
  };

  const fetchTables = async (dbName) => {
    try {
      const response = await axios.get(`/api/database/databases/${dbName}/tables`);
      setTables(response.data.tables || []);
      setSelectedDatabase(dbName);
    } catch (error) {
      enqueueSnackbar('Failed to fetch tables', { variant: 'error' });
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/database/users');
      setUsers(response.data.users || []);
    } catch (error) {
      enqueueSnackbar('Failed to fetch database users', { variant: 'error' });
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/database/stats');
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Failed to fetch database stats:', error);
    }
  };

  const createDatabase = async () => {
    try {
      await axios.post('/api/database/databases', databaseForm);
      enqueueSnackbar('Database created successfully', { variant: 'success' });
      setOpenDatabaseDialog(false);
      setDatabaseForm({ name: '', owner: 'postgres', encoding: 'UTF8' });
      fetchDatabases();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to create database', { variant: 'error' });
    }
  };

  const deleteDatabase = async (dbName) => {
    if (window.confirm(`Are you sure you want to delete database ${dbName}? This action cannot be undone.`)) {
      try {
        await axios.delete(`/api/database/databases/${dbName}`);
        enqueueSnackbar('Database deleted successfully', { variant: 'success' });
        fetchDatabases();
        if (selectedDatabase === dbName) {
          setSelectedDatabase('');
          setTables([]);
        }
      } catch (error) {
        enqueueSnackbar('Failed to delete database', { variant: 'error' });
      }
    }
  };

  const createUser = async () => {
    try {
      await axios.post('/api/database/users', userForm);
      enqueueSnackbar('Database user created successfully', { variant: 'success' });
      setOpenUserDialog(false);
      setUserForm({ username: '', password: '', role: 'user', databases: [] });
      fetchUsers();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to create user', { variant: 'error' });
    }
  };

  const deleteUser = async (username) => {
    if (window.confirm(`Are you sure you want to delete user ${username}?`)) {
      try {
        await axios.delete(`/api/database/users/${username}`);
        enqueueSnackbar('Database user deleted successfully', { variant: 'success' });
        fetchUsers();
      } catch (error) {
        enqueueSnackbar('Failed to delete user', { variant: 'error' });
      }
    }
  };

  const executeQuery = async () => {
    try {
      const response = await axios.post('/api/database/query', {
        query: sqlQuery,
        database: selectedDatabase || 'postgres'
      });
      
      setQueryResult(response.data);
      setQueryHistory(prev => [
        { query: sqlQuery, timestamp: new Date(), database: selectedDatabase || 'postgres' },
        ...prev.slice(0, 9)
      ]);
      enqueueSnackbar('Query executed successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to execute query', { variant: 'error' });
      setQueryResult({ error: error.response?.data?.error || 'Query execution failed' });
    }
  };

  const createBackup = async () => {
    try {
      await axios.post('/api/database/backup', backupForm);
      enqueueSnackbar('Database backup created successfully', { variant: 'success' });
      setOpenBackupDialog(false);
      setBackupForm({ database: '', format: 'custom', compression: true });
    } catch (error) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to create backup', { variant: 'error' });
    }
  };

  const StatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <StorageIcon color="primary" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{databases.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Databases
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
                <Typography variant="h6">{users.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Database Users
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
              <TableIcon color="success" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{stats.totalConnections || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Connections
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
              <AssessmentIcon color="info" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{stats.totalSize || '0 MB'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Size
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
      id={`database-tabpanel-${index}`}
      aria-labelledby={`database-tab-${index}`}
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
          Database Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => setOpenBackupDialog(true)}
            sx={{ mr: 2 }}
          >
            Backup
          </Button>
          <Button
            variant="outlined"
            startIcon={<CodeIcon />}
            onClick={() => setOpenQueryDialog(true)}
            sx={{ mr: 2 }}
          >
            Query Console
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchDatabaseData}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <StatsCards />

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Databases" />
            <Tab label="Users" />
            <Tab label="Query History" />
          </Tabs>
        </Box>

        {/* Databases Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
            <Typography variant="h6">PostgreSQL Databases</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDatabaseDialog(true)}
            >
              Create Database
            </Button>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Database Name</TableCell>
                      <TableCell>Owner</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {databases.map((db, index) => (
                      <TableRow key={index}>
                        <TableCell>{db.name}</TableCell>
                        <TableCell>{db.owner}</TableCell>
                        <TableCell>{db.size}</TableCell>
                        <TableCell>
                          <Tooltip title="View Tables">
                            <IconButton
                              size="small"
                              onClick={() => fetchTables(db.name)}
                            >
                              <TableIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Database">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteDatabase(db.name)}
                              disabled={['postgres', 'template0', 'template1'].includes(db.name)}
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
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: 'fit-content' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Tables {selectedDatabase && `in ${selectedDatabase}`}
                  </Typography>
                  {!selectedDatabase ? (
                    <Alert severity="info">
                      Select a database to view its tables
                    </Alert>
                  ) : (
                    <List>
                      {tables.map((table, index) => (
                        <ListItem key={index} divider>
                          <ListItemText
                            primary={table.name}
                            secondary={`${table.rows} rows, ${table.size}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Users Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
            <Typography variant="h6">Database Users</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenUserDialog(true)}
            >
              Create User
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Can Create DB</TableCell>
                  <TableCell>Can Create Role</TableCell>
                  <TableCell>Valid Until</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user, index) => (
                  <TableRow key={index}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role} 
                        color={user.role === 'superuser' ? 'error' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.canCreateDB ? 'Yes' : 'No'}
                        color={user.canCreateDB ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.canCreateRole ? 'Yes' : 'No'}
                        color={user.canCreateRole ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user.validUntil || 'Never'}</TableCell>
                    <TableCell>
                      <Tooltip title="Delete User">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteUser(user.username)}
                          disabled={user.username === 'postgres'}
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

        {/* Query History Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Recent Query History
          </Typography>
          {queryHistory.length === 0 ? (
            <Alert severity="info">No queries executed yet</Alert>
          ) : (
            <List>
              {queryHistory.map((entry, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>{entry.query.slice(0, 50)}...</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {entry.database} - {entry.timestamp.toLocaleString()}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                      <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                        {entry.query}
                      </Typography>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </List>
          )}
        </TabPanel>
      </Card>

      {/* Create Database Dialog */}
      <Dialog open={openDatabaseDialog} onClose={() => setOpenDatabaseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Database</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Database Name"
            type="text"
            fullWidth
            variant="outlined"
            value={databaseForm.name}
            onChange={(e) => setDatabaseForm({ ...databaseForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Owner"
            type="text"
            fullWidth
            variant="outlined"
            value={databaseForm.owner}
            onChange={(e) => setDatabaseForm({ ...databaseForm, owner: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined">
            <InputLabel>Encoding</InputLabel>
            <Select
              value={databaseForm.encoding}
              onChange={(e) => setDatabaseForm({ ...databaseForm, encoding: e.target.value })}
              label="Encoding"
            >
              <MenuItem value="UTF8">UTF8</MenuItem>
              <MenuItem value="LATIN1">LATIN1</MenuItem>
              <MenuItem value="ASCII">ASCII</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDatabaseDialog(false)}>Cancel</Button>
          <Button onClick={createDatabase} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Database User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={userForm.username}
            onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined">
            <InputLabel>Role</InputLabel>
            <Select
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              label="Role"
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="readonly">Read Only</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUserDialog(false)}>Cancel</Button>
          <Button onClick={createUser} variant="contained">Create User</Button>
        </DialogActions>
      </Dialog>

      {/* Query Console Dialog */}
      <Dialog open={openQueryDialog} onClose={() => setOpenQueryDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>SQL Query Console</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <FormControl variant="outlined" sx={{ minWidth: 200, mr: 2 }}>
              <InputLabel>Database</InputLabel>
              <Select
                value={selectedDatabase || 'postgres'}
                onChange={(e) => setSelectedDatabase(e.target.value)}
                label="Database"
              >
                <MenuItem value="postgres">postgres</MenuItem>
                {databases.map((db) => (
                  <MenuItem key={db.name} value={db.name}>{db.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<PlayIcon />}
              onClick={executeQuery}
            >
              Execute Query
            </Button>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <AceEditor
              mode="sql"
              theme="github"
              value={sqlQuery}
              onChange={setSqlQuery}
              name="sql-editor"
              editorProps={{ $blockScrolling: true }}
              width="100%"
              height="200px"
              fontSize={14}
              showPrintMargin={false}
              showGutter={true}
              highlightActiveLine={true}
              setOptions={{
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                enableSnippets: true,
                showLineNumbers: true,
                tabSize: 2
              }}
            />
          </Box>

          {queryResult && (
            <Box>
              <Typography variant="h6" gutterBottom>Query Result</Typography>
              {queryResult.error ? (
                <Alert severity="error">{queryResult.error}</Alert>
              ) : (
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        {queryResult.columns?.map((col, index) => (
                          <TableCell key={index}>{col}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {queryResult.rows?.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value, cellIndex) => (
                            <TableCell key={cellIndex}>
                              {value?.toString() || 'NULL'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQueryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Backup Dialog */}
      <Dialog open={openBackupDialog} onClose={() => setOpenBackupDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Database Backup</DialogTitle>
        <DialogContent>
          <FormControl fullWidth variant="outlined" sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Database</InputLabel>
            <Select
              value={backupForm.database}
              onChange={(e) => setBackupForm({ ...backupForm, database: e.target.value })}
              label="Database"
            >
              {databases.map((db) => (
                <MenuItem key={db.name} value={db.name}>{db.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>Format</InputLabel>
            <Select
              value={backupForm.format}
              onChange={(e) => setBackupForm({ ...backupForm, format: e.target.value })}
              label="Format"
            >
              <MenuItem value="custom">Custom</MenuItem>
              <MenuItem value="plain">Plain SQL</MenuItem>
              <MenuItem value="directory">Directory</MenuItem>
              <MenuItem value="tar">Tar</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBackupDialog(false)}>Cancel</Button>
          <Button onClick={createBackup} variant="contained">Create Backup</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatabaseManagement;
