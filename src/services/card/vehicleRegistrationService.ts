import axios from "@/src/lib/axios";
import {
  VehicleRegistrationDecisionPayload,
  VehicleRegistrationFilter,
  VehicleRegistrationRequest,
} from "@/src/types/vehicleRegistration";

const CARD_SERVICE_BASE_URL =
  process.env.NEXT_PUBLIC_CARD_SERVICE_URL ||
  "http://localhost:8083";

export async function fetchVehicleRegistrationRequests(
  filter?: VehicleRegistrationFilter
): Promise<VehicleRegistrationRequest[]> {
  const params: Record<string, string> = {};
  if (filter?.status) params.status = filter.status;
  if (filter?.paymentStatus) params.paymentStatus = filter.paymentStatus;

  const response = await axios.get(
    `${CARD_SERVICE_BASE_URL}/api/register-service/admin/vehicle-registrations`,
    {
      params,
      withCredentials: true,
    }
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchVehicleRegistrationRequest(
  registrationId: string
): Promise<VehicleRegistrationRequest> {
  const response = await axios.get(
    `${CARD_SERVICE_BASE_URL}/api/register-service/admin/vehicle-registrations/${registrationId}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
}

export async function approveVehicleRegistration(
  registrationId: string,
  payload?: VehicleRegistrationDecisionPayload
): Promise<VehicleRegistrationRequest> {
  const response = await axios.post(
    `${CARD_SERVICE_BASE_URL}/api/register-service/admin/vehicle-registrations/${registrationId}/approve`,
    payload ?? {},
    {
      withCredentials: true,
    }
  );
  return response.data;
}

export async function rejectVehicleRegistration(
  registrationId: string,
  payload?: VehicleRegistrationDecisionPayload
): Promise<VehicleRegistrationRequest> {
  const response = await axios.post(
    `${CARD_SERVICE_BASE_URL}/api/register-service/admin/vehicle-registrations/${registrationId}/reject`,
    payload ?? {},
    {
      withCredentials: true,
    }
  );
  return response.data;
}

