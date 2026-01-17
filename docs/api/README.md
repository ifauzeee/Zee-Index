# 📚 Zee-Index API Documentation

## Overview

This directory contains the API documentation for Zee-Index.

## OpenAPI Specification

The complete API specification is available in `openapi.yaml` (OpenAPI 3.1 format).

### Viewing the Documentation

You can view the interactive API documentation using any OpenAPI-compatible viewer:

1. **Swagger UI** (Recommended)

   ```bash
   # Install swagger-ui-express or use online editor
   # Visit: https://editor.swagger.io/
   # Paste the contents of openapi.yaml
   ```

2. **Redoc**

   ```bash
   npx @redocly/cli preview-docs ./docs/api/openapi.yaml
   ```

3. **Postman**
   - Import `openapi.yaml` into Postman
   - All endpoints will be automatically configured

## API Endpoints Summary

### 🔐 Authentication

| Method | Endpoint           | Description                      |
| ------ | ------------------ | -------------------------------- |
| GET    | `/api/auth/me`     | Get current user                 |
| POST   | `/api/auth/folder` | Authenticate to protected folder |

### 📁 Files

| Method | Endpoint            | Description          |
| ------ | ------------------- | -------------------- |
| GET    | `/api/files`        | List files in folder |
| GET    | `/api/filedetails`  | Get file details     |
| GET    | `/api/download`     | Download file        |
| GET    | `/api/search`       | Search files         |
| POST   | `/api/files/upload` | Upload file          |
| PATCH  | `/api/files/rename` | Rename file          |
| DELETE | `/api/files/delete` | Delete file          |

### 🔗 Share

| Method | Endpoint            | Description       |
| ------ | ------------------- | ----------------- |
| POST   | `/api/share/create` | Create share link |
| GET    | `/api/share/list`   | List share links  |
| POST   | `/api/share/delete` | Delete share link |

### ⚙️ Admin

| Method | Endpoint                  | Description          |
| ------ | ------------------------- | -------------------- |
| GET    | `/api/admin/config`       | Get configuration    |
| POST   | `/api/admin/config`       | Update configuration |
| GET    | `/api/admin/users`        | List admins          |
| POST   | `/api/admin/users`        | Add admin            |
| DELETE | `/api/admin/users`        | Remove admin         |
| GET    | `/api/admin/activity-log` | Get activity logs    |

### 💚 Health

| Method | Endpoint      | Description  |
| ------ | ------------- | ------------ |
| GET    | `/api/health` | Health check |

## Authentication

Most endpoints require authentication. Zee-Index uses NextAuth.js for session management.

### Session Authentication

```
Cookie: next-auth.session-token=<token>
```

### Share Token Authentication

```
?share_token=<jwt-token>
```

### Folder Access Token

```
?access_token=<folder-token>
```

## Rate Limiting

| Endpoint Type | Limit               |
| ------------- | ------------------- |
| General API   | 100 requests/minute |
| Download API  | 30 requests/minute  |

## Error Handling

All errors return a consistent format:

```json
{
  "error": "Human readable error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code             | HTTP Status | Description        |
| ---------------- | ----------- | ------------------ |
| `UNAUTHORIZED`   | 401         | Not authenticated  |
| `FORBIDDEN`      | 403         | Access denied      |
| `NOT_FOUND`      | 404         | Resource not found |
| `RATE_LIMITED`   | 429         | Too many requests  |
| `INTERNAL_ERROR` | 500         | Server error       |

## Examples

### List Files

```bash
curl -X GET "http://localhost:3000/api/files?folderId=<folder-id>" \
  -H "Cookie: next-auth.session-token=<token>"
```

### Create Share Link

```bash
curl -X POST "http://localhost:3000/api/share/create" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<token>" \
  -d '{
    "path": "/folder/<folder-id>",
    "itemName": "My Folder",
    "expiresIn": 86400,
    "loginRequired": false
  }'
```

### Upload File

```bash
curl -X POST "http://localhost:3000/api/files/upload" \
  -H "Cookie: next-auth.session-token=<token>" \
  -F "file=@/path/to/file.pdf" \
  -F "folderId=<folder-id>"
```

## SDK / Client Libraries

Currently, no official SDKs are provided. You can generate client libraries from the OpenAPI specification:

```bash
# Generate TypeScript client
npx @openapitools/openapi-generator-cli generate \
  -i ./docs/api/openapi.yaml \
  -g typescript-fetch \
  -o ./sdk/typescript

# Generate Python client
npx @openapitools/openapi-generator-cli generate \
  -i ./docs/api/openapi.yaml \
  -g python \
  -o ./sdk/python
```

## Changelog

### v2.0.0

- Initial API documentation
- Added OpenAPI 3.1 specification
- Documented all endpoints
