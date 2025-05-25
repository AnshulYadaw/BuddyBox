# BuddyBox - Modern Web Control Panel

BuddyBox is a comprehensive web-based control panel for managing your full-stack infrastructure, including DNS (PowerDNS), web server (Caddy), databases (PostgreSQL, MongoDB, MySQL), and mail server (Mailcow).

## 🎨 Brand Colors

| Color Name   | Use Case                        | Hex Code |
|-------------|----------------------------------|----------|
| Buddy Blue   | Primary brand color, UI highlights| #2A4D9B |
| Box Orange   | Accent color, buttons, icons     | #FF7A33 |
| Soft Gray    | Backgrounds, borders             | #F4F5F7 |
| Mid Gray     | Secondary text, UI elements      | #A1A1AA |
| Dark Navy    | Headings, logo text             | #1E2A3A |
| White        | Text contrast, panel backgrounds | #FFFFFF |

## 🚀 Features

- **DNS Management**
  - Add/remove zones and records via PowerDNS API
  - Bulk record management
  - DNS templates

- **Web Server Management**
  - Configure sites and applications
  - SSL certificate management
  - PHP/Node.js app deployment
  - Reverse proxy configuration

- **Database Management**
  - PostgreSQL, MongoDB, and MySQL support
  - Create/delete databases and users
  - Database backup and restore
  - Query interface

- **Mail Server Management**
  - Domain and user management
  - Alias configuration
  - Spam filter settings
  - Email routing rules

- **Monitoring & Logs**
  - Real-time server status
  - Resource usage metrics
  - Centralized logging
  - Alert configuration

- **User Management**
  - Role-based access control (RBAC)
  - Multi-user support
  - Activity logging
  - Two-factor authentication

## 🛠 Prerequisites

- Node.js (via nvm)
- PHP
- Python
- PostgreSQL/MongoDB/MySQL
- PowerDNS
- Caddy
- Mailcow

## 📦 Installation

### Automatic Installation (Recommended)

```bash
curl -o- https://raw.githubusercontent.com/buddybox/install.sh | bash
```

### Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/buddybox.git
cd buddybox
```

2. Install dependencies:
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

# Install CLI tool
cd ../cli
npm install -g .
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the services:
```bash
# Start backend
npm run server

# Start frontend
npm run client
```

## 🔧 CLI Usage

BuddyBox comes with a powerful CLI tool for managing your server:

```bash
buddybox --help                    # Show help
buddybox service list             # List all services
buddybox dns add-zone example.com # Add DNS zone
buddybox db create mydb           # Create database
```

## 🔒 Security

- JWT-based authentication
- Role-based access control
- API rate limiting
- SSL/TLS encryption
- Regular security audits
- Automated backup system

## 📚 Documentation

Full documentation is available at [docs.buddybox.com](https://docs.buddybox.com)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 🆘 Support

- Create an issue for bug reports
- Join our Discord for community support
- Check the documentation for guides

---

**Made with ❤️ by the BuddyBox Team**
