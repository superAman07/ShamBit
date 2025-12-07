# Product Management Feature

This feature provides comprehensive product and category management capabilities for the ShamBit admin portal.

## Components

### ProductListPage
Main page for viewing and managing products with the following features:
- **Search**: Search products by name
- **Filters**: Filter by category and status (active/inactive)
- **Pagination**: Navigate through large product lists
- **Actions**:
  - Add new product
  - Edit existing product
  - Delete product
  - Toggle product status (activate/deactivate)
  - Bulk upload products via CSV

### ProductFormPage
Form for creating and editing products with:
- **Product Information**: Name, description, category, brand, unit size
- **Pricing**: Price and MRP
- **Images**: Upload multiple product images with preview
- **Status**: Toggle active/inactive status
- **Validation**: Client-side form validation

### CategoryManagement
Interface for managing product categories with:
- **Category List**: View all categories sorted by display order
- **CRUD Operations**: Create, read, update, and delete categories
- **Display Order**: Control the order categories appear in the app
- **Status Management**: Activate/deactivate categories

## State Management

### Redux Slice: `productSlice`
Manages the state for products and categories:

**State:**
- `products`: Array of products
- `categories`: Array of categories
- `selectedProduct`: Currently selected product for editing
- `selectedCategory`: Currently selected category
- `loading`: Loading state
- `error`: Error messages
- `pagination`: Pagination metadata
- `filters`: Current filter settings

**Actions:**
- `fetchProducts`: Fetch products with filters
- `fetchProduct`: Fetch single product by ID
- `createProduct`: Create new product
- `updateProduct`: Update existing product
- `deleteProduct`: Delete product
- `toggleProductStatus`: Activate/deactivate product
- `uploadProductImages`: Upload product images
- `bulkUploadProducts`: Bulk upload via CSV
- `fetchCategories`: Fetch all categories
- `createCategory`: Create new category
- `updateCategory`: Update existing category
- `deleteCategory`: Delete category

## API Service

### ProductService
Handles all product and category API calls:

**Product Endpoints:**
- `GET /api/v1/products` - List products with filters
- `GET /api/v1/products/:id` - Get product details
- `POST /api/v1/products` - Create product
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product
- `POST /api/v1/products/:id/images` - Upload product images
- `POST /api/v1/products/bulk-upload` - Bulk upload products

**Category Endpoints:**
- `GET /api/v1/categories` - List all categories
- `GET /api/v1/categories/:id` - Get category details
- `POST /api/v1/categories` - Create category
- `PUT /api/v1/categories/:id` - Update category
- `DELETE /api/v1/categories/:id` - Delete category
- `POST /api/v1/categories/:id/image` - Upload category image

## Types

### Product
```typescript
interface Product {
  id: string
  categoryId: string
  name: string
  description: string
  brand?: string
  unitSize: string
  price: number
  mrp: number
  imageUrls: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  category?: Category
}
```

### Category
```typescript
interface Category {
  id: string
  name: string
  description?: string
  imageUrl?: string
  displayOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}
```

## Routes

- `/products` - Product list page
- `/products/new` - Create new product
- `/products/:id/edit` - Edit existing product
- `/products/categories` - Category management

## Features Implemented

✅ Product list with search and filters
✅ Product creation form with image upload
✅ Product edit functionality
✅ Category management interface
✅ Bulk product upload via CSV
✅ Product activation/deactivation
✅ Responsive design with Material-UI
✅ Form validation
✅ Error handling
✅ Loading states
✅ Confirmation dialogs for destructive actions

## Usage

### Adding a Product
1. Navigate to `/products`
2. Click "Add Product" button
3. Fill in product details
4. Upload product images (optional)
5. Click "Create Product"

### Editing a Product
1. Navigate to `/products`
2. Click the edit icon on the product row
3. Modify product details
4. Click "Update Product"

### Managing Categories
1. Navigate to `/products`
2. Click "Manage Categories" button
3. Add, edit, or delete categories as needed

### Bulk Upload
1. Navigate to `/products`
2. Click "Bulk Upload" button
3. Select a CSV file with product data
4. Click "Upload"

## CSV Format for Bulk Upload

### Quick Reference
- **Download Template**: Use the "Download CSV Template" button in the bulk upload dialog
- **Required Fields**: name, mrp, sellingPrice
- **Optional Fields**: 20+ additional fields for complete product data
- **Detailed Guide**: See `/docs/PRODUCT_BULK_UPLOAD.md` for complete documentation

### CSV Columns

#### Required Fields
- `name` - Product name (max 255 characters)
- `mrp` - Maximum retail price (must be > 0)
- `sellingPrice` - Selling price (must be > 0 and ≤ MRP)

#### Optional Fields
- `description` - Product description (max 1000 characters)
- `categoryId` - Category UUID
- `brandId` - Brand UUID
- `sku` - Stock Keeping Unit (auto-generated if not provided)
- `barcode` - Product barcode (numbers only)
- `unitSize` - Size/quantity (e.g., "1", "500")
- `unitType` - Unit of measurement (e.g., "L", "kg", "g", "ml", "pcs")
- `taxPercent` - Tax percentage (0-100)
- `discountPercent` - Discount percentage (0-100)
- `weight` - Product weight in grams
- `dimensions` - Product dimensions (e.g., "10x10x20")
- `storageInfo` - Storage instructions
- `ingredients` - Product ingredients
- `nutritionInfo` - Nutritional information
- `shelfLifeDays` - Shelf life in days
- `searchKeywords` - Keywords for search (comma-separated)
- `tags` - Product tags (comma-separated)
- `isFeatured` - true/false (default: false)
- `isReturnable` - true/false (default: true)
- `isSellable` - true/false (default: true)
- `isActive` - true/false (default: true)
- `imageUrls` - Product image URLs (comma-separated)

Example:
```csv
name,description,categoryId,brandId,sku,barcode,unitSize,unitType,mrp,sellingPrice,taxPercent,discountPercent,weight,dimensions,storageInfo,ingredients,nutritionInfo,shelfLifeDays,searchKeywords,tags,isFeatured,isReturnable,isSellable,isActive,imageUrls
Amul Milk 1L,Fresh full cream milk,cat-uuid,brand-uuid,AMUL-MILK-1L,8901430001234,1,L,65,60,0,0,1000,10x10x20,Store in refrigerator,Full cream milk,Protein: 3.5g Fat: 6g per 100ml,5,milk dairy amul,dairy beverage,false,true,true,true,https://example.com/milk.jpg
```

For a complete example with multiple products, see `/docs/product-bulk-upload-example.csv`

## Requirements Fulfilled

This implementation fulfills requirement **FR-7.1** from the requirements document:
- ✅ Admin can add new products with all required fields
- ✅ Admin can update product information and pricing
- ✅ Inventory updates reflect within 5 seconds (handled by backend)
- ✅ Current stock levels displayed with visual indicators
- ✅ Products automatically marked as unavailable when stock reaches zero (handled by backend)
