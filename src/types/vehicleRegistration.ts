export interface VehicleRegistrationImage {
  id: string;
  registrationId: string;
  imageUrl: string;
  createdAt: string;
}

export interface VehicleRegistrationRequest {
  id: string;
  userId: string;
  serviceType: string;
  requestType: string;
  note?: string | null;
  status: string;
  vehicleType?: string | null;
  licensePlate?: string | null;
  vehicleBrand?: string | null;
  vehicleColor?: string | null;
  apartmentNumber?: string | null;
  buildingName?: string | null;
  unitId?: string | null;
  paymentStatus: string;
  paymentAmount?: number | null;
  paymentDate?: string | null;
  paymentGateway?: string | null;
  vnpayTransactionRef?: string | null;
  adminNote?: string | null;
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  images: VehicleRegistrationImage[];
  createdAt: string;
  updatedAt: string;
}

export interface VehicleRegistrationFilter {
  status?: string;
  paymentStatus?: string;
}

export interface VehicleRegistrationDecisionPayload {
  note?: string;
  issueMessage?: string;
}

