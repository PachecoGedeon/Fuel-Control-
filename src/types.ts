export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt?: string;
  isPremium?: boolean;
}

export interface Vehicle {
  id?: string;
  userId: string;
  type: string;
  model: string;
  year: number;
  fuelType: 'Álcool' | 'Gasolina' | 'Flex';
}

export interface Partner {
  id?: string;
  name: string;
  category: string;
  logoUrl: string;
  description: string;
  rating: number;
  websiteUrl: string;
}

export interface Coupon {
  id?: string;
  partnerId: string;
  title: string;
  code: string;
  discount: string;
  expiryDate?: string;
  imageUrl?: string;
}

export interface FuelLog {
  id?: string;
  userId: string;
  odometer: number;
  fuelAmount: number;
  totalCost: number;
  date: string;
  location?: string;
}

export interface MaintenanceLog {
  id?: string;
  userId: string;
  vehicleId: string;
  date: string;
  description: string;
  mechanicName?: string;
  cost?: number;
  odometer?: number;
  fileUrl?: string;
  fileName?: string;
}

export interface ParkingLog {
  id?: string;
  userId: string;
  vehicleId: string;
  entryOdometer: number;
  exitOdometer?: number;
  entryDate: string;
  exitDate?: string;
  locationName?: string;
  status: 'active' | 'completed';
}
