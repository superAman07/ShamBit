import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('newsletter_signups', (table) => {
        table.increments('id').primary();
        table.string('email', 255).notNullable().unique();
        table.string('status', 50).defaultTo('active'); // active, unsubscribed
        table.string('source', 100).defaultTo('website'); // website, admin, api
        table.json('metadata').nullable(); // Additional data like referrer, utm params, etc.
        table.timestamp('subscribed_at').defaultTo(knex.fn.now());
        table.timestamp('unsubscribed_at').nullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        
        // Indexes
        table.index(['email']);
        table.index(['status']);
        table.index(['subscribed_at']);
        table.index(['created_at']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('newsletter_signups');
}