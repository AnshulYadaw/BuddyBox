import apiService from './apiService';

class MonitoringService {
  // System metrics
  async getSystemMetrics() {
    return await apiService.get('/api/monitoring/system');
  }

  async getCPUUsage() {
    return await apiService.get('/api/monitoring/cpu');
  }

  async getMemoryUsage() {
    return await apiService.get('/api/monitoring/memory');
  }

  async getDiskUsage() {
    return await apiService.get('/api/monitoring/disk');
  }

  async getNetworkUsage() {
    return await apiService.get('/api/monitoring/network');
  }

  // Process management
  async getProcesses() {
    return await apiService.get('/api/monitoring/processes');
  }

  async getProcessDetails(pid) {
    return await apiService.get(`/api/monitoring/processes/${pid}`);
  }

  async killProcess(pid, signal = 'TERM') {
    return await apiService.post('/api/monitoring/processes/kill', { pid, signal });
  }

  async getTopProcesses(type = 'cpu', limit = 10) {
    return await apiService.get(`/api/monitoring/processes/top?type=${type}&limit=${limit}`);
  }

  // Service management
  async getServices() {
    return await apiService.get('/api/monitoring/services');
  }

  async getServiceStatus(serviceName) {
    return await apiService.get(`/api/monitoring/services/${serviceName}`);
  }

  async startService(serviceName) {
    return await apiService.post(`/api/monitoring/services/${serviceName}/start`);
  }

  async stopService(serviceName) {
    return await apiService.post(`/api/monitoring/services/${serviceName}/stop`);
  }

  async restartService(serviceName) {
    return await apiService.post(`/api/monitoring/services/${serviceName}/restart`);
  }

  async enableService(serviceName) {
    return await apiService.post(`/api/monitoring/services/${serviceName}/enable`);
  }

  async disableService(serviceName) {
    return await apiService.post(`/api/monitoring/services/${serviceName}/disable`);
  }

  async getServiceLogs(serviceName, lines = 100) {
    return await apiService.get(`/api/monitoring/services/${serviceName}/logs?lines=${lines}`);
  }

  // Log management
  async getSystemLogs(type = 'syslog', lines = 100) {
    return await apiService.get(`/api/monitoring/logs?type=${type}&lines=${lines}`);
  }

  async getLogFiles() {
    return await apiService.get('/api/monitoring/logs/files');
  }

  async downloadLogFile(filename) {
    return await apiService.download(`/api/monitoring/logs/download/${filename}`);
  }

  async searchLogs(query, files = [], startDate, endDate) {
    return await apiService.post('/api/monitoring/logs/search', {
      query,
      files,
      startDate,
      endDate
    });
  }

  // Performance monitoring
  async getPerformanceMetrics(timeRange = '1h') {
    return await apiService.get(`/api/monitoring/performance?range=${timeRange}`);
  }

  async getIOStats() {
    return await apiService.get('/api/monitoring/io');
  }

  async getTemperature() {
    return await apiService.get('/api/monitoring/temperature');
  }

  async getBandwidthUsage(interface = 'all') {
    return await apiService.get(`/api/monitoring/bandwidth?interface=${interface}`);
  }

  // Alerting
  async getAlerts() {
    return await apiService.get('/api/monitoring/alerts');
  }

  async createAlert(alert) {
    return await apiService.post('/api/monitoring/alerts', alert);
  }

  async updateAlert(id, alert) {
    return await apiService.put(`/api/monitoring/alerts/${id}`, alert);
  }

  async deleteAlert(id) {
    return await apiService.delete(`/api/monitoring/alerts/${id}`);
  }

  async acknowledgeAlert(id) {
    return await apiService.post(`/api/monitoring/alerts/${id}/acknowledge`);
  }

  // Real-time monitoring
  subscribeToMetrics(callback) {
    const ws = new WebSocket(`ws://${window.location.host}/api/monitoring/ws`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  }

  // Uptime monitoring
  async getUptime() {
    return await apiService.get('/api/monitoring/uptime');
  }

  async getUptimeHistory(period = '30d') {
    return await apiService.get(`/api/monitoring/uptime/history?period=${period}`);
  }

  // Container monitoring
  async getContainers() {
    return await apiService.get('/api/monitoring/containers');
  }

  async getContainerStats(containerId) {
    return await apiService.get(`/api/monitoring/containers/${containerId}/stats`);
  }

  async getContainerLogs(containerId, lines = 100) {
    return await apiService.get(`/api/monitoring/containers/${containerId}/logs?lines=${lines}`);
  }

  // Custom metrics
  async addCustomMetric(metric) {
    return await apiService.post('/api/monitoring/custom-metrics', metric);
  }

  async getCustomMetrics() {
    return await apiService.get('/api/monitoring/custom-metrics');
  }

  async deleteCustomMetric(id) {
    return await apiService.delete(`/api/monitoring/custom-metrics/${id}`);
  }

  // Health checks
  async getHealthStatus() {
    return await apiService.get('/api/monitoring/health');
  }

  async runHealthCheck(component) {
    return await apiService.post('/api/monitoring/health/check', { component });
  }

  // Reports
  async generateReport(type, period = '24h') {
    return await apiService.post('/api/monitoring/reports', { type, period });
  }

  async getReportHistory() {
    return await apiService.get('/api/monitoring/reports');
  }

  async downloadReport(reportId) {
    return await apiService.download(`/api/monitoring/reports/${reportId}/download`);
  }
}

const monitoringService = new MonitoringService();
export default monitoringService;
