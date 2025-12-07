export const apiEndpoints = {
  customer: [
    {
      method: 'POST',
      path: '/auth/register',
      description: 'Customer registration',
      auth: 'None',
      parameters: [
        { name: 'email', type: 'string', required: true, description: 'Customer email' },
        { name: 'password', type: 'string', required: true, description: 'Customer password' },
        { name: 'name', type: 'string', required: true, description: 'Customer name' },
        { name: 'phone', type: 'string', required: false, description: 'Customer phone number' }
      ]
    },
    {
      method: 'POST',
      path: '/auth/login',
      description: 'Customer login',
      auth: 'None',
      parameters: [
        { name: 'email', type: 'string', required: true, description: 'Customer email' },
        { name: 'password', type: 'string', required: true, description: 'Customer password' }
      ]
    },
    {
      method: 'GET',
      path: '/products',
      description: 'Get all products for customers',
      auth: 'Bearer Token',
      parameters: [
        { name: 'page', type: 'number', required: false, description: 'Page number' },
        { name: 'limit', type: 'number', required: false, description: 'Items per page' },
        { name: 'category', type: 'string', required: false, description: 'Filter by category' },
        { name: 'search', type: 'string', required: false, description: 'Search term' }
      ]
    },
    {
      method: 'GET',
      path: '/products/:id',
      description: 'Get product details',
      auth: 'Bearer Token',
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'Product ID' }
      ]
    },
    {
      method: 'GET',
      path: '/categories',
      description: 'Get all product categories',
      auth: 'Bearer Token',
      parameters: []
    },
    {
      method: 'GET',
      path: '/brands',
      description: 'Get all brands',
      auth: 'Bearer Token',
      parameters: []
    },
    {
      method: 'POST',
      path: '/orders',
      description: 'Create new order',
      auth: 'Bearer Token',
      parameters: [
        { name: 'items', type: 'array', required: true, description: 'Order items' },
        { name: 'deliveryAddress', type: 'object', required: true, description: 'Delivery address' },
        { name: 'paymentMethod', type: 'string', required: true, description: 'Payment method' }
      ]
    },
    {
      method: 'GET',
      path: '/orders',
      description: 'Get customer orders',
      auth: 'Bearer Token',
      parameters: [
        { name: 'status', type: 'string', required: false, description: 'Filter by status' },
        { name: 'page', type: 'number', required: false, description: 'Page number' }
      ]
    },
    {
      method: 'GET',
      path: '/orders/:id',
      description: 'Get order details',
      auth: 'Bearer Token',
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'Order ID' }
      ]
    },
    {
      method: 'GET',
      path: '/profile',
      description: 'Get customer profile',
      auth: 'Bearer Token',
      parameters: []
    },
    {
      method: 'PUT',
      path: '/profile',
      description: 'Update customer profile',
      auth: 'Bearer Token',
      parameters: [
        { name: 'name', type: 'string', required: false, description: 'Customer name' },
        { name: 'phone', type: 'string', required: false, description: 'Phone number' },
        { name: 'address', type: 'object', required: false, description: 'Address details' }
      ]
    },
    {
      method: 'GET',
      path: '/promotions',
      description: 'Get active promotions',
      auth: 'Bearer Token',
      parameters: []
    },
    {
      method: 'GET',
      path: '/product-offers',
      description: 'Get product offers',
      auth: 'Bearer Token',
      parameters: [
        { name: 'category', type: 'string', required: false, description: 'Filter by category' }
      ]
    }
  ],
  
  delivery: [
    {
      method: 'POST',
      path: '/auth/delivery/login',
      description: 'Delivery personnel login',
      auth: 'None',
      parameters: [
        { name: 'email', type: 'string', required: true, description: 'Delivery personnel email' },
        { name: 'password', type: 'string', required: true, description: 'Password' }
      ]
    },
    {
      method: 'GET',
      path: '/delivery/orders',
      description: 'Get assigned delivery orders',
      auth: 'Bearer Token',
      parameters: [
        { name: 'status', type: 'string', required: false, description: 'Filter by status' }
      ]
    },
    {
      method: 'PUT',
      path: '/delivery/orders/:id/status',
      description: 'Update order delivery status',
      auth: 'Bearer Token',
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'Order ID' },
        { name: 'status', type: 'string', required: true, description: 'New status' },
        { name: 'location', type: 'object', required: false, description: 'Current location' }
      ]
    },
    {
      method: 'POST',
      path: '/delivery/location',
      description: 'Update delivery personnel location',
      auth: 'Bearer Token',
      parameters: [
        { name: 'latitude', type: 'number', required: true, description: 'Latitude' },
        { name: 'longitude', type: 'number', required: true, description: 'Longitude' }
      ]
    },
    {
      method: 'GET',
      path: '/delivery/profile',
      description: 'Get delivery personnel profile',
      auth: 'Bearer Token',
      parameters: []
    },
    {
      method: 'PUT',
      path: '/delivery/profile',
      description: 'Update delivery personnel profile',
      auth: 'Bearer Token',
      parameters: [
        { name: 'name', type: 'string', required: false, description: 'Name' },
        { name: 'phone', type: 'string', required: false, description: 'Phone number' }
      ]
    },
    {
      method: 'POST',
      path: '/delivery/orders/:id/complete',
      description: 'Mark order as delivered',
      auth: 'Bearer Token',
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'Order ID' },
        { name: 'signature', type: 'string', required: false, description: 'Customer signature' },
        { name: 'photo', type: 'string', required: false, description: 'Delivery photo' }
      ]
    }
  ],
  
  admin: [
    {
      method: 'POST',
      path: '/auth/admin/login',
      description: 'Admin login',
      auth: 'None',
      parameters: [
        { name: 'email', type: 'string', required: true, description: 'Admin email' },
        { name: 'password', type: 'string', required: true, description: 'Admin password' }
      ]
    },
    {
      method: 'GET',
      path: '/admins',
      description: 'Get all admins',
      auth: 'Bearer Token (Admin)',
      parameters: []
    },
    {
      method: 'POST',
      path: '/admins',
      description: 'Create new admin',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'email', type: 'string', required: true, description: 'Admin email' },
        { name: 'password', type: 'string', required: true, description: 'Admin password' },
        { name: 'name', type: 'string', required: true, description: 'Admin name' },
        { name: 'role', type: 'string', required: true, description: 'Admin role' }
      ]
    },
    {
      method: 'GET',
      path: '/analytics/dashboard',
      description: 'Get dashboard analytics',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'period', type: 'string', required: false, description: 'Time period' }
      ]
    },
    {
      method: 'GET',
      path: '/analytics/sales',
      description: 'Get sales analytics',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'startDate', type: 'string', required: false, description: 'Start date' },
        { name: 'endDate', type: 'string', required: false, description: 'End date' }
      ]
    }
  ],
  
  products: [
    {
      method: 'GET',
      path: '/products',
      description: 'Get all products (admin)',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'page', type: 'number', required: false, description: 'Page number' },
        { name: 'limit', type: 'number', required: false, description: 'Items per page' },
        { name: 'category', type: 'string', required: false, description: 'Filter by category' }
      ]
    },
    {
      method: 'POST',
      path: '/products',
      description: 'Create new product',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Product name' },
        { name: 'description', type: 'string', required: true, description: 'Product description' },
        { name: 'price', type: 'number', required: true, description: 'Product price' },
        { name: 'categoryId', type: 'string', required: true, description: 'Category ID' },
        { name: 'brandId', type: 'string', required: true, description: 'Brand ID' }
      ]
    },
    {
      method: 'PUT',
      path: '/products/:id',
      description: 'Update product',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'Product ID' },
        { name: 'name', type: 'string', required: false, description: 'Product name' },
        { name: 'description', type: 'string', required: false, description: 'Product description' },
        { name: 'price', type: 'number', required: false, description: 'Product price' }
      ]
    },
    {
      method: 'DELETE',
      path: '/products/:id',
      description: 'Delete product',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'Product ID' }
      ]
    },
    {
      method: 'GET',
      path: '/categories',
      description: 'Get all categories (admin)',
      auth: 'Bearer Token (Admin)',
      parameters: []
    },
    {
      method: 'POST',
      path: '/categories',
      description: 'Create new category',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Category name' },
        { name: 'description', type: 'string', required: false, description: 'Category description' }
      ]
    },
    {
      method: 'GET',
      path: '/brands',
      description: 'Get all brands (admin)',
      auth: 'Bearer Token (Admin)',
      parameters: []
    },
    {
      method: 'POST',
      path: '/brands',
      description: 'Create new brand',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Brand name' },
        { name: 'description', type: 'string', required: false, description: 'Brand description' }
      ]
    }
  ],
  
  orders: [
    {
      method: 'GET',
      path: '/orders',
      description: 'Get all orders (admin)',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'status', type: 'string', required: false, description: 'Filter by status' },
        { name: 'page', type: 'number', required: false, description: 'Page number' },
        { name: 'customerId', type: 'string', required: false, description: 'Filter by customer' }
      ]
    },
    {
      method: 'GET',
      path: '/orders/:id',
      description: 'Get order details (admin)',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'Order ID' }
      ]
    },
    {
      method: 'PUT',
      path: '/orders/:id/status',
      description: 'Update order status',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'Order ID' },
        { name: 'status', type: 'string', required: true, description: 'New status' }
      ]
    },
    {
      method: 'POST',
      path: '/orders/:id/assign-delivery',
      description: 'Assign delivery personnel to order',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'Order ID' },
        { name: 'deliveryPersonnelId', type: 'string', required: true, description: 'Delivery personnel ID' }
      ]
    }
  ],
  
  inventory: [
    {
      method: 'GET',
      path: '/inventory',
      description: 'Get inventory items',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'warehouseId', type: 'string', required: false, description: 'Filter by warehouse' },
        { name: 'productId', type: 'string', required: false, description: 'Filter by product' },
        { name: 'lowStock', type: 'boolean', required: false, description: 'Show only low stock items' }
      ]
    },
    {
      method: 'POST',
      path: '/inventory/restock',
      description: 'Restock inventory',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'productId', type: 'string', required: true, description: 'Product ID' },
        { name: 'warehouseId', type: 'string', required: true, description: 'Warehouse ID' },
        { name: 'quantity', type: 'number', required: true, description: 'Quantity to add' },
        { name: 'batchId', type: 'string', required: false, description: 'Batch ID' }
      ]
    },
    {
      method: 'GET',
      path: '/warehouses',
      description: 'Get all warehouses',
      auth: 'Bearer Token (Admin)',
      parameters: []
    },
    {
      method: 'POST',
      path: '/warehouses',
      description: 'Create new warehouse',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Warehouse name' },
        { name: 'address', type: 'object', required: true, description: 'Warehouse address' },
        { name: 'capacity', type: 'number', required: false, description: 'Warehouse capacity' }
      ]
    },
    {
      method: 'GET',
      path: '/batches',
      description: 'Get product batches',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'productId', type: 'string', required: false, description: 'Filter by product' }
      ]
    }
  ],
  
  analytics: [
    {
      method: 'GET',
      path: '/analytics/sales-report',
      description: 'Get sales report',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'startDate', type: 'string', required: true, description: 'Start date' },
        { name: 'endDate', type: 'string', required: true, description: 'End date' },
        { name: 'groupBy', type: 'string', required: false, description: 'Group by (day/week/month)' }
      ]
    },
    {
      method: 'GET',
      path: '/analytics/inventory-report',
      description: 'Get inventory report',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'warehouseId', type: 'string', required: false, description: 'Filter by warehouse' }
      ]
    },
    {
      method: 'GET',
      path: '/analytics/customer-report',
      description: 'Get customer analytics',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'period', type: 'string', required: false, description: 'Time period' }
      ]
    },
    {
      method: 'GET',
      path: '/performance/metrics',
      description: 'Get performance metrics',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'metric', type: 'string', required: false, description: 'Specific metric' }
      ]
    }
  ],
  
  utilities: [
    {
      method: 'GET',
      path: '/health',
      description: 'Health check endpoint',
      auth: 'None',
      parameters: []
    },
    {
      method: 'POST',
      path: '/upload',
      description: 'Upload file',
      auth: 'Bearer Token',
      parameters: [
        { name: 'file', type: 'file', required: true, description: 'File to upload' },
        { name: 'type', type: 'string', required: false, description: 'File type' }
      ]
    },
    {
      method: 'GET',
      path: '/location/search',
      description: 'Search locations',
      auth: 'Bearer Token',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Search query' },
        { name: 'limit', type: 'number', required: false, description: 'Result limit' }
      ]
    },
    {
      method: 'POST',
      path: '/notifications/send',
      description: 'Send notification',
      auth: 'Bearer Token (Admin)',
      parameters: [
        { name: 'userId', type: 'string', required: true, description: 'User ID' },
        { name: 'message', type: 'string', required: true, description: 'Notification message' },
        { name: 'type', type: 'string', required: false, description: 'Notification type' }
      ]
    }
  ]
};