"use client";
import React from 'react';
import { useRolePermissions } from '@/src/hooks/useRolePermissions';
import { useNotifications } from '@/src/hooks/useNotifications';
import { getAllPermissions, Permission } from '@/src/services/iam';

export default function RolePermissionManager() {
  const { show } = useNotifications();
  const {
    roles,
    selectedRole,
    permissions,
    loadingRoles,
    loadingPermissions,
    error,
    handleSelectRole,
    handleAddPermission,
    handleRemovePermission,
  } = useRolePermissions();
  
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [allPermissions, setAllPermissions] = React.useState<string[]>([]);


  if (loadingRoles) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Role & Permission Management</h2>
        <div className="text-center py-12 text-slate-500">Loading roles...</div>
      </div>
    );
  }

  if (error && roles.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Role & Permission Management</h2>
        <div className="text-center py-12 text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-semibold text-slate-800">
          🔐 Role & Permission Management
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Quản lý roles và permissions của hệ thống
        </p>
      </div>

      {/* Content */}
      <div className="grid grid-cols-2 divide-x divide-slate-200">
        {/* Left: Roles List */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            👥 Roles ({roles.length})
          </h3>
          
          {roles.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No roles found</div>
          ) : (
            <div className="space-y-2">
              {roles.map((role) => {
                // Handle both string and object format
                const roleName = typeof role === 'string' ? role : role.name;
                const roleDesc = typeof role === 'object' ? role.description : undefined;
                
                if (!roleName) {
                  console.warn('Invalid role data:', role);
                  return null;
                }
                
                return (
                  <button
                    key={roleName}
                    onClick={() => handleSelectRole(roleName)}
                    className={`w-full text-left p-4 rounded-lg border transition ${
                      selectedRole === roleName
                        ? 'border-[#6B9B6E] bg-green-50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800 capitalize">
                          {roleName.replace(/_/g, ' ')}
                        </div>
                        {roleDesc && (
                          <div className="text-sm text-slate-500 mt-0.5">
                            {roleDesc}
                          </div>
                        )}
                      </div>
                      {selectedRole === roleName && (
                        <div className="text-[#6B9B6E] text-xl">✓</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Permissions */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">
              🔑 Permissions
            </h3>
            {selectedRole && (
              <button
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  if (!isEditMode) {
                    // Load all permissions when entering edit mode
                    getAllPermissions()
                      .then(setAllPermissions)
                      .catch(err => show(`Failed to load permissions: ${err.message}`, 'error'));
                  }
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                  isEditMode
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-[#6B9B6E] text-white hover:bg-[#5a8259]'
                }`}
              >
                {isEditMode ? '✓ Done' : '✏️ Edit'}
              </button>
            )}
          </div>

          {!selectedRole ? (
            <div className="text-center py-12 text-slate-500">
              ← Select a role to view its permissions
            </div>
          ) : loadingPermissions ? (
            <div className="text-center py-12 text-slate-500">
              Loading permissions...
            </div>
          ) : permissions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No permissions found for this role
            </div>
          ) : (
            <div>
              <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-600">
                      Permissions for:
                    </div>
                    <div className="font-semibold text-slate-800 capitalize">
                      {selectedRole?.replace(/_/g, ' ') || 'N/A'}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {permissions.length} permission(s)
                    </div>
                  </div>
                  {isEditMode && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="px-3 py-1.5 bg-[#6B9B6E] text-white text-sm font-medium rounded-md hover:bg-[#5a8259] transition"
                    >
                      + Add Permission
                    </button>
                  )}
                </div>
              </div>

              {/* Group permissions by service */}
              <PermissionGroups 
                permissions={permissions} 
                isEditMode={isEditMode}
                onRemove={async (code) => {
                  try {
                    await handleRemovePermission(code);
                    show('Permission removed successfully', 'success');
                  } catch (err: any) {
                    show(`Error: ${err.message}`, 'error');
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Add Permission Modal */}
      {showAddModal && (
        <AddPermissionModal
          allPermissions={allPermissions}
          currentPermissions={permissions}
          onAdd={async (code) => {
            try {
              await handleAddPermission(code);
              show('Permission added successfully', 'success');
            } catch (err: any) {
              show(`Error: ${err.message}`, 'error');
            }
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

/**
 * Component: PermissionGroups
 * Group permissions by service prefix
 */
function PermissionGroups({ 
  permissions, 
  isEditMode = false,
  onRemove 
}: { 
  permissions: any[]; 
  isEditMode?: boolean;
  onRemove?: (code: string) => void;
}) {
  // Group by service prefix (e.g., "tenant.", "building.", "iam.")
  const grouped = permissions.reduce((acc, perm) => {
    const prefix = perm.code.split('.')[0]; // "tenant.create" → "tenant"
    if (!acc[prefix]) {
      acc[prefix] = [];
    }
    acc[prefix].push(perm);
    return acc;
  }, {} as Record<string, any[]>);

  const serviceNames: Record<string, string> = {
    tenant: '🏢 Tenant Management',
    building: '🏗️ Building Management',
    unit: '🏠 Unit Management',
    iam: '🔐 IAM Service',
    user: '👤 User Management',
    role: '👥 Role Management',
    invoice: '💰 Invoice Management',
    billing: '💳 Billing Management',
    maintenance: '🔧 Maintenance',
    report: '📊 Report',
    finance: '💵 Finance',
    system: '⚙️ System',
  };

  return (
    <div className="space-y-4">
      {(Object.entries(grouped) as [string, any[]][]).map(([service, perms]) => (
        <div key={service} className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 font-medium text-slate-700 text-sm">
            {serviceNames[service] || service.toUpperCase()}
          </div>
          <div className="p-3 space-y-1">
            {perms.map((perm: any) => (
              <div
                key={perm.code}
                className="flex items-start gap-2 py-1.5 px-2 hover:bg-slate-50 rounded group"
              >
                <span className="text-green-600 mt-0.5">✓</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-800 font-mono">
                    {perm.code}
                  </div>
                  {perm.description && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {perm.description}
                    </div>
                  )}
                </div>
                {isEditMode && onRemove && (
                  <button
                    onClick={() => onRemove(perm.code)}
                    className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition"
                    title="Remove permission"
                  >
                    ✕ Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Component: AddPermissionModal
 * Modal to select permissions to add to role
 */
function AddPermissionModal({
  allPermissions,
  currentPermissions,
  onAdd,
  onClose,
}: {
  allPermissions: string[];
  currentPermissions: any[];
  onAdd: (code: string) => Promise<void>;
  onClose: () => void;
}) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedService, setSelectedService] = React.useState<string>('all');

  // Filter out permissions that are already assigned
  const currentCodes = new Set(currentPermissions.map(p => p.code));
  const availablePermissions = allPermissions.filter(code => !currentCodes.has(code));

  // Group by service
  const grouped = availablePermissions.reduce((acc, perm) => {
    const prefix = perm.split('.')[0];
    if (!acc[prefix]) {
      acc[prefix] = [];
    }
    acc[prefix].push(perm);
    return acc;
  }, {} as Record<string, string[]>);

  // Filter by search term and selected service
  const filtered = availablePermissions.filter(perm => {
    const matchesSearch = perm.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesService = selectedService === 'all' || perm.startsWith(selectedService + '.');
    return matchesSearch && matchesService;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-[#6B9B6E] text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Add Permission</h3>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-200 space-y-3">
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6B9B6E]"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedService('all')}
              className={`px-3 py-1 text-sm rounded-full transition ${
                selectedService === 'all'
                  ? 'bg-[#6B9B6E] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All ({availablePermissions.length})
            </button>
            {Object.keys(grouped).map(service => (
              <button
                key={service}
                onClick={() => setSelectedService(service)}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  selectedService === service
                    ? 'bg-[#6B9B6E] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {service} ({grouped[service].length})
              </button>
            ))}
          </div>
        </div>

        {/* Permission List */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-200px)]">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {availablePermissions.length === 0
                ? 'All permissions are already assigned'
                : 'No permissions found'}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(perm => (
                <button
                  key={perm}
                  onClick={async () => {
                    await onAdd(perm);
                    onClose();
                  }}
                  className="w-full text-left p-3 border border-slate-200 rounded-lg hover:border-[#6B9B6E] hover:bg-green-50 transition group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-slate-800 font-mono text-sm">
                        {perm}
                      </div>
                    </div>
                    <div className="text-[#6B9B6E] opacity-0 group-hover:opacity-100 transition">
                      + Add
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
