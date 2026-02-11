'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Building2,
  Home,
  Calendar,
  Loader2,
  AlertCircle,
  Key
} from 'lucide-react';
import {
  UserAccountInfo,
  UserProfileInfo,
  UserStatusInfo,
  fetchResidentAccountDetail,
  fetchUserProfile,
  fetchUserStatus,
} from '@/src/services/iam/userService';
import { useResidentUnits } from '@/src/hooks/useResidentUnits';
import { fetchResidentByUserId } from '@/src/services/base/residentService';

type FetchState = 'idle' | 'loading' | 'error' | 'success';

export default function AccountDetailResidentPage() {
  const router = useRouter();
  const t = useTranslations('AccountDetailRe');
  const params = useParams<{ id: string }>();
  const userIdParam = params?.id;
  const userId =
    typeof userIdParam === 'string' ? userIdParam : Array.isArray(userIdParam) ? userIdParam[0] : '';

  const [account, setAccount] = useState<UserAccountInfo | null>(null);
  const [profile, setProfile] = useState<UserProfileInfo | null>(null);
  const [status, setStatus] = useState<UserStatusInfo | null>(null);
  const [state, setState] = useState<FetchState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [residentId, setResidentId] = useState<string | undefined>(undefined);

  const {
    assignments: residentUnits,
    loading: residentUnitsLoading,
    error: residentUnitsError,
  } = useResidentUnits(residentId);

  useEffect(() => {
    if (!userId) {
      setState('error');
      setError(t('errors.userIdNotFound'));
      return;
    }

    let active = true;

    const loadDetail = async () => {
      setState('loading');
      setError(null);
      try {
        const [accountRes, profileRes, statusRes] = await Promise.all([
          fetchResidentAccountDetail(userId),
          fetchUserProfile(userId),
          fetchUserStatus(userId),
        ]);

        if (!active) {
          return;
        }

        setAccount(accountRes);
        setProfile(profileRes);
        setStatus(statusRes);

        // Lấy residentId từ account hoặc fetch từ userId
        let finalResidentId = accountRes.residentId;
        if (!finalResidentId && userId) {
          try {
            const resident = await fetchResidentByUserId(userId);
            finalResidentId = resident.id;
          } catch (err) {
            console.warn('Could not fetch residentId from userId:', err);
          }
        }
        setResidentId(finalResidentId);

        setState('success');
      } catch (err: any) {
        if (!active) {
          return;
        }
        const message =
          err?.response?.data?.message ||
          err?.message ||
          t('errors.loadFailed');
        setError(message);
        setState('error');
      }
    };

    loadDetail();

    return () => {
      active = false;
    };
  }, [userId, t]);

  const roles = useMemo<string[]>(() => {
    if (account?.roles?.length) {
      return account.roles;
    }
    if (profile?.roles?.length) {
      return profile.roles;
    }
    return [];
  }, [account, profile]);

  const permissions = useMemo<string[]>(() => profile?.permissions ?? [], [profile]);

  const handleBack = () => {
    router.push('/accountList');
  };

  const formatDateLabel = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('vi-VN');
  };

  const renderResidentUnits = () => {
    if (residentUnitsLoading) {
      return (
        <div className="flex items-center justify-center p-8 rounded-xl border border-slate-200 bg-slate-50/50">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          <span className="ml-2 text-sm text-slate-500">{t('units.loading')}</span>
        </div>
      );
    }

    if (residentUnitsError) {
      return (
        <div className="flex items-center p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-600">
          <AlertCircle className="mr-2 h-5 w-5" />
          {residentUnitsError}
        </div>
      );
    }

    if (!residentUnits.length) {
      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
          <Home className="h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">{t('units.noUnits')}</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {residentUnits.map((assignment) => {
          const buildingLabel = assignment.buildingName ?? assignment.buildingCode ?? t('units.unknownBuilding');
          const joinedAt = formatDateLabel(assignment.joinedAt);
          return (
            <div
              key={assignment.householdId}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <Home className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">
                        {assignment.unitCode ?? assignment.unitId ?? t('units.unknownUnitCode')}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center">
                        <Building2 className="mr-1 h-3 w-3" />
                        {buildingLabel}
                      </p>
                    </div>
                  </div>
                </div>

                {assignment.isPrimary && (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    {t('units.houseOwner')}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {assignment.relation || t('units.resident')}
                  </span>
                </div>
                {joinedAt && (
                  <div className="flex items-center text-xs text-slate-400" title={t('units.joinedAt')}>
                    <Calendar className="mr-1 h-3 w-3" />
                    {joinedAt}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (state === 'loading' || state === 'idle') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-4">
        <div className="rounded-full bg-red-50 p-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-slate-600">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()} // Simple reload for retry
          className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800"
        >
          {t('buttons.retry')}
        </button>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-500">
        {t('errors.accountNotFound')}
      </div>
    );
  }

  const isActive = account.active;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      {/* Back Button */}
      <div
        className="mx-auto mb-8 flex max-w-5xl cursor-pointer items-center group"
        onClick={handleBack}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-all group-hover:bg-emerald-50 group-hover:shadow-md">
          <ArrowLeft className="h-5 w-5 text-slate-600 transition-colors group-hover:text-emerald-600" />
        </div>
        <span className="ml-3 text-lg font-semibold text-slate-600 transition-colors group-hover:text-emerald-700">
          {t('back')}
        </span>
      </div>

      <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Main Card */}
        <div className="overflow-hidden rounded-3xl border border-white/50 bg-white/80 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
          {/* Header */}
          <div className="border-b border-slate-100 p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 shadow-inner">
                  <span className="text-3xl font-bold">
                    {account.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    {account.username}
                  </h1>
                  <p className="text-sm font-medium text-slate-500">{account.email}</p>
                </div>
              </div>

              <div className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${isActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {isActive ? t('status.active') : t('status.inactive')}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8 space-y-8">
            {/* Account Info */}
            <div className="space-y-6">
              <h3 className="flex items-center text-sm font-semibold uppercase tracking-wider text-slate-500">
                <User className="mr-2 h-4 w-4" />
                {t('sections.accountInfo') || 'Thông tin tài khoản'}
              </h3>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <User className="h-4 w-4 text-emerald-500" />
                    {t('fields.username')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={account.username}
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-4 text-sm font-medium text-slate-700 shadow-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-emerald-500" />
                    {t('fields.email')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={account.email}
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 px-4 text-sm font-medium text-slate-700 shadow-sm focus:outline-none"
                    />
                  </div>
                </div>

                {roles.length > 0 && (
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-500" />
                      {t('fields.roles') || 'Vai trò'}
                    </label>
                    <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                      {roles.map((role) => (
                        <span key={role} className="inline-flex items-center rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 text-shadow-sm border border-emerald-200/50 shadow-sm">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {permissions.length > 0 && (
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Key className="h-4 w-4 text-emerald-500" />
                      {t('fields.permissions') || 'Quyền hạn'}
                    </label>
                    <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                      {permissions.map((perm) => (
                        <span key={perm} className="inline-flex items-center rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-100 shadow-sm">
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Linked Units Section */}
            <div className="space-y-6">
              <h3 className="flex items-center text-sm font-semibold uppercase tracking-wider text-slate-500">
                <Building2 className="mr-2 h-4 w-4" />
                {t('sections.linkedUnits') || 'Căn hộ liên kết'}
              </h3>

              {renderResidentUnits()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
