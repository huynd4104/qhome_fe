'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { ArrowLeft, Save, Loader2, User, Mail, Shield, CheckCircle2, XCircle, Phone, MapPin, CreditCard, FileText } from 'lucide-react';
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
  fullName: string;
  phone: string;
  nationalId: string;
  address: string;
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
    fullName: '',
    phone: '',
    nationalId: '',
    address: '',
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
          fullName: accountRes.fullName ?? '',
          phone: accountRes.phone ?? '',
          nationalId: accountRes.nationalId ?? '',
          address: accountRes.address ?? '',
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

  const handleStatusToggle = () => {
    setForm((prev) => ({
      ...prev,
      active: !prev.active,
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
        /* const value = field === 'active' ? target.checked : target.value; // active handled by toggle */
        const value = target.value;
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
    if (!form.fullName.trim()) {
      setFormError(t('validation.fullName.required'));
      return false;
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
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        nationalId: form.nationalId.trim(),
        address: form.address.trim(),
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
        fullName: updatedAccount.fullName ?? prev.fullName,
        phone: updatedAccount.phone ?? prev.phone,
        nationalId: updatedAccount.nationalId ?? prev.nationalId,
        address: updatedAccount.address ?? prev.address,
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

  const renderContent = () => {
    if (state === 'loading' || state === 'idle') {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm font-medium text-slate-500">{t('loading')}</p>
        </div>
      );
    }

    if (state === 'error') {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-full bg-red-50 p-4">
            <Shield className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-slate-600">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800"
          >
            {t('buttons.retry')}
          </button>
        </div>
      );
    }

    if (!account) {
      return (
        <div className="flex min-h-[400px] items-center justify-center text-sm text-slate-500">
          {t('errors.accountNotFound')}
        </div>
      );
    }

    return (
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6"
      >
        {/* Card Container */}
        <div className="overflow-hidden rounded-3xl border border-white/50 bg-white/80 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
          {/* Header Section */}
          <div className="border-b border-slate-100 p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 shadow-inner">
                  <span className="text-xl font-bold">
                    {account.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    {account.username}
                  </h1>
                  <p className="text-sm text-slate-500">{account.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStatusToggle}
                className={`group relative inline-flex h-9 items-center rounded-full px-1 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${form.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 pr-4' : 'bg-slate-100 text-slate-500 border border-slate-200 pr-4'
                  }`}
              >
                <span
                  className={`mr-2 inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-full' : 'translate-x-0'
                    }`}
                />

                <span className={`ml-2 text-xs font-semibold uppercase tracking-wide ${form.active ? "order-first" : ""}`}>
                  {form.active ? t('status.active') : t('status.inactive')}
                </span>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 md:p-8 space-y-8">
            {/* Feedback Messages */}
            {(formError || successMessage) && (
              <div className={`rounded-2xl p-4 border ${formError ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                <div className="flex items-center gap-3">
                  {formError ? <XCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                  <p className="text-sm font-medium">{formError || successMessage}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
              {/* Username */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-500" />
                  {t('fields.username')}
                </label>
                <input
                  title={t('fields.username')}
                  type="text"
                  value={form.username}
                  readOnly
                  onChange={handleChange('username')}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-not-allowed"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-500" />
                  {t('fields.email')}
                </label>
                <input
                  title={t('fields.email')}
                  type="email"
                  value={form.email}
                  readOnly
                  onChange={handleChange('email')}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-not-allowed"
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  {t('fields.role')}
                </label>
                <div className="relative">
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
                  <p className="text-xs font-medium text-red-600 animate-pulse">
                    {t('validation.role.selectMessage')}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  {t('fields.fullName')}
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={handleChange('fullName')}
                  placeholder={t('placeholders.fullName')}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 hover:border-emerald-200"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  {t('fields.phone')}
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  placeholder={t('placeholders.phone')}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 hover:border-emerald-200"
                />
              </div>

              {/* National ID */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  {t('fields.nationalId')}
                </label>
                <input
                  type="text"
                  value={form.nationalId}
                  onChange={handleChange('nationalId')}
                  placeholder={t('placeholders.nationalId')}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 hover:border-emerald-200"
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  {t('fields.address')}
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={handleChange('address')}
                  placeholder={t('placeholders.address')}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 hover:border-emerald-200"
                />
              </div>
            </div>

            {/* Password Section */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
              <PasswordChangeSection
                newPassword={form.newPassword}
                confirmPassword={form.confirmPassword}
                onChangeNewPassword={handlePasswordFieldChange('newPassword')}
                onChangeConfirmPassword={handlePasswordFieldChange('confirmPassword')}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-600 hover:to-teal-700 hover:shadow-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('buttons.saving')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('buttons.save')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="group mb-6 flex items-center gap-2 rounded-lg py-2 pl-2 pr-4 text-slate-500 transition-all hover:bg-white hover:text-emerald-700 hover:shadow-sm"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition-colors group-hover:ring-emerald-200">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          </div>
          <span className="font-semibold">{t('back')}</span>
        </button>

        {renderContent()}
      </div>
    </div>
  );
}
