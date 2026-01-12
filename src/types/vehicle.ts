export enum VehicleKind {
    CAR = 'CAR',
    MOTORCYCLE = 'MOTORCYCLE',
    BICYCLE = 'BICYCLE',
    OTHER = 'OTHER'
}

export interface Vehicle {
    id: string;
    tenantId: string;
    residentId: string;
    residentName: string;
    unitId: string;
    unitCode: string;
    plateNo: string;
    kind: VehicleKind;
    color: string;
    active: boolean;
    activatedAt?: string;
    registrationApprovedAt?: string;
    approvedBy?: string;
    createdAt: string;
    updatedAt: string;
}

export type VehicleRegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';

export interface VehicleRegistration {
    id: string;
    vehicleId: string | null;
    vehiclePlateNo: string | null;
    vehicleKind: string | null;
    vehicleColor: string | null;
    reason: string | null;
    status: VehicleRegistrationStatus;
    requestedBy: string | null;
    requestedByName: string | null;
    approvedBy: string | null;
    approvedByName: string | null;
    note: string | null;
    requestedAt: string | null;
    approvedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

