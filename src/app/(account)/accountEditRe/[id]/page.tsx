'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import Arrow from '@/src/assets/Arrow.svg';
import DetailField from '@/src/components/base-service/DetailField';
import Select from '@/src/components/customer-interaction/Select';
import PasswordChangeSection from '@/src/components/account/PasswordChangeSection';
import {
  UpdateResidentAccountPayload,
  UserAccountInfo,
  UserProfileInfo,
  UserStatusInfo,
  fetchResidentAccountDetail,
  fetchUserProfile,
  fetchUserStatus,
  updateResidentAccount,
  updateUserPassword,
} from '@/src/services/iam/userService';
import { useResidentUnits } from '@/src/hooks/useResidentUnits';
import { getBuildings, type Building } from '@/src/services/base/buildingService';
import { getUnitsByBuilding, type Unit } from '@/src/services/base/unitService';
import { createHousehold } from '@/src/services/base/householdService';

type FetchState = 'idle' | 'loading' | 'error' | 'success';

type FormState = {
  username: string;
  email: string;
  active: boolean;
  newPassword: string;
  confirmPassword: string;
};

export default function AccountEditResidentPage() {
  const router = useRouter();
  const t = useTranslations('AccountEditRe');
  const params = useParams<{ id: string }>();
  const userIdParam = params?.id;
  const userId =
    typeof userIdParam === 'string' ? userIdParam : Array.isArray(userIdParam) ? userIdParam[0] : '';

  const [state, setState] = useState<FetchState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [account, setAccount] = useState<UserAccountInfo | null>(null);
  const [profile, setProfile] = useState<UserProfileInfo | null>(null);
  const [status, setStatus] = useState<UserStatusInfo | null>(null);

  const {
    assignments: residentUnits,
    loading: residentUnitsLoading,
    error: residentUnitsError,
    refresh: refreshResidentUnits,
  } = useResidentUnits(userId || undefined);

  const [unitPanelOpen, setUnitPanelOpen] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [loadingAvailableUnits, setLoadingAvailableUnits] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);
  const [assigningUnits, setAssigningUnits] = useState(false);

  const [form, setForm] = useState<FormState>({
    username: '',
    email: '',
    active: true,
    newPassword: '',
    confirmPassword: '',
  });

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

        setAccount({ ...accountRes, residentId: accountRes.userId });
        setProfile(profileRes);
        setStatus(statusRes);
        setForm({
          username: accountRes.username ?? '',
          email: accountRes.email ?? '',
          active: accountRes.active,
          newPassword: '',
          confirmPassword: '',
        });
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

  const roles = useMemo<string[]>(() => profile?.roles ?? account?.roles ?? [], [profile, account]);

  const STATUS_OPTIONS = useMemo(() => [
    { id: 'ACTIVE', label: t('status.active') },
    { id: 'INACTIVE', label: t('status.inactive') },
  ], [t]);

  const handleBack = () => {
    router.back();
  };

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = event.target as HTMLInputElement;
      const value = field === 'active' ? target.checked : target.value;
      setForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleStatusSelect = (optionId: string) => {
    setForm((prev) => ({
      ...prev,
      active: optionId === 'ACTIVE',
    }));
  };

  const handlePasswordFieldChange =
    (field: 'newPassword' | 'confirmPassword') =>
    (value: string) => {
      setForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const validateForm = () => {
    if (!form.username.trim()) {
      setError(t('validation.username.required'));
      return false;
    }
    if (!form.email.trim()) {
      setError(t('validation.email.required'));
      return false;
    }
    if (form.newPassword) {
      if (form.newPassword.length < 8) {
        setError(t('validation.password.minLength'));
        return false;
      }
      if (form.newPassword !== form.confirmPassword) {
        setError(t('validation.password.mismatch'));
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      const profilePayload: UpdateResidentAccountPayload = {
        username: form.username.trim(),
        email: form.email.trim(),
        active: form.active,
      };

      const updatedAccount = await updateResidentAccount(userId, profilePayload);
      setAccount({ ...updatedAccount, residentId: updatedAccount.userId });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              username: updatedAccount.username,
              email: updatedAccount.email,
            }
          : prev,
      );

      if (form.newPassword) {
        await updateUserPassword(userId, { newPassword: form.newPassword });
      }

      setForm((prev) => ({
        ...prev,
        username: updatedAccount.username ?? prev.username,
        email: updatedAccount.email ?? prev.email,
        newPassword: '',
        confirmPassword: '',
      }));
      setSuccessMessage(t('messages.updateSuccess'));
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('messages.updateError');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const assignedUnitIds = useMemo(() => {
    const ids = new Set<string>();
    residentUnits.forEach((item) => {
      if (item.unitId) {
        ids.add(item.unitId);
      }
    });
    return ids;
  }, [residentUnits]);

  const loadBuildings = useCallback(async () => {
    if (loadingBuildings || buildings.length) {
      return;
    }

    try {
      setLoadingBuildings(true);
      const data = await getBuildings();
      setBuildings(data);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || t('errors.loadBuildingsFailed');
      setAssignmentError(message);
    } finally {
      setLoadingBuildings(false);
    }
  }, [buildings.length, loadingBuildings]);

  const loadUnits = useCallback(
    async (buildingId: string) => {
      if (!buildingId) {
        setAvailableUnits([]);
        return;
      }

      try {
        setLoadingAvailableUnits(true);
        const data = await getUnitsByBuilding(buildingId);
        setAvailableUnits(data);
      } catch (err: any) {
        const message =
          err?.response?.data?.message || err?.message || t('errors.loadUnitsFailed');
        setAssignmentError(message);
      } finally {
        setLoadingAvailableUnits(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!unitPanelOpen) {
      return;
    }
    if (!selectedBuildingId) {
      setAvailableUnits([]);
      setSelectedUnitIds([]);
      return;
    }

    setSelectedUnitIds([]);
    void loadUnits(selectedBuildingId);
  }, [loadUnits, selectedBuildingId, unitPanelOpen]);

  const handleOpenUnitPanel = async () => {
    setAssignmentError(null);
    setAssignmentSuccess(null);
    setSelectedUnitIds([]);
    setUnitPanelOpen(true);
    await loadBuildings();
  };

  const handleCloseUnitPanel = () => {
    setUnitPanelOpen(false);
    setSelectedBuildingId('');
    setAvailableUnits([]);
    setSelectedUnitIds([]);
    setAssignmentError(null);
    setAssignmentSuccess(null);
  };

  const handleToggleUnitSelection = (unitId: string) => {
    if (assignedUnitIds.has(unitId)) {
      return;
    }
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId],
    );
  };

  const formatDateLabel = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('vi-VN');
  };

  const handleAddUnits = async () => {
    if (!userId) {
      setAssignmentError(t('errors.userNotIdentified'));
      return;
    }

    const pendingUnitIds = selectedUnitIds.filter((id) => !assignedUnitIds.has(id));
    if (!pendingUnitIds.length) {
      setAssignmentError(t('errors.noUnitsSelected'));
      return;
    }

    setAssigningUnits(true);
    setAssignmentError(null);
    setAssignmentSuccess(null);

    const today = new Date().toISOString().split('T')[0];
    const results = await Promise.allSettled(
      pendingUnitIds.map((unitId) =>
        createHousehold({
          unitId,
          kind: 'OWNER',
          primaryResidentId: userId,
          startDate: today,
        }),
      ),
    );

    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    if (rejected.length && rejected.length === results.length) {
      const firstError = rejected[0].reason;
      const message =
        firstError?.response?.data?.message ||
        firstError?.message ||
        t('errors.assignUnitsFailed');
      setAssignmentError(message);
    } else {
      const successCount = results.length - rejected.length;
      setAssignmentSuccess(t('messages.assignUnitsSuccess', { count: successCount }));
      setSelectedUnitIds([]);
      await refreshResidentUnits();
    }

    if (rejected.length) {
      console.error('Failed to assign some units', rejected);
    }

    setAssigningUnits(false);
  };

  const renderAssignedUnits = () => {
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
      return (
        <p className="text-sm text-slate-500">{t('units.noUnits')}</p>
      );
    }

    return (
      <div className="space-y-3">
        {residentUnits.map((assignment) => {
          const joinedAt = formatDateLabel(assignment.joinedAt);
          const buildingLabel = assignment.buildingName ?? assignment.buildingCode ?? t('units.unknownBuilding');

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
                  <p className="text-xs text-slate-500">
                    {assignment.buildingId ? (
                      <Link
                        href={`/base/building/buildingDetail/${assignment.buildingId}`}
                        className="text-emerald-600 hover:underline"
                      >
                        {buildingLabel}
                      </Link>
                    ) : (
                      buildingLabel
                    )}
                  </p>
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
                  {joinedAt && (
                    <span className="text-xs text-slate-500">{t('units.from')} {joinedAt}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
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

    return (
      <form
        onSubmit={handleSubmit}
        className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200 space-y-8"
      >
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#02542D]">{account.username}</h1>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  form.active ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {form.active ? t('status.active') : t('status.inactive')}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <DetailField
            label={t('fields.username')}
            value={form.username}
            readonly={false}
            onChange={handleChange('username')}
          />
          <DetailField
            label={t('fields.email')}
            value={form.email}
            readonly={false}
            onChange={handleChange('email')}
          />
          <div className="flex flex-col">
            <span className="text-md font-bold text-[#02542D] mb-1">{t('fields.status')}</span>
            <Select
              options={STATUS_OPTIONS}
              value={form.active ? 'ACTIVE' : 'INACTIVE'}
              onSelect={(option) => handleStatusSelect(option.id)}
              renderItem={(option) => option.label}
              getValue={(option) => option.id}
              placeholder={t('placeholders.selectStatus')}
            />
          </div>
        </div>

        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-md font-semibold text-[#02542D]">{t('sections.assignedUnits')}</h2>
            {!unitPanelOpen && (
              <button
                type="button"
                onClick={handleOpenUnitPanel}
                className="inline-flex items-center justify-center rounded-lg border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                {t('buttons.addUnit')}
              </button>
            )}
          </div>
          <div className="mt-3">{renderAssignedUnits()}</div>

          {(assignmentSuccess || assignmentError) && (
            <div className="mt-3 space-y-2">
              {assignmentSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {assignmentSuccess}
                </div>
              )}
              {assignmentError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {assignmentError}
                </div>
              )}
            </div>
          )}

          {unitPanelOpen && (
            <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">{t('units.building')}</label>
                <select
                  value={selectedBuildingId}
                  onChange={(event) => setSelectedBuildingId(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">{t('placeholders.selectBuilding')}</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name || building.code || building.id}
                    </option>
                  ))}
                </select>
                {loadingBuildings && (
                  <span className="text-xs text-slate-500">{t('units.loadingBuildings')}</span>
                )}
              </div>

              {selectedBuildingId && (
                <div className="space-y-3">
                  <span className="text-sm font-medium text-slate-700">{t('units.selectUnit')}</span>
                  {loadingAvailableUnits ? (
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                      {t('units.loading')}
                    </div>
                  ) : availableUnits.length ? (
                    <div className="space-y-2">
                      {availableUnits.map((unit) => {
                        const { primaryResidentId } = unit as unknown as {
                          primaryResidentId?: string | null;
                        };
                        const disabled =
                          assignedUnitIds.has(unit.id) || Boolean(primaryResidentId);
                        const checked = disabled || selectedUnitIds.includes(unit.id);
                        const label = unit.code ?? unit.name ?? unit.id;
                        const floor =
                          typeof unit.floor === 'number' && !Number.isNaN(unit.floor)
                            ? unit.floor
                            : undefined;
                        return (
                          <label
                            key={unit.id}
                            className={`flex cursor-pointer items-start justify-between gap-4 rounded-lg border px-3 py-2 text-sm transition ${
                              disabled
                                ? 'border-slate-200 bg-slate-100 text-slate-400'
                                : 'border-slate-200 bg-white hover:border-emerald-300'
                            }`}
                          >
                            <span className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4"
                                checked={checked}
                                disabled={disabled}
                                onChange={() => handleToggleUnitSelection(unit.id)}
                              />
                              <span>
                                <span className="font-semibold text-slate-800">
                                  {label}
                                </span>
                                {floor !== undefined && (
                                  <span className="block text-xs text-slate-500">
                                    {t('units.floor')} {floor}
                                  </span>
                                )}
                              </span>
                            </span>
                            {disabled && (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                                {t('units.assigned')}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                      {t('units.noUnitsInBuilding')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCloseUnitPanel}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
                >
                  {t('buttons.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleAddUnits}
                  disabled={assigningUnits || !selectedUnitIds.length}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {assigningUnits ? t('buttons.assigning') : t('buttons.assignUnit')}
                </button>
              </div>
            </div>
          )}
        </div>

        <PasswordChangeSection
          newPassword={form.newPassword}
          confirmPassword={form.confirmPassword}
          onChangeNewPassword={handlePasswordFieldChange('newPassword')}
          onChangeConfirmPassword={handlePasswordFieldChange('confirmPassword')}
        />
        <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t('buttons.saving') : t('buttons.save')}
            </button>
          </div>


      </form>
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

