export type VehicleType = 'bike' | 'scooter' | 'bicycle';
export type DeliveryStatus = 'pending' | 'assigned' | 'out_for_delivery' | 'delivered';

export interface DeliveryPersonnel {
  id: string;
  name: string;
  mobileNumber: string;
  email?: string;
  vehicleType?: VehicleType;
  vehicleNumber?: string;
  isActive: boolean;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryPersonnelWithStats extends DeliveryPersonnel {
  stats: {
    totalDeliveries: number;
    completedDeliveries: number;
    activeDeliveries: number;
    averageDeliveryTime: number;
    successRate: number;
  };
}

export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  orderNumber: string;
  deliveryPersonnelId: string;
  deliveryPersonnel: DeliveryPersonnel;
  status: DeliveryStatus;
  pickupLocation: DeliveryLocation;
  deliveryLocation: DeliveryLocation;
  assignedAt: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryMetrics {
  personnelId: string;
  personnelName: string;
  totalDeliveries: number;
  completedDeliveries: number;
  failedDeliveries: number;
  averageDeliveryTime: number;
  averageDistance: number;
  successRate: number;
  onTimeDeliveryRate: number;
  customerRating?: number;
}

export interface DeliveryStatusOverview {
  totalActive: number;
  assigned: number;
  pickedUp: number;
  inTransit: number;
  totalPersonnel: number;
  availablePersonnel: number;
  busyPersonnel: number;
}

export interface CreateDeliveryPersonnelRequest {
  name: string;
  mobileNumber: string;
  email?: string;
  vehicleType?: VehicleType;
  vehicleNumber?: string;
  isActive?: boolean;
  isAvailable?: boolean;
}

export interface UpdateDeliveryPersonnelRequest {
  name?: string;
  mobileNumber?: string;
  email?: string;
  vehicleType?: VehicleType;
  vehicleNumber?: string;
  isActive?: boolean;
  isAvailable?: boolean;
}

export interface AssignmentSuggestion {
  personnel: DeliveryPersonnel;
  distance: number;
  estimatedTime: number;
  currentWorkload: number;
  score: number;
}

export interface DeliveryFilters {
  status?: DeliveryStatus[];
  deliveryPersonnelId?: string;
  startDate?: string;
  endDate?: string;
}

export interface DeliveryListResponse {
  deliveries: Delivery[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PersonnelListResponse {
  personnel: DeliveryPersonnel[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
