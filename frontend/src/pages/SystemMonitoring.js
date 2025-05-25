import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Computer as ComputerIcon,
  NetworkCheck as NetworkIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Stop as StopIcon,
  PlayArrow as PlayIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useSocket } from '../contexts/SocketContext';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import moment from 'moment';

const SystemMonitoring = () => {
  const [systemInfo, setSystemInfo] = useState({});
  const [processes, setProcesses] = useState([]);
  const [services, setServices] = useState([]);
  const [networkStats, setNetworkStats] = useState({});
  const [diskUsage, setDiskUsage] = useState([]);
  const [cpuHistory, setCpuHistory] = useState([]);
  const [memoryHistory, setMemoryHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { systemStats, connected } = useSocket();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (systemStats) {
      // Update history charts
      const timestamp = moment().format('HH:mm:ss');
      
      setCpuHistory(prev => [...prev.slice(-19), {
        time: timestamp,
        cpu: systemStats.cpu?.usage || 0
      }]);

      setMemoryHistory(prev => [...prev.slice(-19), {
        time: timestamp,
        memory: systemStats.memory?.usedPercent || 0
      }]);
    }
  }, [systemStats]);

  const fetchSystemData = async () => {
    try {
      setLoading(true);
      const [infoRes, processRes, servicesRes, networkRes, diskRes] = await Promise.all([
        axios.get('/api/monitoring/system-info'),
        axios.get('/api/monitoring/processes'),
        axios.get('/api/monitoring/services'),
        axios.get('/api/monitoring/network'),
        axios.get('/api/monitoring/disk')
      ]);

      setSystemInfo(infoRes.data.info || {});
      setProcesses(processRes.data.processes || []);
      setServices(servicesRes.data.services || []);
      setNetworkStats(networkRes.data.network || {});
      setDiskUsage(diskRes.data.disks || []);
    } catch (error) {
      console.error('Failed to fetch system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const controlService = async (serviceName, action) => {
    try {
      await axios.post(`/api/monitoring/services/${serviceName}/${action}`);
      enqueueSnackbar(`Service ${serviceName} ${action}ed successfully`, { variant: 'success' });
      fetchSystemData();
    } catch (error) {
      enqueueSnackbar(`Failed to ${action} service ${serviceName}`, { variant: 'error' });
    }
  };

  const killProcess = async (pid) => {
    if (window.confirm(`Are you sure you want to kill process ${pid}?`)) {
      try {
        await axios.post(`/api/monitoring/processes/${pid}/kill`);
        enqueueSnackbar('Process killed successfully', { variant: 'success' });
        fetchSystemData();
      } catch (error) {
        enqueueSnackbar('Failed to kill process', { variant: 'error' });
      }
    }
  };

  const getColorByUsage = (usage) => {
    if (usage > 80) return 'error';
    if (usage > 60) return 'warning';
    return 'success';
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading && !systemStats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  const currentStats = systemStats || {};

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          System Monitoring
        </Typography>
        <Box display="flex" alignItems="center">
          <Chip 
            label={connected ? 'Real-time' : 'Disconnected'} 
            color={connected ? 'success' : 'error'}
            size="small"
            sx={{ mr: 2 }}
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchSystemData}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* System Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <SpeedIcon color="primary" sx={{ mr: 2 }} />
                <Typography variant="h6">CPU Usage</Typography>
              </Box>
              <Box display="flex" alignItems="center" mb={1}>
                <Typography variant="h4" sx={{ mr: 2 }}>
                  {Math.round(currentStats.cpu?.usage || 0)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={currentStats.cpu?.usage || 0}
                  color={getColorByUsage(currentStats.cpu?.usage || 0)}
                  sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Load: {currentStats.cpu?.loadAvg || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <MemoryIcon color="primary" sx={{ mr: 2 }} />
                <Typography variant="h6">Memory</Typography>
              </Box>
              <Box display="flex" alignItems="center" mb={1}>
                <Typography variant="h4" sx={{ mr: 2 }}>
                  {Math.round(currentStats.memory?.usedPercent || 0)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={currentStats.memory?.usedPercent || 0}
                  color={getColorByUsage(currentStats.memory?.usedPercent || 0)}
                  sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {formatBytes(currentStats.memory?.used || 0)} / {formatBytes(currentStats.memory?.total || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <StorageIcon color="primary" sx={{ mr: 2 }} />
                <Typography variant="h6">Disk Usage</Typography>
              </Box>
              <Box display="flex" alignItems="center" mb={1}>
                <Typography variant="h4" sx={{ mr: 2 }}>
                  {Math.round(currentStats.disk?.usedPercent || 0)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={currentStats.disk?.usedPercent || 0}
                  color={getColorByUsage(currentStats.disk?.usedPercent || 0)}
                  sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {formatBytes(currentStats.disk?.used || 0)} / {formatBytes(currentStats.disk?.total || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ComputerIcon color="primary" sx={{ mr: 2 }} />
                <Typography variant="h6">System Info</Typography>
              </Box>
              <Typography variant="body2" gutterBottom>
                OS: {systemInfo.platform || 'Unknown'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Uptime: {formatUptime(currentStats.uptime || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hostname: {systemInfo.hostname || 'Unknown'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CPU Usage History
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={cpuHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 100]} />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="cpu" stroke="#1976d2" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Memory Usage History
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={memoryHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 100]} />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="memory" stroke="#dc004e" fill="#dc004e" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Processes and Services */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Processes
              </Typography>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>PID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>CPU%</TableCell>
                      <TableCell>Memory</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {processes.slice(0, 10).map((process, index) => (
                      <TableRow key={index}>
                        <TableCell>{process.pid}</TableCell>
                        <TableCell>{process.name}</TableCell>
                        <TableCell>{process.cpu}%</TableCell>
                        <TableCell>{formatBytes(process.memory)}</TableCell>
                        <TableCell>
                          <Tooltip title="Kill Process">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => killProcess(process.pid)}
                              disabled={process.pid <= 100} // Protect system processes
                            >
                              <StopIcon />
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

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Services
              </Typography>
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {services.map((service, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={service.name}
                      secondary={service.description || 'System service'}
                    />
                    <ListItemSecondaryAction>
                      <Box display="flex" alignItems="center">
                        <Chip
                          label={service.status}
                          color={service.status === 'active' ? 'success' : 'error'}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        {service.status === 'active' ? (
                          <Tooltip title="Stop Service">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => controlService(service.name, 'stop')}
                            >
                              <StopIcon />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Start Service">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => controlService(service.name, 'start')}
                            >
                              <PlayIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Network and Disk Details */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Network Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <NetworkIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">
                      {formatBytes(networkStats.bytesReceived || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Received
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <NetworkIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">
                      {formatBytes(networkStats.bytesSent || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sent
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              <Box mt={2}>
                <Typography variant="body2">
                  Packets Received: {networkStats.packetsReceived || 0}
                </Typography>
                <Typography variant="body2">
                  Packets Sent: {networkStats.packetsSent || 0}
                </Typography>
                <Typography variant="body2">
                  Errors: {networkStats.errors || 0}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Disk Usage Details
              </Typography>
              <List>
                {diskUsage.map((disk, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={disk.filesystem}
                      secondary={`Mounted on ${disk.mountpoint}`}
                    />
                    <ListItemSecondaryAction>
                      <Box textAlign="right">
                        <Typography variant="body2">
                          {Math.round(disk.usedPercent)}% used
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatBytes(disk.used)} / {formatBytes(disk.total)}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={disk.usedPercent}
                          color={getColorByUsage(disk.usedPercent)}
                          sx={{ width: 100, mt: 0.5 }}
                        />
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {!connected && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          Real-time monitoring is disconnected. Some data may not be current.
        </Alert>
      )}
    </Box>
  );
};

export default SystemMonitoring;
