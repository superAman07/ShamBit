import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add offer_id to orders table to track which offer was used
  await knex.schema.table('orders', (table) => {
    table.uuid('offer_id').references('id').inTable('product_offers').onDelete('SET NULL');
    table.index('offer_id');
  });

  // Create offer_views table to track when offers are viewed
  await knex.schema.createTable('offer_views', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('offer_id').notNullable().references('id').inTable('product_offers').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('session_id', 255); // For anonymous users
    table.timestamp('viewed_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('offer_id');
    table.index('viewed_at');
    table.index(['offer_id', 'viewed_at']);
  });

  console.log('✅ Created offer analytics tracking tables');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('offer_views');
  
  await knex.schema.table('orders', (table) => {
    table.dropColumn('offer_id');
  });

  console.log('✅ Dropped offer analytics tracking tables');
}
