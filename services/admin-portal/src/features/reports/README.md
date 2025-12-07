# Reports Feature

## Overview
The Reports feature provides admin users with essential business insights through sales, revenue, and product performance reports.

## Components

### ReportsPage
Main page component that orchestrates the reports interface with:
- Date range selector with predefined periods
- Tabbed interface for different report types
- Loading and error states
- Export notifications

### DateRangeSelector
Allows users to select date ranges using:
- Predefined periods (Today, Last 7 Days, Last 30 Days, This Month, Last Month)
- Custom date range picker
- Date validation
- Debounced updates (500ms)

### SalesReportTab
Displays sales metrics including:
- Total orders, completed orders, average order value, unique customers
- Bar chart showing orders by status
- CSV export functionality
- Empty state handling

### RevenueReportTab
Shows revenue breakdown with:
- Total, gross, and net revenue metrics
- Payment method breakdown (COD vs Online)
- Tax, delivery fees, and discounts
- Bar chart for revenue visualization
- CSV export functionality

### ProductsReportTab
Presents top-selling products:
- Top 10 products by quantity sold
- Top 10 products by revenue
- Side-by-side bar charts
- Product details on hover
- CSV export functionality
- Empty state for no products sold

## Redux State Management

### reportsSlice
Manages:
- Sales, revenue, and products report data
- Date range filters and period selection
- Loading states for each report type
- Error handling
- CSV export actions

## Services

### reportsService
API service for:
- Fetching sales, revenue, and products reports
- Exporting reports to CSV
- Handling API responses

## Types

### reports.ts
TypeScript interfaces for:
- SalesReport, RevenueReport, TopProductsReport
- ReportFilters, ReportPeriod
- TopProduct

## Features

- **Date Range Selection**: Predefined periods and custom date ranges
- **Real-time Updates**: Debounced date changes trigger automatic report refresh
- **Visual Charts**: Simple bar charts using Recharts library
- **CSV Export**: Download reports for external analysis
- **Empty States**: Proper handling when no data is available
- **Loading States**: Visual feedback during data fetching
- **Error Handling**: User-friendly error messages
- **Responsive Design**: Works on desktop and mobile devices

## Navigation

The Reports page is accessible from the sidebar navigation under "Overview" section, right after the Dashboard.

## API Endpoints

- `GET /api/v1/admin/reports/sales` - Get sales report
- `GET /api/v1/admin/reports/revenue` - Get revenue report
- `GET /api/v1/admin/reports/products` - Get top products report
- `GET /api/v1/admin/reports/sales/export` - Export sales report CSV
- `GET /api/v1/admin/reports/revenue/export` - Export revenue report CSV
- `GET /api/v1/admin/reports/products/export` - Export products report CSV

## Usage

1. Navigate to Reports from the sidebar
2. Select a date range using predefined periods or custom dates
3. Switch between Sales, Revenue, and Products tabs
4. View metrics and charts
5. Export reports to CSV using the "Export to CSV" button
