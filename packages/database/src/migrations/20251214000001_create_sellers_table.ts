import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sellers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('business_name').notNullable();
    table.enum('business_type', ['grocery', 'organic', 'packaged', 'other']).notNullable();
    table.string('gstin').nullable();
    table.string('owner_name').notNullable();
    table.string('phone').notNullable();
    table.string('email').notNullable();
    table.string('city').notNullable();
    table.enum('status', ['pending', 'approved', 'rejected', 'suspended']).defaultTo('pending');
    table.text('verification_notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('approved_at').nullable();
    table.uuid('approved_by').nullable();
    
    // Indexes
    table.index(['status']);
    table.index(['city']);
    table.index(['business_type']);
    table.index(['created_at']);
    table.index(['email']);
    table.index(['phone']);
    
    // Unique constraints
    table.unique(['email']);
    table.unique(['phone']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sellers');
}