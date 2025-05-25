import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Avatar,
  Box,
  Tab,
  Tabs,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import {
  Person,
  Security,
  History,
  Settings,
  Edit,
  Save,
  Cancel,
  Visibility,
  VisibilityOff,
  VpnKey,
  Shield,
  Computer,
  Email,
  Phone,
  LocationOn,
  Language,
  Palette,
  Notifications
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const UserProfile = () => {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    avatar: null
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    emailNotifications: true,
    smsNotifications: false,
    securityAlerts: true,
    maintenanceAlerts: true,
    autoLogout: 30
  });
  const [sessions, setSessions] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [apiKeyDialog, setApiKeyDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState({ name: '', permissions: [] });

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        bio: user.bio || '',
        avatar: user.avatar || null
      });
    }
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, activityRes, keysRes, prefsRes] = await Promise.all([
        fetch('/api/auth/sessions', { credentials: 'include' }),
        fetch('/api/auth/activity', { credentials: 'include' }),
        fetch('/api/auth/api-keys', { credentials: 'include' }),
        fetch('/api/auth/preferences', { credentials: 'include' })
      ]);

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || []);
      }

      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivityLog(data.activities || []);
      }

      if (keysRes.ok) {
        const data = await keysRes.json();
        setApiKeys(data.apiKeys || []);
      }

      if (prefsRes.ok) {
        const data = await prefsRes.json();
        setPreferences(prev => ({ ...prev, ...data.preferences }));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setSnackbar({
        open: true,
        message: 'Error loading user data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        await updateProfile(profileData);
        setEditing(false);
        setSnackbar({
          open: true,
          message: 'Profile updated successfully',
          severity: 'success'
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setSnackbar({
        open: true,
        message: 'Error updating profile',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSnackbar({
        open: true,
        message: 'New passwords do not match',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordDialog(false);
        setSnackbar({
          open: true,
          message: 'Password changed successfully',
          severity: 'success'
        });
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesUpdate = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: 'Preferences updated successfully',
          severity: 'success'
        });
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      setSnackbar({
        open: true,
        message: 'Error updating preferences',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId) => {
    try {
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId));
        setSnackbar({
          open: true,
          message: 'Session terminated successfully',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Error terminating session:', error);
      setSnackbar({
        open: true,
        message: 'Error terminating session',
        severity: 'error'
      });
    }
  };

  const createApiKey = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newApiKey)
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys([...apiKeys, data.apiKey]);
        setNewApiKey({ name: '', permissions: [] });
        setApiKeyDialog(false);
        setSnackbar({
          open: true,
          message: 'API key created successfully',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      setSnackbar({
        open: true,
        message: 'Error creating API key',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const revokeApiKey = async (keyId) => {
    try {
      const response = await fetch(`/api/auth/api-keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setApiKeys(apiKeys.filter(k => k.id !== keyId));
        setSnackbar({
          open: true,
          message: 'API key revoked successfully',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
      setSnackbar({
        open: true,
        message: 'Error revoking API key',
        severity: 'error'
      });
    }
  };

  const ProfileTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Avatar
            sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
            src={profileData.avatar}
          >
            <Person sx={{ fontSize: 60 }} />
          </Avatar>
          <Typography variant="h6">
            {profileData.firstName} {profileData.lastName}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {user?.role?.toUpperCase()}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            sx={{ mt: 2 }}
            onClick={() => setEditing(!editing)}
          >
            {editing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Profile Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={profileData.firstName}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                disabled={!editing}
                InputProps={{ startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} /> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={profileData.lastName}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                disabled={!editing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                disabled={!editing}
                InputProps={{ startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} /> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                disabled={!editing}
                InputProps={{ startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} /> }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location"
                value={profileData.location}
                onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                disabled={!editing}
                InputProps={{ startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} /> }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Bio"
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                disabled={!editing}
              />
            </Grid>
          </Grid>
          {editing && (
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleProfileUpdate}
                disabled={loading}
              >
                Save Changes
              </Button>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );

  const SecurityTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Password & Security
          </Typography>
          <Button
            variant="outlined"
            startIcon={<VpnKey />}
            fullWidth
            sx={{ mb: 2 }}
            onClick={() => setPasswordDialog(true)}
          >
            Change Password
          </Button>
          <Button
            variant="outlined"
            startIcon={<Shield />}
            fullWidth
            sx={{ mb: 2 }}
          >
            Enable Two-Factor Authentication
          </Button>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>
            API Keys
          </Typography>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => setApiKeyDialog(true)}
            sx={{ mb: 2 }}
          >
            Create New API Key
          </Button>
          <List>
            {apiKeys.map((key) => (
              <ListItem key={key.id} divider>
                <ListItemText
                  primary={key.name}
                  secondary={`Created: ${new Date(key.createdAt).toLocaleDateString()}`}
                />
                <Button
                  size="small"
                  color="error"
                  onClick={() => revokeApiKey(key.id)}
                >
                  Revoke
                </Button>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Active Sessions
          </Typography>
          <List>
            {sessions.map((session) => (
              <ListItem key={session.id} divider>
                <ListItemIcon>
                  <Computer />
                </ListItemIcon>
                <ListItemText
                  primary={session.userAgent}
                  secondary={`IP: ${session.ipAddress} | Last active: ${new Date(session.lastActive).toLocaleString()}`}
                />
                {session.current ? (
                  <Chip label="Current" color="primary" size="small" />
                ) : (
                  <Button
                    size="small"
                    color="error"
                    onClick={() => terminateSession(session.id)}
                  >
                    Terminate
                  </Button>
                )}
              </ListItem>
            ))}
          </List>
        </Paper>
      </Grid>
    </Grid>
  );

  const PreferencesTab = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Preferences
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Appearance
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Theme</InputLabel>
            <Select
              value={preferences.theme}
              label="Theme"
              onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
              startAdornment={<Palette sx={{ mr: 1, color: 'text.secondary' }} />}
            >
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
              <MenuItem value="auto">Auto</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Language</InputLabel>
            <Select
              value={preferences.language}
              label="Language"
              onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
              startAdornment={<Language sx={{ mr: 1, color: 'text.secondary' }} />}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="es">Español</MenuItem>
              <MenuItem value="fr">Français</MenuItem>
              <MenuItem value="de">Deutsch</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Notifications
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.emailNotifications}
                onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
              />
            }
            label="Email Notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={preferences.smsNotifications}
                onChange={(e) => setPreferences({ ...preferences, smsNotifications: e.target.checked })}
              />
            }
            label="SMS Notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={preferences.securityAlerts}
                onChange={(e) => setPreferences({ ...preferences, securityAlerts: e.target.checked })}
              />
            }
            label="Security Alerts"
          />
          <FormControlLabel
            control={
              <Switch
                checked={preferences.maintenanceAlerts}
                onChange={(e) => setPreferences({ ...preferences, maintenanceAlerts: e.target.checked })}
              />
            }
            label="Maintenance Alerts"
          />
        </Grid>
      </Grid>
      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          onClick={handlePreferencesUpdate}
          disabled={loading}
        >
          Save Preferences
        </Button>
      </Box>
    </Paper>
  );

  const ActivityTab = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Activity Log
      </Typography>
      <List>
        {activityLog.map((activity, index) => (
          <ListItem key={index} divider>
            <ListItemIcon>
              <History />
            </ListItemIcon>
            <ListItemText
              primary={activity.action}
              secondary={`${new Date(activity.timestamp).toLocaleString()} | IP: ${activity.ipAddress}`}
            />
            <Chip
              label={activity.status}
              color={activity.status === 'success' ? 'success' : 'error'}
              size="small"
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Person />} label="Profile" />
          <Tab icon={<Security />} label="Security" />
          <Tab icon={<Settings />} label="Preferences" />
          <Tab icon={<History />} label="Activity" />
        </Tabs>
      </Paper>

      {activeTab === 0 && <ProfileTab />}
      {activeTab === 1 && <SecurityTab />}
      {activeTab === 2 && <PreferencesTab />}
      {activeTab === 3 && <ActivityTab />}

      {/* Password Change Dialog */}
      <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type={showPassword ? 'text' : 'password'}
            label="Current Password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            margin="normal"
            InputProps={{
              endAdornment: (
                <Button onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </Button>
              )
            }}
          />
          <TextField
            fullWidth
            type="password"
            label="New Password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            type="password"
            label="Confirm New Password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog(false)}>Cancel</Button>
          <Button
            onClick={handlePasswordChange}
            variant="contained"
            disabled={loading || !passwordData.currentPassword || !passwordData.newPassword}
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* API Key Creation Dialog */}
      <Dialog open={apiKeyDialog} onClose={() => setApiKeyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create API Key</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Key Name"
            value={newApiKey.name}
            onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Permissions</InputLabel>
            <Select
              multiple
              value={newApiKey.permissions}
              onChange={(e) => setNewApiKey({ ...newApiKey, permissions: e.target.value })}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              <MenuItem value="dns">DNS Management</MenuItem>
              <MenuItem value="email">Email Management</MenuItem>
              <MenuItem value="security">Security Panel</MenuItem>
              <MenuItem value="database">Database Management</MenuItem>
              <MenuItem value="monitoring">System Monitoring</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApiKeyDialog(false)}>Cancel</Button>
          <Button
            onClick={createApiKey}
            variant="contained"
            disabled={loading || !newApiKey.name}
          >
            Create Key
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserProfile;
