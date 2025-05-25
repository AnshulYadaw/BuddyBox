# Web Server Service API

## Overview
Endpoints for managing web server (Caddy) configuration and operations.

## Endpoints

### Get Web Server Status
- **GET** `/service/web-server/status`
- **Description**: Get current status of the web server
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "status": {
        "name": "web-server",
        "active": true,
        "running": true,
        "enabled": true,
        "version": "2.6.4",
        "sites": 5,
        "lastError": null
      }
    }
  }
  ```

### List Sites
- **GET** `/service/web-server/sites`
- **Description**: Get list of all configured sites
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "sites": [
        {
          "domain": "example.com",
          "enabled": true,
          "ssl": true,
          "root": "/var/www/example.com",
          "php": true
        }
      ]
    }
  }
  ```

### Add Site
- **POST** `/service/web-server/sites`
- **Description**: Add a new site
- **Body**:
  ```json
  {
    "domain": "example.com",
    "root": "/var/www/example.com",
    "php": true,
    "ssl": true
  }
  ```
- **Response**: Success message

### Update Site
- **PUT** `/service/web-server/sites/:domain`
- **Description**: Update site configuration
- **Body**:
  ```json
  {
    "root": "/var/www/new-path",
    "php": false,
    "ssl": true
  }
  ```
- **Response**: Success message

### Delete Site
- **DELETE** `/service/web-server/sites/:domain`
- **Description**: Remove a site
- **Response**: Success message

### Get SSL Status
- **GET** `/service/web-server/ssl/:domain`
- **Description**: Get SSL certificate status
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "domain": "example.com",
      "valid": true,
      "issuer": "Let's Encrypt",
      "expires": "2024-03-15T00:00:00Z"
    }
  }
  ```

### Renew SSL
- **POST** `/service/web-server/ssl/:domain/renew`
- **Description**: Renew SSL certificate
- **Response**: Success message

### Get PHP Status
- **GET** `/service/web-server/php/status`
- **Description**: Get PHP-FPM status
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "version": "8.2",
      "active": true,
      "processes": 10,
      "memory": "256M"
    }
  }
  ```

### Update PHP Configuration
- **PUT** `/service/web-server/php/config`
- **Description**: Update PHP-FPM configuration
- **Body**:
  ```json
  {
    "memory_limit": "512M",
    "max_execution_time": 30,
    "upload_max_filesize": "64M"
  }
  ```
- **Response**: Success message

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid configuration |
| 403 | Permission denied |
| 404 | Site not found |
| 409 | Domain already exists |
| 500 | Server error |

## Examples

### Adding a New Site
```bash
curl -X POST http://localhost:5000/api/service/web-server/sites \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "root": "/var/www/example.com",
    "php": true,
    "ssl": true
  }'
```

### Updating PHP Configuration
```bash
curl -X PUT http://localhost:5000/api/service/web-server/php/config \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "memory_limit": "512M",
    "max_execution_time": 30
  }'
``` 