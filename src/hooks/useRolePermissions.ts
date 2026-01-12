/**
 * Hook: useRolePermissions
 * Quản lý roles và permissions trong hệ thống
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  getAllRoles, 
  getPermissionsByRole,
  addPermissionToRole,
  removePermissionFromRole,
  Role, 
  Permission 
} from '@/src/services/iam';

export function useRolePermissions() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all roles
  useEffect(() => {
    const loadRoles = async () => {
      try {
        setLoadingRoles(true);
        setError(null);
        const data = await getAllRoles();
        setRoles(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load roles');
        console.error('Failed to load roles:', err);
      } finally {
        setLoadingRoles(false);
      }
    };

    loadRoles();
  }, []);

  // Load permissions when role is selected
  const handleSelectRole = useCallback(async (roleName: string) => {
    setSelectedRole(roleName);
    
    try {
      setLoadingPermissions(true);
      setError(null);
      const data = await getPermissionsByRole(roleName);
      setPermissions(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load permissions');
      console.error(`Failed to load permissions for role ${roleName}:`, err);
      setPermissions([]);
    } finally {
      setLoadingPermissions(false);
    }
  }, []);

  
  const handleAddPermission = useCallback(async (permissionCode: string) => {
    if (!selectedRole) return;
    
    try {
      await addPermissionToRole(selectedRole, permissionCode);
      // Reload permissions
      await handleSelectRole(selectedRole);
    } catch (err: any) {
      setError(err?.message || 'Failed to add permission');
      throw err;
    }
  }, [selectedRole, handleSelectRole]);

  // Action: Remove permission from role
  const handleRemovePermission = useCallback(async (permissionCode: string) => {
    if (!selectedRole) return;
    
    try {
      await removePermissionFromRole(selectedRole, permissionCode);
      // Reload permissions
      await handleSelectRole(selectedRole);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove permission');
      throw err;
    }
  }, [selectedRole, handleSelectRole]);

  return {
    roles,
    selectedRole,
    permissions,
    loadingRoles,
    loadingPermissions,
    error,
    handleSelectRole,
    handleAddPermission,
    handleRemovePermission,
  };
}

