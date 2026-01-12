import axios from '@/src/lib/axios';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

export type HouseholdKind = 'OWNER' | 'TENANT' | 'SERVICE';

export interface HouseholdDto {
  id: string;
  unitId: string | null;
  unitCode: string | null;
  kind: HouseholdKind;
  primaryResidentId: string | null;
  primaryResidentName?: string | null;
  startDate: string;
  endDate: string | null;
  contractId?: string | null;
  contractNumber?: string | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  contractStatus?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdMemberDto {
  id: string;
  householdId: string;
  residentId: string;
  residentName: string | null;
  residentEmail: string | null;
  residentPhone: string | null;
  relation: string | null;
  proofOfRelationImageUrl: string | null;
  isPrimary: boolean | null;
  joinedAt: string | null;
  leftAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHouseholdPayload {
  unitId: string;
  kind: HouseholdKind;
  contractId?: string | null;
  primaryResidentId?: string | null;
  startDate: string;
  endDate?: string | null;
}

export interface UpdateHouseholdPayload {
  unitId?: string;
  kind?: HouseholdKind;
  contractId?: string | null;
  primaryResidentId?: string | null;
  startDate?: string;
  endDate?: string | null;
}

export async function fetchHouseholdMembersByResident(residentId: string): Promise<HouseholdMemberDto[]> {
  const response = await axios.get<HouseholdMemberDto[]>(
    `${BASE_URL}/api/household-members/residents/${residentId}`,
    { withCredentials: true },
  );
  return response.data;
}

export async function fetchHouseholdMembersByHousehold(householdId: string): Promise<HouseholdMemberDto[]> {
  const response = await axios.get<HouseholdMemberDto[]>(
    `${BASE_URL}/api/household-members/households/${householdId}`,
    { withCredentials: true },
  );
  return response.data;
}

export async function fetchAllHouseholdMembersByHousehold(householdId: string): Promise<HouseholdMemberDto[]> {
  const response = await axios.get<HouseholdMemberDto[]>(
    `${BASE_URL}/api/household-members/households/${householdId}/all`,
    { withCredentials: true },
  );
  return response.data;
}

export async function fetchHouseholdById(householdId: string): Promise<HouseholdDto> {
  const response = await axios.get<HouseholdDto>(
    `${BASE_URL}/api/households/${householdId}`,
    { withCredentials: true },
  );
  return response.data;
}

export async function fetchCurrentHouseholdByUnit(unitId: string): Promise<HouseholdDto | null> {
  try {
    const response = await axios.get<HouseholdDto>(
      `${BASE_URL}/api/households/units/${unitId}/current`,
      { 
        withCredentials: true,
        validateStatus: (status) => status === 200 || status === 404,
      },
    );
    // 404 means no household exists for this unit, which is valid
    if (response.status === 404) {
      return null;
    }
    return response.data;
  } catch (error: any) {
    // Only log non-404 errors as warnings
    if (axios.isAxiosError(error) && error.response?.status !== 404) {
      console.warn(`Failed to fetch household for unit ${unitId}:`, error);
    }
    // For any other error, return null (unit has no household)
    return null;
  }
}

export async function createHousehold(payload: CreateHouseholdPayload): Promise<HouseholdDto> {
  const response = await axios.post<HouseholdDto>(
    `${BASE_URL}/api/households`,
    payload,
    { withCredentials: true },
  );
  return response.data;
}

export async function updateHousehold(id: string, payload: UpdateHouseholdPayload): Promise<HouseholdDto> {
  const response = await axios.put<HouseholdDto>(
    `${BASE_URL}/api/households/${id}`,
    payload,
    { withCredentials: true },
  );
  return response.data;
}

export async function deleteHousehold(id: string): Promise<void> {
  await axios.delete(`${BASE_URL}/api/households/${id}`, {
    withCredentials: true,
  });
}

export async function fetchHouseholdsByUnit(unitId: string): Promise<HouseholdDto[]> {
  const response = await axios.get<HouseholdDto[]>(
    `${BASE_URL}/api/households/units/${unitId}`,
    { withCredentials: true },
  );
  return response.data;
}
