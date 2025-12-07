export type VehicleType = 'bike' | 'scooter' | 'bicycle';
export type DeliveryStatus = 'pending' | 'assigned' | 'out_for_delivery' | 'delivered';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface DeliveryPersonnel {
  id: string;
  name: string;
  mobileNumber: string;
  email?: string;
  vehicleType?: VehicleType;
  vehicleNumber?: string;
  isActive: boolean;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliveryPersonnelDto {
  name: string;
  mobileNumber: string;
  email?: string;
  vehicleType?: VehicleType;
  vehicleNumber?: string;
  password?: string;
  isActive?: boolean;
  isAvailable?: boolean;
}

export interface UpdateDeliveryPersonnelDto {
  name?: string;
  mobileNumber?: string;
  email?: string;
  vehicleType?: VehicleType;
  vehicleNumber?: string;
  isActive?: boolean;
  isAvailable?: boolean;
}

export interface UpdateLocationDto {
  latitude: number;
  longitude: number;
}

export interface Delivery {
  id: string;
  orderId: string;
  deliveryPersonnelId: string;
  status: DeliveryStatus;
  pickupLocation: Location;
  deliveryLocation: Location;
  assignedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliveryDto {
  orderId: string;
  deliveryPersonnelId: string;
  pickupLocation: Location;
  deliveryLocation: Location;
}

export interface UpdateDeliveryStatusDto {
  status: DeliveryStatus;
}

export interface AssignDeliveryDto {
  orderId: string;
  deliveryPersonnelId: string;
}

export interface DeliveryPersonnelWithStats extends DeliveryPersonnel {
  activeDeliveries: number;
  completedDeliveries: number;
  averageDeliveryTime?: number; // in minutes
}

export interface DeliveryAssignmentSuggestion {
  personnelId: string;
  name: string;
  distanceKm: number;
  activeDeliveries: number;
  estimatedArrivalTime: number; // in minutes
  score: number; // Higher is better
}

export interface DeliveryMetrics {
  personnelId: string;
  name: string;
  totalDeliveries: number;
  completedDeliveries: number;
  failedDeliveries: number;
  averageDeliveryTime: number; // in minutes
  onTimeDeliveryRate: number; // percentage
}

export interface DeliveryListQuery {
  status?: DeliveryStatus;
  deliveryPersonnelId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}
