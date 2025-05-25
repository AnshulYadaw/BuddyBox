import apiService from './apiService';

class EmailService {
  // Get email domains
  async getDomains() {
    return apiService.get('/mail/domains');
  }

  // Create email domain
  async createDomain(domainData) {
    return apiService.post('/mail/domains', domainData);
  }

  // Update email domain
  async updateDomain(domainId, domainData) {
    return apiService.put(`/mail/domains/${domainId}`, domainData);
  }

  // Delete email domain
  async deleteDomain(domainId) {
    return apiService.delete(`/mail/domains/${domainId}`);
  }

  // Get email accounts
  async getAccounts(domainId = null) {
    const endpoint = domainId ? `/mail/accounts?domain=${domainId}` : '/mail/accounts';
    return apiService.get(endpoint);
  }

  // Create email account
  async createAccount(accountData) {
    return apiService.post('/mail/accounts', accountData);
  }

  // Update email account
  async updateAccount(accountId, accountData) {
    return apiService.put(`/mail/accounts/${accountId}`, accountData);
  }

  // Delete email account
  async deleteAccount(accountId) {
    return apiService.delete(`/mail/accounts/${accountId}`);
  }

  // Change account password
  async changeAccountPassword(accountId, passwordData) {
    return apiService.post(`/mail/accounts/${accountId}/password`, passwordData);
  }

  // Get email aliases
  async getAliases(domainId = null) {
    const endpoint = domainId ? `/mail/aliases?domain=${domainId}` : '/mail/aliases';
    return apiService.get(endpoint);
  }

  // Create email alias
  async createAlias(aliasData) {
    return apiService.post('/mail/aliases', aliasData);
  }

  // Update email alias
  async updateAlias(aliasId, aliasData) {
    return apiService.put(`/mail/aliases/${aliasId}`, aliasData);
  }

  // Delete email alias
  async deleteAlias(aliasId) {
    return apiService.delete(`/mail/aliases/${aliasId}`);
  }

  // Get mail queue
  async getMailQueue() {
    return apiService.get('/mail/queue');
  }

  // Flush mail queue
  async flushMailQueue() {
    return apiService.post('/mail/queue/flush');
  }

  // Delete mail from queue
  async deleteFromQueue(messageId) {
    return apiService.delete(`/mail/queue/${messageId}`);
  }

  // Get mail logs
  async getMailLogs(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return apiService.get(`/mail/logs${params ? `?${params}` : ''}`);
  }

  // Get mail statistics
  async getStatistics(period = '24h') {
    return apiService.get(`/mail/statistics?period=${period}`);
  }

  // Send test email
  async sendTestEmail(testData) {
    return apiService.post('/mail/test', testData);
  }

  // Get server configuration
  async getConfiguration() {
    return apiService.get('/mail/config');
  }

  // Update server configuration
  async updateConfiguration(configData) {
    return apiService.put('/mail/config', configData);
  }

  // Get DKIM keys
  async getDKIMKeys(domainId) {
    return apiService.get(`/mail/domains/${domainId}/dkim`);
  }

  // Generate DKIM key
  async generateDKIMKey(domainId, options = {}) {
    return apiService.post(`/mail/domains/${domainId}/dkim/generate`, options);
  }

  // Get SPF record
  async getSPFRecord(domainId) {
    return apiService.get(`/mail/domains/${domainId}/spf`);
  }

  // Update SPF record
  async updateSPFRecord(domainId, spfData) {
    return apiService.put(`/mail/domains/${domainId}/spf`, spfData);
  }

  // Get DMARC record
  async getDMARCRecord(domainId) {
    return apiService.get(`/mail/domains/${domainId}/dmarc`);
  }

  // Update DMARC record
  async updateDMARCRecord(domainId, dmarcData) {
    return apiService.put(`/mail/domains/${domainId}/dmarc`, dmarcData);
  }

  // Get mailbox usage
  async getMailboxUsage(accountId) {
    return apiService.get(`/mail/accounts/${accountId}/usage`);
  }

  // Get blacklisted IPs
  async getBlacklist() {
    return apiService.get('/mail/blacklist');
  }

  // Add IP to blacklist
  async addToBlacklist(ip, reason = '') {
    return apiService.post('/mail/blacklist', { ip, reason });
  }

  // Remove IP from blacklist
  async removeFromBlacklist(ip) {
    return apiService.delete(`/mail/blacklist/${ip}`);
  }

  // Get whitelisted IPs
  async getWhitelist() {
    return apiService.get('/mail/whitelist');
  }

  // Add IP to whitelist
  async addToWhitelist(ip, reason = '') {
    return apiService.post('/mail/whitelist', { ip, reason });
  }

  // Remove IP from whitelist
  async removeFromWhitelist(ip) {
    return apiService.delete(`/mail/whitelist/${ip}`);
  }

  // Backup mail configuration
  async backupConfiguration() {
    return apiService.post('/mail/backup');
  }

  // Restore mail configuration
  async restoreConfiguration(backupData) {
    return apiService.post('/mail/restore', backupData);
  }

  // Get mail server status
  async getServerStatus() {
    return apiService.get('/mail/status');
  }

  // Restart mail services
  async restartServices(services = ['postfix', 'dovecot']) {
    return apiService.post('/mail/restart', { services });
  }
}

export default new EmailService();
