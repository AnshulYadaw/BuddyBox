import apiService from './apiService';

class AuthService {
  // Login
  async login(credentials) {
    return apiService.post('/auth/login', credentials);
  }

  // Logout
  async logout() {
    return apiService.post('/auth/logout');
  }

  // Register
  async register(userData) {
    return apiService.post('/auth/register', userData);
  }

  // Get current user
  async getCurrentUser() {
    return apiService.get('/auth/me');
  }

  // Update profile
  async updateProfile(profileData) {
    return apiService.put('/auth/profile', profileData);
  }

  // Change password
  async changePassword(passwordData) {
    return apiService.post('/auth/change-password', passwordData);
  }

  // Get user sessions
  async getSessions() {
    return apiService.get('/auth/sessions');
  }

  // Terminate session
  async terminateSession(sessionId) {
    return apiService.delete(`/auth/sessions/${sessionId}`);
  }

  // Get activity log
  async getActivity() {
    return apiService.get('/auth/activity');
  }

  // Get API keys
  async getApiKeys() {
    return apiService.get('/auth/api-keys');
  }

  // Create API key
  async createApiKey(keyData) {
    return apiService.post('/auth/api-keys', keyData);
  }

  // Revoke API key
  async revokeApiKey(keyId) {
    return apiService.delete(`/auth/api-keys/${keyId}`);
  }

  // Get user preferences
  async getPreferences() {
    return apiService.get('/auth/preferences');
  }

  // Update user preferences
  async updatePreferences(preferences) {
    return apiService.put('/auth/preferences', preferences);
  }

  // Request password reset
  async requestPasswordReset(email) {
    return apiService.post('/auth/forgot-password', { email });
  }

  // Reset password
  async resetPassword(token, newPassword) {
    return apiService.post('/auth/reset-password', { token, newPassword });
  }

  // Verify email
  async verifyEmail(token) {
    return apiService.post('/auth/verify-email', { token });
  }

  // Enable 2FA
  async enable2FA() {
    return apiService.post('/auth/2fa/enable');
  }

  // Disable 2FA
  async disable2FA(code) {
    return apiService.post('/auth/2fa/disable', { code });
  }

  // Verify 2FA code
  async verify2FA(code) {
    return apiService.post('/auth/2fa/verify', { code });
  }
}

export default new AuthService();
