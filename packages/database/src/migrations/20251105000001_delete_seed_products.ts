import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Delete all seed products (IDs starting with 'a')
  await knex.raw(`
    DELETE FROM products 
    WHERE id::text LIKE 'a%-%'
  `);

  console.log('✅ Deleted seed products');
}

export async function down(knex: Knex): Promise<void> {
  // Cannot restore deleted products
  console.log('⚠️  Cannot restore deleted seed products');
}
