const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const app = require('../../server/src/index');

describe('Service Management Commands', () => {
  let server;
  const cliPath = path.join(__dirname, '../../src/index.js');
  const testService = 'nginx';

  beforeAll(async () => {
    // Start the server
    server = app.listen(3000);
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Login as admin
    execSync(`node ${cliPath} iam login -e admin@test.com -p adminpass`);
  });

  afterAll(async () => {
    // Stop the server
    await server.close();
  });

  beforeEach(() => {
    // Clear any existing config
    const configPath = path.join(process.env.HOME, '.buddybox.json');
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });

  describe('Service List Command', () => {
    test('should list all services', () => {
      const output = execSync(`node ${cliPath} service list`).toString();
      
      expect(output).toContain('Services:');
      expect(output).toContain('Name:');
      expect(output).toContain('Status:');
    });
  });

  describe('Service Status Command', () => {
    test('should get service status', () => {
      const output = execSync(`node ${cliPath} service status ${testService}`).toString();
      
      expect(output).toContain('Service Status:');
      expect(output).toContain('Active:');
      expect(output).toContain('Running:');
    });

    test('should handle non-existent service', () => {
      expect(() => {
        execSync(`node ${cliPath} service status nonexistent`);
      }).toThrow();
    });
  });

  describe('Service Control Commands', () => {
    test('should start service', () => {
      const output = execSync(`node ${cliPath} service start ${testService}`).toString();
      expect(output).toContain('started successfully');
    });

    test('should stop service', () => {
      const output = execSync(`node ${cliPath} service stop ${testService}`).toString();
      expect(output).toContain('stopped successfully');
    });

    test('should restart service', () => {
      const output = execSync(`node ${cliPath} service restart ${testService}`).toString();
      expect(output).toContain('restarted successfully');
    });
  });

  describe('Service Logs Command', () => {
    test('should get service logs', () => {
      const output = execSync(`node ${cliPath} service logs ${testService} -l 50`).toString();
      expect(output).toContain('Service Logs:');
    });

    test('should handle invalid line count', () => {
      expect(() => {
        execSync(`node ${cliPath} service logs ${testService} -l invalid`);
      }).toThrow();
    });
  });

  describe('Service Config Command', () => {
    test('should update service config from file', () => {
      // Create temporary config file
      const configFile = path.join(__dirname, 'temp-config.json');
      fs.writeFileSync(configFile, JSON.stringify({ port: 8080 }));

      const output = execSync(`node ${cliPath} service config ${testService} -f ${configFile}`).toString();
      expect(output).toContain('configuration updated successfully');

      // Clean up
      fs.unlinkSync(configFile);
    });

    test('should handle invalid config file', () => {
      expect(() => {
        execSync(`node ${cliPath} service config ${testService} -f nonexistent.json`);
      }).toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle unauthorized access', () => {
      // Logout first
      execSync(`node ${cliPath} iam logout`);

      expect(() => {
        execSync(`node ${cliPath} service list`);
      }).toThrow();

      // Login back as admin
      execSync(`node ${cliPath} iam login -e admin@test.com -p adminpass`);
    });

    test('should handle invalid command', () => {
      expect(() => {
        execSync(`node ${cliPath} service invalid-command`);
      }).toThrow();
    });
  });
}); 