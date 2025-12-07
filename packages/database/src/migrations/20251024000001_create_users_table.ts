import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('mobile_number', 15).notNullable().unique();
    table.string('name', 100);
    table.string('email', 255);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('last_login_at');

    table.index('mobile_number');
    table.index('is_active');
  });

  await knex.schema.createTable('user_addresses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('address_line1', 255).notNullable();
    table.string('address_line2', 255);
    table.string('city', 100).notNullable();
    table.string('state', 100).notNullable();
    table.string('pincode', 10).notNullable();
    table.decimal('latitude', 10, 8);
    table.decimal('longitude', 11, 8);
    table.boolean('is_default').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_addresses');
  await knex.schema.dropTableIfExists('users');
}
