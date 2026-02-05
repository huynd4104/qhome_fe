"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { getEmployeesInTenant, getUserPermissionSummary, type UserPermissionSummaryDto } from '@/src/services/iam';
import type { EmployeeRoleDto } from '@/src/services/iam';
import PermissionGroup from '@/src/components/admin/PermissionGroup';
import EditUserPermissionsModal from '@/src/components/admin/EditUserPermissionsModal';

export default function UserPermissionDetailPage() {
  const t = useTranslations('AdminUserPermissionDetail');
  const params = useParams();
  const searchParams = useSearchParams();
  const username = params.username as string;
  const tenantId = searchParams.get('tenant') || '';
  const tenantName = searchParams.get('tenantName') || 'Unknown Tenant';

  const [employee, setEmployee] = useState<EmployeeRoleDto | null>(null);
  const [summary, setSummary] = useState<UserPermissionSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (tenantId && username) {
      loadEmployeeData();
    }
  }, [tenantId, username]);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      const employees = await getEmployeesInTenant(tenantId);
      const found = employees.find(emp => emp.username === username);
      setEmployee(found || null);
      
      // Load permission summary if employee found
      if (found) {
        try {
          const permSummary = await getUserPermissionSummary(found.userId, tenantId);
          setSummary(permSummary);
        } catch (err) {
          console.error('Failed to load permission summary:', err);
        }
      }
    } catch (error) {
      console.error('Failed to load employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group permissions by service
  const groupedPermissions = React.useMemo(() => {
    if (!employee?.allPermissions) return {};
    
    const groups: Record<string, string[]> = {};
    
    employee.allPermissions.forEach(permission => {
      const servicePrefix = permission.split('.')[0] || 'other';
      if (!groups[servicePrefix]) {
        groups[servicePrefix] = [];
      }
      groups[servicePrefix].push(permission);
    });
    
    return groups;
  }, [employee]);

  // Filter permissions by search
  const filteredGroups = React.useMemo(() => {
    if (!searchQuery) return groupedPermissions;
    
    const filtered: Record<string, string[]> = {};
    Object.entries(groupedPermissions).forEach(([service, perms]) => {
      const matchingPerms = perms.filter(p => 
        p.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (matchingPerms.length > 0) {
        filtered[service] = matchingPerms;
      }
    });
    
    return filtered;
  }, [groupedPermissions, searchQuery]);

  const totalPermissions = employee?.allPermissions?.length || 0;
  const filteredCount = Object.values(filteredGroups).flat().length;

  if (loading) {
    return (
      <div className="lg:col-span-1 space-y-6">
        <div className="max-w-screen overflow-x-hidden  min-h-screen">
          <div className="px-[41px] py-12 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-2 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('loading')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="lg:col-span-1 space-y-6">
        <div className="max-w-screen overflow-x-hidden  min-h-screen">
          <div className="px-[41px] py-12 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 mb-4">{t('notFound')}</p>
              <Link
                href={`/users/permissions?tenant=${tenantId}&tenantName=${encodeURIComponent(tenantName)}`}
                className="text-[#02542D] hover:underline"
              >
                {t('backToUserList')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-1 space-y-6">
      <div className="max-w-screen overflow-x-hidden ">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <Link href="/dashboard" className="hover:text-[#02542D]">{t('breadcrumb.dashboard')}</Link>
          <span>›</span>
          <Link
            href={`/users/permissions?tenant=${tenantId}&tenantName=${encodeURIComponent(tenantName)}`}
            className="hover:text-[#02542D]"
          >
            {tenantName}
          </Link>
          <span>›</span>
          <span className="text-slate-700 font-medium">{username}</span>
        </div>

        {/* Back Link */}
        <Link
          href={`/users/permissions?tenant=${tenantId}&tenantName=${encodeURIComponent(tenantName)}`}
          className="inline-flex items-center text-[#02542D] hover:underline mb-6"
        >
          {t('backToUserList')}
        </Link>

        {/* User Info Card */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-[#02542D] text-white rounded-full flex items-center justify-center font-bold text-2xl">
            {employee.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800 mb-1">
              {employee.username}
            </h1>
            <p className="text-slate-600 mb-3">📧 {employee.email}</p>
            <p className="text-slate-600 mb-4 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" id="Building-5-Fill--Streamline-Mingcute-Fill" height="16" width="16">
                <g fill="none" fillRule="evenodd">
                  <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
                  <path fill="#475569" d="M10 2a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 1.3333333333333333v2.6666666666666665h1.3333333333333333a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 1.3333333333333333v5.333333333333333a0.6666666666666666 0.6666666666666666 0 1 1 0 1.3333333333333333H2a0.6666666666666666 0.6666666666666666 0 1 1 0 -1.3333333333333333V6a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 -1.3333333333333333h1.3333333333333333V3.333333333333333a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 -1.3333333333333333h4ZM4.666666666666666 6H3.333333333333333v6.666666666666666h1.3333333333333333V6Zm8 1.3333333333333333h-1.3333333333333333v5.333333333333333h1.3333333333333333v-5.333333333333333Zm-4 2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333v-1.3333333333333333Zm0 -2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333v-1.3333333333333333Zm0 -2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333V4.666666666666666Z" strokeWidth="0.6667"></path>
                </g>
              </svg>
              {t('userCard.tenant')} {tenantName}
            </p>

            {/* Roles */}
            <div className="mb-4">
              <span className="text-sm font-semibold text-slate-700">{t('userCard.roles')}</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {employee.assignedRoles.length === 0 ? (
                  <span className="text-sm text-slate-400 italic">{t('userCard.noRoles')}</span>
                ) : (
                  employee.assignedRoles.map((role, idx) => (
                    <span
                      key={`${role.roleName}-${idx}`}
                      className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#02542D] text-white uppercase"
                    >
                      {role.roleName}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Permission Summary */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-600">
                {t('userCard.totalPermissions', { count: totalPermissions })}
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-[#02542D] text-white rounded-md hover:bg-[#024030] transition font-medium text-sm flex items-center gap-2"
              >
                {t('userCard.editPermissions')}
              </button>
            </div>
          </div>
        </div>
      </div>

        {/* Permission Breakdown */}
        {summary && (
          <div className="bg-white rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            {t('permissionBreakdown.title')}
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-700 font-medium mb-1">{t('permissionBreakdown.inherited.label')}</div>
              <div className="text-2xl font-bold text-blue-800">{summary.inheritedFromRoles?.length || 0}</div>
              <div className="text-xs text-blue-600 mt-1">{t('permissionBreakdown.inherited.description')}</div>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-700 font-medium mb-1">{t('permissionBreakdown.granted.label')}</div>
              <div className="text-2xl font-bold text-green-800">{summary.grantedPermissions?.length || 0}</div>
              <div className="text-xs text-green-600 mt-1">{t('permissionBreakdown.granted.description')}</div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-700 font-medium mb-1">{t('permissionBreakdown.denied.label')}</div>
              <div className="text-2xl font-bold text-red-800">{summary.deniedPermissions?.length || 0}</div>
              <div className="text-xs text-red-600 mt-1">{t('permissionBreakdown.denied.description')}</div>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-sm text-purple-700 font-medium mb-1">{t('permissionBreakdown.effective.label')}</div>
              <div className="text-2xl font-bold text-purple-800">{summary.effectivePermissions?.length || 0}</div>
              <div className="text-xs text-purple-600 mt-1">{t('permissionBreakdown.effective.description')}</div>
            </div>
          </div>
        </div>
      )}

        {/* Search Permissions */}
        <div className="mb-6">
          <input
            type="text"
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02542D]"
          />
        {searchQuery && (
          <p className="text-sm text-slate-600 mt-2">
            {t('search.showing', { filtered: filteredCount, total: totalPermissions })}
          </p>
        )}
      </div>

        {/* Permissions List */}
        <div className="bg-white rounded-xl p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          {t('effectivePermissions.title')}
        </h2>

        {Object.keys(filteredGroups).length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            {searchQuery 
              ? t('effectivePermissions.empty.noResults')
              : t('effectivePermissions.empty.noData')
            }
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(filteredGroups)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([service, permissions]) => (
                <PermissionGroup
                  key={service}
                  service={service}
                  permissions={permissions}
                  searchQuery={searchQuery}
                />
              ))}
          </div>
        )}
      </div>

        {/* Export Button */}
        <div className="mt-6 flex justify-end">
        <button
          onClick={() => {
            const permissions = employee?.allPermissions || [];
            const csv = [
              [t('export.csvHeaders.permission'), t('export.csvHeaders.service')],
              ...permissions.map(p => [p, p.split('.')[0]])
            ].map(row => row.join(',')).join('\n');
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${employee.username}_permissions.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          disabled={!employee || !employee.allPermissions || employee.allPermissions.length === 0}
          className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition font-medium flex items-center gap-2"
        >
          {t('export.button')}
        </button>
      </div>

        {/* Edit Permissions Modal */}
        {showEditModal && employee && (
          <EditUserPermissionsModal
            userId={employee.userId}
            username={employee.username}
            tenantId={tenantId}
            tenantName={tenantName}
            onClose={() => setShowEditModal(false)}
            onSuccess={() => {
              loadEmployeeData();
            }}
          />
        )}
      </div>
    </div>
  );
}

