# Admin Management Testing Guide

## Prerequisites

1. Backend API running on http://localhost:3000
2. Admin Portal running on http://localhost:5173
3. Super admin account credentials

## Test Scenarios

### Scenario 1: Access Control

**Objective:** Verify that only super admins can access admin management

**Steps:**
1. Log in with a non-super admin account (e.g., order_manager)
2. Check the sidebar navigation
3. **Expected:** "Admin Management" menu item should NOT be visible
4. Try to access `/admins` directly via URL
5. **Expected:** Permission denied message should be displayed

**Steps:**
1. Log in with a super admin account
2. Check the sidebar navigation
3. **Expected:** "Admin Management" menu item SHOULD be visible
4. Click on "Admin Management"
5. **Expected:** Admin list page should load successfully

### Scenario 2: Create New Admin

**Objective:** Create a new admin user with proper validation

**Steps:**
1. Log in as super admin
2. Navigate to Admin Management
3. Click "Add Admin" button
4. **Test validation:**
   - Try to submit empty form → Should show validation errors
   - Enter username: `testadmin`
   - Enter weak password: `test` → Should show password complexity error
   - Enter valid password: `TestAdmin123!`
   - Enter name: `Test Admin`
   - Enter invalid email: `invalid` → Should show email format error
   - Enter valid email: `testadmin@example.com`
   - Select role: `Order Manager`
5. Click "Create"
6. **Expected:** 
   - Success message
   - New admin appears in the list
   - Dialog closes

### Scenario 3: Edit Existing Admin

**Objective:** Update admin user information

**Steps:**
1. Log in as super admin
2. Navigate to Admin Management
3. Find the admin created in Scenario 2
4. Click the edit icon (pencil)
5. **Verify:**
   - Username field is disabled (cannot change username)
   - Password field is not shown (use Change Password instead)
   - Current values are pre-filled
6. Update name to: `Test Admin Updated`
7. Update email to: `testadmin.updated@example.com`
8. Change role to: `Inventory Manager`
9. Click "Update"
10. **Expected:**
    - Success message
    - Updated values appear in the list
    - Dialog closes

### Scenario 4: Toggle Admin Status

**Objective:** Activate/deactivate admin users

**Steps:**
1. Log in as super admin
2. Navigate to Admin Management
3. Find the admin created in Scenario 2
4. Click the edit icon
5. Toggle the "Active" switch to OFF
6. Click "Update"
7. **Expected:**
   - Admin status shows "Inactive" chip in the list
8. Edit again and toggle back to ON
9. **Expected:**
   - Admin status shows "Active" chip in the list

### Scenario 5: Change Admin Password

**Objective:** Change password with proper validation

**Steps:**
1. Log in as super admin
2. Navigate to Admin Management
3. Find any admin user
4. Click the lock icon (Change Password)
5. **Test validation:**
   - Enter weak password: `test` → Should show complexity error
   - Enter valid password: `NewPassword123!`
   - Enter different confirmation: `Different123!` → Should show mismatch error
   - Enter matching confirmation: `NewPassword123!`
6. Click "Change Password"
7. **Expected:**
   - Success message
   - Dialog closes after 2 seconds
8. **Verify:** Try logging in with the new password (if it's your test account)

### Scenario 6: View Audit Logs

**Objective:** View and filter admin action audit logs

**Steps:**
1. Log in as super admin
2. Navigate to Admin Management
3. Click "View Audit Logs" button
4. **Verify:**
   - Audit logs are displayed in a table
   - Recent actions from previous scenarios should be visible
   - Actions include: CREATE_ADMIN, UPDATE_ADMIN, CHANGE_ADMIN_PASSWORD
5. Click the expand icon on any log entry
6. **Expected:**
   - Detailed information is shown:
     - Full resource ID
     - User agent
     - IP address
     - JSON changes (if applicable)

### Scenario 7: Filter Audit Logs

**Objective:** Filter audit logs by various criteria

**Steps:**
1. In the Audit Log Viewer dialog
2. Enter action filter: `CREATE_ADMIN`
3. Click "Apply Filters"
4. **Expected:** Only CREATE_ADMIN actions are shown
5. Click "Clear Filters"
6. **Expected:** All logs are shown again
7. Enter resource type filter: `admin`
8. Click "Apply Filters"
9. **Expected:** Only admin-related actions are shown

### Scenario 8: Self-Protection

**Objective:** Verify admins cannot edit their own account

**Steps:**
1. Log in as super admin
2. Navigate to Admin Management
3. Find your own admin account in the list
4. **Expected:** Edit button should be disabled for your own account
5. Try to edit another admin account
6. **Expected:** Edit button should be enabled

## API Testing

### Using cURL or Postman

**Get Access Token:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123"
  }'
```

**List All Admins:**
```bash
curl -X GET http://localhost:3000/api/v1/admins \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Create Admin:**
```bash
curl -X POST http://localhost:3000/api/v1/admins \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newadmin",
    "password": "SecurePass123!",
    "name": "New Admin",
    "email": "newadmin@example.com",
    "role": "order_manager"
  }'
```

**Update Admin:**
```bash
curl -X PUT http://localhost:3000/api/v1/admins/ADMIN_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "email": "updated@example.com",
    "role": "inventory_manager",
    "isActive": true
  }'
```

**Change Password:**
```bash
curl -X PUT http://localhost:3000/api/v1/admins/ADMIN_ID/password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "NewSecurePass123!"
  }'
```

**Get Audit Logs:**
```bash
curl -X GET "http://localhost:3000/api/v1/auth/admin/audit-logs?limit=50&action=CREATE_ADMIN" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Expected Results Summary

| Test Scenario | Expected Result |
|--------------|----------------|
| Non-super admin access | Menu hidden, permission denied |
| Super admin access | Menu visible, page loads |
| Create admin with validation | Validation errors shown, success on valid data |
| Edit admin | Values updated, username cannot change |
| Toggle status | Status chip updates correctly |
| Change password | Password updated, validation enforced |
| View audit logs | Logs displayed with details |
| Filter audit logs | Filtered results shown |
| Self-protection | Cannot edit own account |

## Troubleshooting

### Issue: "Admin Management" menu not visible
- **Solution:** Ensure you're logged in as a super admin (role: 'super_admin')

### Issue: Permission denied error
- **Solution:** Check that your admin account has 'super_admin' role in the database

### Issue: Audit logs not showing
- **Solution:** Perform some admin actions first (create, edit, etc.) to generate logs

### Issue: Password validation failing
- **Solution:** Ensure password meets all requirements:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 number
  - At least 1 special character

### Issue: Cannot create admin
- **Solution:** Check backend logs for detailed error messages
- Verify database connection
- Ensure username is unique

## Database Verification

To verify data in the database:

```sql
-- View all admins
SELECT id, username, name, email, role, is_active, last_login_at, created_at 
FROM admins 
ORDER BY created_at DESC;

-- View recent audit logs
SELECT id, admin_id, action, resource_type, resource_id, created_at 
FROM admin_audit_logs 
ORDER BY created_at DESC 
LIMIT 20;

-- View audit logs for specific admin
SELECT * FROM admin_audit_logs 
WHERE admin_id = 'YOUR_ADMIN_ID' 
ORDER BY created_at DESC;
```

## Success Criteria

All tests pass if:
- ✅ Only super admins can access admin management
- ✅ New admins can be created with proper validation
- ✅ Existing admins can be edited
- ✅ Admin status can be toggled
- ✅ Passwords can be changed with validation
- ✅ Audit logs are visible and filterable
- ✅ Admins cannot edit their own account
- ✅ All actions are logged in audit trail
- ✅ No console errors or warnings
- ✅ UI is responsive and user-friendly
