# Promotions Feature

## Overview
This feature provides comprehensive promotion and discount code management for the ShamBit admin portal.

## Components

### PromotionsPage
Main page for managing promotional discount codes with the following features:
- List all promotions with filtering and search
- Create new promotions
- Edit existing promotions
- Toggle promotion active/inactive status
- View promotion usage statistics
- Delete promotions
- Copy promotion codes to clipboard

### PromotionFormDialog
Dialog component for creating and editing promotions with validation:
- Promotion code (uppercase letters and numbers only)
- Description
- Discount type (percentage or fixed amount)
- Discount value
- Minimum order value (optional)
- Maximum discount amount (optional for percentage discounts)
- Total usage limit (optional)
- Per user limit (optional)
- Start and end dates
- Active/inactive toggle

### PromotionStatsDialog
Dialog component for viewing detailed promotion statistics:
- Total usage count
- Total discount amount given
- Number of unique users
- Average discount per use
- Recent usage history with order and user details

## State Management
- Redux slice: `promotionSlice`
- Service: `promotionService`
- Types: `promotion.ts`

## API Endpoints
- `GET /api/v1/promotions` - List promotions with filters
- `GET /api/v1/promotions/:id` - Get promotion details
- `POST /api/v1/promotions` - Create promotion
- `PUT /api/v1/promotions/:id` - Update promotion
- `DELETE /api/v1/promotions/:id` - Delete promotion
- `GET /api/v1/promotions/:id/usage` - Get promotion usage history

## Requirements Fulfilled
- FR-11.1: Promotion management with CRUD operations
- FR-11.2: Promotion validation and usage tracking
