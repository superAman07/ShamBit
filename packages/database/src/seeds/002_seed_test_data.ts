import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  const environment = process.env.NODE_ENV || 'development';
  const skipTestData = process.env.SKIP_TEST_DATA === 'true';

  if (environment === 'production' || skipTestData) {
    console.log('⏭️  Skipping test data seed (production mode or SKIP_TEST_DATA=true)');
    return;
  }

  console.log('🌱 Seeding test data...');

  // Seed Categories
  console.log('  📁 Seeding categories...');
  const categoryIds = {
    fruits: 'c1111111-1111-1111-1111-111111111111',
    dairy: 'c2222222-2222-2222-2222-222222222222',
    beverages: 'c3333333-3333-3333-3333-333333333333',
    snacks: 'c4444444-4444-4444-4444-444444444444',
    bakery: 'c5555555-5555-5555-5555-555555555555',
  };

  await knex('categories').insert([
    {
      id: categoryIds.fruits,
      name: 'Fruits & Vegetables',
      description: 'Fresh fruits and vegetables',
      image_url: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=400',
      display_order: 1,
      is_active: true,
    },
    {
      id: categoryIds.dairy,
      name: 'Dairy & Eggs',
      description: 'Milk, cheese, eggs and more',
      image_url: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400',
      display_order: 2,
      is_active: true,
    },
    {
      id: categoryIds.beverages,
      name: 'Beverages',
      description: 'Drinks and beverages',
      image_url: 'https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=400',
      display_order: 3,
      is_active: true,
    },
    {
      id: categoryIds.snacks,
      name: 'Snacks',
      description: 'Chips, cookies and snacks',
      image_url: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400',
      display_order: 4,
      is_active: true,
    },
    {
      id: categoryIds.bakery,
      name: 'Bakery',
      description: 'Bread, cakes and bakery items',
      image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
      display_order: 5,
      is_active: true,
    },
  ]).onConflict('id').ignore();

  // Seed Products
  console.log('  🛒 Seeding products...');
  await knex('products').insert([
    // Fruits & Vegetables
    {
      id: 'a1111111-1111-1111-1111-111111111111',
      category_id: categoryIds.fruits,
      name: 'Fresh Tomatoes',
      description: 'Farm fresh red tomatoes, perfect for salads and cooking',
      brand: 'FreshFarm',
      unit_size: '500g',
      price: 4000,
      mrp: 5000,
      image_urls: ['https://images.unsplash.com/photo-1546470427-227e2e1e8c8e?w=400'],
      is_active: true,
    },
    {
      id: 'a1111111-1111-1111-1111-111111111112',
      category_id: categoryIds.fruits,
      name: 'Fresh Bananas',
      description: 'Ripe yellow bananas, rich in potassium',
      brand: 'FreshFarm',
      unit_size: '1 dozen',
      price: 6000,
      mrp: 6000,
      image_urls: ['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400'],
      is_active: true,
    },
    {
      id: 'a1111111-1111-1111-1111-111111111113',
      category_id: categoryIds.fruits,
      name: 'Fresh Onions',
      description: 'Premium quality onions for daily cooking',
      brand: 'FreshFarm',
      unit_size: '1kg',
      price: 3500,
      mrp: 4000,
      image_urls: ['https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400'],
      is_active: true,
    },
    // Dairy & Eggs
    {
      id: 'a2222222-2222-2222-2222-222222222221',
      category_id: categoryIds.dairy,
      name: 'Fresh Milk',
      description: 'Full cream fresh milk, homogenized and pasteurized',
      brand: 'Amul',
      unit_size: '1L',
      price: 6000,
      mrp: 6000,
      image_urls: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400'],
      is_active: true,
    },
    {
      id: 'a2222222-2222-2222-2222-222222222222',
      category_id: categoryIds.dairy,
      name: 'Farm Fresh Eggs',
      description: 'Brown eggs from free-range chickens',
      brand: 'Keggs',
      unit_size: '6 pieces',
      price: 4500,
      mrp: 5000,
      image_urls: ['https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400'],
      is_active: true,
    },
    {
      id: 'a2222222-2222-2222-2222-222222222223',
      category_id: categoryIds.dairy,
      name: 'Paneer',
      description: 'Fresh cottage cheese, perfect for curries',
      brand: 'Amul',
      unit_size: '200g',
      price: 8000,
      mrp: 9000,
      image_urls: ['https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400'],
      is_active: true,
    },
    // Beverages
    {
      id: 'a3333333-3333-3333-3333-333333333331',
      category_id: categoryIds.beverages,
      name: 'Coca Cola',
      description: 'Refreshing cola drink',
      brand: 'Coca Cola',
      unit_size: '2L',
      price: 9000,
      mrp: 10000,
      image_urls: ['https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400'],
      is_active: true,
    },
    {
      id: 'a3333333-3333-3333-3333-333333333332',
      category_id: categoryIds.beverages,
      name: 'Orange Juice',
      description: '100% pure orange juice, no added sugar',
      brand: 'Tropicana',
      unit_size: '1L',
      price: 12000,
      mrp: 15000,
      image_urls: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400'],
      is_active: true,
    },
    {
      id: 'a3333333-3333-3333-3333-333333333333',
      category_id: categoryIds.beverages,
      name: 'Mineral Water',
      description: 'Pure mineral water',
      brand: 'Bisleri',
      unit_size: '1L',
      price: 2000,
      mrp: 2000,
      image_urls: ['https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400'],
      is_active: true,
    },
    // Snacks
    {
      id: 'a4444444-4444-4444-4444-444444444441',
      category_id: categoryIds.snacks,
      name: 'Lays Chips',
      description: 'Classic salted potato chips',
      brand: 'Lays',
      unit_size: '100g',
      price: 2000,
      mrp: 2000,
      image_urls: ['https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400'],
      is_active: true,
    },
    {
      id: 'a4444444-4444-4444-4444-444444444442',
      category_id: categoryIds.snacks,
      name: 'Oreo Cookies',
      description: 'Chocolate sandwich cookies with cream filling',
      brand: 'Oreo',
      unit_size: '150g',
      price: 3000,
      mrp: 3500,
      image_urls: ['https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400'],
      is_active: true,
    },
    {
      id: 'a4444444-4444-4444-4444-444444444443',
      category_id: categoryIds.snacks,
      name: 'Kurkure',
      description: 'Crunchy corn puffs with masala flavor',
      brand: 'Kurkure',
      unit_size: '90g',
      price: 2000,
      mrp: 2000,
      image_urls: ['https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400'],
      is_active: true,
    },
    // Bakery
    {
      id: 'a5555555-5555-5555-5555-555555555551',
      category_id: categoryIds.bakery,
      name: 'White Bread',
      description: 'Soft white bread, perfect for sandwiches',
      brand: 'Britannia',
      unit_size: '400g',
      price: 4000,
      mrp: 4500,
      image_urls: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'],
      is_active: true,
    },
    {
      id: 'a5555555-5555-5555-5555-555555555552',
      category_id: categoryIds.bakery,
      name: 'Chocolate Cake',
      description: 'Rich chocolate cake with chocolate frosting',
      brand: 'Monginis',
      unit_size: '500g',
      price: 25000,
      mrp: 30000,
      image_urls: ['https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400'],
      is_active: true,
    },
    {
      id: 'a5555555-5555-5555-5555-555555555553',
      category_id: categoryIds.bakery,
      name: 'Butter Cookies',
      description: 'Crispy butter cookies',
      brand: 'Britannia',
      unit_size: '200g',
      price: 5000,
      mrp: 6000,
      image_urls: ['https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400'],
      is_active: true,
    },
  ]).onConflict('id').ignore();

  // Seed Inventory (only in development mode)
  const skipInventorySeeding = process.env.SKIP_INVENTORY_SEEDING === 'true';
  
  if (environment === 'development' && !skipInventorySeeding) {
    console.log('  📦 Seeding inventory (development mode only)...');
    
    // Get the main warehouse
    const mainWarehouse = await knex('warehouses')
      .where('code', 'WH-MAIN')
      .first();
    
    if (mainWarehouse) {
      const products = await knex('products').select('id');
      for (const product of products) {
        await knex('inventory').insert({
          product_id: product.id,
          warehouse_id: mainWarehouse.id,
          total_stock: 100,
          available_stock: 100,
          reserved_stock: 0,
          threshold_stock: 10,
          stock_level: 'Normal',
          status: 'Active'
        }).onConflict(['product_id', 'warehouse_id']).ignore();
      }
    }
  } else {
    console.log('  ⏭️  Skipping inventory seeding (production mode or explicitly disabled)');
  }

  // Seed Promotions
  console.log('  🎁 Seeding promotions...');
  await knex('promotions').insert([
    {
      id: 'a1111111-1111-1111-1111-111111111111',
      code: 'WELCOME10',
      description: 'Welcome offer - 10% off on first order',
      discount_type: 'percentage',
      discount_value: 10,
      min_order_value: 50000,
      max_discount_amount: 10000,
      usage_limit: 1000,
      usage_count: 0,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2025-12-31'),
      is_active: true,
    },
    {
      id: 'a2222222-2222-2222-2222-222222222222',
      code: 'FIRST50',
      description: 'First order - Flat 50% off',
      discount_type: 'percentage',
      discount_value: 50,
      min_order_value: 100000,
      max_discount_amount: 20000,
      usage_limit: 500,
      usage_count: 0,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2025-12-31'),
      is_active: true,
    },
  ]).onConflict('id').ignore();

  console.log('✅ Test data seeded successfully!');
}
