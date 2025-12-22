import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('pending_registrations', (table) => {
    table.increments('id').primary();
    table.string('full_name', 255).notNullable();
    table.string('mobile', 15).notNullable().unique();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('expires_at').notNullable();
    
    // Indexes for performance
    table.index(['mobile']);
    table.index(['email']);
    table.index(['expires_at']);
    table.index(['mobile', 'expires_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('pending_registrations');
}