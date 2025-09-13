# SuperAdmin Module (Simplified)

A simple SuperAdmin creation module for NestJS applications with Prisma database integration.

## Features

- ✅ Create SuperAdmin accounts only
- ✅ Password hashing with bcrypt
- ✅ Comprehensive validation with DTOs
- ✅ Prisma database integration
- ✅ No authentication guards (uses @Public() decorator to bypass)
- ✅ Swagger/OpenAPI documentation

## Module Structure

```
SuperAdmin/
├── dto/
│   ├── superadmin.dto.ts      # Data Transfer Objects
│   └── index.ts
├── superadmin.controller.ts   # REST API controller (create only)
├── superadmin.service.ts      # Business logic service (create only)
├── superadmin.module.ts       # NestJS module
├── example-request.json       # Test request example
└── README-SIMPLE.md           # This documentation
```

## Quick Start

### 1. Import the Module

```typescript
import { SuperAdminModule } from './modules/SuperAdmin';

@Module({
  imports: [
    // ... other modules
    SuperAdminModule,
  ],
})
export class AppModule {}
```

## API Endpoint

### Base URL: `/superadmin`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create Super Admin | ❌ None |

## Request Format

### CreateSuperAdminDto

```json
{
  "username": "superadmin",
  "email": "superadmin@example.com", 
  "password": "SuperSecure123!",
  "name": "Super Administrator",
  "role_id": "1",              // Optional - BigInt as string
  "parent_user_id": "1",       // Optional - BigInt as string  
  "address_id": "1",           // Optional - BigInt as string
  "mobile_prefix": "+1",       // Optional
  "mobile_number": "1234567890", // Optional
  "profile_url": "https://example.com/profile.jpg", // Optional
  "is_active": true,           // Optional - default true
  "is_email_verified": false,  // Optional - default false
  "mfa_enabled": false,        // Optional - default false
  "credits": "1000"            // Optional - BigInt as string, default "0"
}
```

### Required Fields
- `username` (string, unique)
- `email` (string, unique, valid email)
- `password` (string, minimum 8 characters)
- `name` (string, not empty)

## Testing the API

### Using curl

```bash
curl -X POST http://localhost:3000/superadmin \
  -H "Content-Type: application/json" \
  -d @example-request.json
```

### Using the example file

The module includes `example-request.json`:

```json
{
  "username": "superadmin",
  "email": "superadmin@example.com",
  "password": "SuperSecure123!",
  "name": "Super Administrator",
  "mobile_prefix": "+1",
  "mobile_number": "1234567890",
  "profile_url": "https://example.com/profile.jpg",
  "is_active": true,
  "is_email_verified": true,
  "mfa_enabled": false,
  "credits": "1000"
}
```

### Expected Response

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

## Database Integration

The module works with your existing `Users` table schema:

```prisma
model Users {
  uid               BigInt   @id @default(autoincrement())
  login_type        LoginType
  
  role_id           BigInt?
  parent_user_id    BigInt?
  address_id        BigInt?
  
  name              String
  email             String   @unique
  is_email_verified Boolean  @default(false)
  
  mobile_prefix     String?
  mobile_number     String?
  
  profile_url       String?
  username          String   @unique
  password_hash     String
  credits           BigInt   @default(0)
  mfa_enabled       Boolean  @default(false)
  
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  deleted_at        DateTime?
  last_login        DateTime?
  is_active         Boolean  @default(true)
  
  @@map("users")
}

enum LoginType {
  SUPERADMIN
  // ... other types
}
```

## Error Handling

The module handles these errors:

- **409 Conflict** - Username or email already exists
- **400 Bad Request** - Validation errors (missing fields, invalid email, password too short, etc.)
- **500 Internal Server Error** - Database or system errors

## Security Features

- 🔐 Password hashing with bcrypt (12 rounds)
- ✅ Input validation and sanitization
- 🚫 Sensitive data filtering (password_hash not returned)
- 📊 Performance monitoring with Prisma
- 🔍 Comprehensive logging

## Files Overview

1. **superadmin.controller.ts** - Single POST endpoint
2. **superadmin.service.ts** - Create method with validation
3. **superadmin.module.ts** - NestJS module configuration
4. **dto/superadmin.dto.ts** - Request/response DTOs
5. **example-request.json** - Test data

## Notes

- This is a simplified version with only the create functionality
- Uses @Public() decorator to bypass global authentication guards
- No role-based access control (except bypassing auth)
- Designed for initial SuperAdmin account setup
- Uses LoginType.SUPERADMIN automatically

## Next Steps

After creating your first SuperAdmin:

1. Add authentication to your application
2. Use the created SuperAdmin account to login
3. Implement additional admin features as needed
4. Consider adding guards/auth to this endpoint in production
