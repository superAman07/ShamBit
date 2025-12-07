# Admin Dashboard

This directory contains the implementation of the Admin Web Portal Dashboard as specified in task 19.

## Features Implemented

### 1. Main Dashboard Layout with Sidebar Navigation
- **Component**: `DashboardLayout` (`src/components/layout/DashboardLayout.tsx`)
- Responsive sidebar navigation with menu items for all admin sections
- Mobile-friendly drawer that collapses on smaller screens
- Top app bar with user profile menu and logout functionality
- Navigation items: Dashboard, Orders, Products, Inventory, Delivery, Promotions, Analytics

### 2. Sales Metrics Cards
- **Component**: `SalesMetricsCards` (`src/components/dashboard/SalesMetricsCards.tsx`)
- Displays four key metrics:
  - Total Orders
  - Total Revenue (formatted in rupees)
  - Average Order Value (formatted in rupees)
  - Current Period (Daily/Weekly/Monthly)
- Color-coded icons for visual distinction
- Loading and error states
- Responsive grid layout

### 3. Recent Orders Table
- **Component**: `RecentOrdersTable` (`src/components/dashboard/RecentOrdersTable.tsx`)
- Displays the 10 most recent orders
- Shows: Order Number, Status (with color-coded chips), Amount, Date
- Status colors:
  - Confirmed/Preparing: Info (blue)
  - Out for Delivery: Primary (blue)
  - Delivered: Success (green)
  - Canceled/Failed: Error (red)
  - Returned: Warning (orange)
- Loading and error states
- Empty state message

### 4. Low Stock Alerts Section
- **Component**: `LowStockAlerts` (`src/components/dashboard/LowStockAlerts.tsx`)
- Lists products with low inventory
- Shows product name, category, and available stock
- Color-coded chips:
  - Out of stock (0): Red
  - Low stock: Orange
- Warning icon in header
- Loading and error states

### 5. Delivery Status Overview
- **Component**: `DeliveryStatusOverview` (`src/components/dashboard/DeliveryStatusOverview.tsx`)
- Visual overview of delivery statuses:
  - Assigned (orange)
  - Picked Up (light blue)
  - In Transit (blue)
  - Delivered (green)
  - Failed (red)
  - Active (total of assigned + picked up + in transit)
- Icon-based status cards with counts
- Responsive grid layout
- Loading and error states

### 6. Date Range Selector
- **Component**: `DateRangeSelector` (`src/components/dashboard/DateRangeSelector.tsx`)
- Quick range buttons:
  - Today
  - Last 7 Days
  - Last 30 Days
  - Custom (opens date picker dialog)
- Custom date range dialog with start and end date pickers
- Updates sales metrics when date range changes

## State Management

### Redux Slice
- **File**: `src/store/slices/dashboardSlice.ts`
- Manages dashboard state including:
  - Sales metrics
  - Recent orders
  - Low stock products
  - Delivery status overview
  - Date range selection
  - Loading states for each section
  - Error states for each section

### Async Actions
- `fetchSalesMetrics`: Fetches sales data for the selected date range
- `fetchRecentOrders`: Fetches the most recent orders
- `fetchLowStockProducts`: Fetches products with low inventory
- `fetchDeliveryStatusOverview`: Fetches delivery status counts

## Services

### Dashboard Service
- **File**: `src/services/dashboardService.ts`
- Provides methods to fetch dashboard data from the API:
  - `getSalesMetrics(dateRange?)`: Get sales metrics
  - `getRecentOrders(limit)`: Get recent orders
  - `getLowStockProducts(limit)`: Get low stock products
  - `getDeliveryStatusOverview()`: Get delivery status counts

## Types

### Dashboard Types
- **File**: `src/types/dashboard.ts`
- TypeScript interfaces for:
  - `SalesMetrics`: Sales data structure
  - `RecentOrder`: Order data structure
  - `OrderStatus`: Order status enum
  - `LowStockProduct`: Low stock product data
  - `DeliveryStatusOverview`: Delivery status counts
  - `DateRange`: Date range selection

## API Integration

The dashboard integrates with the following backend endpoints:

- `GET /api/v1/analytics/sales`: Sales metrics
- `GET /api/v1/orders/admin/all`: Recent orders
- `GET /api/v1/inventory/low-stock`: Low stock products
- `GET /api/v1/delivery/status-overview`: Delivery status overview

## Usage

The dashboard automatically loads data on mount and provides a refresh button to manually reload all data. The date range selector updates only the sales metrics section.

```typescript
// The DashboardPage component orchestrates all dashboard components
<DashboardLayout>
  <DateRangeSelector />
  <SalesMetricsCards />
  <RecentOrdersTable />
  <LowStockAlerts />
  <DeliveryStatusOverview />
</DashboardLayout>
```

## Responsive Design

- Mobile: Single column layout with collapsible sidebar
- Tablet: Two column layout for some sections
- Desktop: Full multi-column layout with permanent sidebar

## Requirements Satisfied

This implementation satisfies all requirements from FR-10.1:
- ✅ Display daily sales metrics including total orders, revenue, and average order value
- ✅ Display recent orders table with real-time updates capability
- ✅ Create low stock alerts section
- ✅ Add delivery status overview
- ✅ Implement date range selector for metrics
- ✅ Main dashboard layout with sidebar navigation
