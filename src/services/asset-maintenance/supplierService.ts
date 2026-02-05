import axios from "@/src/lib/axios";

const BASE_URL = process.env.NEXT_PUBLIC_ASSET_MAINTENANCE_URL || 'http://localhost:8084';

export interface SupplierResponse {
  id: string;
  name: string;
  type: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxCode?: string;
  website?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateSupplierRequest {
  name: string;
  type: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxCode?: string;
  website?: string;
  notes?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  type?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  website?: string;
  notes?: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export async function getSupplierById(id: string): Promise<SupplierResponse> {
  const response = await axios.get(
    `${BASE_URL}/api/asset-maintenance/suppliers/${id}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getAllSuppliers(params?: {
  isActive?: boolean;
  type?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}): Promise<Page<SupplierResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
  if (params?.type) queryParams.append('type', params.type);
  if (params?.page !== undefined) queryParams.append('page', String(params.page));
  if (params?.size !== undefined) queryParams.append('size', String(params.size));
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortDir) queryParams.append('sortDir', params.sortDir);

  const response = await axios.get(
    `${BASE_URL}/api/asset-maintenance/suppliers?${queryParams.toString()}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getActiveSuppliers(): Promise<SupplierResponse[]> {
  const response = await axios.get(
    `${BASE_URL}/api/asset-maintenance/suppliers/active`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getActiveSuppliersByType(type: string): Promise<SupplierResponse[]> {
  const response = await axios.get(
    `${BASE_URL}/api/asset-maintenance/suppliers/active/by-type?type=${type}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function searchSuppliers(query: string, limit: number = 20): Promise<SupplierResponse[]> {
  const response = await axios.get(
    `${BASE_URL}/api/asset-maintenance/suppliers/search?query=${encodeURIComponent(query)}&limit=${limit}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function createSupplier(data: CreateSupplierRequest): Promise<SupplierResponse> {
  const response = await axios.post(
    `${BASE_URL}/api/asset-maintenance/suppliers`,
    data,
    { withCredentials: true }
  );
  return response.data;
}

export async function updateSupplier(id: string, data: UpdateSupplierRequest): Promise<SupplierResponse> {
  const response = await axios.put(
    `${BASE_URL}/api/asset-maintenance/suppliers/${id}`,
    data,
    { withCredentials: true }
  );
  return response.data;
}

export async function deleteSupplier(id: string): Promise<void> {
  await axios.delete(
    `${BASE_URL}/api/asset-maintenance/suppliers/${id}`,
    { withCredentials: true }
  );
}

export async function restoreSupplier(id: string): Promise<SupplierResponse> {
  const response = await axios.put(
    `${BASE_URL}/api/asset-maintenance/suppliers/${id}/restore`,
    {},
    { withCredentials: true }
  );
  return response.data;
}

