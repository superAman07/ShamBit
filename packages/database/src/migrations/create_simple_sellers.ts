import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create simple sellers table matching the 32 requirements
  await knex.schema.createTable('sellers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Basic Registration Fields (Requirement 1: 4 fields)
    table.string('full_name', 100).notNullable();
    table.string('mobile', 10).notNullable().unique();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    
    // Verification Status (Requirements 2, 9)
    table.boolean('mobile_verified').defaultTo(false).notNullable();
    table.boolean('email_verified').defaultTo(false).notNullable();
    
    // Account Status (Requirement 3: immediate access)
    table.enum('status', ['active', 'suspended', 'deactivated']).defaultTo('active').notNullable();
    
    // Progressive Profile Completion (Requirement 6)
    table.jsonb('business_details').nullable();
    table.jsonb('address_info').nullable();
    table.jsonb('tax_compliance').nullable();
    table.jsonb('bank_details').nullable();
    table.integer('profile_completion_percentage').defaultTo(25).notNullable(); // 25% after basic registration
    
    // Product Listing Access (Requirement 25)
    table.boolean('can_list_products').defaultTo(false).notNullable();
    table.boolean('kyc_verified').defaultTo(false).notNullable();
    
    // Security & Audit (Requirements 7, 8, 22)
    table.integer('login_attempts').defaultTo(0).notNullable();
    table.timestamp('account_locked_until').nullable();
    table.timestamp('last_login_at').nullable();
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    
    // Indexes for performance
    table.index(['mobile']);
    table.index(['email']);
    table.index(['status']);
    table.index(['mobile_verified']);
    table.index(['can_list_products']);
    table.index(['created_at']);
  });

  // Create simple OTP table (Requirement 2, 12)
  await knex.schema.createTable('seller_otps', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('mobile', 10).notNullable().index();
    table.string('otp_hash', 255).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('expires_at').notNullable().index();
    table.boolean('verified').defaultTo(false).notNullable();
    table.integer('attempts').defaultTo(0).notNullable();
    table.string('ip_address', 45).nullable();
    
    // Cleanup index for expired OTPs
    table.index(['expires_at']);
    table.index(['mobile', 'verified']);
  });

  // Create simple documents table (Requirements 15, 16, 28)
  await knex.schema.createTable('seller_documents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('seller_id').notNullable().references('id').inTable('sellers').onDelete('CASCADE');
    table.enum('type', [
      'pan_card',
      'gst_certificate', 
      'bank_proof',
      'aadhaar',
      'business_certificate',
      'address_proof'
    ]).notNullable();
    table.string('file_name', 255).notNullable();
    table.string('file_url', 500).notNullable();
    table.string('file_hash', 64).notNullable(); // SHA-256 hash for integrity
    table.integer('file_size').notNullable();
    table.enum('verification_status', ['pending', 'verified', 'rejected']).defaultTo('pending').notNullable();
    table.text('rejection_reason').nullable();
    table.timestamp('uploaded_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('verified_at').nullable();
    table.uuid('verified_by').nullable();
    
    // Indexes
    table.index(['seller_id']);
    table.index(['type']);
    table.index(['verification_status']);
    table.index(['uploaded_at']);
    
    // One document per type per seller
    table.unique(['seller_id', 'type']);
  });

  // Create audit log table (Requirements 11, 19)
  await knex.schema.createTable('seller_audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('seller_id').notNullable().references('id').inTable('sellers').onDelete('CASCADE');
    table.string('action', 100).notNullable(); // 'registration', 'login', 'verification', etc.
    table.string('ip_address', 45).nullable();
    table.text('user_agent').nullable();
    table.jsonb('metadata').nullable(); // Additional context
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    
    // Indexes for analytics and monitoring
    table.index(['seller_id']);
    table.index(['action']);
    table.index(['created_at']);
    table.index(['ip_address']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('seller_audit_logs');
  await knex.schema.dropTableIfExists('seller_documents');
  await knex.schema.dropTableIfExists('seller_otps');
  await knex.schema.dropTableIfExists('sellers');
}