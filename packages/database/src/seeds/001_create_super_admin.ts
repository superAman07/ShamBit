import { Knex } from 'knex';
import bcrypt from 'bcrypt';

/**
 * Seed initial super admin user
 * Username: admin
 * Password: Admin@123
 */
export async function seed(knex: Knex): Promise<void> {
  // Check if super admin already exists
  const existingAdmin = await knex('admins')
    .where({ username: 'admin' })
    .first();

  if (existingAdmin) {
    console.log('Super admin already exists, skipping seed');
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  // Insert super admin
  await knex('admins').insert({
    username: 'admin',
    password_hash: passwordHash,
    name: 'Super Administrator',
    email: 'admin@shambit.com',
    role: 'super_admin',
    is_active: true,
  });

  console.log('Super admin created successfully');
  console.log('Username: admin');
  console.log('Password: Admin@123');
  console.log('⚠️  Please change the password after first login!');
}
