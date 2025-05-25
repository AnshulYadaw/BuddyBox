import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DNSManagement from './pages/DNSManagement';
import EmailManagement from './pages/EmailManagement';
import SecurityPanel from './pages/SecurityPanel';
import DatabaseManagement from './pages/DatabaseManagement';
import SystemMonitoring from './pages/SystemMonitoring';
import UserProfile from './pages/UserProfile';
import { CircularProgress, Box } from '@mui/material';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dns" element={<DNSManagement />} />
        <Route path="/email" element={<EmailManagement />} />
        <Route path="/security" element={<SecurityPanel />} />
        <Route path="/database" element={<DatabaseManagement />} />
        <Route path="/monitoring" element={<SystemMonitoring />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
