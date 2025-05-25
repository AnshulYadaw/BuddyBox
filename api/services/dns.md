# DNS Service API

## Overview
Endpoints for managing DNS (PowerDNS) configuration and operations.

## Endpoints

### Get DNS Server Status
- **GET** `/service/dns/status`
- **Description**: Get current status of the DNS server
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "status": {
        "name": "dns",
        "active": true,
        "running": true,
        "enabled": true,
        "version": "4.7.0",
        "zones": 10,
        "lastError": null
      }
    }
  }
  ```

### List Zones
- **GET** `/service/dns/zones`
- **Description**: Get list of all DNS zones
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "zones": [
        {
          "name": "example.com",
          "type": "MASTER",
          "records": 5,
          "lastCheck": "2024-02-15T00:00:00Z"
        }
      ]
    }
  }
  ```

### Get Zone Details
- **GET** `/service/dns/zones/:zoneName`
- **Description**: Get detailed information about a zone
- **Response**:
  ```json
  {
    "status": "success",
    "data": {
      "zone": {
        "name": "example.com",
        "type": "MASTER",
        "records": [
          {
            "name": "example.com",
            "type": "A",
            "content": "192.168.1.1",
            "ttl": 3600
          }
        ],
        "soa": {
          "primary": "ns1.example.com",
          "admin": "admin@example.com",
          "serial": 2024021501
        }
      }
    }
  }
  ```

### Create Zone
- **POST** `/service/dns/zones`
- **Description**: Create a new DNS zone
- **Body**:
  ```json
  {
    "name": "example.com",
    "type": "MASTER",
    "records": [
      {
        "name": "@",
        "type": "A",
        "content": "192.168.1.1",
        "ttl": 3600
      }
    ],
    "soa": {
      "primary": "ns1.example.com",
      "admin": "admin@example.com"
    }
  }
  ```
- **Response**: Success message

### Update Zone
- **PUT** `/service/dns/zones/:zoneName`
- **Description**: Update zone configuration
- **Body**:
  ```json
  {
    "records": [
      {
        "name": "@",
        "type": "A",
        "content": "192.168.1.2",
        "ttl": 3600
      }
    ]
  }
  ```
- **Response**: Success message

### Delete Zone
- **DELETE** `/service/dns/zones/:zoneName`
- **Description**: Remove a DNS zone
- **Response**: Success message

### Add Record
- **POST** `/service/dns/zones/:zoneName/records`
- **Description**: Add a new DNS record
- **Body**:
  ```json
  {
    "name": "www",
    "type": "CNAME",
    "content": "example.com",
    "ttl": 3600
  }
  ```
- **Response**: Success message

### Update Record
- **PUT** `/service/dns/zones/:zoneName/records/:recordId`
- **Description**: Update a DNS record
- **Body**:
  ```json
  {
    "content": "new.example.com",
    "ttl": 7200
  }
  ```
- **Response**: Success message

### Delete Record
- **DELETE** `/service/dns/zones/:zoneName/records/:recordId`
- **Description**: Remove a DNS record
- **Response**: Success message

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid zone configuration |
| 403 | Permission denied |
| 404 | Zone not found |
| 409 | Zone already exists |
| 500 | Server error |

## Examples

### Creating a New Zone
```bash
curl -X POST http://localhost:5000/api/service/dns/zones \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "example.com",
    "type": "MASTER",
    "records": [
      {
        "name": "@",
        "type": "A",
        "content": "192.168.1.1",
        "ttl": 3600
      }
    ],
    "soa": {
      "primary": "ns1.example.com",
      "admin": "admin@example.com"
    }
  }'
```

### Adding a DNS Record
```bash
curl -X POST http://localhost:5000/api/service/dns/zones/example.com/records \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "www",
    "type": "CNAME",
    "content": "example.com",
    "ttl": 3600
  }'
``` 