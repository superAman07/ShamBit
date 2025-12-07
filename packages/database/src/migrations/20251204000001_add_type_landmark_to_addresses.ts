import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_addresses', (table) => {
    table.string('type', 20).defaultTo('home'); // 'home', 'work', 'other'
    table.string('landmark', 255);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_addresses', (table) => {
    table.dropColumn('type');
    table.dropColumn('landmark');
  });
}
