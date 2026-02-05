/**
 * Tenant Deletion Service
 * Handles API calls for tenant deletion requests
 */
import axios from "@/src/lib/axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

// ========== Types ==========

export enum TenantDeletionStatus {
  PENDING = 'PENDING',
  CANCELED = 'CANCELED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED'
}

export interface TenantDeletionRequest {
  id: string;
  tenantId: string;
  requestedBy: string;
  approvedBy?: string;
  reason: string;
  note?: string;
  status: TenantDeletionStatus;
  createdAt: string;
  approvedAt?: string;
}

export interface CreateDeletionReq {
  tenantId: string;
  reason: string;
}

export interface ApproveDeletionReq {
  note?: string;
}

export interface TenantDeletionTargetsStatus {
  buildings: Record<string, number>;
  units: Record<string, number>;
  totalBuildings: number;
  totalUnits: number;
  buildingsArchived: number;
  unitsInactive: number;
  buildingsReady: boolean;
  unitsReady: boolean;
  employeesCount: number;
  employeesReady: boolean;
  allTargetsReady: boolean;
  requirements: {
    buildings: string;
    units: string;
    employees: string;
  };
}

// ========== API Functions ==========

/**
 * Create a tenant deletion request
 * POST /api/tenant-deletions
 */
export async function createDeletionRequest(
  data: CreateDeletionReq
): Promise<TenantDeletionRequest> {
  const response = await axios.post<TenantDeletionRequest>(
    `${BASE_URL}/api/tenant-deletions`,
    data,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Get all tenant deletion requests (Admin only)
 * GET /api/tenant-deletions
 */
export async function getAllDeletionRequests(): Promise<TenantDeletionRequest[]> {
  const response = await axios.get<TenantDeletionRequest[]>(
    `${BASE_URL}/api/tenant-deletions`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Get a specific deletion request
 * GET /api/tenant-deletions/{id}
 */
export async function getDeletionRequest(id: string): Promise<TenantDeletionRequest> {
  const response = await axios.get<TenantDeletionRequest>(
    `${BASE_URL}/api/tenant-deletions/${id}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Get targets status for deletion request
 * GET /api/tenant-deletions/{id}/targets-status
 */
export async function getDeletionTargetsStatus(
  id: string
): Promise<TenantDeletionTargetsStatus> {
  const response = await axios.get<TenantDeletionTargetsStatus>(
    `${BASE_URL}/api/tenant-deletions/${id}/targets-status`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Approve a deletion request (Admin or Tenant Owner)
 * POST /api/tenant-deletions/{id}/approve
 */
export async function approveDeletionRequest(
  id: string,
  data: ApproveDeletionReq
): Promise<TenantDeletionRequest> {
  const response = await axios.post<TenantDeletionRequest>(
    `${BASE_URL}/api/tenant-deletions/${id}/approve`,
    data,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Reject a deletion request (Admin only)
 * POST /api/tenant-deletions/{id}/reject
 */
export async function rejectDeletionRequest(
  id: string,
  data: ApproveDeletionReq
): Promise<TenantDeletionRequest> {
  const response = await axios.post<TenantDeletionRequest>(
    `${BASE_URL}/api/tenant-deletions/${id}/reject`,
    data,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Complete a deletion (Admin only)
 * POST /api/tenant-deletions/{id}/complete
 */
export async function completeDeletion(id: string): Promise<TenantDeletionRequest> {
  const response = await axios.post<TenantDeletionRequest>(
    `${BASE_URL}/api/tenant-deletions/${id}/complete`,
    {},
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Get my tenant's deletion requests
 * GET /api/tenant-deletions/my-requests
 */
export async function getMyDeletionRequests(): Promise<TenantDeletionRequest[]> {
  const response = await axios.get<TenantDeletionRequest[]>(
    `${BASE_URL}/api/tenant-deletions/my-requests`,
    { withCredentials: true }
  );
  return response.data;
}

