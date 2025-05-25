import apiService from './apiService';

class BackupService {
  // Backup Management
  async getBackups() {
    return apiService.get('/api/backup/list');
  }

  async createBackup(options = {}) {
    return apiService.post('/api/backup/create', options);
  }

  async deleteBackup(backupId) {
    return apiService.delete(`/api/backup/${backupId}`);
  }

  async getBackupDetails(backupId) {
    return apiService.get(`/api/backup/${backupId}`);
  }

  async downloadBackup(backupId) {
    return apiService.get(`/api/backup/${backupId}/download`, {
      responseType: 'blob'
    });
  }

  // Backup Types
  async createFullBackup(description = '') {
    return apiService.post('/api/backup/full', { description });
  }

  async createDatabaseBackup(databases = [], description = '') {
    return apiService.post('/api/backup/database', { databases, description });
  }

  async createConfigBackup(description = '') {
    return apiService.post('/api/backup/config', { description });
  }

  async createFileBackup(paths = [], description = '') {
    return apiService.post('/api/backup/files', { paths, description });
  }

  // Restore Operations
  async restoreBackup(backupId, options = {}) {
    return apiService.post('/api/backup/restore', { backupId, ...options });
  }

  async restoreDatabase(backupId, targetDatabase) {
    return apiService.post('/api/backup/restore/database', { 
      backupId, 
      targetDatabase 
    });
  }

  async restoreConfig(backupId, components = []) {
    return apiService.post('/api/backup/restore/config', { 
      backupId, 
      components 
    });
  }

  async restoreFiles(backupId, targetPath, files = []) {
    return apiService.post('/api/backup/restore/files', { 
      backupId, 
      targetPath, 
      files 
    });
  }

  // Backup Scheduling
  async getBackupSchedule() {
    return apiService.get('/api/backup/schedule');
  }

  async createScheduledBackup(schedule) {
    return apiService.post('/api/backup/schedule', schedule);
  }

  async updateScheduledBackup(id, schedule) {
    return apiService.put(`/api/backup/schedule/${id}`, schedule);
  }

  async deleteScheduledBackup(id) {
    return apiService.delete(`/api/backup/schedule/${id}`);
  }

  async enableScheduledBackup(id) {
    return apiService.post(`/api/backup/schedule/${id}/enable`);
  }

  async disableScheduledBackup(id) {
    return apiService.post(`/api/backup/schedule/${id}/disable`);
  }

  async runScheduledBackup(id) {
    return apiService.post(`/api/backup/schedule/${id}/run`);
  }

  // Backup Status and Monitoring
  async getBackupStatus() {
    return apiService.get('/api/backup/status');
  }

  async getRunningBackups() {
    return apiService.get('/api/backup/running');
  }

  async cancelBackup(backupId) {
    return apiService.post(`/api/backup/${backupId}/cancel`);
  }

  async getBackupProgress(backupId) {
    return apiService.get(`/api/backup/${backupId}/progress`);
  }

  async getBackupLogs(backupId) {
    return apiService.get(`/api/backup/${backupId}/logs`);
  }

  // Backup History and Statistics
  async getBackupHistory(limit = 50) {
    return apiService.get(`/api/backup/history?limit=${limit}`);
  }

  async getBackupStatistics() {
    return apiService.get('/api/backup/statistics');
  }

  async getStorageUsage() {
    return apiService.get('/api/backup/storage');
  }

  // Backup Configuration
  async getBackupSettings() {
    return apiService.get('/api/backup/settings');
  }

  async updateBackupSettings(settings) {
    return apiService.put('/api/backup/settings', settings);
  }

  async getRetentionPolicies() {
    return apiService.get('/api/backup/retention');
  }

  async updateRetentionPolicies(policies) {
    return apiService.put('/api/backup/retention', policies);
  }

  // Remote Backup Locations
  async getBackupLocations() {
    return apiService.get('/api/backup/locations');
  }

  async addBackupLocation(location) {
    return apiService.post('/api/backup/locations', location);
  }

  async updateBackupLocation(id, location) {
    return apiService.put(`/api/backup/locations/${id}`, location);
  }

  async deleteBackupLocation(id) {
    return apiService.delete(`/api/backup/locations/${id}`);
  }

  async testBackupLocation(id) {
    return apiService.post(`/api/backup/locations/${id}/test`);
  }

  // Backup Verification
  async verifyBackup(backupId) {
    return apiService.post(`/api/backup/${backupId}/verify`);
  }

  async getBackupIntegrity(backupId) {
    return apiService.get(`/api/backup/${backupId}/integrity`);
  }

  // Import/Export Backup Configurations
  async exportBackupConfig() {
    return apiService.get('/api/backup/config/export', {
      responseType: 'blob'
    });
  }

  async importBackupConfig(file) {
    const formData = new FormData();
    formData.append('config', file);
    
    return apiService.post('/api/backup/config/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // Backup Cleanup
  async cleanupOldBackups() {
    return apiService.post('/api/backup/cleanup');
  }

  async getCleanupPreview() {
    return apiService.get('/api/backup/cleanup/preview');
  }

  // Backup Comparison
  async compareBackups(backup1Id, backup2Id) {
    return apiService.post('/api/backup/compare', { 
      backup1: backup1Id, 
      backup2: backup2Id 
    });
  }

  // Incremental Backups
  async createIncrementalBackup(baseBackupId, description = '') {
    return apiService.post('/api/backup/incremental', { 
      baseBackupId, 
      description 
    });
  }

  async getIncrementalChain(backupId) {
    return apiService.get(`/api/backup/${backupId}/chain`);
  }

  // Backup Encryption
  async encryptBackup(backupId, password) {
    return apiService.post(`/api/backup/${backupId}/encrypt`, { password });
  }

  async decryptBackup(backupId, password) {
    return apiService.post(`/api/backup/${backupId}/decrypt`, { password });
  }

  // Backup Templates
  async getBackupTemplates() {
    return apiService.get('/api/backup/templates');
  }

  async createBackupTemplate(template) {
    return apiService.post('/api/backup/templates', template);
  }

  async updateBackupTemplate(id, template) {
    return apiService.put(`/api/backup/templates/${id}`, template);
  }

  async deleteBackupTemplate(id) {
    return apiService.delete(`/api/backup/templates/${id}`);
  }

  async createBackupFromTemplate(templateId, options = {}) {
    return apiService.post('/api/backup/from-template', { 
      templateId, 
      ...options 
    });
  }

  // Real-time Backup Monitoring
  async subscribeToBackupEvents(callback) {
    const eventSource = new EventSource('/api/backup/events');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    eventSource.onerror = (error) => {
      console.error('Backup events stream error:', error);
    };

    return () => eventSource.close();
  }
}

const backupService = new BackupService();
export default backupService;
