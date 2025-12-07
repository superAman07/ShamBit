import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Make product_id nullable to support banners without specific products
  await knex.schema.alterTable('product_offers', (table) => {
    table.uuid('product_id').nullable().alter();
  });

  console.log('✅ Made product_id nullable in product_offers table');
}

export async function down(knex: Knex): Promise<void> {
  // Make product_id not nullable again (this will fail if there are null values)
  await knex.schema.alterTable('product_offers', (table) => {
    table.uuid('product_id').notNullable().alter();
  });

  console.log('✅ Reverted product_id to not nullable in product_offers table');
}
