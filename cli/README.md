# BuddyBox CLI

Command Line Interface for managing BuddyBox services.

## Installation

```bash
npm install -g buddybox-cli
```

## Usage

### IAM Commands

#### Register a new user
```bash
buddybox iam register [options]
```
Options:
- `-e, --email <email>` - User email
- `-p, --password <password>` - User password
- `-n, --name <name>` - User name
- `-r, --role <role>` - User role (user/admin/superadmin)

#### Login
```bash
buddybox iam login [options]
```
Options:
- `-e, --email <email>` - User email
- `-p, --password <password>` - User password

#### Logout
```bash
buddybox iam logout
```

#### List Users (Admin only)
```bash
buddybox iam list
```

#### Delete User (Admin only)
```bash
buddybox iam delete <id>
```

### Service Management Commands

#### List Services
```bash
buddybox service list
```
Lists all available services and their current status.

#### Get Service Status
```bash
buddybox service status <serviceName>
```
Shows detailed status information for a specific service.

#### Start Service
```bash
buddybox service start <serviceName>
```
Starts a specific service.

#### Stop Service
```bash
buddybox service stop <serviceName>
```
Stops a specific service.

#### Restart Service
```bash
buddybox service restart <serviceName>
```
Restarts a specific service.

#### View Service Logs
```bash
buddybox service logs <serviceName> [options]
```
Options:
- `-l, --lines <number>` - Number of log lines to fetch (default: 100)

#### Update Service Configuration
```bash
buddybox service config <serviceName> [options]
```
Options:
- `-f, --file <path>` - Path to configuration file (JSON format)

### Configuration Commands

#### Set API URL
```bash
buddybox config set apiUrl <url>
```

#### Get Current Configuration
```bash
buddybox config get
```

## Development

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run dev
```

4. Run tests:
```bash
npm test
```

## API Endpoints

The CLI communicates with the following API endpoints:

- Authentication: `http://localhost:5000/api/auth`
- IAM: `http://localhost:5000/api/iam`
- Services: `http://localhost:5000/api/service`

## Environment Variables

- `BUDDYBOX_API_URL` - API base URL (default: http://localhost:5000/api)
- `BUDDYBOX_CONFIG_PATH` - Path to config file (default: ~/.buddybox.json)

## Examples

### Managing Services

1. List all services:
```bash
buddybox service list
```

2. Check status of a specific service:
```bash
buddybox service status nginx
```

3. Start a service:
```bash
buddybox service start nginx
```

4. View service logs:
```bash
buddybox service logs nginx -l 200
```

5. Update service configuration:
```bash
buddybox service config nginx -f config.json
```

### User Management

1. Register a new admin user:
```bash
buddybox iam register -e admin@example.com -p securepass -n "Admin User" -r admin
```

2. Login:
```bash
buddybox iam login -e admin@example.com -p securepass
```

3. List all users:
```bash
buddybox iam list
``` 