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

/**
 * Lấy danh sách tất cả tenants (cho admin)
 */
export async function getAllTenants(): Promise<Tenant[]> {
  const response = await axios.get(
    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081'}/api/tenants`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Lấy thông tin 1 tenant
 */
export async function getTenant(id: string): Promise<Tenant> {
  const response = await axios.get(
    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081'}/api/tenants/${id}`,
    { withCredentials: true }
  );
  return response.data;
}


