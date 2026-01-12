import axios from '@/src/lib/axios';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

export interface MaintenanceRequestDto {
  id: string;
  unitId: string;
  residentId?: string;
  createdBy: string;
  category: string;
  title: string;
  description: string;
  attachments?: string[];
  location: string;
  preferredDatetime?: string;
  contactName: string;
  contactPhone: string;
  userId?: string;
  note?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastResentAt?: string;
  adminResponse?: string;
  estimatedCost?: number;
  respondedBy?: string;
  respondedAt?: string;
  responseStatus?: string;
}

const withCredentials = { withCredentials: true } as const;

export async function getPendingMaintenanceRequests(): Promise<MaintenanceRequestDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/maintenance-requests/admin/pending`,
    withCredentials
  );
  return response.data as MaintenanceRequestDto[];
}

export async function getMaintenanceRequestsByResponder(responderId: string): Promise<MaintenanceRequestDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/maintenance-requests/admin/pending`,
    withCredentials
  );
  const allRequests = response.data as MaintenanceRequestDto[];
  return allRequests.filter(req => req.respondedBy === responderId);
}



































