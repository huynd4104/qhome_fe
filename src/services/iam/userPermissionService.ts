import axios from '@/src/lib/axios';

const IAM_URL = 'http://localhost:8088';

// ========== Types ==========

export interface UserPermissionSummaryDto {
  userId: string;
  tenantId: string;
  inheritedFromRoles?: string[];      // From roles (optional - may be null from backend)
  grantedPermissions?: string[];      // Direct grants to user (optional)
  deniedPermissions?: string[];       // Direct denies to user (optional)
  effectivePermissions?: string[];    // Final calculated permissions (optional)
}

export interface UserPermissionGrantRequest {
  userId?: string;
  tenantId?: string;
  permissionCodes: string[];
}

export interface UserPermissionDenyRequest {
  userId?: string;
  tenantId?: string;
  permissionCodes: string[];
}

export interface UserPermissionRevokeRequest {
  userId?: string;
  tenantId?: string;
  permissionCodes: string[];
}

// ========== API Functions ==========

/**
 * Get permission summary for a user in a tenant
 * GET /api/user-permissions/summary/{tenantId}/{userId}
 */
export async function getUserPermissionSummary(
  userId: string,
  tenantId: string
): Promise<UserPermissionSummaryDto> {
  const response = await axios.get(
    `${IAM_URL}/api/user-permissions/summary/${tenantId}/${userId}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Grant permissions directly to a user
 * POST /api/user-permissions/grant/{tenantId}/{userId}
 */
export async function grantPermissionsToUser(
  userId: string,
  tenantId: string,
  permissionCodes: string[]
): Promise<void> {
  await axios.post(
    `${IAM_URL}/api/user-permissions/grant/${tenantId}/${userId}`,
    { permissionCodes },
    { withCredentials: true }
  );
}

/**
 * Deny permissions directly to a user
 * POST /api/user-permissions/deny/{tenantId}/{userId}
 */
export async function denyPermissionsToUser(
  userId: string,
  tenantId: string,
  permissionCodes: string[]
): Promise<void> {
  await axios.post(
    `${IAM_URL}/api/user-permissions/deny/${tenantId}/${userId}`,
    { permissionCodes },
    { withCredentials: true }
  );
}

/**
 * Revoke granted permissions from a user
 * POST /api/user-permissions/revoke-grants/{tenantId}/{userId}
 */
export async function revokeGrantsFromUser(
  userId: string,
  tenantId: string,
  permissionCodes: string[]
): Promise<void> {
  await axios.post(
    `${IAM_URL}/api/user-permissions/revoke-grants/${tenantId}/${userId}`,
    { permissionCodes },
    { withCredentials: true }
  );
}

/**
 * Revoke denied permissions from a user
 * POST /api/user-permissions/revoke-denies/{tenantId}/{userId}
 */
export async function revokeDeniesFromUser(
  userId: string,
  tenantId: string,
  permissionCodes: string[]
): Promise<void> {
  await axios.post(
    `${IAM_URL}/api/user-permissions/revoke-denies/${tenantId}/${userId}`,
    { permissionCodes },
    { withCredentials: true }
  );
}

/**
 * Get active granted permissions for a user
 * GET /api/user-permissions/grants/{tenantId}/{userId}
 */
export async function getActiveGrants(
  userId: string,
  tenantId: string
): Promise<string[]> {
  const response = await axios.get(
    `${IAM_URL}/api/user-permissions/grants/${tenantId}/${userId}`,
    { withCredentials: true }
  );
  return response.data;
}

/**
 * Get active denied permissions for a user
 * GET /api/user-permissions/denies/{tenantId}/{userId}
 */
export async function getActiveDenies(
  userId: string,
  tenantId: string
): Promise<string[]> {
  const response = await axios.get(
    `${IAM_URL}/api/user-permissions/denies/${tenantId}/${userId}`,
    { withCredentials: true }
  );
  return response.data;
}

