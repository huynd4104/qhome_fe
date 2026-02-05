'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import DetailField from '@/src/components/base-service/DetailField';
import Select from '@/src/components/customer-interaction/Select';
import PasswordChangeSection from '@/src/components/account/PasswordChangeSection';
import {
  UpdateStaffAccountPayload,
  UserAccountInfo,
  UserProfileInfo,
  UserStatusInfo,
  fetchStaffAccountDetail,
  fetchUserProfile,
  fetchUserStatus,
  updateStaffAccount,
} from '@/src/services/iam/userService';

type FetchState = 'idle' | 'loading' | 'error' | 'success';

type FormState = {
  username: string;
  email: string;
  active: boolean;
  role: string;
  newPassword: string;
  confirmPassword: string;
};

export default function AccountEditStaffPage() {
  const router = useRouter();
  const t = useTranslations('AccountEditStaff');
  const params = useParams<{ id: string }>();
  const userIdParam = params?.id;
  const userId =
    typeof userIdParam === 'string' ? userIdParam : Array.isArray(userIdParam) ? userIdParam[0] : '';

  const [state, setState] = useState<FetchState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const STAFF_ROLE_SELECT_OPTIONS = useMemo(
    () => [
      { id: 'ADMIN', label: t('roles.admin') },
      { id: 'ACCOUNTANT', label: t('roles.accountant') },
      { id: 'TECHNICIAN', label: t('roles.technician') },
      { id: 'SUPPORTER', label: t('roles.supporter') },
    ],
    [t],
  );

  const STATUS_OPTIONS = useMemo(
    () => [
      { id: 'ACTIVE', label: t('status.active') },
      { id: 'INACTIVE', label: t('status.inactive') },
    ],
    [t],
  );

  const [account, setAccount] = useState<UserAccountInfo | null>(null);
  const [profile, setProfile] = useState<UserProfileInfo | null>(null);
  const [status, setStatus] = useState<UserStatusInfo | null>(null);

  const [form, setForm] = useState<FormState>({
    username: '',
    email: '',
    active: true,
    role: '',
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
          fetchStaffAccountDetail(userId),
          fetchUserProfile(userId),
          fetchUserStatus(userId),
        ]);

        if (!active) {
          return;
        }

        setAccount(accountRes);
        setProfile(profileRes);
        setStatus(statusRes);
        setForm({
          username: accountRes.username ?? '',
          email: accountRes.email ?? '',
          active: accountRes.active,
          role: accountRes.roles?.[0] ?? '',
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

  const handleBack = () => {
    router.push(`/accountList`);
  };

  const handleRoleSelect = (roleValue: string) => {
    setFormError(null);
    setSuccessMessage(null);
    setForm((prev) => ({
      ...prev,
      role: roleValue,
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

  const validateForm = () => {
    setFormError(null);
    if (!form.username.trim()) {
      setFormError(t('validation.username.required'));
      return false;
    }
    if (!form.email.trim()) {
      setFormError(t('validation.email.required'));
      return false;
    }
    if (!form.role) {
      setFormError(t('validation.role.required'));
      return false;
    }
    if (form.newPassword) {
      if (form.newPassword.length < 8) {
        setFormError(t('validation.password.minLength'));
        return false;
      }
      if (form.newPassword !== form.confirmPassword) {
        setFormError(t('validation.password.mismatch'));
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;
    setFormError(null);
    setSuccessMessage(null);
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const payload: UpdateStaffAccountPayload = {
        username: form.username.trim(),
        email: form.email.trim(),
        active: form.active,
        roles: [form.role],
      };
      if (form.newPassword) {
        payload.newPassword = form.newPassword;
      }

      const updatedAccount = await updateStaffAccount(userId, payload);
      setAccount(updatedAccount);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              username: updatedAccount.username,
              email: updatedAccount.email,
              roles: updatedAccount.roles ?? prev.roles,
            }
          : prev,
      );
      setForm((prev) => ({
        ...prev,
        username: updatedAccount.username ?? prev.username,
        email: updatedAccount.email ?? prev.email,
        role: updatedAccount.roles?.[0] ?? prev.role,
        newPassword: '',
        confirmPassword: '',
      }));
      setSuccessMessage(t('messages.updateSuccess'));
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('messages.updateError');
      setFormError(message);
    } finally {
      setSubmitting(false);
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

    return (
      <form
        onSubmit={handleSubmit}
        className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200 space-y-8"
      >
        {(formError || successMessage) && (
          <div className="space-y-3">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}
            {successMessage && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#02542D]">{account.username}</h1>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  form.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
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
            readonly={true}
            onChange={handleChange('username')}
          />
          <DetailField
            label={t('fields.email')}
            value={form.email}
            readonly={true}
            onChange={handleChange('email')}
          />

          <div className="flex flex-col gap-3">
            <h2 className="text-md font-semibold text-[#02542D]">{t('fields.role')}</h2>
            <div className="w-full sm:w-64">
              <Select
                options={STAFF_ROLE_SELECT_OPTIONS}
                value={form.role.toUpperCase()}
                onSelect={(option) => handleRoleSelect(option.id)}
                renderItem={(option) => option.label}
                getValue={(option) => option.id}
                placeholder={t('placeholders.selectRole')}
                disable={true}
              />
            </div>
            {formError === t('validation.role.required') && (
              <p className="text-xs font-medium text-red-600">
                {t('validation.role.selectMessage')}
              </p>
            )}
          </div>
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
              className="flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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

