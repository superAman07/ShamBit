# Delivery Management Feature Overview

## Quick Start

Navigate to `/delivery` in the admin portal to access the Delivery Management interface.

## Main Interface

### Status Overview Dashboard
At the top of the page, you'll see four key metrics cards:
- **Active Deliveries**: Total count with breakdown (assigned, picked up, in transit)
- **Total Personnel**: Total number of delivery personnel in the system
- **Available Personnel**: Count of personnel ready for assignments
- **Busy Personnel**: Count of personnel currently on deliveries

### Two Main Tabs

#### 1. Personnel List Tab
The default view showing all delivery personnel.

**Filter Options:**
- All: Show all personnel
- Active Only: Show only active personnel
- Available Only: Show only available personnel

**Table Columns:**
- Name
- Contact (mobile number and email)
- Vehicle (type and number)
- Status (Active/Inactive badge)
- Availability (Available/Busy badge)
- Actions (Metrics, Edit, Delete buttons)

**Actions:**
- **Add Personnel**: Click the "Add Personnel" button in the header
- **View Metrics**: Click the metrics icon to see performance dashboard
- **Edit**: Click the edit icon to modify personnel details
- **Delete**: Click the delete icon (with confirmation)

#### 2. Active Deliveries Tab
Shows all currently active deliveries in real-time.

**Table Columns:**
- Order Number
- Delivery Personnel (name and contact)
- Status (color-coded badge)
- Pickup Location
- Delivery Location
- Distance (in km)
- Assigned At (timestamp)
- Actions (View Details, Reassign)

**Actions:**
- **View Details**: See complete delivery information
- **Reassign**: Transfer delivery to different personnel

## Dialogs and Forms

### Add/Edit Personnel Dialog
**Fields:**
- Name* (required)
- Mobile Number* (required, validated format)
- Email (optional, validated format)
- Vehicle Type (dropdown: Bike, Scooter, Bicycle)
- Vehicle Number (optional)
- Active (toggle switch)
- Available (toggle switch)

### Reassign Delivery Dialog
**Shows:**
- Order number
- Current assignment details
- Current delivery status

**Action:**
- Select new personnel from dropdown
- Dropdown shows all active personnel with their status
- Cannot reassign to the same personnel

### Performance Metrics Dialog
**Displays:**
- Total Deliveries (count)
- Completed Deliveries (count with failed count)
- Average Delivery Time (formatted as hours/minutes)
- Success Rate (percentage)
- Average Distance (km)
- On-Time Delivery Rate (percentage)
- Customer Rating (if available, out of 5.0)

## Status Color Coding

### Delivery Status
- **Assigned**: Blue (info)
- **Picked Up**: Blue (primary)
- **In Transit**: Purple (secondary)
- **Delivered**: Green (success)
- **Failed**: Red (error)

### Personnel Status
- **Active**: Green badge with checkmark
- **Inactive**: Gray badge with X

### Availability
- **Available**: Green badge
- **Busy**: Orange badge

## Common Workflows

### Adding New Delivery Personnel
1. Click "Add Personnel" button
2. Fill in required fields (Name, Mobile Number)
3. Optionally add email and vehicle details
4. Set active/available status
5. Click "Create"

### Editing Personnel Information
1. Find personnel in the list
2. Click the edit icon
3. Modify desired fields
4. Click "Update"

### Viewing Performance Metrics
1. Find personnel in the list
2. Click the metrics icon
3. Review performance dashboard
4. Click "Close" when done

### Reassigning a Delivery
1. Switch to "Active Deliveries" tab
2. Find the delivery to reassign
3. Click the reassign icon
4. Select new personnel from dropdown
5. Click "Reassign"

### Deleting Personnel
1. Find personnel in the list
2. Click the delete icon
3. Confirm deletion in the popup
4. Personnel is removed from the system

## Pagination

The personnel list supports pagination:
- Default: 50 items per page
- Options: 10, 25, 50, 100 items per page
- Use the pagination controls at the bottom of the table

## Error Handling

- **Network Errors**: Red alert banner with error message
- **Validation Errors**: Red text under invalid fields
- **Action Failures**: Error message in dialog
- **Empty States**: Friendly "No data" messages

## Responsive Design

The interface adapts to different screen sizes:
- **Desktop**: Full table view with all columns
- **Tablet**: Optimized layout with essential columns
- **Mobile**: Stacked card view (future enhancement)

## Keyboard Shortcuts

- **Esc**: Close any open dialog
- **Tab**: Navigate between form fields
- **Enter**: Submit forms (when focused on input)

## Tips

1. **Filter First**: Use filters to quickly find specific personnel
2. **Check Availability**: Before reassigning, check personnel availability
3. **Review Metrics**: Regularly check performance metrics to identify top performers
4. **Keep Info Updated**: Ensure contact details and vehicle info are current
5. **Monitor Active Deliveries**: Use the Active Deliveries tab for real-time monitoring

## Integration Points

This feature integrates with:
- **Order Management**: Deliveries are linked to orders
- **Analytics**: Performance data feeds into analytics
- **Notifications**: Status changes trigger notifications
- **Audit Logs**: All actions are logged for compliance

## API Dependencies

Requires the following backend endpoints to be operational:
- `/api/v1/delivery/personnel` (CRUD operations)
- `/api/v1/delivery/active` (active deliveries)
- `/api/v1/delivery/status-overview` (dashboard stats)
- `/api/v1/delivery/:id/reassign` (reassignment)

## Troubleshooting

**Personnel not appearing?**
- Check if filters are applied
- Verify backend API is running
- Check browser console for errors

**Cannot reassign delivery?**
- Ensure delivery is not already delivered/failed
- Verify personnel is active
- Check network connection

**Metrics not loading?**
- Verify personnel has delivery history
- Check API endpoint availability
- Refresh the page

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API connectivity
3. Review implementation summary document
4. Contact development team
