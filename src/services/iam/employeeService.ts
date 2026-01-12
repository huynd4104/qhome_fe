/**
 * Employee & Role Management Service
 * Maps to EmployeeRoleManagementController.java and UserController.java
 */

import axios from '@/src/lib/axios';

const IAM_URL = process.env.NEXT_PUBLIC_IAM_URL || 'http://localhost:8088';

// ========== Types ==========

export interface UserInfoDto {
  id?: string;              // Frontend expects this
  userId?: string;          // Backend returns this
  username: string;
  email: string;
  tenantId?: string;
  tenantName?: string;
  roles: string[];
  permissions: string[];
}

export interface EmployeeRoleDto {
  userId: string;
  username: string;
  email: string;
  fullName?: string;
  department?: string;
  position?: string;
  assignedRoles: AssignedRoleInfo[];
  totalPermissions: number;
}

export interface AssignedRoleInfo {
  roleName: string;
  assignedAt: string;
  assignedBy: string;
}

export interface AvailableRoleDto {
  roleName: string;
  description?: string;
  permissionCount: number;
  category?: string;
}

export interface AvailablePermissionDto {
  service: string;
  permissions: PermissionInfo[];
}

export interface PermissionInfo {
  code: string;
  description?: string;
}

export interface RoleAssignmentRequest {
  userId: string;
  tenantId: string;
  roleNames: string[];
}

export interface RoleRemovalRequest {
  userId: string;
  tenantId: string;
  roleNames: string[];
}

// ========== API Functions ==========

/**
 * Lấy danh sách staff available (chưa được assign vào tenant nào)
 * GET /api/users/available-staff
 */
export async function getAvailableStaff(): Promise<UserInfoDto[]> {
  const response = await axios.get(
    `${IAM_URL}/api/users/available-staff`,
    { withCredentials: true }
  );
  
  // Map userId to id for frontend consistency
  const staff = response.data.map((user: any) => ({
    ...user,
    id: user.userId || user.id,  // Use userId if available, fallback to id
  }));
  
  return staff;
}

/**
 * Lấy danh sách employees trong 1 tenant
 * GET /api/employee-roles/tenant/{tenantId}
 */
export async function getEmployeesInTenant(tenantId: string): Promise<EmployeeRoleDto[]> {
  const response = await axios.get(
    `${IAM_URL}/api/employee-roles/tenant/${tenantId}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Lấy chi tiết 1 employee trong tenant
 * GET /api/employee-roles/employee/{userId}?tenantId={tenantId}
 */
export async function getEmployeeDetails(
  userId: string,
  tenantId: string
): Promise<EmployeeRoleDto> {
  const response = await axios.get(
    `${IAM_URL}/api/employee-roles/employee/${userId}`,
    {
      params: { tenantId },
      withCredentials: true,
    }
  );
  return response.data;
}

/**
 * Lấy danh sách roles available cho tenant
 * GET /api/employee-roles/available-roles/{tenantId}
 */
export async function getAvailableRoles(tenantId: string): Promise<AvailableRoleDto[]> {
  const response = await axios.get(
    `${IAM_URL}/api/employee-roles/available-roles/${tenantId}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Lấy danh sách permissions available (grouped by service)
 * GET /api/employee-roles/available-permissions
 */
export async function getAvailablePermissions(): Promise<AvailablePermissionDto[]> {
  const response = await axios.get(
    `${IAM_URL}/api/employee-roles/available-permissions`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Assign roles cho employee trong tenant
 * POST /api/employee-roles/assign?userId={userId}&tenantId={tenantId}
 * Body: ["role1", "role2"]
 */
export async function assignRolesToEmployee(
  userId: string,
  tenantId: string,
  roleNames: string[]
): Promise<void> {
  await axios.post(
    `${IAM_URL}/api/employee-roles/assign`,
    roleNames,
    {
      params: { userId, tenantId },
      withCredentials: true,
    }
  );
}

/**
 * Remove roles khỏi employee trong tenant
 * POST /api/employee-roles/remove
 * Body: { userId, tenantId, roleNames }
 */
export async function removeRolesFromEmployee(
  request: RoleRemovalRequest
): Promise<void> {
  await axios.post(
    `${IAM_URL}/api/employee-roles/remove`,
    request,
    { withCredentials: true }
  );
}

/**
 * Lấy permissions của 1 employee trong tenant
 * GET /api/employee-roles/employee/{userId}/permissions?tenantId={tenantId}
 */
export async function getEmployeePermissions(
  userId: string,
  tenantId: string
): Promise<string[]> {
  const response = await axios.get(
    `${IAM_URL}/api/employee-roles/employee/${userId}/permissions`,
    {
      params: { tenantId },
      withCredentials: true,
    }
  );
  return response.data;
}

/**
 * Lấy employees theo department trong tenant
 * GET /api/employee-roles/tenant/{tenantId}/department/{department}
 */
export async function getEmployeesByDepartment(
  tenantId: string,
  department: string
): Promise<EmployeeRoleDto[]> {
  const response = await axios.get(
    `${IAM_URL}/api/employee-roles/tenant/${tenantId}/department/${department}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Lấy employees theo role trong tenant
 * GET /api/employee-roles/tenant/{tenantId}/role/{roleName}
 */
export async function getEmployeesByRole(
  tenantId: string,
  roleName: string
): Promise<EmployeeRoleDto[]> {
  const response = await axios.get(
    `${IAM_URL}/api/employee-roles/tenant/${tenantId}/role/${roleName.toLowerCase()}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getEmployeesByRoleNew(
  roleName: string
): Promise<EmployeeRoleDto[]> {
  const response = await axios.get(
    `${IAM_URL}/api/employees/role/${roleName.toUpperCase()}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getEmployees(
): Promise<UserInfoDto[]> {
  const response = await axios.get(
    `${IAM_URL}/api/employees`,
    { withCredentials: true }
  );
  console.log('Available staff:', response.data);
  return response.data;
}

/**
 * Employee DTO từ backend
 */
export interface EmployeeDto {
  userId: string;
  username: string;
  fullName?: string;
  email: string;
  phoneNumber?: string;
  department?: string;
  position?: string;
  tenantId?: string;
  tenantName?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  permissionStatus?: string;
  grantedOverrides?: number;
  deniedOverrides?: number;
  totalOverrides?: number;
  hasTemporaryPermissions?: boolean;
  lastPermissionChange?: string;
}

/**
 * Lấy chi tiết employee theo userId (từ EmployeeManagementController)
 * GET /api/employees/{userId}
 */
export async function getEmployeeDetailsById(userId: string): Promise<EmployeeDto> {
  const response = await axios.get(
    `${IAM_URL}/api/employees/${userId}`,
    { withCredentials: true }
  );
  return response.data;
}