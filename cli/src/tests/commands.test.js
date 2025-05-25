const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const app = require('../../server/src/index');

describe('CLI Commands Integration Tests', () => {
  let server;
  const cliPath = path.join(__dirname, '../../src/index.js');
  const testUser = {
    email: 'test@example.com',
    password: 'testpass123',
    name: 'Test User'
  };

  beforeAll(async () => {
    // Start the server
    server = app.listen(3000);
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
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

  describe('User Management Commands', () => {
    test('should register a new user', () => {
      const output = execSync(`node ${cliPath} iam register --email ${testUser.email} --password ${testUser.password} --name "${testUser.name}"`).toString();
      
      expect(output).toContain('User registered successfully');
      expect(output).toContain(testUser.email);
    });

    test('should login user', () => {
      const output = execSync(`node ${cliPath} iam login --email ${testUser.email} --password ${testUser.password}`).toString();
      
      expect(output).toContain('Login successful');
      expect(output).toContain(testUser.email);
    });

    test('should list users (admin only)', () => {
      // First login as admin
      execSync(`node ${cliPath} iam login --email admin@test.com --password adminpass`);
      
      const output = execSync(`node ${cliPath} iam list`).toString();
      
      expect(output).toContain('Users:');
      expect(output).toContain(testUser.email);
    });

    test('should delete user (admin only)', () => {
      // First login as admin
      execSync(`node ${cliPath} iam login --email admin@test.com --password adminpass`);
      
      const output = execSync(`node ${cliPath} iam delete --email ${testUser.email}`).toString();
      
      expect(output).toContain('User deleted successfully');
    });

    test('should logout user', () => {
      const output = execSync(`node ${cliPath} iam logout`).toString();
      
      expect(output).toContain('Logged out successfully');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid credentials', () => {
      expect(() => {
        execSync(`node ${cliPath} iam login --email wrong@example.com --password wrongpass`);
      }).toThrow();
    });

    test('should handle missing required options', () => {
      expect(() => {
        execSync(`node ${cliPath} iam register`);
      }).toThrow();
    });

    test('should handle invalid command', () => {
      expect(() => {
        execSync(`node ${cliPath} invalid-command`);
      }).toThrow();
    });
  });

  describe('Configuration', () => {
    test('should set API URL', () => {
      const apiUrl = 'http://localhost:3000';
      const output = execSync(`node ${cliPath} config set apiUrl ${apiUrl}`).toString();
      
      expect(output).toContain('API URL updated successfully');
      
      // Verify config file
      const config = JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.buddybox.json')));
      expect(config.apiUrl).toBe(apiUrl);
    });

    test('should get current configuration', () => {
      const output = execSync(`node ${cliPath} config get`).toString();
      
      expect(output).toContain('Current configuration:');
      expect(output).toContain('apiUrl');
    });
  });
}); 