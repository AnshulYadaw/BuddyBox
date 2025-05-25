import apiService from './apiService';

class DNSService {
  // Get all DNS zones
  async getZones() {
    return apiService.get('/dns/zones');
  }

  // Create new DNS zone
  async createZone(zoneData) {
    return apiService.post('/dns/zones', zoneData);
  }

  // Update DNS zone
  async updateZone(zoneId, zoneData) {
    return apiService.put(`/dns/zones/${zoneId}`, zoneData);
  }

  // Delete DNS zone
  async deleteZone(zoneId) {
    return apiService.delete(`/dns/zones/${zoneId}`);
  }

  // Get DNS records for a zone
  async getRecords(zoneId) {
    return apiService.get(`/dns/zones/${zoneId}/records`);
  }

  // Create DNS record
  async createRecord(zoneId, recordData) {
    return apiService.post(`/dns/zones/${zoneId}/records`, recordData);
  }

  // Update DNS record
  async updateRecord(zoneId, recordId, recordData) {
    return apiService.put(`/dns/zones/${zoneId}/records/${recordId}`, recordData);
  }

  // Delete DNS record
  async deleteRecord(zoneId, recordId) {
    return apiService.delete(`/dns/zones/${zoneId}/records/${recordId}`);
  }

  // Check DNS propagation
  async checkPropagation(domain, recordType = 'A') {
    return apiService.get(`/dns/propagation?domain=${domain}&type=${recordType}`);
  }

  // Get DNS statistics
  async getStatistics() {
    return apiService.get('/dns/statistics');
  }

  // Get DNS templates
  async getTemplates() {
    return apiService.get('/dns/templates');
  }

  // Create zone from template
  async createFromTemplate(templateId, zoneData) {
    return apiService.post(`/dns/templates/${templateId}/create`, zoneData);
  }

  // Validate DNS configuration
  async validateConfig(config) {
    return apiService.post('/dns/validate', config);
  }

  // Get DNS query logs
  async getQueryLogs(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return apiService.get(`/dns/logs${params ? `?${params}` : ''}`);
  }

  // Get zone transfer status
  async getZoneTransferStatus(zoneId) {
    return apiService.get(`/dns/zones/${zoneId}/transfer-status`);
  }

  // Import zone file
  async importZoneFile(zoneFile) {
    const formData = new FormData();
    formData.append('zoneFile', zoneFile);
    return apiService.upload('/dns/import', formData);
  }

  // Export zone file
  async exportZoneFile(zoneId, format = 'bind') {
    return apiService.get(`/dns/zones/${zoneId}/export?format=${format}`);
  }

  // Backup DNS configuration
  async backupConfiguration() {
    return apiService.post('/dns/backup');
  }

  // Restore DNS configuration
  async restoreConfiguration(backupData) {
    return apiService.post('/dns/restore', backupData);
  }

  // Get DNSSEC status
  async getDNSSECStatus(zoneId) {
    return apiService.get(`/dns/zones/${zoneId}/dnssec`);
  }

  // Enable DNSSEC
  async enableDNSSEC(zoneId, options = {}) {
    return apiService.post(`/dns/zones/${zoneId}/dnssec/enable`, options);
  }

  // Disable DNSSEC
  async disableDNSSEC(zoneId) {
    return apiService.post(`/dns/zones/${zoneId}/dnssec/disable`);
  }
}

export default new DNSService();
