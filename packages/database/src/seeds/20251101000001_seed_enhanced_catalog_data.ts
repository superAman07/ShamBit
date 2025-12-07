import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  const environment = process.env.NODE_ENV || 'development';
  const skipTestData = process.env.SKIP_TEST_DATA === 'true';

  if (environment === 'production' || skipTestData) {
    console.log('⏭️  Skipping enhanced catalog test data seed (production mode or SKIP_TEST_DATA=true)');
    return;
  }

  // Check if we already have data to avoid duplicate seeding
  const existingBrands = await knex('brands').count('* as count').first();
  if (existingBrands && parseInt(existingBrands.count as string) > 1) {
    console.log('✅ Enhanced catalog data already seeded, skipping...');
    return;
  }

  // Seed some popular brands
  const brands = [
    {
      name: 'Amul',
      description: 'India\'s leading dairy brand',
      country: 'India',
      website_url: 'https://www.amul.com',
      is_active: true
    },
    {
      name: 'Britannia',
      description: 'Popular biscuits and bakery products',
      country: 'India',
      website_url: 'https://www.britannia.co.in',
      is_active: true
    },
    {
      name: 'Nestle',
      description: 'Global food and beverage company',
      country: 'Switzerland',
      website_url: 'https://www.nestle.com',
      is_active: true
    },
    {
      name: 'Parle',
      description: 'Indian confectionery company',
      country: 'India',
      website_url: 'https://www.parle.com',
      is_active: true
    },
    {
      name: 'Haldiram\'s',
      description: 'Indian sweets and snacks',
      country: 'India',
      website_url: 'https://www.haldirams.com',
      is_active: true
    }
  ];

  await knex('brands').insert(brands);

  // Seed additional warehouses
  const warehouses = [
    {
      name: 'North Delhi Warehouse',
      code: 'WH-ND',
      address_line1: 'Sector 15, Rohini',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      postal_code: '110085',
      latitude: 28.7041,
      longitude: 77.1025,
      contact_person: 'Rajesh Kumar',
      phone: '+91-9876543210',
      email: 'north.delhi@shambit.com',
      is_active: true
    },
    {
      name: 'South Delhi Warehouse',
      code: 'WH-SD',
      address_line1: 'Okhla Industrial Area',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      postal_code: '110020',
      latitude: 28.5355,
      longitude: 77.2730,
      contact_person: 'Priya Sharma',
      phone: '+91-9876543211',
      email: 'south.delhi@shambit.com',
      is_active: true
    },
    {
      name: 'Gurgaon Warehouse',
      code: 'WH-GGN',
      address_line1: 'Udyog Vihar Phase 4',
      city: 'Gurgaon',
      state: 'Haryana',
      country: 'India',
      postal_code: '122015',
      latitude: 28.4595,
      longitude: 77.0266,
      contact_person: 'Amit Singh',
      phone: '+91-9876543212',
      email: 'gurgaon@shambit.com',
      is_active: true
    }
  ];

  await knex('warehouses').insert(warehouses);

  console.log('✅ Seeded enhanced catalog data: brands and warehouses');
}