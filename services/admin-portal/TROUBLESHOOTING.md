# Admin Portal - Seller Management Troubleshooting

## Common Issues and Solutions

### 1. "Cannot read properties of null (reading 'city')" Error

**Problem**: This error occurs when the admin portal tries to display seller data that doesn't have the new comprehensive data structure.

**Solution**:
1. **Run Database Migration**: Execute the migration script to update existing seller records:
   ```sql
   -- Navigate to services/api/database/migrations/
   \i update_sellers_table.sql
   ```

2. **Check Data Format**: The error boundary will now catch these issues and display helpful information.

3. **Verify API Response**: Ensure the API is returning properly formatted seller data.

### 2. Seller Data Shows "Not Provided" or "Legacy"

**Problem**: Existing sellers don't have the new comprehensive registration fields.

**Solution**:
- This is expected behavior for sellers registered before the update
- The migration utility automatically handles backward compatibility
- Legacy sellers will show "Legacy" as seller type and "Not provided" for missing fields
- Encourage sellers to update their profiles with complete information

### 3. Statistics Not Loading

**Problem**: Seller statistics dashboard shows errors or empty data.

**Solution**:
1. Check if the API endpoint `/api/sellers/statistics/overview` is accessible
2. Verify database has seller records
3. Check browser console for API errors
4. Ensure proper authentication tokens

### 4. Document Upload/Download Issues

**Problem**: Document management features not working properly.

**Solution**:
1. Verify file upload service is configured
2. Check document storage permissions
3. Ensure proper API endpoints for document handling
4. Verify file paths in database are accessible

### 5. Verification Actions Not Working

**Problem**: Approve/Reject/Hold actions fail or don't update status.

**Solution**:
1. Check API endpoint `/api/sellers/:id/verify` is working
2. Verify admin has proper permissions
3. Check database constraints and triggers
4. Ensure notification service is configured for sending credentials

## Data Migration Notes

### Backward Compatibility
The system now supports both legacy and new seller data formats:

**Legacy Format** (old sellers):
- Uses `ownerName`, `phone`, `businessName`, `city`
- Limited fields available
- Automatically migrated to new format for display

**New Format** (comprehensive registration):
- Complete personal, business, and operational information
- Full address and document management
- Enhanced verification workflow

### Migration Utility
The `sellerDataMigration.ts` utility handles:
- Automatic detection of legacy vs new data formats
- Seamless transformation for UI compatibility
- Fallback values for missing information
- Consistent display across all components

## Error Boundary Features

The seller error boundary provides:
- Graceful error handling for data issues
- Helpful troubleshooting suggestions
- Retry mechanisms for temporary issues
- Detailed error information for debugging

## API Compatibility

### Endpoints Updated:
- `POST /api/sellers/register` - Now accepts comprehensive registration data
- `PUT /api/sellers/:id/verify` - New verification workflow
- `POST /api/sellers/:id/documents` - Document management

### Endpoints Maintained:
- `GET /api/sellers` - Enhanced with new fields, backward compatible
- `GET /api/sellers/:id` - Returns comprehensive data with fallbacks
- `PUT /api/sellers/:id/status` - Legacy status update (still works)

## Performance Considerations

### Database Indexes
The migration script adds indexes for:
- Mobile number lookups
- Email searches
- Status filtering
- Date-based queries
- Geographic grouping

### Caching Recommendations
Consider implementing caching for:
- Seller statistics (refresh every 15 minutes)
- Document metadata (refresh on upload)
- Geographic distribution data (refresh daily)

## Security Notes

### Data Protection
- Sensitive data (Aadhaar, account numbers) are masked in UI
- Document access requires proper authentication
- All verification actions are logged with admin details

### Access Control
- Only authenticated admins can access seller management
- Document downloads are secured with proper authorization
- Verification actions require admin-level permissions

## Monitoring and Logging

### Key Metrics to Monitor
- Seller registration completion rates
- Verification processing times
- Document upload success rates
- API response times for seller operations

### Log Files to Check
- API server logs for seller-related errors
- Database query logs for performance issues
- File upload service logs for document issues
- Authentication service logs for access problems

## Getting Help

If issues persist after following this guide:
1. Check browser console for detailed error messages
2. Review API server logs for backend issues
3. Verify database connectivity and data integrity
4. Contact the development team with specific error details