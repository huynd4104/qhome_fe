'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  fetchUserProfile,
  fetchUserAccount,
  fetchUserStatus,
  updateUserProfile,
  updateUserPassword,
  UserProfileInfo,
  UserAccountInfo,
  UserStatusInfo,
  UpdateUserProfilePayload,
  UpdateUserPasswordPayload,
} from '@/src/services/iam/userService';
import { getEmployeeDetailsById, EmployeeDto } from '@/src/services/iam/employeeService';
import { useNotifications } from '@/src/hooks/useNotifications';
import { getMyAssignments, getMyActiveAssignments, MeterReadingAssignmentDto } from '@/src/services/base/assignmentService';
import { getPendingMaintenanceRequests, MaintenanceRequestDto } from '@/src/services/base/maintenanceRequestService';

export default function StaffProfilePage() {
  const { user, isLoading } = useAuth();
  const { show } = useNotifications();
  const t = useTranslations('StaffProfile');
  
  const [profile, setProfile] = useState<UserProfileInfo | null>(null);
  const [account, setAccount] = useState<UserAccountInfo | null>(null);
  const [status, setStatus] = useState<UserStatusInfo | null>(null);
  const [employee, setEmployee] = useState<EmployeeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    phoneNumber: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  
  // Dashboard data
  const [assignments, setAssignments] = useState<MeterReadingAssignmentDto[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<MeterReadingAssignmentDto[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequestDto[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  useEffect(() => {
    if (!user?.userId) {
      setLoading(false);
      return;
    }

    loadProfile();
    loadDashboard();
  }, [user?.userId]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [profileRes, accountRes, statusRes, employeeRes] = await Promise.all([
        fetchUserProfile(user!.userId),
        fetchUserAccount(user!.userId),
        fetchUserStatus(user!.userId),
        getEmployeeDetailsById(user!.userId).catch(() => null), // Optional
      ]);

      setProfile(profileRes);
      setAccount(accountRes);
      setStatus(statusRes);
      if (employeeRes) {
        setEmployee(employeeRes);
        setEditForm({
          email: employeeRes.email || accountRes.email || '',
          phoneNumber: employeeRes.phoneNumber || '',
        });
      } else {
        setEditForm({
          email: accountRes.email || '',
          phoneNumber: '',
        });
      }
    } catch (err: any) {
      console.error('Failed to load profile', err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('errors.loadFailed');
      setError(message);
      show(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.userId) return;

    setSaving(true);
    try {
      const payload: UpdateUserProfilePayload = {
        email: editForm.email,
      };

      await updateUserProfile(user.userId, payload);
      show(t('messages.updateSuccess'), 'success');
      setIsEditing(false);
      await loadProfile();
    } catch (err: any) {
      console.error('Failed to update profile', err);
      const message = err?.response?.data?.message || t('errors.updateFailed');
      show(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const loadDashboard = async () => {
    if (!user?.userId) return;
    
    setLoadingDashboard(true);
    try {
      const [allAssignments, activeAssigns, requests] = await Promise.all([
        getMyAssignments().catch(() => []),
        getMyActiveAssignments().catch(() => []),
        getPendingMaintenanceRequests().catch(() => []),
      ]);
      
      setAssignments(allAssignments);
      setActiveAssignments(activeAssigns);
      
      const myRequests = requests.filter(req => req.respondedBy === user.userId);
      setMaintenanceRequests(myRequests);
    } catch (err: any) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.userId) return;

    // Validation: Check if new password is provided
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      show(t('messages.passwordRequired') || 'Vui lòng nhập mật khẩu mới và xác nhận mật khẩu', 'error');
      return;
    }

    // Validation: Check password match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      show(t('messages.passwordMismatch') || 'Mật khẩu xác nhận không khớp', 'error');
      return;
    }

    // Validation: Check minimum length (backend requires 8 characters)
    if (passwordForm.newPassword.length < 8) {
      show('Mật khẩu phải có ít nhất 8 ký tự', 'error');
      return;
    }

    // Validation: Check maximum length (backend allows up to 100 characters)
    if (passwordForm.newPassword.length > 100) {
      show('Mật khẩu không được vượt quá 100 ký tự', 'error');
      return;
    }

    // Validation: Backend requires at least one special character (@$!%*?&)
    // Pattern: ^(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$
    const hasSpecialChar = /[@$!%*?&]/.test(passwordForm.newPassword);
    if (!hasSpecialChar) {
      show('Mật khẩu phải chứa ít nhất một ký tự đặc biệt (@$!%*?&)', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: UpdateUserPasswordPayload = {
        newPassword: passwordForm.newPassword,
      };

      await updateUserPassword(user.userId, payload);
      show(t('messages.changePasswordSuccess') || 'Đổi mật khẩu thành công', 'success');
      setPasswordForm({
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      console.error('Failed to change password', err);
      let message = t('errors.changePasswordFailed') || 'Không thể đổi mật khẩu';
      
      // Handle specific error cases
      if (err?.response?.status === 403) {
        message = 'Bạn không có quyền đổi mật khẩu. Vui lòng liên hệ quản trị viên.';
      } else if (err?.response?.status === 400) {
        message = err?.response?.data?.message || 'Mật khẩu không hợp lệ. Vui lòng kiểm tra lại.';
      } else if (err?.response?.data?.message) {
        message = err.response.data.message;
      }
      
      show(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const isStaff = user?.roles?.some(role => 
    ['TECHNICIAN', 'SUPPORTER', 'ACCOUNTANT'].includes(role.toUpperCase())
  );

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-slate-600 mb-4">{t('restricted.title')}</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            {t('restricted.backToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600">{t('loading')}</div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <button
            onClick={loadProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  const roles = profile?.roles || user?.roles || [];
  const roleLabels: Record<string, string> = {
    TECHNICIAN: t('roles.technician'),
    SUPPORTER: t('roles.supporter'),
    ACCOUNTANT: t('roles.accountant'),
    ADMIN: t('roles.admin'),
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600 mt-2">{t('subtitle')}</p>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">{t('sections.basicInfo')}</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {t('buttons.edit')}
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('fields.username')}
                </label>
                <input
                  type="text"
                  value={account?.username || user?.username || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">{t('validation.usernameCannotChange')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('fields.email')} *
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {employee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('fields.phoneNumber')}
                  </label>
                  <input
                    type="tel"
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {saving ? t('buttons.saving') : t('buttons.save')}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    loadProfile();
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  {t('buttons.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('fields.username')}
                  </label>
                  <p className="text-gray-900">{account?.username || user?.username || t('status.notSet')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('fields.email')}
                  </label>
                  <p className="text-gray-900">{account?.email || employee?.email || t('status.notSet')}</p>
                </div>

                {employee?.phoneNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {t('fields.phoneNumber')}
                    </label>
                    <p className="text-gray-900">{employee.phoneNumber}</p>
                  </div>
                )}

                {employee?.department && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {t('fields.department')}
                    </label>
                    <p className="text-gray-900">{employee.department}</p>
                  </div>
                )}

                {employee?.position && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {t('fields.position')}
                    </label>
                    <p className="text-gray-900">{employee.position}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('fields.role')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((role) => (
                      <span
                        key={role}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                      >
                        {roleLabels[role.toUpperCase()] || role}
                      </span>
                    ))}
                  </div>
                </div>

                {status && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {t('fields.status')}
                    </label>
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        status.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {status.active ? t('status.active') : t('status.inactive')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('sections.changePassword')}</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('fields.newPassword')} *
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('placeholders.newPassword') || 'Nhập mật khẩu mới (tối thiểu 8 ký tự, có ký tự đặc biệt)'}
                minLength={8}
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                Mật khẩu phải có ít nhất 8 ký tự và chứa ít nhất một ký tự đặc biệt (@$!%*?&)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('fields.confirmPassword')} *
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('placeholders.confirmPassword') || 'Xác nhận mật khẩu mới'}
                minLength={8}
                maxLength={100}
              />
              {passwordForm.newPassword && passwordForm.confirmPassword && 
               passwordForm.newPassword !== passwordForm.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">
                  Mật khẩu xác nhận không khớp
                </p>
              )}
            </div>

            <button
              onClick={handleChangePassword}
              disabled={
                saving || 
                !passwordForm.newPassword || 
                !passwordForm.confirmPassword ||
                passwordForm.newPassword !== passwordForm.confirmPassword ||
                passwordForm.newPassword.length < 8 ||
                !/[@$!%*?&]/.test(passwordForm.newPassword)
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? t('buttons.processing') || 'Đang xử lý...' : t('buttons.changePasswordButton') || 'Đổi mật khẩu'}
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard - Work Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('sections.workDashboard')}</h2>
          
          {loadingDashboard ? (
            <div className="text-center py-8">
              <div className="text-sm text-gray-600">{t('loading')}</div>
            </div>
          ) : (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-sm font-medium text-blue-700 mb-1">{t('dashboard.totalAssignments')}</div>
                  <div className="text-2xl font-bold text-blue-900">{assignments.length}</div>
                </div>
                
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="text-sm font-medium text-yellow-700 mb-1">{t('dashboard.inProgress')}</div>
                  <div className="text-2xl font-bold text-yellow-900">{activeAssignments.length}</div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-sm font-medium text-green-700 mb-1">{t('dashboard.completed')}</div>
                  <div className="text-2xl font-bold text-green-900">
                    {assignments.filter(a => a.status === 'COMPLETED').length}
                  </div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="text-sm font-medium text-purple-700 mb-1">{t('dashboard.processedRequests')}</div>
                  <div className="text-2xl font-bold text-purple-900">{maintenanceRequests.length}</div>
                </div>
              </div>

              {/* Active Assignments */}
              {activeAssignments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-3">{t('dashboard.activeAssignments')}</h3>
                  <div className="space-y-2">
                    {activeAssignments.slice(0, 5).map((assignment) => (
                      <div
                        key={assignment.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {assignment.cycleName} - {assignment.serviceCode}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {assignment.buildingName}
                              {assignment.floor && ` - ${t('dashboard.floor', { floor: assignment.floor })}`}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(assignment.startDate).toLocaleDateString('vi-VN')} -{' '}
                              {new Date(assignment.endDate).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                          <div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                assignment.status === 'PENDING'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : assignment.status === 'IN_PROGRESS'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {assignment.status === 'PENDING'
                                ? t('dashboard.assignmentStatus.pending')
                                : assignment.status === 'IN_PROGRESS'
                                ? t('dashboard.assignmentStatus.inProgress')
                                : t('dashboard.assignmentStatus.overdue')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {activeAssignments.length > 5 && (
                    <div className="text-sm text-gray-600 mt-2">
                      {t('dashboard.andMore', { count: activeAssignments.length - 5 })}
                    </div>
                  )}
                </div>
              )}

              {/* Recent Maintenance Requests */}
              {maintenanceRequests.length > 0 && (
                <div>
                  <h3 className="text-md font-semibold text-gray-900 mb-3">{t('dashboard.recentRequests')}</h3>
                  <div className="space-y-2">
                    {maintenanceRequests.slice(0, 5).map((request) => (
                      <div
                        key={request.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{request.title}</div>
                            <div className="text-sm text-gray-600 mt-1">{request.category}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {request.respondedAt &&
                                t('dashboard.processedAt', { date: new Date(request.respondedAt).toLocaleString('vi-VN') })}
                            </div>
                          </div>
                          <div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                request.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800'
                                  : request.status === 'IN_PROGRESS'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {request.status === 'COMPLETED'
                                ? t('dashboard.requestStatus.completed')
                                : request.status === 'IN_PROGRESS'
                                ? t('dashboard.requestStatus.inProgress')
                                : request.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {maintenanceRequests.length > 5 && (
                    <div className="text-sm text-gray-600 mt-2">
                      {t('dashboard.andMore', { count: maintenanceRequests.length - 5 })}
                    </div>
                  )}
                </div>
              )}

              {activeAssignments.length === 0 && maintenanceRequests.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {t('dashboard.noWork')}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Account Status */}
      {status && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('sections.accountInfo')}</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('fields.lastLogin')}</span>
                <span className="text-gray-900">
                  {status.lastLogin
                    ? new Date(status.lastLogin).toLocaleString('vi-VN')
                    : t('status.notSet')}
                </span>
              </div>
              
              {status.failedLoginAttempts > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('fields.failedLoginAttempts')}</span>
                  <span className="text-yellow-600 font-medium">
                    {status.failedLoginAttempts}
                  </span>
                </div>
              )}
              
              {status.accountLocked && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-700 text-sm">
                    {t('accountStatus.accountLocked')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

