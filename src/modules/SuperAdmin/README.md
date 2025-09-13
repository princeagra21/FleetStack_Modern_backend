# SuperAdmin Module

A comprehensive SuperAdmin management module for NestJS applications with Prisma database integration.

## Features

- ✅ Complete CRUD operations for Super Admin accounts
- ✅ Role-based access control with guards and decorators
- ✅ Advanced filtering and pagination
- ✅ Bulk operations support
- ✅ Comprehensive validation with DTOs
- ✅ Password hashing and security
- ✅ Soft delete functionality
- ✅ Statistics and analytics
- ✅ Data export capabilities
- ✅ Audit trail support
- ✅ Performance optimization with Prisma
- ✅ Comprehensive Swagger/OpenAPI documentation

## Module Structure

```
SuperAdmin/
├── dto/
│   ├── superadmin.dto.ts      # Data Transfer Objects
│   └── index.ts
├── guards/
│   └── superadmin.guard.ts    # Access control guards
├── decorators/
│   └── superadmin.decorator.ts # Custom decorators
├── superadmin.controller.ts   # REST API controller
├── superadmin.service.ts      # Business logic service
├── superadmin.module.ts       # NestJS module
├── index.ts                   # Main exports
└── README.md                  # Documentation
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

### 2. Use in Controllers

```typescript
import { SuperAdminEndpoint, SuperAdminService } from './modules/SuperAdmin';

@Controller('admin')
export class AdminController {
  constructor(private superAdminService: SuperAdminService) {}

  @Get('users')
  @SuperAdminEndpoint()
  async getUsers() {
    return this.superAdminService.getSuperAdmins({});
  }
}
```

## API Endpoints

### Base URL: `/superadmin`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create Super Admin | SUPERADMIN |
| GET | `/` | Get All Super Admins | SUPERADMIN |
| GET | `/stats` | Get Statistics | SUPERADMIN |
| GET | `/:id` | Get Super Admin by ID | SUPERADMIN |
| PUT | `/:id` | Update Super Admin | SUPERADMIN |
| DELETE | `/:id` | Delete Super Admin (Soft) | SUPERADMIN |
| PATCH | `/:id/toggle-status` | Toggle Active Status | SUPERADMIN |
| PATCH | `/:id/reset-password` | Reset Password | SUPERADMIN |
| POST | `/bulk-action` | Bulk Operations | SUPERADMIN |
| GET | `/:id/audit-trail` | Get Audit Trail | SUPERADMIN |
| POST | `/export` | Export Data | SUPERADMIN |
| POST | `/test-superadmin` | Test Create (No Auth) | None |

## DTOs

### CreateSuperAdminDto

```typescript
{
  username: string;
  email: string;
  password: string;
  name: string;
  role_id?: string;           // BigInt as string
  parent_user_id?: string;    // BigInt as string
  address_id?: string;        // BigInt as string
  mobile_prefix?: string;
  mobile_number?: string;
  profile_url?: string;
  is_active?: boolean;
  is_email_verified?: boolean;
  mfa_enabled?: boolean;
  credits?: string;           // BigInt as string
}
```

### SuperAdminFilterDto

```typescript
{
  username?: string;
  email?: string;
  name?: string;
  is_active?: boolean;
  is_email_verified?: boolean;
  mfa_enabled?: boolean;
  login_type?: LoginType;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## Guards

### SuperAdminGuard

Extends JWT authentication with SUPER_ADMIN role verification.

```typescript
@UseGuards(SuperAdminGuard)
@Get('protected')
async protectedEndpoint() {
  // Only accessible to authenticated SUPER_ADMIN users
}
```

### SuperAdminOnlyGuard

Simple role-based guard for SUPER_ADMIN access.

```typescript
@UseGuards(SuperAdminOnlyGuard)
@Get('admin-only')
async adminOnly() {
  // Only accessible to SUPER_ADMIN users
}
```

## Decorators

### SuperAdminEndpoint

Combined decorator with full protection:

```typescript
@SuperAdminEndpoint(['read', 'write'])
@Get('data')
async getData() {
  // Protected with authentication, role check, and permissions
}
```

### Available Decorators

- `@SuperAdminRequired()` - Basic SUPERADMIN role requirement
- `@SuperAdminPermissions(...permissions)` - Specific permissions
- `@SuperAdminEndpoint(permissions?)` - Full protection
- `@SuperAdminReadOnly()` - Read-only access
- `@SuperAdminWriteAccess()` - Write permissions
- `@SuperAdminFullAccess()` - Full management permissions
- `@SuperAdminBulkOperations()` - Bulk operations access
- `@SuperAdminSystemAccess()` - System-level access

## Service Methods

### Core CRUD Operations

```typescript
// Create a new Super Admin
await superAdminService.createSuperAdmin(createDto);

// Get paginated list with filters
await superAdminService.getSuperAdmins(filterDto);

// Get by ID
await superAdminService.getSuperAdminById(id);

// Update Super Admin
await superAdminService.updateSuperAdmin(id, updateDto);

// Soft delete
await superAdminService.deleteSuperAdmin(id);
```

### Advanced Operations

```typescript
// Get statistics
await superAdminService.getSuperAdminStats();

// Bulk operations
await superAdminService.bulkAction({
  userIds: [1, 2, 3],
  action: 'activate'
});

// Toggle status
await superAdminService.toggleSuperAdminStatus(id, true);

// Reset password
await superAdminService.resetPassword(id, 'newPassword');
```

## Database Integration

The service uses Prisma ORM with the `PrimaryDatabaseService` for:

- High-performance queries with monitoring
- Transaction support
- Connection pooling
- Query optimization
- Error handling and logging

### Prisma Model Requirements

The module works with the existing `Users` table schema:

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
  
  // ... relations
  @@map("users")
}

enum LoginType {
  SUPERADMIN
  // ... other types
}
```

## Error Handling

The module includes comprehensive error handling:

- `ConflictException` - Username/email already exists
- `NotFoundException` - Super Admin not found
- `ForbiddenException` - Access denied
- `BadRequestException` - Invalid input
- `InternalServerErrorException` - System errors

## Security Features

- 🔐 Password hashing with bcrypt (12 rounds)
- 🛡️ Role-based access control
- 🔒 JWT authentication integration
- 🚫 Soft delete for data retention
- ✅ Input validation and sanitization
- 📊 Performance monitoring
- 🔍 Audit trail support

## Configuration

No additional configuration required. The module automatically integrates with:

- `PrimaryDatabaseService` for database operations
- `ConfigService` for application settings
- `AuthModule` for authentication

## Performance

- Optimized Prisma queries with performance tracking
- Parallel execution for statistics and bulk operations
- Pagination support for large datasets
- Connection pooling for high concurrency
- Query result caching where appropriate

## Development

### Running Tests

```bash
# Unit tests
npm run test:unit src/modules/SuperAdmin

# Integration tests
npm run test:integration src/modules/SuperAdmin

# End-to-end tests
npm run test:e2e superadmin
```

### Development Commands

```bash
# Generate new DTO
nest g class dto/new-dto --no-spec --project=SuperAdmin

# Generate new service method
# Add method to superadmin.service.ts

# Update Swagger docs
npm run build && npm run start:dev
# Visit http://localhost:3000/api for updated docs
```

## Testing the API

### Test Endpoint (No Authentication)

For testing purposes, a non-authenticated endpoint is provided:

```bash
# Test create SuperAdmin
curl -X POST http://localhost:3000/test-superadmin \
  -H "Content-Type: application/json" \
  -d @example-request.json
```

### Example Request (example-request.json)

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

### Production Endpoints

Once you have a SuperAdmin account, you can use the authenticated endpoints:

```bash
# Get JWT token first by logging in
# Then use the protected endpoints
curl -X POST http://localhost:3000/superadmin \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d @example-request.json
```

## Contributing

1. Follow existing code patterns and naming conventions
2. Add comprehensive tests for new features
3. Update DTOs and Swagger documentation
4. Ensure proper error handling and logging
5. Test with various user roles and permissions

## Troubleshooting

### Common Issues

1. **Module not found errors**: Ensure proper imports and circular dependencies are avoided
2. **Database connection issues**: Check `PrimaryDatabaseService` configuration
3. **Authentication failures**: Verify JWT configuration and token format
4. **Permission denied**: Ensure user has SUPER_ADMIN role

### Debug Tips

- Enable debug logging: `LOG_LEVEL=debug`
- Check database queries: Enable Prisma query logging
- Verify JWT tokens: Use jwt.io to decode tokens
- Test API endpoints: Use Swagger UI at `/api`

## License

This module is part of the main application and follows the same license terms.
