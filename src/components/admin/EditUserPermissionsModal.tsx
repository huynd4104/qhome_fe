"use client";
import React, { useState, useEffect } from 'react';
import {
  getUserPermissionSummary,
  grantPermissionsToUser,
  denyPermissionsToUser,
  revokeGrantsFromUser,
  revokeDeniesFromUser,
  getAllPermissions,
  type UserPermissionSummaryDto,
} from '@/src/services/iam';

type Props = {
  userId: string;
  username: string;
  tenantId: string;
  tenantName: string;
  onClose: () => void;
  onSuccess: () => void;
};

type Tab = 'grant' | 'deny' | 'revoke-grants' | 'revoke-denies';

export default function EditUserPermissionsModal({
  userId,
  username,
  tenantId,
  tenantName,
  onClose,
  onSuccess,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('grant');
  const [summary, setSummary] = useState<UserPermissionSummaryDto | null>(null);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [userId, tenantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryData, allPerms] = await Promise.all([
        getUserPermissionSummary(userId, tenantId),
        getAllPermissions(),
      ]);
      setSummary(summaryData);
      setAllPermissions(allPerms);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get available permissions based on tab
  const getAvailablePermissions = (): string[] => {
    if (!summary) return [];

    // Defensive coding - ensure arrays are not null/undefined
    const effectivePerms = summary.effectivePermissions || [];
    const inheritedPerms = summary.inheritedFromRoles || [];
    const grantedPerms = summary.grantedPermissions || [];
    const deniedPerms = summary.deniedPermissions || [];

    switch (activeTab) {
      case 'grant':
        // Can grant permissions that are not already effective
        return allPermissions.filter(p => !effectivePerms.includes(p));
      
      case 'deny':
        // Can deny permissions that are in inherited or granted
        return [
          ...inheritedPerms,
          ...grantedPerms
        ].filter((p, i, arr) => arr.indexOf(p) === i); // Unique
      
      case 'revoke-grants':
        // Can revoke granted permissions
        return grantedPerms;
      
      case 'revoke-denies':
        // Can revoke denied permissions
        return deniedPerms;
      
      default:
        return [];
    }
  };

  const availablePermissions = getAvailablePermissions();

  // Filter permissions by search
  const filteredPermissions = availablePermissions.filter(p =>
    p.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by service
  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    const service = permission.split('.')[0] || 'other';
    if (!acc[service]) acc[service] = [];
    acc[service].push(permission);
    return acc;
  }, {} as Record<string, string[]>);

  const handleTogglePermission = (permission: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permission)) {
      newSelected.delete(permission);
    } else {
      newSelected.add(permission);
    }
    setSelectedPermissions(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedPermissions.size === 0) {
      alert('Vui lòng chọn ít nhất 1 permission');
      return;
    }

    try {
      setIsSubmitting(true);
      const perms = Array.from(selectedPermissions);

      switch (activeTab) {
        case 'grant':
          await grantPermissionsToUser(userId, tenantId, perms);
          break;
        case 'deny':
          await denyPermissionsToUser(userId, tenantId, perms);
          break;
        case 'revoke-grants':
          await revokeGrantsFromUser(userId, tenantId, perms);
          break;
        case 'revoke-denies':
          await revokeDeniesFromUser(userId, tenantId, perms);
          break;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update permissions:', error);
      alert('Failed to update permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSelectedPermissions(new Set());
    setSearchQuery('');
  };

  const getTabLabel = (tab: Tab): string => {
    switch (tab) {
      case 'grant': return '➕ Grant Permissions';
      case 'deny': return '🚫 Deny Permissions';
      case 'revoke-grants': return '↩️ Revoke Grants';
      case 'revoke-denies': return '↩️ Revoke Denies';
    }
  };

  const getTabDescription = (tab: Tab): string => {
    switch (tab) {
      case 'grant': return 'Add permissions directly to this user';
      case 'deny': return 'Block specific permissions for this user';
      case 'revoke-grants': return 'Remove granted permissions';
      case 'revoke-denies': return 'Remove denied permissions';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center text-slate-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-[#6B9B6E] text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">✏️ Edit User Permissions</h3>
              <p className="text-sm opacity-90 mt-1">
                {username} • {tenantName}
              </p>
            </div>
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

        {/* Tabs */}
        <div className="border-b border-slate-200 bg-slate-50">
          <div className="flex gap-1 px-6">
            {(['grant', 'deny', 'revoke-grants', 'revoke-denies'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
                  activeTab === tab
                    ? 'border-[#6B9B6E] text-[#6B9B6E] bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-800'
                }`}
              >
                {getTabLabel(tab)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Description */}
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
          <p className="text-sm text-blue-800">
            ℹ️ {getTabDescription(activeTab)}
          </p>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-slate-200">
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6B9B6E]"
          />
          <div className="flex items-center justify-between mt-2 text-sm text-slate-600">
            <span>Available: {availablePermissions.length} permissions</span>
            <span>Selected: {selectedPermissions.size}</span>
          </div>
        </div>

        {/* Permission List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {Object.keys(groupedPermissions).length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {availablePermissions.length === 0
                ? 'No permissions available for this action'
                : 'No permissions match your search'}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedPermissions)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([service, perms]) => (
                  <div key={service} className="border border-slate-200 rounded-lg p-4">
                    <h4 className="font-medium text-slate-700 mb-3 capitalize">
                      {service} ({perms.length})
                    </h4>
                    <div className="space-y-1">
                      {perms.map(permission => {
                        const isSelected = selectedPermissions.has(permission);
                        return (
                          <label
                            key={permission}
                            className={`flex items-center p-2 rounded cursor-pointer transition ${
                              isSelected ? 'bg-green-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTogglePermission(permission)}
                              className="h-4 w-4 text-[#6B9B6E] border-slate-300 rounded focus:ring-[#6B9B6E]"
                            />
                            <code className="ml-3 text-sm font-mono text-slate-700">
                              {permission}
                            </code>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedPermissions.size === 0}
            className="px-4 py-2 bg-[#6B9B6E] text-white rounded-md hover:bg-[#5a8259] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : `Apply (${selectedPermissions.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

