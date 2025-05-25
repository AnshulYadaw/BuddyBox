# BuddyBox Documentation

## Overview
BuddyBox is a comprehensive web-based control panel for managing various services including DNS, web servers, databases, and mail servers. This documentation provides detailed information about installation, configuration, and usage of BuddyBox.

## Table of Contents

1. [Getting Started](./getting-started/README.md)
   - Installation
   - Configuration
   - First-time Setup

2. [User Guide](./user-guide/README.md)
   - Dashboard Overview
   - Service Management
   - User Management
   - Security Settings

3. [API Documentation](./api/README.md)
   - Authentication
   - Service Endpoints
   - Error Handling
   - Rate Limiting

4. [CLI Documentation](./cli/README.md)
   - Installation
   - Command Reference
   - Examples
   - Configuration

5. [Development Guide](./development/README.md)
   - Project Structure
   - Contributing
   - Testing
   - Building

6. [Service Guides](./services/README.md)
   - Web Server (Caddy)
   - DNS (PowerDNS)
   - Database (MySQL/PostgreSQL)
   - Mail Server (Postfix/Dovecot)

7. [Security](./security/README.md)
   - Authentication
   - Authorization
   - SSL/TLS
   - Best Practices

8. [Troubleshooting](./troubleshooting/README.md)
   - Common Issues
   - Logs
   - Debugging
   - Support

## Quick Start

1. Install BuddyBox:
```bash
curl -sSL https://install.buddybox.com | bash
```

2. Start the backend:
```bash
cd backend
npm install
npm run dev
```

3. Start the frontend:
```bash
cd frontend
npm install
npm start
```

4. Access the web interface:
```
http://localhost:3000
```

5. Use the CLI:
```bash
npm install -g buddybox-cli
buddybox --help
```

## Project Structure

```
buddybox/
├── backend/           # Backend API server
├── frontend/          # React frontend application
├── cli/              # Command-line interface
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

## Support

- [GitHub Issues](https://github.com/buddybox/buddybox/issues)
- [Documentation](https://docs.buddybox.com)
- [Community Forum](https://community.buddybox.com)

## License

BuddyBox is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details. 