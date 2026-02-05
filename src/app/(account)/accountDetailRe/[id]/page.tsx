'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import Arrow from '@/src/assets/Arrow.svg';
import Edit from '@/src/assets/Edit.svg';
import DetailField from '@/src/components/base-service/DetailField';
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
        console.log('Final residentId:', finalResidentId);
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
  }, [userId]);

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

  const handleEdit = () => {
    if (userId) {
      router.push(`/accountEditRe/${userId}`);
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return t('common.notRecorded');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString('vi-VN');
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
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          {t('units.loading')}
        </div>
      );
    }

    if (residentUnitsError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-600">
          {residentUnitsError}
        </div>
      );
    }

    if (!residentUnits.length) {
      return <p className="text-sm text-slate-500">{t('units.noUnits')}</p>;
    }

    return (
      <div className="space-y-3">
        {residentUnits.map((assignment) => {
          const buildingLabel = assignment.buildingName ?? assignment.buildingCode ?? t('units.unknownBuilding');
          const joinedAt = formatDateLabel(assignment.joinedAt);
          return (
            <div
              key={assignment.householdId}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {assignment.unitCode ?? assignment.unitId ?? t('units.unknownUnitCode')}
                  </p>
                  <p className="text-xs text-slate-500">{buildingLabel}</p>
                </div>
                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <div className="flex flex-wrap items-center gap-2">
                    {assignment.isPrimary && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        {t('units.houseOwner')}
                      </span>
                    )}
                    {assignment.relation && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                        {assignment.relation}
                      </span>
                    )}
                  </div>
                  {joinedAt && <span className="text-xs text-slate-500">{t('units.from')} {joinedAt}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderRoles = () => {
    if (!roles.length) {
      return t('roles.noRoles');
    }
    return (
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <span
            key={role}
            className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
          >
            {role}
          </span>
        ))}
      </div>
    );
  };

  const renderPermissions = () => {
    if (!permissions.length) {
      return <p className="text-sm text-gray-500">{t('permissions.noPermissions')}</p>;
    }
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {permissions.map((perm) => (
          <div
            key={perm}
            className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700"
          >
            {perm}
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (state === 'loading' || state === 'idle') {
      return (
        <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
          {t('loading')}
        </div>
      );
    }

    if (state === 'error') {
      return (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-4">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            {t('buttons.retry')}
          </button>
        </div>
      );
    }

    if (!account) {
      return (
        <div className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">
          {t('errors.accountNotFound')}
        </div>
      );
    }

    const isActive = account.active;

    return (
      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200">
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>            
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-[#02542D]">{account.username}</h1>
                <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                }`}
                >
                {isActive ? t('status.active') : t('status.inactive')}
                </span>
            </div>
          </div>
          {/* <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleEdit}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
            >
              <Image src={Edit} alt={t('buttons.edit')} width={20} height={20} />
              {t('buttons.edit')}
            </button>
          </div> */}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <DetailField label={t('fields.username')} value={account.username} readonly />
          <DetailField label={t('fields.email')} value={account.email} readonly />
          <DetailField label={t('fields.status')} value={isActive ? t('status.active') : t('status.inactive')} readonly />
        </div>

        <div className="mt-6">
          <h2 className="text-md font-semibold text-[#02542D]">{t('sections.linkedUnits')}</h2>
          <div className="mt-2">{renderResidentUnits()}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div
        className="mx-auto mb-6 flex max-w-4xl cursor-pointer items-center"
        onClick={handleBack}
      >
        <Image src={Arrow} alt={t('back')} width={20} height={20} className="mr-2 h-5 w-5" />
        <span className="text-2xl font-bold text-[#02542D] transition hover:text-opacity-80">
          {t('back')}
        </span>
      </div>
      {renderContent()}
    </div>
  );
}

