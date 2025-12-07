import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create warehouses table
  await knex.schema.createTable('warehouses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('code', 100).unique().notNullable();
    table.string('address_line1', 255).notNullable();
    table.string('address_line2', 255);
    table.string('city', 100).notNullable();
    table.string('state', 100).notNullable();
    table.string('country', 100).notNullable();
    table.string('postal_code', 20).notNullable();
    table.decimal('latitude', 10, 8);
    table.decimal('longitude', 11, 8);
    table.string('contact_person', 255);
    table.string('phone', 50);
    table.string('email', 100);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('code');
    table.index('is_active');
    table.index(['latitude', 'longitude']);
    table.index(['is_active', 'city']);
  });

  console.log('✅ Created warehouses table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('warehouses');
  console.log('✅ Dropped warehouses table');
}