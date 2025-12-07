# Product Search and Offers API Fixes

## Issues Fixed

### 1. Product Search 500 Error - Ambiguous Column Reference

**Error**: `column reference "is_active" is ambiguous`

**Root Cause**: The product search query was joining multiple tables (products, categories, brands, inventory) that all have an `is_active` column. When filtering by `is_active`, the database couldn't determine which table's column to use.

**Fix**: Updated all column references in `services/api/src/services/product.service.ts` to explicitly specify the table name:

- `is_active` → `products.is_active`
- `is_sellable` → `products.is_sellable`
- `category_id` → `products.category_id`
- `brand_id` → `products.brand_id`
- `brand` → `products.brand`
- `sku` → `products.sku`
- `barcode` → `products.barcode`
- `tags` → `products.tags`
- `selling_price` → `products.selling_price`
- `name` → `products.name`
- `description` → `products.description`
- `search_keywords` → `products.search_keywords`

### 2. Product Offers 500 Error - NOT NULL Constraint

**Error**: Product offers/banners creation was failing because `product_id` was NOT NULL in the database.

**Root Cause**: The original `product_offers` table migration had `product_id` as a required field, but the application was trying to create banners without specific products (hero banners, promotional banners, etc.).

**Fix**: Created migration `20251206000001_make_product_offers_product_id_nullable.ts` to make `product_id` nullable, allowing banners to exist without being tied to a specific product.

## Files Modified

1. `services/api/src/services/product.service.ts` - Fixed ambiguous column references
2. `packages/database/src/migrations/20251206000001_make_product_offers_product_id_nullable.ts` - New migration to make product_id nullable

## Testing

After restarting your API server, the following should now work:

1. Product search with `isActive` filter: `GET /api/v1/products?search=almonds&pageSize=20&isActive=true`
2. Creating banners without product_id: `POST /api/v1/product-offers`

## Next Steps

Restart your API server to apply the code changes:

```bash
# Stop the current API server if running
# Then restart it
cd services/api
npm run dev
```
