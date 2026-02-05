import axios from '@/src/lib/axios';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

export interface MeterReadingAssignmentDto {
  id: string;
  cycleId: string;
  cycleName: string;
  serviceId: string;
  serviceCode: string;
  buildingId: string;
  buildingName?: string;
  floor?: number;
  unitIds?: string[];
  assignedTo: string;
  assignedToName?: string;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const withCredentials = { withCredentials: true } as const;

export async function getMyAssignments(): Promise<MeterReadingAssignmentDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-assignments/my-assignments`,
    withCredentials
  );
  return response.data as MeterReadingAssignmentDto[];
}

export async function getMyActiveAssignments(): Promise<MeterReadingAssignmentDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-assignments/my-assignments/active`,
    withCredentials
  );
  return response.data as MeterReadingAssignmentDto[];
}

export async function getAssignmentsByStaff(staffId: string): Promise<MeterReadingAssignmentDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-assignments/staff/${staffId}`,
    withCredentials
  );
  return response.data as MeterReadingAssignmentDto[];
}









































