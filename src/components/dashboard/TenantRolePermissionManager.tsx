"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Tenant } from '@/src/services/base';
import {
  getSelectedRolesInTenant,
  getRolePermissionSummary,
  grantPermissionsToRole,
  revokePermissionsFromRole,
  RolePermissionSummaryDto,
  getAllPermissions,
} from '@/src/services/iam';
import { useNotifications } from '@/src/hooks/useNotifications';

type Props = {
  tenant: Tenant;
  onBack: () => void;
};

export default function TenantRolePermissionManager({ tenant, onBack }: Props) {
  const { show } = useNotifications();
  
  const [roles, setRoles] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [summary, setSummary] = useState<RolePermissionSummaryDto | null>(null);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load roles
  useEffect(() => {
    loadRoles();
    loadAllPermissions();
  }, [tenant.id]);

  // Load summary when role selected
  useEffect(() => {
    if (selectedRole) {
      loadSummary(selectedRole);
    }
  }, [selectedRole]);

  const loadRoles = async () => {
    try {
      setLoadingRoles(true);
      console.log('🔍 Loading roles for tenant:', tenant.id);
      
      const data = await getSelectedRolesInTenant(tenant.id);
      
      // Remove duplicates (case-insensitive) but keep lowercase for API calls
      const lowerCaseRoles = data.map(role => role.toLowerCase());
      const uniqueRoles = Array.from(new Set(lowerCaseRoles));
      
      console.log('✅ Raw roles from backend:', data);
      console.log('✅ Unique roles (lowercase):', uniqueRoles);
      
      setRoles(uniqueRoles);
      if (uniqueRoles.length > 0 && !selectedRole) {
        setSelectedRole(uniqueRoles[0]);
      }
    } catch (err: any) {
      console.error('❌ Failed to load roles:', err);
      console.error('❌ Tenant ID:', tenant.id);
      console.error('❌ Error status:', err?.response?.status);
      console.error('❌ Error message:', err?.response?.data);
      
      // Check if 403 - permission denied
      if (err?.response?.status === 403) {
        show('Bạn không có quyền xem roles của tenant này', 'error');
      } else {
        show(`Lỗi tải roles: ${err.message}`, 'error');
      }
      
      // Set empty array so UI shows gracefully
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadSummary = async (role: string) => {
    try {
      setLoadingSummary(true);
      console.log('📡 Loading summary for role:', role, '(lowercase)');
      const data = await getRolePermissionSummary(tenant.id, role);
      
      // Defensive: Ensure all arrays exist
      const safeSummary: RolePermissionSummaryDto = {
        tenantId: data.tenantId,
        role: data.role,
        totalPermissions: data.totalPermissions || 0,
        grantedPermissions: data.grantedPermissions || [],
        deniedPermissions: data.deniedPermissions || [],
        effectivePermissions: data.effectivePermissions || [],
        inheritedFromGlobal: data.inheritedFromGlobal || [],
      };
      
      console.log('📦 Summary data from backend:', data);
      console.log('✅ Safe summary:', safeSummary);
      console.log('📊 Counts:', {
        granted: safeSummary.grantedPermissions?.length,
        denied: safeSummary.deniedPermissions?.length,
        effective: safeSummary.effectivePermissions?.length,
        inherited: safeSummary.inheritedFromGlobal?.length,
      });
      
      setSummary(safeSummary);
    } catch (err: any) {
      show(`Lỗi tải permissions: ${err.message}`, 'error');
      console.error('Failed to load summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadAllPermissions = async () => {
    try {
      const data = await getAllPermissions();
      setAllPermissions(data);
    } catch (err: any) {
      console.error('Failed to load all permissions:', err);
    }
  };

  const handleAddPermission = async (permissionCode: string) => {
    if (!selectedRole) return;
    
    try {
      await grantPermissionsToRole(tenant.id, {
        role: selectedRole,
        permissionCodes: [permissionCode],
      });
      show('Thêm permission thành công', 'success');
      await loadSummary(selectedRole);
      setShowAddModal(false);
    } catch (err: any) {
      show(`Lỗi thêm permission: ${err.message}`, 'error');
    }
  };

  const handleRemovePermission = async (permissionCode: string) => {
    if (!selectedRole) return;
    
    if (!confirm(`Xóa permission "${permissionCode}" khỏi role "${selectedRole}"?`)) {
      return;
    }

    try {
      await revokePermissionsFromRole(tenant.id, {
        role: selectedRole,
        permissionCodes: [permissionCode],
      });
      show('Xóa permission thành công', 'success');
      await loadSummary(selectedRole);
    } catch (err: any) {
      show(`Lỗi xóa permission: ${err.message}`, 'error');
    }
  };

  // Group permissions by service
  const groupPermissionsByService = (permissions: string[]) => {
    const groups: Record<string, string[]> = {};
    
    permissions.forEach(code => {
      const service = code.split('.')[0] || 'other';
      if (!groups[service]) {
        groups[service] = [];
      }
      groups[service].push(code);
    });
    
    return groups;
  };

  const serviceLabels: Record<string, string> = {
    iam: '🔐 IAM - Identity & Access',
    base: '🏢 Base - Tenant/Building/Unit',
    finance: '💰 Finance - Billing/Invoice',
    maintenance: '🔧 Maintenance - Request/Task',
    customer: '👤 Customer - Profile/Contract',
    report: '📊 Report',
    system: '⚙️ System',
  };

  if (loadingRoles) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="text-center py-12 text-slate-500">Loading roles...</div>
      </div>
    );
  }

  if (!loadingRoles && roles.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Tenant Role & Permission Management</h2>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition"
          >
            ← Quay lại
          </button>
        </div>
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            Không thể tải dữ liệu
          </h3>
          <p className="text-slate-600 mb-4">
            Tenant này chưa có role nào được chọn<br />
            hoặc bạn không có quyền xem thông tin này.
          </p>
          <div className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4 max-w-md mx-auto">
            <p className="font-medium mb-2">Kiểm tra:</p>
            <ul className="text-left space-y-1">
              <li>• User của bạn có quyền <code className="bg-slate-200 px-1 rounded">canManagePermissions</code></li>
              <li>• Tenant ID: <code className="bg-slate-200 px-1 rounded">{tenant.id}</code></li>
              <li>• Backend logs để xem chi tiết lỗi</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-[#6B9B6E] text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Tenant Role & Permission Management</h2>
            <p className="text-sm opacity-90 mt-1">
              Tenant: {tenant.name} ({tenant.code})
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md transition"
          >
            ← Quay lại
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 divide-x divide-slate-200">
        {/* Sidebar: Role List */}
        <div className="col-span-3 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
            Roles ({roles.length})
          </h3>
          <div className="space-y-1">
            {roles.map((role, index) => (
              <button
                key={`${role}-${index}`}
                onClick={() => setSelectedRole(role)}
                className={`w-full text-left px-3 py-2 rounded-md transition ${
                  selectedRole === role
                    ? 'bg-[#6B9B6E] text-white shadow'
                    : 'hover:bg-white text-slate-700'
                }`}
              >
                <div className="font-medium uppercase">{role}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main: Permissions */}
        <div className="col-span-9 p-6">
          {!selectedRole ? (
            <div className="text-center py-12 text-slate-500">
              ← Chọn role bên trái
            </div>
          ) : loadingSummary ? (
            <div className="text-center py-12 text-slate-500">Loading permissions...</div>
          ) : !summary ? (
            <div className="text-center py-12 text-slate-500">Không có dữ liệu</div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    🔑 Permissions for: <span className="uppercase">{selectedRole}</span>
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {summary.grantedPermissions?.length || 0} granted
                    {(summary.deniedPermissions?.length || 0) > 0 && `, ${summary.deniedPermissions.length} denied`}
                    {(summary.effectivePermissions?.length || 0) > 0 && `, ${summary.effectivePermissions.length} effective`}
                    {(summary.inheritedFromGlobal?.length || 0) > 0 && `, ${summary.inheritedFromGlobal.length} inherited`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isEditMode && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-3 py-1.5 bg-[#6B9B6E] text-white rounded-md hover:bg-[#5a8259] transition text-sm font-medium"
                    >
                      + Add Permission
                    </button>
                  )}
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`px-3 py-1.5 rounded-md transition text-sm font-medium ${
                      isEditMode
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-[#6B9B6E] text-white hover:bg-[#5a8259]'
                    }`}
                  >
                    {isEditMode ? '✓ Done' : '✏️ Edit'}
                  </button>
                </div>
              </div>

              {/* Effective Permissions (if provided by backend) */}
              {summary.effectivePermissions && summary.effectivePermissions.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-slate-700 mb-3">
                    ⚡ Effective Permissions ({summary.effectivePermissions.length})
                  </h4>
                  <p className="text-xs text-slate-500 mb-2">Final permissions after applying grants, denies, and inheritance</p>
                  <div className="space-y-4">
                    {Object.entries(groupPermissionsByService(summary.effectivePermissions)).map(
                      ([service, perms]) => (
                        <div key={service} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                          <h5 className="font-medium text-slate-700 mb-2">
                            {serviceLabels[service] || service}
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {perms.map(perm => (
                              <div
                                key={perm}
                                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 border border-blue-300 rounded-md text-sm"
                              >
                                <span className="text-blue-700 font-mono">{perm}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Granted Permissions */}
              {summary.grantedPermissions && summary.grantedPermissions.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-slate-700 mb-3">
                    ✅ Granted Permissions ({summary.grantedPermissions.length})
                  </h4>
                  <p className="text-xs text-slate-500 mb-2">Permissions explicitly granted to this role in this tenant</p>
                  <div className="space-y-4">
                    {Object.entries(groupPermissionsByService(summary.grantedPermissions)).map(
                      ([service, perms]) => (
                        <div key={service} className="border border-slate-200 rounded-lg p-4">
                          <h5 className="font-medium text-slate-700 mb-2">
                            {serviceLabels[service] || service}
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {perms.map(perm => (
                              <div
                                key={perm}
                                className="group relative inline-flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-md text-sm"
                              >
                                <span className="text-green-700 font-mono">{perm}</span>
                                {isEditMode && (
                                  <button
                                    onClick={() => handleRemovePermission(perm)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-100 rounded px-1"
                                    title="Remove permission"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Denied Permissions */}
              {summary.deniedPermissions && summary.deniedPermissions.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-slate-700 mb-3">
                    ⛔ Denied Permissions ({summary.deniedPermissions.length})
                  </h4>
                  <p className="text-xs text-slate-500 mb-2">Permissions explicitly denied for this role</p>
                  <div className="space-y-4">
                    {Object.entries(groupPermissionsByService(summary.deniedPermissions)).map(
                      ([service, perms]) => (
                        <div key={service} className="border border-red-200 rounded-lg p-4 bg-red-50">
                          <h5 className="font-medium text-slate-600 mb-2">
                            {serviceLabels[service] || service}
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {perms.map(perm => (
                              <div
                                key={perm}
                                className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 border border-red-300 rounded-md text-sm"
                              >
                                <span className="text-red-700 font-mono">{perm}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Inherited Permissions */}
              {summary.inheritedFromGlobal && summary.inheritedFromGlobal.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-semibold text-slate-700 mb-3">
                    🔗 Inherited from Global ({summary.inheritedFromGlobal.length})
                  </h4>
                  <p className="text-xs text-slate-500 mb-2">Permissions inherited from global role definition</p>
                  <div className="space-y-4">
                    {Object.entries(groupPermissionsByService(summary.inheritedFromGlobal)).map(
                      ([service, perms]) => (
                        <div key={service} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                          <h5 className="font-medium text-slate-600 mb-2">
                            {serviceLabels[service] || service}
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {perms.map(perm => (
                              <div
                                key={perm}
                                className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-300 rounded-md text-sm"
                              >
                                <span className="text-slate-600 font-mono">{perm}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {(!summary.grantedPermissions || summary.grantedPermissions.length === 0) && 
               (!summary.deniedPermissions || summary.deniedPermissions.length === 0) &&
               (!summary.effectivePermissions || summary.effectivePermissions.length === 0) &&
               (!summary.inheritedFromGlobal || summary.inheritedFromGlobal.length === 0) && (
                <div className="text-center py-12 text-slate-500">
                  Role này chưa có permission nào
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Permission Modal */}
      {showAddModal && (
        <AddPermissionModal
          availablePermissions={allPermissions.filter(
            p => !(summary?.grantedPermissions || []).includes(p)
          )}
          onAdd={handleAddPermission}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

// ========== Add Permission Modal ==========

type AddPermissionModalProps = {
  availablePermissions: string[];
  onAdd: (code: string) => void;
  onClose: () => void;
};

function AddPermissionModal({ availablePermissions, onAdd, onClose }: AddPermissionModalProps) {
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState<string>('all');

  const services = Array.from(
    new Set(availablePermissions.map(p => p.split('.')[0]))
  ).sort();

  const filteredPermissions = availablePermissions.filter(p => {
    const matchSearch = p.toLowerCase().includes(search.toLowerCase());
    const matchService = selectedService === 'all' || p.startsWith(selectedService + '.');
    return matchSearch && matchService;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-[#6B9B6E] text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Add Permission</h3>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1.5 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-slate-200 space-y-3">
          <input
            type="text"
            placeholder="Search permissions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6B9B6E]"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedService('all')}
              className={`px-3 py-1 rounded-md text-sm ${
                selectedService === 'all'
                  ? 'bg-[#6B9B6E] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {services.map(service => (
              <button
                key={service}
                onClick={() => setSelectedService(service)}
                className={`px-3 py-1 rounded-md text-sm ${
                  selectedService === service
                    ? 'bg-[#6B9B6E] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {service}
              </button>
            ))}
          </div>
        </div>

        {/* Permission List */}
        <div className="px-6 py-4 overflow-y-auto max-h-96">
          {filteredPermissions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Không tìm thấy permission
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPermissions.map(perm => (
                <button
                  key={perm}
                  onClick={() => onAdd(perm)}
                  className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:border-[#6B9B6E] hover:bg-green-50 transition group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-mono text-sm text-slate-800 group-hover:text-[#6B9B6E]">
                        {perm}
                      </div>
                    </div>
                    <span className="text-[#6B9B6E] opacity-0 group-hover:opacity-100 transition">
                      + Add
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

