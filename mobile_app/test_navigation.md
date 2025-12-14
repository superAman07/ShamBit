# Navigation Test Plan

## Test Case 1: Parent Category Navigation
**Given:** User is on Home screen  
**When:** User taps "Dry Fruits" category  
**Then:** App should navigate to CategoryDetailScreen  
**And:** Screen should show subcategories like "Almonds", "Cashews", etc.

## Test Case 2: Subcategory Navigation  
**Given:** User is on CategoryDetailScreen for "Dry Fruits"  
**When:** User taps "Almonds" subcategory  
**Then:** App should navigate to CategoryProductsScreen  
**And:** Screen should show almond products

## API Endpoints Used:
1. `GET /categories` - Home screen (parent categories)
2. `GET /categories/{id}` - Category details  
3. `GET /categories/{id}/subcategories` - Subcategories list
4. `GET /products?categoryId={id}` - Products in category

## Expected Flow:
Home → CategoryDetail → CategoryProducts → ProductDetail