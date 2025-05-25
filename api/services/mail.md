# Mail Server Service API

## Overview
Endpoints for managing mail server (Postfix/Dovecot) configuration and operations.

## Endpoints

### Get Mail Server Status
- **GET** `/service/mail/status`
- **Description**: Get current status of the mail server
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "status": {
        "name": "mail",
        "active": true,
        "running": true,
        "enabled": true,
        "version": "3.7.0",
        "domains": 5,
        "users": 10,
        "lastError": null
      }
    }
  }
  ```

### List Domains
- **GET** `/service/mail/domains`
- **Description**: Get list of all mail domains
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "domains": [
        {
          "name": "example.com",
          "active": true,
          "users": 5,
          "aliases": 2
        }
      ]
    }
  }
  ```

### Add Domain
- **POST** `/service/mail/domains`
- **Description**: Add a new mail domain
- **Body**:
  ```json
  {
    "name": "newdomain.com",
    "dkim": true,
    "spf": true,
    "dmarc": true
  }
  ```
- **Response**: Success message

### Delete Domain
- **DELETE** `/service/mail/domains/:domainName`
- **Description**: Remove a mail domain
- **Response**: Success message

### List Users
- **GET** `/service/mail/users`
- **Description**: Get list of all mail users
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "users": [
        {
          "email": "user@example.com",
          "domain": "example.com",
          "quota": "1GB",
          "active": true
        }
      ]
    }
  }
  ```

### Create User
- **POST** `/service/mail/users`
- **Description**: Create a new mail user
- **Body**:
  ```json
  {
    "email": "newuser@example.com",
    "password": "securepassword",
    "quota": "1GB"
  }
  ```
- **Response**: Success message

### Update User
- **PUT** `/service/mail/users/:email`
- **Description**: Update user settings
- **Body**:
  ```json
  {
    "password": "newpassword",
    "quota": "2GB",
    "active": true
  }
  ```
- **Response**: Success message

### Delete User
- **DELETE** `/service/mail/users/:email`
- **Description**: Remove a mail user
- **Response**: Success message

### List Aliases
- **GET** `/service/mail/aliases`
- **Description**: Get list of all email aliases
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "aliases": [
        {
          "source": "info@example.com",
          "destination": "user@example.com",
          "active": true
        }
      ]
    }
  }
  ```

### Create Alias
- **POST** `/service/mail/aliases`
- **Description**: Create a new email alias
- **Body**:
  ```json
  {
    "source": "support@example.com",
    "destination": "user@example.com"
  }
  ```
- **Response**: Success message

### Delete Alias
- **DELETE** `/service/mail/aliases/:aliasId`
- **Description**: Remove an email alias
- **Response**: Success message

### Get DKIM Status
- **GET** `/service/mail/dkim/:domainName`
- **Description**: Get DKIM configuration status
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "dkim": {
        "domain": "example.com",
        "enabled": true,
        "selector": "default",
        "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A..."
      }
    }
  }
  ```

### Update DKIM
- **PUT** `/service/mail/dkim/:domainName`
- **Description**: Update DKIM configuration
- **Body**:
  ```json
  {
    "enabled": true,
    "selector": "new",
    "keySize": 2048
  }
  ```
- **Response**: Success message

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid configuration |
| 403 | Permission denied |
| 404 | Domain/User not found |
| 409 | Domain/User already exists |
| 500 | Server error |

## Examples

### Adding a New Mail Domain
```bash
curl -X POST http://localhost:5000/api/service/mail/domains \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "newdomain.com",
    "dkim": true,
    "spf": true,
    "dmarc": true
  }'
```

### Creating a Mail User
```bash
curl -X POST http://localhost:5000/api/service/mail/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword",
    "quota": "1GB"
  }'
``` 