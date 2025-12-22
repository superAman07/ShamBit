import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create seller sessions table for JWT token management (if it doesn't exist)
  const hasSellerSessions = await knex.schema.hasTable('seller_sessions');
  
  if (!hasSellerSessions) {
    await knex.schema.createTable('seller_sessions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('seller_id').notNullable().references('id').inTable('sellers').onDelete('CASCADE');
      table.string('refresh_token_hash', 255).notNullable();
      table.string('token_family', 100).notNullable(); // For token rotation
      table.string('access_token_jti', 255).nullable(); // JWT ID for access token
      table.timestamp('access_token_expires_at').nullable(); // Access token expiry
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at').notNullable();
      table.boolean('revoked').defaultTo(false);
      table.timestamp('revoked_at').nullable();
      table.string('ip_address').nullable();
      table.text('user_agent').nullable();
      
      // Indexes
      table.index(['seller_id']);
      table.index(['refresh_token_hash']);
      table.index(['token_family']);
      table.index(['expires_at']);
      table.index(['revoked']);
      table.index(['access_token_jti']);
    });
  } else {
    // Add access token tracking to existing seller_sessions table
    await knex.schema.alterTable('seller_sessions', (table) => {
      table.string('access_token_jti', 255).nullable(); // JWT ID for access token
      table.timestamp('access_token_expires_at').nullable(); // Access token expiry
    });
  }

  // Create revoked access tokens table for immediate revocation
  await knex.schema.createTable('revoked_access_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('jti', 255).notNullable().unique(); // JWT ID
    table.uuid('seller_id').notNullable().references('id').inTable('sellers').onDelete('CASCADE');
    table.timestamp('revoked_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable(); // When the token would have expired naturally
    
    // Indexes for performance
    table.index(['jti']);
    table.index(['seller_id']);
    table.index(['expires_at']);
  });

  // Add cleanup function comment
  await knex.raw(`
    COMMENT ON TABLE revoked_access_tokens IS 'Tracks revoked access tokens for immediate invalidation';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('revoked_access_tokens');
  
  const hasSellerSessions = await knex.schema.hasTable('seller_sessions');
  if (hasSellerSessions) {
    // Check if columns exist before dropping
    const hasJtiColumn = await knex.schema.hasColumn('seller_sessions', 'access_token_jti');
    const hasExpiresColumn = await knex.schema.hasColumn('seller_sessions', 'access_token_expires_at');
    
    if (hasJtiColumn || hasExpiresColumn) {
      await knex.schema.alterTable('seller_sessions', (table) => {
        if (hasJtiColumn) table.dropColumn('access_token_jti');
        if (hasExpiresColumn) table.dropColumn('access_token_expires_at');
      });
    }
  }
}