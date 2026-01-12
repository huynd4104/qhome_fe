/**
 * IAM Service - Role & Permission Management
 * Tương ứng với iam-service backend (port 8088)
 */
import axios from "@/src/lib/axios";

const IAM_URL = process.env.NEXT_PUBLIC_IAM_URL || 'http://localhost:8088';

export type Role = {
  name: string;          // admin, tenant_owner, account, technician, supporter
  description?: string;
} | string;  // Backend có thể trả về array of strings hoặc array of objects

export type Permission = {
  code: string;          // tenant.create, building.read, etc.
  description?: string;
};

export type User = {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions?: string[];
};

/**
 * Lấy tất cả roles trong hệ thống
 * GET /api/roles/all
 */
export async function getAllRoles(): Promise<Role[]> {
  const response = await axios.get(
    `${IAM_URL}/api/roles/all`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Lấy tất cả permissions trong hệ thống
 * GET /api/roles/permissions/all
 */
export async function getAllPermissions(): Promise<string[]> {
  const response = await axios.get<Permission[]>(
    `${IAM_URL}/api/roles/permissions/all`,
    { withCredentials: true }
  );
  // Extract permission codes
  return response.data.map(p => p.code);
}

/**
 * Lấy permissions của 1 role cụ thể
 * GET /api/roles/permissions/role/{role}
 */
export async function getPermissionsByRole(role: string): Promise<Permission[]> {
  const response = await axios.get(
    `${IAM_URL}/api/roles/permissions/role/${role.toLowerCase()}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Lấy permissions theo service
 * GET /api/permissions/service/{servicePrefix}
 */
export async function getPermissionsByService(servicePrefix: string): Promise<Permission[]> {
  const response = await axios.get(
    `${IAM_URL}/api/permissions/service/${servicePrefix}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Lấy users trong tenant
 * GET /api/roles/tenant/{tenantId}/users
 */
export async function getUsersInTenant(tenantId: string): Promise<string[]> {
  const response = await axios.get(
    `${IAM_URL}/api/roles/tenant/${tenantId}/users`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Lấy users có role cụ thể trong tenant
 * GET /api/roles/tenant/{tenantId}/role/{role}/users
 */
export async function getUsersByRoleInTenant(
  tenantId: string,
  role: string
): Promise<string[]> {
  const response = await axios.get(
    `${IAM_URL}/api/roles/tenant/${tenantId}/role/${role}/users`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Lấy danh sách users trong tenant (với thông tin đầy đủ)
 * GET /api/tenants/{tenantId}/users
 * TODO: Backend cần implement API này
 */
export async function getTenantUsers(tenantId: string): Promise<User[]> {
  const response = await axios.get(
    `${IAM_URL}/api/tenants/${tenantId}/users`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Lấy danh sách roles trong tenant
 * GET /api/tenants/{tenantId}/roles
 * TODO: Backend cần implement API này
 */
export async function getTenantRoles(tenantId: string): Promise<Role[]> {
  const response = await axios.get(
    `${IAM_URL}/api/tenants/${tenantId}/roles`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Lấy roles của user trong tenant
 * GET /api/roles/user/{userId}/tenant/{tenantId}
 */
export async function getUserRolesInTenant(
  userId: string,
  tenantId: string
): Promise<string[]> {
  const response = await axios.get(
    `${IAM_URL}/api/roles/user/${userId}/tenant/${tenantId}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Gán role cho user trong tenant
 * POST /api/roles/user/{userId}/tenant/{tenantId}/assign?role=xxx
 */
export async function assignRoleToUser(
  userId: string,
  tenantId: string,
  role: string
): Promise<void> {
  await axios.post(
    `${IAM_URL}/api/roles/user/${userId}/tenant/${tenantId}/assign`,
    null,
    { 
      params: { role: role.toLowerCase() },
      withCredentials: true 
    }
  );
}

/**
 * Xóa role khỏi user trong tenant
 * DELETE /api/roles/user/{userId}/tenant/{tenantId}/remove?role=xxx
 */
export async function removeRoleFromUser(
  userId: string,
  tenantId: string,
  role: string
): Promise<void> {
  await axios.delete(
    `${IAM_URL}/api/roles/user/${userId}/tenant/${tenantId}/remove`,
    { 
      params: { role: role.toLowerCase() },
      withCredentials: true 
    }
  );
}

/**
 * Thêm permission vào role
 * POST /api/roles/{role}/permissions
 */
export async function addPermissionToRole(
  role: string,
  permissionCode: string
): Promise<void> {
  await axios.post(
    `${IAM_URL}/api/roles/${role.toLowerCase()}/permissions`,
    { permissionCode },
    { withCredentials: true }
  );
}

/**
 * Xóa permission khỏi role
 * DELETE /api/roles/{role}/permissions/{permissionCode}
 */
export async function removePermissionFromRole(
  role: string,
  permissionCode: string
): Promise<void> {
  await axios.delete(
    `${IAM_URL}/api/roles/${role.toLowerCase()}/permissions/${permissionCode}`,
    { withCredentials: true }
  );
}

/**
 * Thêm nhiều permissions vào role
 * POST /api/roles/{role}/permissions/batch
 */
export async function addMultiplePermissionsToRole(
  role: string,
  permissionCodes: string[]
): Promise<void> {
  await axios.post(
    `${IAM_URL}/api/roles/${role.toLowerCase()}/permissions/batch`,
    { permissionCodes },
    { withCredentials: true }
  );
}

/**
 * Update toàn bộ permissions của role
 * PUT /api/roles/{role}/permissions
 */
export async function updateRolePermissions(
  role: string,
  permissionCodes: string[]
): Promise<void> {
  await axios.put(
    `${IAM_URL}/api/roles/${role.toLowerCase()}/permissions`,
    { permissionCodes },
    { withCredentials: true }
  );
}

