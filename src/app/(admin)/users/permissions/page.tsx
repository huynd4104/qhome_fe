"use client";
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { getEmployeesInTenant } from '@/src/services/iam';
import type { EmployeeRoleDto } from '@/src/services/iam';

export default function UserPermissionsPage() {
  const t = useTranslations('AdminUserPermissions');
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenant') || '';
  const tenantName = searchParams.get('tenantName') || 'Unknown Tenant';
  
  const [employees, setEmployees] = useState<EmployeeRoleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    if (tenantId) {
      loadEmployees();
    }
  }, [tenantId]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await getEmployeesInTenant(tenantId);
      setEmployees(data);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || 
                       emp.assignedRoles.some(r => r.roleName.toLowerCase() === roleFilter.toLowerCase());
    
    return matchesSearch && matchesRole;
  });

  // Get unique roles for filter
  const allRoles = Array.from(
    new Set(
      employees.flatMap(emp => emp.assignedRoles.map(r => r.roleName))
    )
  );

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

  return (
    <div className="lg:col-span-1 space-y-6">
      <div className="max-w-screen overflow-x-hidden ">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/dashboard" className="hover:text-[#02542D]">{t('breadcrumb.dashboard')}</Link>
          <span>›</span>
          <span className="text-slate-700 font-medium">{tenantName}</span>
          <span>›</span>
          <span className="text-slate-700 font-medium">{t('breadcrumb.userPermissions')}</span>
        </div>
          <h1 className="text-2xl font-semibold text-[#02542D]">
            {t('title')}
          </h1>
          <p className="text-slate-600 mt-1">
            {t('subtitle', { tenantName })}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('filters.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02542D]"
            />
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02542D]"
            >
            <option value="all">{t('filters.roleAll')}</option>
            {allRoles.map(role => (
              <option key={role} value={role}>{role.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

        {/* User List */}
        <div className="space-y-3">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-white rounded-xl">
            {searchQuery || roleFilter !== 'all' 
              ? t('empty.noResults')
              : t('empty.noData')
            }
          </div>
        ) : (
          filteredEmployees.map(employee => (
            <div
              key={employee.userId}
              className="p-5 rounded-xl hover:border-[#02542D] hover:shadow-md transition bg-white"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#02542D] text-white rounded-full flex items-center justify-center font-semibold">
                      {employee.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-lg">
                        {employee.username}
                      </h3>
                      <p className="text-sm text-slate-500">{employee.email}</p>
                    </div>
                  </div>

                  {/* Roles */}
                  <div className="mb-3">
                    <span className="text-sm text-slate-600 font-medium">{t('userCard.roles')} </span>
                    {employee.assignedRoles.length === 0 ? (
                      <span className="text-sm text-slate-400 italic">{t('userCard.noRoles')}</span>
                    ) : (
                      <div className="inline-flex flex-wrap gap-1">
                        {employee.assignedRoles.map((role, idx) => (
                          <span
                            key={`${role.roleName}-${idx}`}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#02542D] text-white uppercase"
                          >
                            {role.roleName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Permission Count */}
                  <div className="text-sm text-slate-600">
                     <span className="font-semibold">{employee.allPermissions?.length || 0}</span> {t('userCard.permissions', { count: employee.allPermissions?.length || 0 })}
                  </div>
                </div>

                  {/* View Details Button */}
                  <Link
                    href={`/users/${employee.username}/permissions?tenant=${tenantId}&tenantName=${encodeURIComponent(tenantName)}`}
                    className="px-4 py-2 bg-[#02542D] text-white rounded-md hover:bg-[#024030] transition font-medium flex items-center gap-2"
                  >
                    {t('userCard.viewDetails')}
                  </Link>
              </div>
            </div>
          ))
        )}
      </div>

        {/* Summary */}
        {filteredEmployees.length > 0 && (
          <div className="mt-6 p-4 bg-white rounded-xl">
            <div className="text-sm text-slate-600">
              {t('summary.showing')} <span className="font-semibold">{filteredEmployees.length}</span> {t('summary.of')}{' '}
              <span className="font-semibold">{employees.length}</span> {t('summary.users')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

