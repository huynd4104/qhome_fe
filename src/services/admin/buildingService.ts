import axios from "@/src/lib/axios";

export type Building = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  address: string;
  floorsMax: number;
  totalApartmentsAll: number;
  totalApartmentsActive: number;
};

/**
 * Lấy danh sách buildings theo tenantId
 */
export async function getBuildingsByTenant(tenantId: string): Promise<Building[]> {
  const response = await axios.get(
    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081'}/api/buildings`,
    { 
      params: { tenantId },
      withCredentials: true 
    }
  );
  return response.data;
}

/**
 * Lấy tất cả buildings (cho admin)
 * Tạm thời sẽ cần gọi nhiều lần với các tenantId khác nhau
 * hoặc backend cần expose API getAllBuildings() cho admin
 */
export async function getAllBuildings(): Promise<Building[]> {
  // TODO: Backend cần tạo API GET /api/buildings/all cho admin
  // Tạm thời return empty array
  return [];
}


