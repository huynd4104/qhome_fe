/**
 * Base Service - Vehicle Management
 */
import axios from "@/src/lib/axios";
import { Vehicle } from "@/src/types/vehicle";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

/**
 * GET /api/vehicles/unit/:unitId
 */
export async function getVehiclesByUnit(unitId: string): Promise<Vehicle[]> {
  const response = await axios.get(
    `${BASE_URL}/api/vehicles/unit/${unitId}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * GET /api/vehicles/building/:buildingId/active
 */
export async function getAllVehiclesRequest(): Promise<Vehicle[]> {
  const response = await axios.get(
    `${BASE_URL}/api/vehicle-registrations`,
    { withCredentials: true }
  );
  console.log("response.data", response.data);
  return response.data;
}

/**
 * GET /api/vehicles/tenant/:buildingId/active
 */
export async function getActiveVehicles(): Promise<Vehicle[]> {
  const response = await axios.get(
    `${BASE_URL}/api/vehicles/active`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * GET /api/vehicles/tenant/:buildingId/pending
 */
export async function getPendingVehicles(buildingId: string): Promise<Vehicle[]> {
  const response = await axios.get(
    `${BASE_URL}/api/vehicles/building/${buildingId}/pending`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * GET /api/vehicles/:id
 */
export async function getVehicle(id: string): Promise<Vehicle> {
  const response = await axios.get(
    `${BASE_URL}/api/vehicles/${id}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * POST /api/vehicles
 */
export async function createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
  const response = await axios.post(
    `${BASE_URL}/api/vehicles`,
    data,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * PUT /api/vehicles/:id
 */
export async function updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
  const response = await axios.put(
    `${BASE_URL}/api/vehicles/${id}`,
    data,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * POST /api/vehicles/:id/approve
 */
export async function approveVehicle(id: string): Promise<Vehicle> {
  const response = await axios.post(
    `${BASE_URL}/api/vehicles/${id}/approve`,
    {},
    { withCredentials: true }
  );
  return response.data;
}

/**
 * DELETE /api/vehicles/:id
 */
export async function deleteVehicle(id: string): Promise<void> {
  const response = await axios.delete(
    `${BASE_URL}/api/vehicles/${id}`,
    { withCredentials: true }
  );
  return response.data;
}

