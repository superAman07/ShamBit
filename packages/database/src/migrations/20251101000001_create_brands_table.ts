import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create brands table
  await knex.schema.createTable('brands', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('logo_url', 500);
    table.string('country', 100);
    table.string('website_url', 255);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('name');
    table.index('is_active');
    table.index(['is_active', 'name']);
  });

  console.log('✅ Created brands table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('brands');
  console.log('✅ Dropped brands table');
}