import axios from '@/src/lib/axios';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

export type HouseholdMemberRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | string;

export interface HouseholdMemberRequest {
  id: string;
  householdId: string | null;
  householdCode: string | null;
  unitId: string | null;
  unitCode: string | null;
  residentId: string | null;
  residentName: string | null;
  residentEmail: string | null;
  residentPhone: string | null;
  requestedResidentFullName: string | null;
  requestedResidentPhone: string | null;
  requestedResidentEmail: string | null;
  requestedResidentNationalId?: string | null;
  requestedResidentDob?: string | null;
  requestedBy: string | null;
  requestedByName: string | null;
  relation: string | null;
  proofOfRelationImageUrl?: string | null;
  note: string | null;
  status: HouseholdMemberRequestStatus;
  rejectionReason: string | null;
  createdAt: string | null;
  updatedAt?: string | null;
}

export interface HouseholdMemberRequestDecisionPayload {
  approve: boolean;
  rejectionReason?: string;
}

export async function fetchPendingHouseholdMemberRequests(): Promise<HouseholdMemberRequest[]> {
  const response = await axios.get<HouseholdMemberRequest[]>(
    `${BASE_URL}/api/household-member-requests/pending`,
    { withCredentials: true },
  );
  return response.data;
}

export async function decideHouseholdMemberRequest(
  requestId: string,
  payload: HouseholdMemberRequestDecisionPayload,
): Promise<HouseholdMemberRequest> {
  const response = await axios.post<HouseholdMemberRequest>(
    `${BASE_URL}/api/household-member-requests/${requestId}/decision`,
    payload,
    { withCredentials: true },
  );
  return response.data;
}
