/**
 * Inventory Configuration Utilities
 * Controls automatic inventory creation behavior
 */

/**
 * Check if automatic inventory creation should be disabled
 * This prevents phantom inventory in production environments
 */
export function shouldDisableAutoInventoryCreation(): boolean {
  const environment = process.env.NODE_ENV || 'development';
  const explicitlyDisabled = process.env.DISABLE_AUTO_INVENTORY === 'true';
  
  // Disable in production by default, or if explicitly disabled
  return environment === 'production' || explicitlyDisabled;
}

/**
 * Check if inventory seeding should be skipped
 */
export function shouldSkipInventorySeeding(): boolean {
  const environment = process.env.NODE_ENV || 'development';
  const explicitlySkipped = process.env.SKIP_INVENTORY_SEEDING === 'true';
  
  // Skip in production by default, or if explicitly skipped
  return environment === 'production' || explicitlySkipped;
}

/**
 * Log inventory creation prevention
 */
export function logInventoryCreationPrevented(context: string): void {
  console.log(`🚫 Automatic inventory creation prevented in ${context} (production safety)`);
}