/**
 * Base Service - Tenant Management
 * Tương ứng với base-service backend (port 8081)
 */
import axios from "@/src/lib/axios";

export type Tenant = {
  id: string;
  code: string;
  name: string;
  contact: string;
  email: string;
  address: string;
  status: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  isDeleted: boolean;
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

/**
 * Lấy danh sách tất cả tenants (cho admin)
 * GET /api/tenants
 */
export async function getAllTenants(): Promise<Tenant[]> {
  const response = await axios.get(
    `${BASE_URL}/api/tenants`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Lấy thông tin 1 tenant
 * GET /api/tenants/:id
 */
export async function getTenant(id: string): Promise<Tenant> {
  const response = await axios.get(
    `${BASE_URL}/api/tenants/${id}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Tạo tenant mới
 * POST /api/tenants
 */
export async function createTenant(data: Partial<Tenant>): Promise<Tenant> {
  const response = await axios.post(
    `${BASE_URL}/api/tenants`,
    data,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Cập nhật tenant
 * PUT /api/tenants/:id
 */
export async function updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
  const response = await axios.put(
    `${BASE_URL}/api/tenants/${id}`,
    data,
    { withCredentials: true }
  );
  return response.data;
}

