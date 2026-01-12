import axios from '@/src/lib/axios';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

export type AccountCreationRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | string;

export interface AccountCreationRequest {
  id: string;
  residentId: string;
  residentName: string;
  residentEmail: string;
  residentPhone: string;
  householdId: string | null;
  unitId: string | null;
  unitCode: string | null;
  relation: string | null;
  requestedBy: string | null;
  requestedByName: string | null;
  username: string | null;
  email: string | null;
  autoGenerate: boolean;
  status: AccountCreationRequestStatus;
  approvedBy: string | null;
  approvedByName: string | null;
  rejectedBy: string | null;
  rejectedByName: string | null;
  rejectionReason: string | null;
  proofOfRelationImageUrl: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
}

export interface ApproveAccountRequestPayload {
  approve: boolean;
  rejectionReason?: string;
}

export interface ResidentWithoutAccount {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  dob: string | null;
  status: string | null;
  relation: string | null;
  isPrimary: boolean;
}

export interface ResidentAccountDto {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  active: boolean;
}

export interface PrimaryResidentProvisionResponse {
  residentId: string;
  householdMemberId: string;
  account: ResidentAccountDto | null;
}

export interface ResidentCreatePayload {
  fullName: string;
  phone?: string;
  email?: string;
  nationalId?: string;
  dob?: string;
  status?: string;
}

export interface CreateResidentAccountDto {
  username?: string | null;
  password?: string | null;
  autoGenerate: boolean;
}

export interface PrimaryResidentProvisionRequest {
  resident: ResidentCreatePayload;
  account?: CreateResidentAccountDto | null;
  relation?: string | null;
}

export async function fetchPendingAccountRequests(): Promise<AccountCreationRequest[]> {
  const response = await axios.get<AccountCreationRequest[]>(
    `${BASE_URL}/api/admin/account-requests/pending`,
    { withCredentials: true },
  );
  return response.data;
}

export async function approveAccountRequest(
  requestId: string,
  payload: ApproveAccountRequestPayload,
): Promise<AccountCreationRequest> {
  const response = await axios.post<AccountCreationRequest>(
    `${BASE_URL}/api/admin/account-requests/${requestId}/approve`,
    payload,
    { withCredentials: true },
  );
  return response.data;
}

export async function fetchResidentsWithoutAccount(
  unitId: string,
): Promise<ResidentWithoutAccount[]> {
  const response = await axios.get<ResidentWithoutAccount[]>(
    `${BASE_URL}/api/residents/units/${unitId}/household/members/without-account`,
    { withCredentials: true },
  );
  return response.data;
}

export async function provisionPrimaryResident(
  unitId: string,
  payload: PrimaryResidentProvisionRequest,
): Promise<PrimaryResidentProvisionResponse> {
  try {
    const response = await axios.post<PrimaryResidentProvisionResponse>(
      `${BASE_URL}/api/units/${unitId}/primary-resident/provision`,
      payload,
      { withCredentials: true },
    );
    return response.data;
  } catch (err: any) {
    throw err; // Re-throw để component có thể handle
  }
}
