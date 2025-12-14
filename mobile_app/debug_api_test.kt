// Simple test to verify API connectivity
// Add this to any activity or fragment to test

fun testSubcategoriesAPI() {
    val categoryId = "b46cdcbf-c012-42b7-b3fb-4ab164d5db3b" // Dry Fruits
    val url = "http://192.168.29.45:3000/api/v1/categories/$categoryId/subcategories"
    
    Log.d("API_TEST", "Testing URL: $url")
    
    // This would be the actual API call the app makes
    // Expected response: 9 subcategories for Dry Fruits
}