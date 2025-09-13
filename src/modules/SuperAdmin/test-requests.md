# Test SuperAdmin API

## Test 1: Minimal Request (Required Fields Only)

```bash
curl -X POST http://localhost:3000/superadmin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "email": "superadmin@example.com",
    "password": "SuperSecure123!",
    "name": "Super Administrator"
  }'
```

Or using the minimal file:
```bash
curl -X POST http://localhost:3000/superadmin \
  -H "Content-Type: application/json" \
  -d @minimal-request.json
```

## Test 2: Full Request (All Fields)

```bash
curl -X POST http://localhost:3000/superadmin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin2",
    "email": "superadmin2@example.com",
    "password": "SuperSecure123!",
    "name": "Super Administrator 2",
    "mobile_prefix": "+1",
    "mobile_number": "1234567890",
    "profile_url": "https://example.com/profile.jpg",
    "is_active": true,
    "is_email_verified": true,
    "mfa_enabled": false,
    "credits": "1000"
  }'
```

Or using the example file:
```bash
curl -X POST http://localhost:3000/superadmin \
  -H "Content-Type: application/json" \
  -d @example-request.json
```

## Expected Success Response

```json
{
  "uid": "1",
  "username": "superadmin",
  "email": "superadmin@example.com",
  "name": "Super Administrator",
  "login_type": "SUPERADMIN",
  "role_id": null,
  "parent_user_id": null,
  "address_id": null,
  "mobile_prefix": "+1",
  "mobile_number": "1234567890",
  "profile_url": "https://example.com/profile.jpg",
  "is_active": true,
  "is_email_verified": true,
  "mfa_enabled": false,
  "credits": "1000",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z",
  "last_login": null,
  "deleted_at": null
}
```
