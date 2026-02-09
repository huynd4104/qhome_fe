"use client";
import React, { useState } from 'react';
import { Tenant } from '@/src/services/base';
import TenantRolePermissionManager from './TenantRolePermissionManager';
import TenantUserManagement from './TenantUserManagement';

type Props = {
  tenant: Tenant;
  onClose: () => void;
};

type ViewMode = 'users' | 'permissions';

export default function TenantPermissionModal({ tenant, onClose }: Props) {
  // Default to 'users' view now that it's implemented
  const [viewMode, setViewMode] = useState<ViewMode>('users');

  // If viewing permissions, show the permission manager
  if (viewMode === 'permissions') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-auto">
          <TenantRolePermissionManager
            tenant={tenant}
            onBack={() => setViewMode('users')}
          />
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition font-medium"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-[#6B9B6E] text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Quản lý phân quyền</h2>
              <p className="text-sm opacity-90 mt-1">Tenant: {tenant.name} ({tenant.code})</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setViewMode('users')}
            className="flex-1 px-6 py-3 font-medium transition text-[#6B9B6E] border-b-2 border-[#6B9B6E] bg-green-50"
          >
            👥 User Management
          </button>
          <button
            onClick={() => setViewMode('permissions')}
            className="flex-1 px-6 py-3 font-medium transition text-slate-600 hover:text-slate-800 hover:bg-slate-50"
          >
            🔑 Role Permissions
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {viewMode === 'users' ? (
            <TenantUserManagement tenant={tenant} />
          ) : (
            <div className="p-6">
              <div className="text-center py-12 text-slate-500">
                Switch to Role Permissions view...
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

