# API Documentation

Fidus Writer provides REST APIs for programmatic access.

## Authentication

Most API endpoints require authentication. Use one of:

1. **Session Authentication** - For browser-based access
2. **Token Authentication** - For programmatic access

## Available APIs

### Documents API

#### List Documents

```http
GET /api/document/documentlist/
```

Response:
```json
{
    "documents": [
        {
            "id": 1,
            "title": "My Document",
            "owner": 1,
            "created": "2025-01-01T00:00:00Z"
        }
    ]
}
```

#### Get Document

```http
GET /api/document/get/{id}/
```

#### Create Document

```http
POST /api/document/create/
Content-Type: application/json

{
    "title": "New Document",
    "content": {...}
}
```

### Bibliography API

#### List Bibliography

```http
GET /api/bibliography/list/
```

#### Add Bibliography Entry

```http
POST /api/bibliography/create/
```

### User API

#### Get User Info

```http
GET /api/user/info/
```

## Error Responses

```json
{
    "error": "Not authenticated",
    "code": 401
}
```

## Rate Limiting

API requests may be rate limited. Check response headers:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`

## Webhooks

Configure webhooks for events:
- Document created
- Document shared
- User invited

## Related Documentation

- [Development Guide](README.md)

---

**Last Updated:** December 8, 2025
