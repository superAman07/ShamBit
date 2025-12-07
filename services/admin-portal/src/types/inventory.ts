/**
 * Inventory Management Types
 */

export interface Inventory {
  id: string
  productId: string
  totalStock: number
  availableStock: number
  reservedStock: number
  lowStockThreshold: number
  lastRestockedAt?: string
  updatedAt: string
  product?: {
    id: string
    name: string
    unitSize: string
    imageUrls: string[]
    category?: {
      id: string
      name: string
    }
  }
}

export interface InventoryHistory {
  id: string
  productId: string
  changeType: 'restock' | 'sale' | 'return' | 'adjustment'
  quantityChange: number
  previousStock: number
  newStock: number
  performedBy: string
  performedByName?: string
  reason?: string
  createdAt: string
}

export interface InventoryUpdateData {
  totalStock?: number
  lowStockThreshold?: number
  reason?: string
}

export interface BulkInventoryUpdateData {
  productId: string
  totalStock: number
  lowStockThreshold?: number
}

export interface BulkInventoryUpdateResult {
  success: number
  failed: number
  errors: Array<{
    productId: string
    error: string
  }>
}

export interface InventoryFilters {
  search?: string
  categoryId?: string
  lowStock?: boolean
  page?: number
  limit?: number
}

export interface RestockData {
  quantity: number
  reason?: string
}