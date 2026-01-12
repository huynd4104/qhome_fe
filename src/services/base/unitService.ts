/**
 * Base Service - Unit Management
 */
import axios from "@/src/lib/axios";

export type Unit = {
  id: string;
  buildingId: string;
  tenantId: string;
  code: string;
  name: string;
  floor: number;
  areaM2?: number;
  bedrooms?: number;
  status?: string;
  ownerName?: string;
  ownerContact?: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

/**
 * GET /api/units/building/:buildingId
 */
export async function getUnitsByBuilding(buildingId: string): Promise<Unit[]> {
  const response = await axios.get(
    `${BASE_URL}/api/units/building/${buildingId}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * GET /api/units/building/:buildingId/floor/:floor
 */
export async function getUnitsByFloor(buildingId: string, floor: number): Promise<Unit[]> {
  const response = await axios.get(
    `${BASE_URL}/api/units/building/${buildingId}/floor/${floor}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * GET /api/units/:id
 */
export async function getUnit(id: string): Promise<Unit> {
  const response = await axios.get(
    `${BASE_URL}/api/units/${id}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * POST /api/units
 */
export async function createUnit(data: Partial<Unit>): Promise<Unit> {
  if (!data.buildingId) {
    throw new Error('buildingId is required in data');
  }

  console.log("Creating unit with data:", JSON.stringify(data, null, 2));
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/units`,
      data,
      { withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
    console.error("Create unit error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
}

/**
 * PUT /api/units/:id
 */
export async function updateUnit(id: string, data: Partial<Unit>): Promise<Unit> {
  const response = await axios.put(
    `${BASE_URL}/api/units/${id}`,
    data,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * DELETE /api/units/:id
 */
export async function deleteUnit(id: string): Promise<void> {
  const response = await axios.delete(
    `${BASE_URL}/api/units/${id}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * PATCH /api/units/:id/status
 * Updates unit status (similar to buildings)
 */
export async function updateUnitStatus(id: string, status: string): Promise<void> {
  const response = await axios.patch(
    `${BASE_URL}/api/units/${id}/status`,
    null,
    { 
      params: { status },
      withCredentials: true 
    }
  );
  return response.data;
}

/**
 * GET /api/units/check-code?code=:code&buildingId=:buildingId
 */
export async function checkUnitCodeExists(code: string, buildingId: string): Promise<boolean> {
  try {
    const units = await getUnitsByBuilding(buildingId);
    return units.some(unit => unit.code.toLowerCase() === code.toLowerCase());
  } catch (error) {
    console.error('Error checking unit code:', error);
    return false;
  }
}
