import axios from '@/src/lib/axios';
import { VehicleRegistration } from '@/src/types/vehicle';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

export async function getVehicleRegistrations(): Promise<VehicleRegistration[]> {
  const response = await axios.get(`${BASE_URL}/api/vehicle-registrations`, {
    withCredentials: true,
  });
  return response.data;
}

export async function approveVehicleRegistration(id: string, note?: string): Promise<VehicleRegistration> {
  const response = await axios.post(
    `${BASE_URL}/api/vehicle-registrations/${id}/approve`,
    note ? { note } : {},
    {
      withCredentials: true,
    },
  );
  return response.data;
}

export async function rejectVehicleRegistration(id: string, reason: string): Promise<VehicleRegistration> {
  const response = await axios.post(
    `${BASE_URL}/api/vehicle-registrations/${id}/reject`,
    { reason },
    {
      withCredentials: true,
    },
  );
  return response.data;
}



