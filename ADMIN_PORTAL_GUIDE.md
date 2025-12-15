# ShamBit Admin Portal - User Guide

## 🚀 Accessing the Admin Portal

**URL**: http://localhost:3001

## 📊 Dashboard Features

### 1. **Standard Dashboard** (`/dashboard`)
- Sales metrics and KPIs
- Recent orders overview
- Low stock alerts
- Delivery status overview
- Date range filtering

### 2. **Enhanced Dashboard** (`/enhanced-dashboard`)
- **Seller Analytics**: Total sellers, pending approvals, status distribution
- **Buyer Analytics**: Total customers, active/blocked users, retention rates
- **Visual Charts**: Pie charts, bar charts for business insights
- **Geographic Data**: Top cities by seller concentration
- **Business Intelligence**: Business type distribution, growth trends

## 👥 User Management

### **Sellers Management** (`/sellers`)

#### **Seller Statistics Overview**
- **Total Sellers**: Complete count of registered sellers
- **Pending Approval**: Sellers awaiting verification
- **Approved Sellers**: Active, verified sellers
- **New This Month**: Recent registrations

#### **Seller Management Features**
- **View All Sellers**: Paginated list with search and filtering
- **Seller Details**: Complete business and contact information
- **Status Management**: 
  - ✅ **Approve**: Verify and activate seller accounts
  - ❌ **Reject**: Decline seller applications with notes
  - ⏸️ **Suspend**: Temporarily disable seller accounts
- **Search & Filter**: By status, city, business type, or search terms
- **Bulk Operations**: Manage multiple sellers efficiently

#### **Seller Information Displayed**
- Business name and type (grocery, organic, packaged)
- Owner name and contact details
- GSTIN (tax registration) if provided
- Registration date and current status
- City and operational area

### **Customers Management** (`/customers`)

#### **Customer Analytics**
- **Total Customers**: All registered buyers
- **Active Customers**: Currently active accounts
- **Blocked Customers**: Suspended accounts
- **New Customers**: Recent registrations (last 30 days)

#### **Customer Management Features**
- **Customer Profiles**: Complete buyer information and history
- **Account Management**: Block/unblock customer accounts
- **Order History**: View customer purchase patterns
- **Verification Status**: Manage customer verification levels
- **Activity Tracking**: Monitor customer engagement

## 📈 Analytics & Reports

### **Visual Analytics Available**
1. **Seller Status Distribution** (Pie Chart)
   - Approved vs Pending vs Rejected vs Suspended

2. **Business Type Distribution** (Bar Chart)
   - Grocery, Organic, Packaged food categories

3. **Geographic Distribution** (Horizontal Bar Chart)
   - Top 5 cities by seller concentration

4. **Customer Status Overview**
   - Active vs Blocked customer ratios
   - Customer retention percentage

### **Key Metrics Tracked**
- **Growth Metrics**: New registrations per month
- **Approval Rates**: Seller verification success rates
- **Geographic Spread**: Market penetration by city
- **Business Mix**: Distribution across food categories

## 🔧 Operations Management

### **Order Management** (`/orders`)
- View all customer orders
- Track order status and delivery
- Manage order lifecycle

### **Inventory Management** (`/inventory`)
- Monitor stock levels
- Low stock alerts
- Inventory adjustments

### **Delivery Management** (`/delivery`)
- Track delivery personnel
- Monitor delivery status
- Optimize delivery routes

## ⚙️ System Administration

### **Admin Management** (`/admins`)
- Manage admin user accounts
- Role-based access control
- Admin activity tracking

### **Settings** (`/settings`)
- System configuration
- Platform settings
- Integration management

## 🎯 Quick Actions & Alerts

### **Dashboard Alerts**
- **Pending Seller Approvals**: Red badge showing count
- **Blocked Customers**: Warning indicators
- **New User Registrations**: Growth notifications

### **Action Items**
- Sellers awaiting approval require immediate attention
- Blocked customers may need review
- Low stock items need restocking

## 📊 How to Monitor Seller & Buyer Activity

### **Daily Operations Checklist**
1. **Check Enhanced Dashboard** for overview metrics
2. **Review Pending Sellers** in seller management
3. **Monitor Customer Activity** in customer management
4. **Check Order Status** in order management
5. **Review System Alerts** for any issues

### **Weekly Review Tasks**
1. **Analyze Growth Trends** using dashboard charts
2. **Review Geographic Expansion** via city distribution
3. **Assess Business Mix** through category analytics
4. **Monitor Customer Retention** rates
5. **Evaluate Seller Performance** metrics

## 🔍 Search & Filter Options

### **Seller Filters**
- **Status**: All, Pending, Approved, Rejected, Suspended
- **Business Type**: Grocery, Organic, Packaged, Other
- **City**: Filter by operational city
- **Search**: Business name, owner name, email, phone

### **Customer Filters**
- **Account Status**: Active, Blocked
- **Verification Status**: Verified, Not Verified, Suspicious
- **Registration Date**: Date range filtering
- **Search**: Name, email, phone number

## 📱 Mobile Responsiveness

The admin portal is fully responsive and works on:
- **Desktop**: Full feature access
- **Tablet**: Optimized layout
- **Mobile**: Essential features accessible

## 🚨 Important Notes

### **Seller Approval Process**
1. New sellers register through the website
2. Applications appear in "Pending" status
3. Admin reviews business details and documentation
4. Admin approves/rejects with optional notes
5. Sellers receive notification of status change

### **Data Security**
- All sensitive data is encrypted
- Admin actions are logged and auditable
- Role-based access ensures data protection

### **Performance Optimization**
- Real-time data updates
- Efficient pagination for large datasets
- Cached statistics for faster loading

---

## 🎉 Getting Started

1. **Access Admin Portal**: Navigate to http://localhost:3001
2. **Login**: Use admin credentials
3. **Explore Enhanced Dashboard**: Get overview of platform metrics
4. **Check Seller Management**: Review pending seller applications
5. **Monitor Customer Activity**: Track buyer engagement
6. **Use Analytics**: Make data-driven decisions

Your ShamBit admin portal provides comprehensive tools to manage and grow your marketplace effectively! 🌟