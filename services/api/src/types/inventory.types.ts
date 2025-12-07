export interface Inventory {
  id: string;
  productId: string;
  totalStock: number;
  availableStock: number;
  reservedStock: number;
  thresholdStock: number;
  stockLevel: 'Normal' | 'Low' | 'Out';
  lastRestockDate?: Date;
  lastSaleDate?: Date;
  lastUpdatedById?: string;
  status: 'Active' | 'Inactive';
  createdAt: Date;
  updatedAt: Date;
  
  // Related data
  product?: {
    id: string;
    name: string;
    sku: string;
    unitSize: string;
    imageUrls?: string[];
    category?: {
      id: string;
      name: string;
    };
  };
}

export interface InventoryHistory {
  id: string;
  productId: string;
  changeType: 'restock' | 'sale' | 'return' | 'adjustment';
  quantityChange: number;
  previousStock: number;
  newStock: number;
  performedBy?: string;
  reason?: string;
  createdAt: Date;
}

export interface InventoryReservation {
  id: string;
  productId: string;
  quantity: number;
  userId: string;
  expiresAt: Date;
  status: 'active' | 'committed' | 'released';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInventoryRequest {
  productId: string;
  totalStock: number;
  thresholdStock?: number;
}

export interface UpdateInventoryRequest {
  totalStock?: number;
  thresholdStock?: number;
  status?: 'Active' | 'Inactive';
  reason?: string;
}

export interface ReserveInventoryRequest {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface ReserveInventoryResponse {
  reservationId: string;
  expiresAt: Date;
  items: Array<{
    productId: string;
    quantity: number;
    reserved: boolean;
  }>;
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
}

export interface InventoryListQuery {
  page?: number;
  pageSize?: number;
  productId?: string;
  stockLevel?: 'Normal' | 'Low' | 'Out';
  search?: string;
}

export interface InventoryListResponse {
  inventory: Inventory[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

export interface InventoryAggregation {
  productId: string;
  totalStock: number;
  availableStock: number;
  reservedStock: number;
}
