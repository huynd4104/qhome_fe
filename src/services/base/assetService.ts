import axios from "@/src/lib/axios";
import { Asset, AssetType, CreateAssetRequest, UpdateAssetRequest } from "@/src/types/asset";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

/**
 * GET /api/assets
 */
export async function getAllAssets(): Promise<Asset[]> {
  const response = await axios.get(`${BASE_URL}/api/assets`);
  return response.data;
}

/**
 * GET /api/assets/:id
 */
export async function getAssetById(id: string): Promise<Asset> {
  const response = await axios.get(`${BASE_URL}/api/assets/${id}`);
  return response.data;
}

/**
 * GET /api/assets/unit/:unitId
 */
export async function getAssetsByUnit(unitId: string): Promise<Asset[]> {
  const response = await axios.get(`${BASE_URL}/api/assets/unit/${unitId}`);
  return response.data;
}

/**
 * GET /api/assets/building/:buildingId
 */
export async function getAssetsByBuilding(buildingId: string): Promise<Asset[]> {
  const response = await axios.get(`${BASE_URL}/api/assets/building/${buildingId}`);
  return response.data;
}

/**
 * GET /api/assets/type/:assetType
 */
export async function getAssetsByType(assetType: AssetType): Promise<Asset[]> {
  const response = await axios.get(`${BASE_URL}/api/assets/type/${assetType}`);
  return response.data;
}

/**
 * POST /api/assets
 */
export async function createAsset(data: CreateAssetRequest): Promise<Asset> {
  const response = await axios.post(`${BASE_URL}/api/assets`, data);
  return response.data;
}

/**
 * PUT /api/assets/:id
 */
export async function updateAsset(id: string, data: UpdateAssetRequest): Promise<Asset> {
  const response = await axios.put(`${BASE_URL}/api/assets/${id}`, data);
  return response.data;
}

/**
 * DELETE /api/assets/:id
 */
export async function deleteAsset(id: string): Promise<void> {
  await axios.delete(`${BASE_URL}/api/assets/${id}`);
}

/**
 * PUT /api/assets/:id/deactivate
 */
export async function deactivateAsset(id: string): Promise<Asset> {
  const response = await axios.put(`${BASE_URL}/api/assets/${id}/deactivate`);
  return response.data;
}

/**
 * GET /api/assets/export
 */
export async function exportAssetsToExcel(
  buildingId?: string,
  unitId?: string,
  assetType?: string
): Promise<Blob> {
  const params: Record<string, string> = {};
  if (buildingId) params.buildingId = buildingId;
  if (unitId) params.unitId = unitId;
  if (assetType) params.assetType = assetType;
  
  const response = await axios.get(`${BASE_URL}/api/assets/export`, {
    params,
    responseType: 'blob',
    withCredentials: true,
  });
  return response.data as Blob;
}






