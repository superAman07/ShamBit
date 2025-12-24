/**
 * Migration to enhance seller_sessions table for production safety
 */

exports.up = function(knex) {
  return knex.schema.alterTable('seller_sessions', function(table) {
    // Add optional columns if they don't exist
    table.string('access_token_jti').nullable().index();
    table.timestamp('access_token_expires_at').nullable();
    
    // Add revocation tracking
    table.boolean('revoked').defaultTo(false).index();
    table.timestamp('revoked_at').nullable();
    
    // Add security tracking
    table.string('device_fingerprint').nullable();
    table.jsonb('security_flags').nullable();
    
    // Add indexes for performance
    table.index(['seller_id', 'revoked']);
    table.index(['token_family', 'revoked']);
    table.index(['expires_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('seller_sessions', function(table) {
    table.dropColumn('access_token_jti');
    table.dropColumn('access_token_expires_at');
    table.dropColumn('revoked');
    table.dropColumn('revoked_at');
    table.dropColumn('device_fingerprint');
    table.dropColumn('security_flags');
  });
};