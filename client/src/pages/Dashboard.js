import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Dns,
  Email,
  Security,
  Storage,
  Speed,
  Memory,
  Computer,
  NetworkWifi,
  Refresh,
} from '@mui/icons-material';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { systemStats, connected } = useSocket();
  const { user } = useAuth();

  const StatCard = ({ title, value, icon, color, subtitle, progress }) => (
    <Card sx={{ height: '100%', position: 'relative' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 2,
              backgroundColor: `${color}.light`,
              color: `${color}.main`,
              mr: 2,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
        </Box>
        
        <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1 }}>
          {value}
        </Typography>
        
        {progress !== undefined && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  backgroundColor: `${color}.main`,
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {progress.toFixed(1)}% used
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const ServiceCard = ({ title, status, icon, color }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 2,
                backgroundColor: `${color}.light`,
                color: `${color}.main`,
                mr: 2,
              }}
            >
              {icon}
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          </Box>
          <Chip
            label={status}
            color={status === 'Running' ? 'success' : 'error'}
            size="small"
          />
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            Welcome back, {user?.username}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here's what's happening with your server today.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={connected ? 'Connected' : 'Disconnected'}
            color={connected ? 'success' : 'error'}
            icon={<NetworkWifi />}
          />
          <IconButton color="primary">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* System Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="CPU Usage"
            value={systemStats?.cpu ? `${systemStats.cpu.toFixed(1)}%` : '0%'}
            icon={<Computer />}
            color="primary"
            subtitle="Current load"
            progress={systemStats?.cpu || 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Memory"
            value={systemStats?.memory ? `${(systemStats.memory.used / 1024 / 1024 / 1024).toFixed(1)}GB` : '0GB'}
            icon={<Memory />}
            color="success"
            subtitle={systemStats?.memory ? `of ${(systemStats.memory.total / 1024 / 1024 / 1024).toFixed(1)}GB` : 'of 0GB'}
            progress={systemStats?.memory ? (systemStats.memory.used / systemStats.memory.total) * 100 : 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Disk Usage"
            value={systemStats?.disk ? `${(systemStats.disk.used / 1024 / 1024 / 1024).toFixed(1)}GB` : '0GB'}
            icon={<Storage />}
            color="warning"
            subtitle={systemStats?.disk ? `of ${(systemStats.disk.total / 1024 / 1024 / 1024).toFixed(1)}GB` : 'of 0GB'}
            progress={systemStats?.disk ? (systemStats.disk.used / systemStats.disk.total) * 100 : 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Load Average"
            value={systemStats?.loadAverage ? systemStats.loadAverage[0].toFixed(2) : '0.00'}
            icon={<Speed />}
            color="info"
            subtitle="1 minute avg"
          />
        </Grid>
      </Grid>

      {/* Services Status */}
      <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 3 }}>
        Services Status
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <ServiceCard
            title="PowerDNS"
            status="Running"
            icon={<Dns />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ServiceCard
            title="Postfix"
            status="Running"
            icon={<Email />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ServiceCard
            title="Fail2Ban"
            status="Running"
            icon={<Security />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ServiceCard
            title="PostgreSQL"
            status="Running"
            icon={<Storage />}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 3 }}>
        Quick Actions
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Dns color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Manage DNS
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add zones and records
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Email color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Email Accounts
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create mail accounts
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Security color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Security Logs
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View security events
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
