# ShamBit Admin Portal

A React-based web application for managing the ShamBit quick-commerce platform.

## Features

### Core Features
- **Authentication**: Secure login with username/password and JWT tokens
- **Session Management**: Auto-logout after 60 minutes of inactivity
- **Protected Routes**: Route-based access control
- **Material-UI**: Modern and responsive user interface
- **Redux Toolkit**: State management for authentication and app data
- **TypeScript**: Type-safe development experience

### Management Features
- **Product Catalog**: Products, categories, brands, and offers
- **Simple Inventory**: Basic stock quantity tracking
- **Order Management**: View and manage customer orders
- **Delivery Management**: Assign orders to delivery personnel (integrated)
- **Promotions**: Create and manage promotional codes
- **Notifications**: Send push notifications to customers

### Simplified Approach
This admin portal has been simplified to focus on core operations:
- ❌ No batch/lot inventory tracking
- ❌ No analytics dashboards (use simple operational reports)
- ❌ No warehouse management (single location)
- ❌ No separate delivery app (delivery managed here)
- ✅ Fast, focused, and easy to use

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Styling**: Emotion (CSS-in-JS)

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Backend API running on `http://localhost:3000`
- Database seeded with admin user

### Installation

```bash
# Install dependencies
npm install
```

### Default Login Credentials

After seeding the database, use these credentials to login:

```
Username: admin
Password: Admin@123
```

⚠️ **Change this password after first login in production!**

See [LOGIN_CREDENTIALS.md](./LOGIN_CREDENTIALS.md) for detailed setup instructions.

### Environment Configuration

Copy the environment example file and configure your API endpoint:

```bash
cp .env.example .env
```

Edit `.env` and set your API base URL:

```
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

### Development

```bash
# Start development server
npm run dev
```

The application will be available at `http://localhost:3001`

### Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── ProtectedRoute.tsx
├── features/           # Feature-based modules
│   ├── auth/          # Authentication features
│   └── dashboard/     # Dashboard features
├── hooks/             # Custom React hooks
├── services/          # API services
├── store/             # Redux store and slices
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── App.tsx            # Main application component
└── main.tsx           # Application entry point
```

## Authentication Flow

1. User enters username and password on login page
2. Credentials are sent to the backend API
3. On successful authentication, JWT tokens are stored in HTTP-only cookies
4. Session timer starts (60 minutes)
5. Protected routes check authentication status
6. Auto-logout occurs on session expiry or user inactivity

## Security Features

- HTTP-only cookies for secure token storage
- Automatic session timeout (60 minutes)
- Protected routes with authentication checks
- Input validation and error handling
- CSRF protection through cookie-based authentication

## API Integration

The admin portal communicates with the backend API using Axios with the following configuration:

- Base URL: Configurable via environment variables
- Credentials: Included for cookie-based authentication
- Interceptors: Handle authentication errors and token refresh
- Error handling: Centralized error processing

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run clean` - Clean build artifacts and node_modules