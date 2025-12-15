# ShamBit - A bit of goodness in every deal

ShamBit is a new marketplace platform connecting verified food sellers with conscious buyers. Our platform focuses on quality, verification, and building trust from day one with fresh, reliable food products delivered with care.

## 🚀 Features

### For Buyers
- **Verified Sellers**: All sellers are thoroughly verified for quality and reliability
- **Fresh Products**: Direct sourcing from trusted growers and suppliers
- **Quality Assurance**: Every item passes strict quality tests
- **Swift Delivery**: Fast and reliable delivery to your doorstep
- **Mobile App**: Native Android app for seamless shopping experience

### For Sellers
- **Easy Registration**: Simple onboarding process with verification
- **Zero Commission**: No commission for the first 3 months
- **Professional Support**: Dedicated onboarding and support team
- **Analytics Dashboard**: Track your sales and performance
- **Inventory Management**: Efficient stock management tools

### For Admins
- **Comprehensive Dashboard**: Real-time statistics and analytics
- **Seller Management**: Approve, reject, or manage seller applications
- **Customer Management**: Monitor and manage customer accounts
- **Order Tracking**: Complete order lifecycle management
- **Reports & Analytics**: Detailed business insights and reports

## 🏗️ Architecture

This is a monorepo containing:

- **Website** (`/Website`): React-based landing page and seller registration
- **Mobile App** (`/mobile_app`): Native Android app built with Kotlin
- **API Service** (`/services/api`): Node.js/Express backend API
- **Admin Portal** (`/services/admin-portal`): React-based admin dashboard
- **Database** (`/packages/database`): PostgreSQL with Knex.js migrations
- **Shared Packages** (`/packages`): Common utilities and configurations

## 🛠️ Tech Stack

### Frontend
- **Website**: React 19, TypeScript, Tailwind CSS, Framer Motion
- **Admin Portal**: React 18, Material-UI, Redux Toolkit, TypeScript
- **Mobile App**: Kotlin, Jetpack Compose, Android Architecture Components

### Backend
- **API**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Knex.js
- **Authentication**: JWT tokens
- **File Storage**: Local storage with Sharp for image optimization
- **Caching**: Node-cache for performance

### DevOps & Deployment
- **Containerization**: Docker & Docker Compose
- **CI/CD**: Turbo for monorepo management
- **Deployment**: Railway, Render, Netlify support
- **Monitoring**: Winston logging, performance monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Android Studio (for mobile development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd shambit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   cd packages/database
   npm run migrate
   npm run seed
   ```

5. **Start development servers**
   ```bash
   # Start all services
   npm run dev

   # Or start individual services
   npm run dev:api      # API server
   npm run dev:admin    # Admin portal
   npm run dev:website  # Website
   ```

### Development URLs
- **Website**: http://localhost:5173
- **Admin Portal**: http://localhost:5174
- **API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/docs

## 📱 Mobile App Development

### Setup
1. Open Android Studio
2. Open the `mobile_app` directory
3. Sync Gradle files
4. Run on emulator or device

### Key Features
- **Authentication**: OTP-based login
- **Product Catalog**: Browse categories and products
- **Shopping Cart**: Add/remove items, manage quantities
- **Order Management**: Place orders, track delivery
- **Profile Management**: Update user information and addresses

## 🔧 API Documentation

### Authentication
```bash
POST /api/auth/login
POST /api/auth/verify-otp
POST /api/auth/refresh
```

### Seller Management
```bash
POST /api/sellers/register          # Register new seller
GET /api/sellers                    # Get sellers (admin)
GET /api/sellers/:id                # Get seller details
PUT /api/sellers/:id/status         # Update seller status
GET /api/sellers/statistics/overview # Get seller statistics
```

### Customer Management
```bash
GET /api/admin/customers            # Get customers
GET /api/admin/customers/:id        # Get customer details
PUT /api/admin/customers/:id/block  # Block customer
PUT /api/admin/customers/:id/unblock # Unblock customer
GET /api/admin/customers/statistics # Get customer statistics
```

### Products & Orders
```bash
GET /api/products                   # Get products
POST /api/products                  # Create product (admin)
GET /api/orders                     # Get orders
POST /api/orders                    # Create order
PUT /api/orders/:id/status          # Update order status
```

## 🎨 Admin Portal Features

### Dashboard
- **Real-time Statistics**: Sellers, customers, orders, revenue
- **Visual Analytics**: Charts and graphs for business insights
- **Quick Actions**: Pending approvals, blocked customers alerts
- **Performance Metrics**: Growth trends and KPIs

### Seller Management
- **Registration Approval**: Review and approve seller applications
- **Status Management**: Approve, reject, or suspend sellers
- **Business Analytics**: Track seller performance and distribution
- **Communication**: Add notes and manage seller relationships

### Customer Management
- **User Overview**: Complete customer profiles and history
- **Account Management**: Block/unblock accounts, verification status
- **Order History**: View customer purchase patterns
- **Support Tools**: Add notes, track customer interactions

## 🚀 Deployment

### Using Docker
```bash
# Build and run all services
docker-compose up --build

# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

### Individual Service Deployment

#### Website (Netlify)
```bash
cd Website
npm run build
netlify deploy --prod
```

#### API (Railway/Render)
```bash
cd services/api
npm run build
# Deploy using platform-specific commands
```

#### Admin Portal
```bash
cd services/admin-portal
npm run build:prod
# Deploy to your hosting platform
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run API tests
npm run test:api

# Run with coverage
npm run test:coverage
```

## 📊 Monitoring & Analytics

### Logging
- **Winston**: Structured logging with daily rotation
- **Request Logging**: Morgan middleware for HTTP requests
- **Error Tracking**: Comprehensive error logging and reporting

### Performance
- **Database Monitoring**: Query performance and connection pooling
- **API Metrics**: Response times, error rates, throughput
- **Caching**: Redis-compatible caching for improved performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation as needed
- Follow the existing code style and conventions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- **Email**: support@shambit.com
- **Documentation**: [docs.shambit.com](https://docs.shambit.com)
- **Issues**: GitHub Issues for bug reports and feature requests

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Basic marketplace functionality
- ✅ Seller registration and verification
- ✅ Admin portal with analytics
- ✅ Mobile app MVP

### Phase 2 (Next)
- 🔄 Payment gateway integration
- 🔄 Advanced analytics and reporting
- 🔄 Multi-language support
- 🔄 Push notifications

### Phase 3 (Future)
- 📋 AI-powered recommendations
- 📋 Advanced inventory management
- 📋 Seller performance analytics
- 📋 Customer loyalty programs

---

**ShamBit** - Bringing goodness to every deal, one verified seller at a time. 🌟