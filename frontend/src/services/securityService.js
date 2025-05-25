import apiService from './apiService';

class SecurityService {
  // Fail2Ban Management
  async getJails() {
    return apiService.get('/api/security/jails');
  }

  async banIP(ip, jail = 'sshd') {
    return apiService.post('/api/security/ban', { ip, jail });
  }

  async unbanIP(ip, jail = 'sshd') {
    return apiService.post('/api/security/unban', { ip, jail });
  }

  async getBannedIPs(jail = 'sshd') {
    return apiService.get(`/api/security/banned?jail=${jail}`);
  }

  async getJailStatus(jail) {
    return apiService.get(`/api/security/jails/${jail}/status`);
  }

  async updateJailConfig(jail, config) {
    return apiService.put(`/api/security/jails/${jail}/config`, config);
  }

  // Firewall Management
  async getFirewallRules() {
    return apiService.get('/api/security/firewall/rules');
  }

  async addFirewallRule(rule) {
    return apiService.post('/api/security/firewall/rules', rule);
  }

  async deleteFirewallRule(ruleId) {
    return apiService.delete(`/api/security/firewall/rules/${ruleId}`);
  }

  async enableFirewall() {
    return apiService.post('/api/security/firewall/enable');
  }

  async disableFirewall() {
    return apiService.post('/api/security/firewall/disable');
  }

  async getFirewallStatus() {
    return apiService.get('/api/security/firewall/status');
  }

  // SSL Management
  async getSSLCertificates() {
    return apiService.get('/api/security/ssl/certificates');
  }

  async generateSSLCertificate(domain, email) {
    return apiService.post('/api/security/ssl/generate', { domain, email });
  }

  async renewSSLCertificate(domain) {
    return apiService.post('/api/security/ssl/renew', { domain });
  }

  async deleteSSLCertificate(domain) {
    return apiService.delete(`/api/security/ssl/certificates/${domain}`);
  }

  // Security Monitoring
  async getSecurityLogs(type = 'auth', limit = 100) {
    return apiService.get(`/api/security/logs?type=${type}&limit=${limit}`);
  }

  async getFailedLogins(hours = 24) {
    return apiService.get(`/api/security/failed-logins?hours=${hours}`);
  }

  async getSuspiciousActivity() {
    return apiService.get('/api/security/suspicious-activity');
  }

  async getSecurityReport() {
    return apiService.get('/api/security/report');
  }

  // IP Whitelist/Blacklist
  async getWhitelist() {
    return apiService.get('/api/security/whitelist');
  }

  async addToWhitelist(ip, description = '') {
    return apiService.post('/api/security/whitelist', { ip, description });
  }

  async removeFromWhitelist(ip) {
    return apiService.delete(`/api/security/whitelist/${ip}`);
  }

  async getBlacklist() {
    return apiService.get('/api/security/blacklist');
  }

  async addToBlacklist(ip, description = '') {
    return apiService.post('/api/security/blacklist', { ip, description });
  }

  async removeFromBlacklist(ip) {
    return apiService.delete(`/api/security/blacklist/${ip}`);
  }

  // Security Settings
  async getSecuritySettings() {
    return apiService.get('/api/security/settings');
  }

  async updateSecuritySettings(settings) {
    return apiService.put('/api/security/settings', settings);
  }

  // Intrusion Detection
  async getIntrusionAttempts(limit = 50) {
    return apiService.get(`/api/security/intrusions?limit=${limit}`);
  }

  async getPortScans(limit = 50) {
    return apiService.get(`/api/security/port-scans?limit=${limit}`);
  }

  // Security Scan
  async startSecurityScan() {
    return apiService.post('/api/security/scan/start');
  }

  async getSecurityScanStatus() {
    return apiService.get('/api/security/scan/status');
  }

  async getSecurityScanResults() {
    return apiService.get('/api/security/scan/results');
  }
}

const securityService = new SecurityService();
export default securityService;
