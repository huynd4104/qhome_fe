/**
 * Service for Tenant-specific Role & Permission Management
 * Maps to TenantRolePermissionController.java
 */

import axios from '@/src/lib/axios';

const IAM_URL = process.env.NEXT_PUBLIC_IAM_URL || 'http://localhost:8088';

// ========== Types ==========

export interface RolePermissionDto {
  id: string;
  tenantId: string;
  role: string;
  permissionCode: string;
  grantedBy: string;
  grantedAt: string;
  customConfig?: any;
}

export interface RolePermissionSummaryDto {
  tenantId: string;
  role: string;
  totalPermissions: number;
  grantedPermissions?: string[];    // Permissions granted to this role in this tenant
  deniedPermissions?: string[];     // Permissions denied (if any)
  effectivePermissions?: string[];  // Final effective permissions
  inheritedFromGlobal?: string[];   // Inherited from global role (if backend provides)
}

export interface RolePermissionGrantRequest {
  role: string;
  permissionCodes: string[];
}

export interface RolePermissionRevokeRequest {
  role: string;
  permissionCodes: string[];
}

// ========== API Functions ==========

/**
 * Lấy danh sách roles đã được chọn trong tenant
 * GET /api/tenant-role-permissions/getSelectedRoles/{tenantId}
 */
export async function getSelectedRolesInTenant(tenantId: string): Promise<string[]> {
  const response = await axios.get(
    `${IAM_URL}/api/tenant-role-permissions/getSelectedRoles/${tenantId}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Lấy tất cả permissions hiệu lực trong tenant
 * GET /api/tenant-role-permissions/permissions/{tenantId}
 */
export async function getAllEffectivePermissionsInTenant(tenantId: string): Promise<string[]> {
  const response = await axios.get(
    `${IAM_URL}/api/tenant-role-permissions/permissions/${tenantId}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Lấy permissions của 1 role trong tenant
 * GET /api/tenant-role-permissions/{tenantId}/{role}
 */
export async function getRolePermissionsInTenant(
  tenantId: string,
  role: string
): Promise<RolePermissionDto[]> {
  const response = await axios.get(
    `${IAM_URL}/api/tenant-role-permissions/${tenantId}/${role.toLowerCase()}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Lấy summary của permissions cho 1 role trong tenant
 * GET /api/tenant-role-permissions/summary/{tenantId}/{role}
 */
export async function getRolePermissionSummary(
  tenantId: string,
  role: string
): Promise<RolePermissionSummaryDto> {
  const response = await axios.get(
    `${IAM_URL}/api/tenant-role-permissions/summary/${tenantId}/${role.toLowerCase()}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Grant permissions cho role trong tenant
 * POST /api/tenant-role-permissions/grant/{tenantId}
 */
export async function grantPermissionsToRole(
  tenantId: string,
  request: RolePermissionGrantRequest
): Promise<void> {
  await axios.post(
    `${IAM_URL}/api/tenant-role-permissions/grant/${tenantId}`,
    {
      role: request.role.toLowerCase(),
      permissionCodes: request.permissionCodes,
    },
    { withCredentials: true }
  );
}

/**
 * Revoke permissions từ role trong tenant
 * POST /api/tenant-role-permissions/revoke/{tenantId}
 */
export async function revokePermissionsFromRole(
  tenantId: string,
  request: RolePermissionRevokeRequest
): Promise<void> {
  await axios.post(
    `${IAM_URL}/api/tenant-role-permissions/revoke/${tenantId}`,
    {
      role: request.role.toLowerCase(),
      permissionCodes: request.permissionCodes,
    },
    { withCredentials: true }
  );
}

/**
 * Xóa tất cả permissions của 1 role trong tenant
 * DELETE /api/tenant-role-permissions/{tenantId}/{role}
 */
export async function removeAllPermissionsForRole(
  tenantId: string,
  role: string
): Promise<void> {
  await axios.delete(
    `${IAM_URL}/api/tenant-role-permissions/${tenantId}/${role.toLowerCase()}`,
    { withCredentials: true }
  );
}

/**
 * Lấy danh sách roles có permissions trong tenant
 * GET /api/tenant-role-permissions/roles/{tenantId}
 */
export async function getRolesWithPermissionsInTenant(tenantId: string): Promise<string[]> {
  const response = await axios.get(
    `${IAM_URL}/api/tenant-role-permissions/roles/${tenantId}`,
    { withCredentials: true }
  );
  return response.data;
}

