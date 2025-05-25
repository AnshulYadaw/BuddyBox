import apiService from './apiService';

class SystemService {
  // Package management
  async getInstalledPackages() {
    return await apiService.get('/api/system/packages');
  }

  async searchPackages(query) {
    return await apiService.get(`/api/system/packages/search?q=${query}`);
  }

  async installPackage(packageName) {
    return await apiService.post('/api/system/packages/install', { packageName });
  }

  async uninstallPackage(packageName) {
    return await apiService.post('/api/system/packages/uninstall', { packageName });
  }

  async updatePackages() {
    return await apiService.post('/api/system/packages/update');
  }

  async upgradeSystem() {
    return await apiService.post('/api/system/packages/upgrade');
  }

  // Cron job management
  async getCronJobs() {
    return await apiService.get('/api/system/cron');
  }

  async createCronJob(cronJob) {
    return await apiService.post('/api/system/cron', cronJob);
  }

  async updateCronJob(id, cronJob) {
    return await apiService.put(`/api/system/cron/${id}`, cronJob);
  }

  async deleteCronJob(id) {
    return await apiService.delete(`/api/system/cron/${id}`);
  }

  async toggleCronJob(id, enabled) {
    return await apiService.put(`/api/system/cron/${id}/toggle`, { enabled });
  }

  // Network configuration
  async getNetworkInterfaces() {
    return await apiService.get('/api/system/network/interfaces');
  }

  async getNetworkConfiguration() {
    return await apiService.get('/api/system/network/config');
  }

  async updateNetworkInterface(interfaceName, config) {
    return await apiService.put(`/api/system/network/interfaces/${interfaceName}`, config);
  }

  async getConnections() {
    return await apiService.get('/api/system/network/connections');
  }

  async getRoutes() {
    return await apiService.get('/api/system/network/routes');
  }

  async addRoute(route) {
    return await apiService.post('/api/system/network/routes', route);
  }

  async deleteRoute(id) {
    return await apiService.delete(`/api/system/network/routes/${id}`);
  }

  // File system operations
  async getDirectoryContents(path) {
    return await apiService.get(`/api/system/filesystem/directory?path=${encodeURIComponent(path)}`);
  }

  async createDirectory(path, name) {
    return await apiService.post('/api/system/filesystem/directory', { path, name });
  }

  async deleteFileOrDirectory(path) {
    return await apiService.delete(`/api/system/filesystem/item?path=${encodeURIComponent(path)}`);
  }

  async renameFileOrDirectory(oldPath, newPath) {
    return await apiService.put('/api/system/filesystem/rename', { oldPath, newPath });
  }

  async getFileContent(path) {
    return await apiService.get(`/api/system/filesystem/file?path=${encodeURIComponent(path)}`);
  }

  async saveFileContent(path, content) {
    return await apiService.put('/api/system/filesystem/file', { path, content });
  }

  async uploadFile(path, file) {
    const formData = new FormData();
    formData.append('path', path);
    formData.append('file', file);
    return await apiService.post('/api/system/filesystem/upload', formData);
  }

  async downloadFile(path) {
    return await apiService.download(`/api/system/filesystem/download?path=${encodeURIComponent(path)}`);
  }

  async getDiskSpace() {
    return await apiService.get('/api/system/filesystem/disk-space');
  }

  // System information
  async getSystemInfo() {
    return await apiService.get('/api/system/info');
  }

  async getHardwareInfo() {
    return await apiService.get('/api/system/hardware');
  }

  async getOSInfo() {
    return await apiService.get('/api/system/os');
  }

  // Power management
  async restart() {
    return await apiService.post('/api/system/power/restart');
  }

  async shutdown() {
    return await apiService.post('/api/system/power/shutdown');
  }

  // Environment variables
  async getEnvironmentVariables() {
    return await apiService.get('/api/system/environment');
  }

  async setEnvironmentVariable(name, value) {
    return await apiService.post('/api/system/environment', { name, value });
  }

  async deleteEnvironmentVariable(name) {
    return await apiService.delete(`/api/system/environment/${name}`);
  }

  // Terminal command execution
  async executeCommand(command, workingDirectory = '/') {
    return await apiService.post('/api/system/command', { command, workingDirectory });
  }

  async getCommandHistory() {
    return await apiService.get('/api/system/command/history');
  }
}

const systemService = new SystemService();
export default systemService;
