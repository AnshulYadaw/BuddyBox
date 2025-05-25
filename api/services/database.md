# Database Service API

## Overview
Endpoints for managing database (MySQL/PostgreSQL) configuration and operations.

## Endpoints

### Get Database Status
- **GET** `/service/database/status`
- **Description**: Get current status of the database server
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "status": {
        "name": "database",
        "active": true,
        "running": true,
        "enabled": true,
        "version": "8.0.32",
        "type": "mysql",
        "databases": 5,
        "lastError": null
      }
    }
  }
  ```

### List Databases
- **GET** `/service/database/databases`
- **Description**: Get list of all databases
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "databases": [
        {
          "name": "myapp",
          "size": "256MB",
          "tables": 10,
          "users": 2
        }
      ]
    }
  }
  ```

### Create Database
- **POST** `/service/database/databases`
- **Description**: Create a new database
- **Body**:
  ```json
  {
    "name": "newapp",
    "charset": "utf8mb4",
    "collation": "utf8mb4_unicode_ci"
  }
  ```
- **Response**: Success message

### Delete Database
- **DELETE** `/service/database/databases/:databaseName`
- **Description**: Remove a database
- **Response**: Success message

### List Users
- **GET** `/service/database/users`
- **Description**: Get list of all database users
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "users": [
        {
          "username": "appuser",
          "host": "localhost",
          "privileges": ["SELECT", "INSERT", "UPDATE"]
        }
      ]
    }
  }
  ```

### Create User
- **POST** `/service/database/users`
- **Description**: Create a new database user
- **Body**:
  ```json
  {
    "username": "newuser",
    "password": "securepassword",
    "host": "localhost",
    "privileges": ["SELECT", "INSERT", "UPDATE"]
  }
  ```
- **Response**: Success message

### Update User
- **PUT** `/service/database/users/:username`
- **Description**: Update user privileges or password
- **Body**:
  ```json
  {
    "password": "newpassword",
    "privileges": ["SELECT", "INSERT", "UPDATE", "DELETE"]
  }
  ```
- **Response**: Success message

### Delete User
- **DELETE** `/service/database/users/:username`
- **Description**: Remove a database user
- **Response**: Success message

### Get Database Backup
- **GET** `/service/database/backup/:databaseName`
- **Description**: Get a backup of the database
- **Response**: SQL dump file

### Restore Database
- **POST** `/service/database/restore/:databaseName`
- **Description**: Restore database from backup
- **Body**: SQL dump file
- **Response**: Success message

### Get Database Stats
- **GET** `/service/database/stats/:databaseName`
- **Description**: Get database statistics
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "stats": {
        "size": "256MB",
        "tables": 10,
        "rows": 10000,
        "indexes": 15,
        "lastBackup": "2024-02-15T00:00:00Z"
      }
    }
  }
  ```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid configuration |
| 403 | Permission denied |
| 404 | Database not found |
| 409 | Database already exists |
| 500 | Server error |

## Examples

### Creating a New Database
```bash
curl -X POST http://localhost:5000/api/service/database/databases \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "newapp",
    "charset": "utf8mb4",
    "collation": "utf8mb4_unicode_ci"
  }'
```

### Creating a Database User
```bash
curl -X POST http://localhost:5000/api/service/database/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "appuser",
    "password": "securepassword",
    "host": "localhost",
    "privileges": ["SELECT", "INSERT", "UPDATE"]
  }'
``` 