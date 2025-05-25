# BuddyBox API Documentation

## Overview
The BuddyBox API provides endpoints for managing services, user authentication, and system configuration. All endpoints are prefixed with `/api`.

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-token>
```

## Base URL
```
http://localhost:5000/api
```

## Endpoints

### IAM (Identity and Access Management)

#### Register User
- **POST** `/iam/register`
- **Description**: Register a new user
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword",
    "name": "User Name",
    "role": "user"
  }
  ```
- **Response**: User object with token

#### Login
- **POST** `/iam/login`
- **Description**: Authenticate user
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- **Response**: User object with token

#### List Users (Admin only)
- **GET** `/iam/users`
- **Description**: Get list of all users
- **Response**: Array of user objects

#### Delete User (Admin only)
- **DELETE** `/iam/users/:id`
- **Description**: Delete a user
- **Response**: Success message

### Service Management

#### List Services
- **GET** `/service`
- **Description**: Get list of all services
- **Response**: Array of service objects

#### Get Service Status
- **GET** `/service/:serviceName/status`
- **Description**: Get status of a specific service
- **Response**: Service status object

#### Start Service
- **POST** `/service/:serviceName/start`
- **Description**: Start a service
- **Response**: Success message

#### Stop Service
- **POST** `/service/:serviceName/stop`
- **Description**: Stop a service
- **Response**: Success message

#### Restart Service
- **POST** `/service/:serviceName/restart`
- **Description**: Restart a service
- **Response**: Success message

#### Get Service Logs
- **GET** `/service/:serviceName/logs`
- **Description**: Get service logs
- **Query Parameters**:
  - `lines`: Number of log lines to fetch (default: 100)
- **Response**: Log content

#### Update Service Configuration
- **PUT** `/service/:serviceName/config`
- **Description**: Update service configuration
- **Body**:
  ```json
  {
    "config": {
      "port": 8080,
      "settings": {
        // service-specific settings
      }
    }
  }
  ```
- **Response**: Success message

## Error Responses
All endpoints return errors in the following format:
```json
{
  "status": "error",
  "message": "Error description"
}
```

## Rate Limiting
API requests are limited to 100 requests per minute per IP address.

## Versioning
The current API version is v1. The version is included in the URL path: `/api/v1/...`

## Authentication Flow
1. Register a new user or login with existing credentials
2. Receive JWT token in response
3. Include token in subsequent requests
4. Token expires after 24 hours

## Security
- All endpoints use HTTPS
- Passwords are hashed using bcrypt
- JWT tokens are signed with a secure secret
- Input validation is performed on all requests
- CORS is enabled for specified origins 