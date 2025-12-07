import { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  const environment = process.env.NODE_ENV || 'development';
  const skipTestData = process.env.SKIP_TEST_DATA === 'true';

  if (environment === 'production' || skipTestData) {
    console.log('⏭️  Skipping test delivery personnel seed (production mode or SKIP_TEST_DATA=true)');
    return;
  }

  // Check if test delivery personnel already exists
  const existingPersonnel = await knex('delivery_personnel')
    .where({ mobile_number: '9999999999' })
    .first();

  if (existingPersonnel) {
    console.log('Test delivery personnel already exists');
    return;
  }

  // Hash the password: Test@123
  const passwordHash = await bcrypt.hash('Test@123', 10);

  // Insert test delivery personnel
  await knex('delivery_personnel').insert({
    name: 'Test Driver',
    mobile_number: '9999999999',
    password_hash: passwordHash,
    email: 'testdriver@shambit.com',
    vehicle_type: 'bike',
    vehicle_number: 'TEST1234',
    is_active: true,
    is_available: true,
    current_latitude: 19.0760,
    current_longitude: 72.8777,
    location_updated_at: new Date(),
  });

  console.log('Test delivery personnel created:');
  console.log('Mobile: 9999999999');
  console.log('Password: Test@123');
}