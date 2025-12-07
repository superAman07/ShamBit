# Admin Management Feature

This feature provides comprehensive admin user management capabilities for super admins.

## Features Implemented

### 1. Admin User List
- View all admin users in the system
- Display username, name, email, role, status, last login, and creation date
- Visual indicators for admin roles and active/inactive status
- Restricted to super admin role only

### 2. Create Admin
- Add new admin users with username, password, name, email, and role assignment
- Password complexity validation (min 8 chars, 1 uppercase, 1 number, 1 special char)
- Role selection from available admin roles:
  - Super Admin
  - Order Manager
  - Inventory Manager
  - Delivery Manager
  - Analyst

### 3. Edit Admin
- Update admin user information (name, email, role)
- Toggle admin active/inactive status
- Cannot edit own admin account
- All changes are logged in audit trail

### 4. Change Password
- Change password for any admin user
- Password complexity validation enforced
- Confirmation field to prevent typos
- Success notification on completion

### 5. Audit Log Viewer
- View all admin actions with timestamps
- Filter by action type, resource type, admin, and date range
- Expandable rows showing detailed information:
  - Full resource ID
  - User agent
  - IP address
  - JSON diff of changes made
- Pagination support for large datasets

## Components

### AdminManagementPage
Main page component that orchestrates the admin management interface.

**Location:** `services/admin-portal/src/features/admins/AdminManagementPage.tsx`

**Features:**
- Lists all admin users in a table
- Provides buttons to add new admin, edit existing admin, change password, and view audit logs
- Role-based access control (super admin only)

### AdminFormDialog
Dialog component for creating and editing admin users.

**Location:** `services/admin-portal/src/features/admins/components/AdminFormDialog.tsx`

**Features:**
- Form validation
- Role selection dropdown
- Active/inactive toggle (edit mode only)
- Password field (create mode only)

### ChangePasswordDialog
Dialog component for changing admin passwords.

**Location:** `services/admin-portal/src/features/admins/components/ChangePasswordDialog.tsx`

**Features:**
- Password complexity validation
- Confirmation field
- Success notification

### AuditLogViewer
Dialog component for viewing admin audit logs.

**Location:** `services/admin-portal/src/features/admins/components/AuditLogViewer.tsx`

**Features:**
- Filterable table of audit logs
- Expandable rows for detailed information
- Pagination support

## Backend API Endpoints

All endpoints require super admin authentication.

### GET /api/v1/admins
List all admin users.

**Response:**
```json
{
  "success": true,
  "data": {
    "admins": [
      {
        "id": "uuid",
        "username": "admin",
        "name": "Admin User",
        "email": "admin@example.com",
        "role": "super_admin",
        "isActive": true,
        "lastLoginAt": "2025-10-24T10:30:00Z",
        "createdAt": "2025-10-24T10:30:00Z"
      }
    ]
  }
}
```

### GET /api/v1/admins/:id
Get admin by ID.

### POST /api/v1/admins
Create new admin.

**Request:**
```json
{
  "username": "newadmin",
  "password": "SecurePass123!",
  "name": "New Admin",
  "email": "newadmin@example.com",
  "role": "order_manager"
}
```

### PUT /api/v1/admins/:id
Update admin.

**Request:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "role": "inventory_manager",
  "isActive": true
}
```

### PUT /api/v1/admins/:id/password
Change admin password.

**Request:**
```json
{
  "newPassword": "NewSecurePass123!"
}
```

### GET /api/v1/auth/admin/audit-logs
Get audit logs with filtering.

**Query Parameters:**
- `limit`: Number of logs to return (default: 100)
- `offset`: Offset for pagination (default: 0)
- `adminId`: Filter by admin ID
- `action`: Filter by action type
- `resourceType`: Filter by resource type
- `resourceId`: Filter by resource ID
- `startDate`: Filter by start date
- `endDate`: Filter by end date

## State Management

### Redux Slice
**Location:** `services/admin-portal/src/store/slices/adminSlice.ts`

**State:**
```typescript
{
  admins: AdminUser[]
  currentAdmin: AdminUser | null
  auditLogs: AdminAuditLog[]
  auditLogsPagination: {
    page: number
    pageSize: number
    totalPages: number
    total: number
  }
  loading: boolean
  error: string | null
}
```

**Actions:**
- `fetchAdmins`: Fetch all admins
- `fetchAdminById`: Fetch admin by ID
- `createAdmin`: Create new admin
- `updateAdmin`: Update admin
- `changeAdminPassword`: Change admin password
- `fetchAuditLogs`: Fetch audit logs with filters

## Service Layer

### AdminService
**Location:** `services/admin-portal/src/services/adminService.ts`

Handles all API calls related to admin management.

## Types

### AdminUser
```typescript
interface AdminUser {
  id: string
  username: string
  name: string
  email: string
  role: AdminRole
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt?: string
}
```

### AdminRole
```typescript
type AdminRole = 
  | 'super_admin'
  | 'order_manager'
  | 'inventory_manager'
  | 'delivery_manager'
  | 'analyst'
```

### AdminAuditLog
```typescript
interface AdminAuditLog {
  id: string
  adminId: string
  action: string
  resourceType: string
  resourceId: string
  changes?: Record<string, any>
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}
```

## Security

- All admin management endpoints require super admin role
- Password complexity requirements enforced:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 number
  - At least 1 special character
- All admin actions are logged in audit trail
- Admins cannot edit their own account
- Audit logs are immutable

## Navigation

The "Admin Management" menu item is only visible to super admins. It's configured in:
- `services/admin-portal/src/config/navigation.config.ts`
- Role-based filtering in `services/admin-portal/src/components/layout/DashboardLayout.tsx`

## Testing

To test the admin management feature:

1. Log in as a super admin user
2. Navigate to "Admin Management" in the sidebar
3. Test creating a new admin user
4. Test editing an existing admin user
5. Test changing an admin password
6. Test viewing audit logs
7. Test filtering audit logs

## Requirements Satisfied

This implementation satisfies the following requirements from FR-6.2:

- ✅ Support role-based access control with different permission levels
- ✅ Maintain an audit log of all admin actions with timestamps and user IDs
- ✅ Ensure the audit trail is immutable and cannot be modified by any user
- ✅ Restrict access to critical actions based on admin role permissions
