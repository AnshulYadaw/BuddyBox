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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Dns as DnsIcon,
  Public as PublicIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import axios from 'axios';

const DNSManagement = () => {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openZoneDialog, setOpenZoneDialog] = useState(false);
  const [openRecordDialog, setOpenRecordDialog] = useState(false);
  const [openPropagationDialog, setOpenPropagationDialog] = useState(false);
  const [propagationData, setPropagationData] = useState(null);
  const [stats, setStats] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const [zoneForm, setZoneForm] = useState({
    name: '',
    type: 'Master',
    nameservers: ['ns1.', 'ns2.']
  });

  const [recordForm, setRecordForm] = useState({
    name: '',
    type: 'A',
    content: '',
    ttl: 3600
  });

  const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SRV'];

  useEffect(() => {
    fetchZones();
    fetchStats();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/dns/zones');
      setZones(response.data.zones || []);
    } catch (error) {
      enqueueSnackbar('Failed to fetch DNS zones', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchZoneRecords = async (zoneName) => {
    try {
      const response = await axios.get(`/api/dns/zones/${zoneName}`);
      setRecords(response.data.zone.records || []);
      setSelectedZone(zoneName);
    } catch (error) {
      enqueueSnackbar('Failed to fetch zone records', { variant: 'error' });
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/dns/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch DNS stats:', error);
    }
  };

  const createZone = async () => {
    try {
      await axios.post('/api/dns/zones', zoneForm);
      enqueueSnackbar('DNS zone created successfully', { variant: 'success' });
      setOpenZoneDialog(false);
      setZoneForm({ name: '', type: 'Master', nameservers: ['ns1.', 'ns2.'] });
      fetchZones();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to create zone', { variant: 'error' });
    }
  };

  const deleteZone = async (zoneName) => {
    if (window.confirm(`Are you sure you want to delete zone ${zoneName}?`)) {
      try {
        await axios.delete(`/api/dns/zones/${zoneName}`);
        enqueueSnackbar('DNS zone deleted successfully', { variant: 'success' });
        fetchZones();
        if (selectedZone === zoneName) {
          setSelectedZone(null);
          setRecords([]);
        }
      } catch (error) {
        enqueueSnackbar('Failed to delete zone', { variant: 'error' });
      }
    }
  };

  const updateRecords = async () => {
    try {
      const rrsets = [
        {
          name: recordForm.name,
          type: recordForm.type,
          changetype: 'REPLACE',
          records: [
            {
              content: recordForm.content,
              disabled: false
            }
          ]
        }
      ];

      await axios.put(`/api/dns/zones/${selectedZone}/records`, { rrsets });
      enqueueSnackbar('DNS record updated successfully', { variant: 'success' });
      setOpenRecordDialog(false);
      setRecordForm({ name: '', type: 'A', content: '', ttl: 3600 });
      fetchZoneRecords(selectedZone);
    } catch (error) {
      enqueueSnackbar('Failed to update record', { variant: 'error' });
    }
  };

  const checkPropagation = async (domain, recordType) => {
    try {
      const response = await axios.get(`/api/dns/propagation/${domain}/${recordType}`);
      setPropagationData(response.data);
      setOpenPropagationDialog(true);
    } catch (error) {
      enqueueSnackbar('Failed to check DNS propagation', { variant: 'error' });
    }
  };

  const StatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <DnsIcon color="primary" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{zones.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Zones
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
              <PublicIcon color="primary" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{stats?.queries || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Queries
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
              <CheckCircleIcon color="success" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{stats?.cacheHits || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Cache Hits
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
              <ErrorIcon color="warning" sx={{ mr: 2 }} />
              <Box>
                <Typography variant="h6">{stats?.cacheMisses || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Cache Misses
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
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
          DNS Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchZones}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenZoneDialog(true)}
          >
            Add Zone
          </Button>
        </Box>
      </Box>

      <StatsCards />

      <Grid container spacing={3}>
        {/* DNS Zones */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                DNS Zones
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Zone Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Records</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {zones.map((zone) => (
                      <TableRow key={zone.id}>
                        <TableCell>{zone.name}</TableCell>
                        <TableCell>
                          <Chip 
                            label={zone.type} 
                            size="small" 
                            color={zone.type === 'Master' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{zone.records}</TableCell>
                        <TableCell>
                          <Tooltip title="View Records">
                            <IconButton
                              size="small"
                              onClick={() => fetchZoneRecords(zone.name)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Zone">
                            <IconButton
                              size="small"
                              onClick={() => deleteZone(zone.name)}
                              color="error"
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
            </CardContent>
          </Card>
        </Grid>

        {/* DNS Records */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  DNS Records {selectedZone && `- ${selectedZone}`}
                </Typography>
                {selectedZone && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenRecordDialog(true)}
                  >
                    Add Record
                  </Button>
                )}
              </Box>

              {!selectedZone ? (
                <Alert severity="info">
                  Select a zone to view and manage records
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Content</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {records.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell>{record.name}</TableCell>
                          <TableCell>
                            <Chip label={record.type} size="small" />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {record.records?.[0]?.content || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Check Propagation">
                              <IconButton
                                size="small"
                                onClick={() => checkPropagation(record.name, record.type)}
                              >
                                <PublicIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Zone Dialog */}
      <Dialog open={openZoneDialog} onClose={() => setOpenZoneDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create DNS Zone</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Zone Name"
            type="text"
            fullWidth
            variant="outlined"
            value={zoneForm.name}
            onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>Zone Type</InputLabel>
            <Select
              value={zoneForm.type}
              onChange={(e) => setZoneForm({ ...zoneForm, type: e.target.value })}
              label="Zone Type"
            >
              <MenuItem value="Master">Master</MenuItem>
              <MenuItem value="Slave">Slave</MenuItem>
              <MenuItem value="Native">Native</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenZoneDialog(false)}>Cancel</Button>
          <Button onClick={createZone} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Add Record Dialog */}
      <Dialog open={openRecordDialog} onClose={() => setOpenRecordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add DNS Record</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Record Name"
            type="text"
            fullWidth
            variant="outlined"
            value={recordForm.name}
            onChange={(e) => setRecordForm({ ...recordForm, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
            <InputLabel>Record Type</InputLabel>
            <Select
              value={recordForm.type}
              onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value })}
              label="Record Type"
            >
              {recordTypes.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Content"
            type="text"
            fullWidth
            variant="outlined"
            value={recordForm.content}
            onChange={(e) => setRecordForm({ ...recordForm, content: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="TTL"
            type="number"
            fullWidth
            variant="outlined"
            value={recordForm.ttl}
            onChange={(e) => setRecordForm({ ...recordForm, ttl: parseInt(e.target.value) })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRecordDialog(false)}>Cancel</Button>
          <Button onClick={updateRecords} variant="contained">Add Record</Button>
        </DialogActions>
      </Dialog>

      {/* Propagation Check Dialog */}
      <Dialog 
        open={openPropagationDialog} 
        onClose={() => setOpenPropagationDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>DNS Propagation Check</DialogTitle>
        <DialogContent>
          {propagationData && (
            <Box>
              <Alert 
                severity={propagationData.consistent ? 'success' : 'warning'} 
                sx={{ mb: 2 }}
              >
                {propagationData.consistent 
                  ? 'DNS records are consistent across all servers'
                  : 'DNS records are not yet fully propagated'
                }
              </Alert>
              <Typography variant="h6" gutterBottom>
                {propagationData.domain} ({propagationData.recordType})
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>DNS Server</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Result</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {propagationData.results.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell>{result.server}</TableCell>
                        <TableCell>
                          <Chip 
                            label={result.status} 
                            color={result.status === 'success' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{result.result || 'No result'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPropagationDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DNSManagement;
