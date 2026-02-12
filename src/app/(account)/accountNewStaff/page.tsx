'use client';

import { ChangeEvent, FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  CreditCard,
  MapPin,
  Lock,
  Shield,
  Upload,
  XCircle,
  Loader2
} from 'lucide-react';
import Select from '@/src/components/customer-interaction/Select';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  CreateStaffAccountPayload,
  createStaffAccount,
  checkUsernameExists,
  checkEmailExists,
} from '@/src/services/iam/userService';
import { StaffImportModal } from '@/src/components/account/StaffImportModal';

type FormState = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  active: boolean;
  fullName: string;
  phone: string;
  nationalId: string;
  address: string;
};

export default function AccountNewStaffPage() {
  const router = useRouter();
  const t = useTranslations('AccountNewStaff');
  const { user, isLoading } = useAuth();

  const [form, setForm] = useState<FormState>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    active: true,
    fullName: '',
    phone: '',
    nationalId: '',
    address: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Check if user has ADMIN role
  useEffect(() => {
    if (!isLoading) {
      const isAdmin = user?.roles?.some(role => role.toUpperCase() === 'ADMIN') ?? false;
      if (!user || !isAdmin) {
        // Redirect to 404 if not admin
        router.push('/404');
      }
    }
  }, [user, isLoading, router]);

  const STAFF_ROLE_OPTIONS = [
    { id: 'ACCOUNTANT', label: t('roles.accountant') },
    { id: 'TECHNICIAN', label: t('roles.technician') },
    { id: 'SUPPORTER', label: t('roles.supporter') },
  ];

  const handleBack = () => {
    router.push('/accountList');
  };

  // Validate username format: only letters (no accents), numbers, and @, _, -, .
  const validateUsernameFormat = (username: string): boolean => {
    // Only allow: a-z, A-Z, 0-9, @, _, -, .
    const usernameRegex = /^[a-zA-Z0-9@_\-\.]+$/;
    return usernameRegex.test(username);
  };

  // Validate individual field
  const validateField = async (field: keyof FormState, value: string) => {
    switch (field) {
      case 'username':
        setUsernameError(null);
        if (!value.trim()) {
          setUsernameError(t('validation.username.required'));
        } else if (/\s/.test(value)) {
          setUsernameError(t('validation.username.noWhitespace'));
        } else if (value.length < 6) {
          setUsernameError(t('validation.username.minLength'));
        } else if (value.length > 16) {
          setUsernameError(t('validation.username.maxLength'));
        } else if (!validateUsernameFormat(value)) {
          setUsernameError(t('validation.username.invalidFormat'));
        } else {
          // Check username tồn tại trong database
          try {
            const exists = await checkUsernameExists(value.trim());
            if (exists) {
              setUsernameError(t('validation.username.exists'));
            }
          } catch (err: any) {
            console.error('Error checking username:', err);
          }
        }
        break;
      case 'email':
        setEmailError(null);
        if (!value.trim()) {
          setEmailError(t('validation.email.required'));
        } else if (/\s/.test(value)) {
          setEmailError(t('validation.email.noWhitespace'));
        } else if (value.length > 40) {
          setEmailError(t('validation.email.maxLength'));
        } else {
          const emailFormatError = validateEmailFormat(value);
          if (emailFormatError) {
            setEmailError(emailFormatError);
          } else {
            // Check email tồn tại trong database
            try {
              const exists = await checkEmailExists(value.trim());
              if (exists) {
                setEmailError(t('validation.email.exists'));
              }
            } catch (err: any) {
              // Nếu có lỗi khi check (network, etc.), không hiển thị lỗi
              console.error('Error checking email:', err);
            }
          }
        }
        break;
      case 'role':
        setRoleError(null);
        if (!value) {
          setRoleError(t('validation.role.required'));
        }
        break;
      case 'fullName':
        setFullNameError(null);
        if (!value.trim()) {
          setFullNameError(t('validation.fullName.required'));
        }
        break;
    }
  };

  const handleChange =
    (field: keyof FormState) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        const value =
          field === 'active' ? event.target.checked : event.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
        // Validate field on change
        if (field === 'username' || field === 'email') {
          setTimeout(() => {
            validateField(field, String(value));
          }, 500); // Debounce 500ms for async checks
        } else if (field === 'role') {
          validateField(field, String(value));
        } else if (field === 'fullName') {
          validateField(field, String(value));
        }
      };

  const handleRoleSelect = (roleId: string) => {
    setForm((prev) => ({ ...prev, role: roleId }));
    validateField('role', roleId);
  };

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
    setUsernameError(null);
    setEmailError(null);
    setRoleError(null);
    setFullNameError(null);
  };

  // Validate email format - must end with .com and have exactly one @
  const validateEmailFormat = (email: string): string => {
    // Ensure email contains exactly one @
    const atCount = (email.match(/@/g) || []).length;
    if (atCount === 0) {
      return t('validation.email.missingAt');
    }
    if (atCount > 1) {
      return t('validation.email.multipleAt');
    }

    // Split email into local part and domain
    const parts = email.split('@');
    if (parts.length !== 2) {
      return t('validation.email.invalidFormat');
    }

    const localPart = parts[0];
    const domain = parts[1];

    // Check if email ends with .com
    if (!domain.toLowerCase().endsWith('.com')) {
      return t('validation.email.mustEndWithCom');
    }

    // Validate local part: only allow a-zA-Z0-9._%+-
    const localPartPattern = /^[a-zA-Z0-9._%+-]+$/;
    if (!localPartPattern.test(localPart)) {
      return t('validation.email.invalidLocalPart');
    }

    // Validate domain part (before .com): only allow a-zA-Z0-9.-
    const domainWithoutCom = domain.substring(0, domain.length - 4);
    const domainPattern = /^[a-zA-Z0-9.-]+$/;
    if (!domainPattern.test(domainWithoutCom)) {
      return t('validation.email.invalidDomain');
    }

    // Final pattern check
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/i;
    if (!emailPattern.test(email)) {
      return t('validation.email.invalidFormat');
    }
    return "";
  };

  const validateForm = async () => {
    let isValid = true;

    // Validate username
    setUsernameError(null);
    if (!form.username.trim()) {
      setUsernameError(t('validation.username.required'));
      isValid = false;
    } else if (/\s/.test(form.username)) {
      setUsernameError(t('validation.username.noWhitespace'));
      isValid = false;
    } else if (form.username.length < 6) {
      setUsernameError(t('validation.username.minLength'));
      isValid = false;
    } else if (form.username.length > 16) {
      setUsernameError(t('validation.username.maxLength'));
      isValid = false;
    } else if (!validateUsernameFormat(form.username)) {
      setUsernameError(t('validation.username.invalidFormat'));
      isValid = false;
    } else {
      // Check username tồn tại trong database
      try {
        const exists = await checkUsernameExists(form.username.trim());
        if (exists) {
          setUsernameError(t('validation.username.exists'));
          isValid = false;
        }
      } catch (err: any) {
        // Nếu có lỗi khi check (network, etc.), vẫn cho phép submit và để backend xử lý
        console.error('Error checking username:', err);
      }
    }

    // Validate email
    setEmailError(null);
    if (!form.email.trim()) {
      setEmailError(t('validation.email.required'));
      isValid = false;
    } else if (/\s/.test(form.email)) {
      setEmailError(t('validation.email.noWhitespace'));
      isValid = false;
    } else if (form.email.length > 40) {
      setEmailError(t('validation.email.maxLength'));
      isValid = false;
    } else {
      const emailFormatError = validateEmailFormat(form.email);
      if (emailFormatError) {
        setEmailError(emailFormatError);
        isValid = false;
      } else {
        // Check email tồn tại trong database
        try {
          const exists = await checkEmailExists(form.email.trim());
          if (exists) {
            setEmailError(t('validation.email.exists'));
            isValid = false;
          }
        } catch (err: any) {
          // Nếu có lỗi khi check (network, etc.), vẫn cho phép submit và để backend xử lý
          console.error('Error checking email:', err);
        }
      }
    }

    // Validate role
    setRoleError(null);
    if (!form.role) {
      setRoleError(t('validation.role.required'));
      isValid = false;
    } else if (form.role === 'ADMIN') {
      setRoleError(t('validation.role.adminNotAllowed'));
      isValid = false;
    }

    // Validate fullName
    setFullNameError(null);
    if (!form.fullName.trim()) {
      setFullNameError(t('validation.fullName.required'));
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    const payload: CreateStaffAccountPayload = {
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      roles: [form.role],
      active: form.active,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      nationalId: form.nationalId.trim(),
      address: form.address.trim(),
    };

    try {
      setSubmitting(true);
      await createStaffAccount(payload);
      setSuccess(t('messages.createSuccess'));
      router.push('/accountList?created=true');
      setForm({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: '',
        active: true,
        fullName: '',
        phone: '',
        nationalId: '',
        address: '',
      });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('messages.createError');
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      {/* Back Button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={handleBack}
          className="group flex items-center gap-2 rounded-lg py-2 pl-2 pr-4 text-slate-500 transition-all hover:bg-white hover:text-emerald-700 hover:shadow-sm"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition-colors group-hover:ring-emerald-200">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          </div>
          <span className="font-semibold">{t('back')}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsImportModalOpen(true)}
          className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition-all hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2"
        >
          <Upload className="mr-2 h-4 w-4" />
          {t('importStaff')}
        </button>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Main Form Card */}
        <div className="relative z-10 overflow-visible rounded-3xl border border-white/50 bg-white/80 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
          <div className="border-b border-slate-100 p-6 md:p-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">{t('title')}</h1>
            <p className="mt-2 text-slate-500">
              {t('subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
            {/* Account Info Section */}
            <div className="space-y-6">
              <h3 className="flex items-center text-sm font-semibold uppercase tracking-wider text-slate-500">
                <Lock className="mr-2 h-4 w-4" />
                {t('sections.accountInfo') || 'Thông tin tài khoản'}
              </h3>

              <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
                <div className="group space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                    <User className="h-4 w-4 text-emerald-500" />
                    {t('fields.username')}
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => {
                      handleChange('username')(e);
                      if (usernameError) setUsernameError(null);
                    }}
                    placeholder={t('placeholders.username')}
                    maxLength={16}
                    className={`h-11 w-full rounded-xl border px-4 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 ${usernameError
                      ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-100 placeholder:text-red-300'
                      : 'border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-200'
                      }`}
                  />
                  {usernameError && (
                    <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1">
                      <XCircle className="mr-1 h-3 w-3" />
                      {usernameError}
                    </div>
                  )}
                </div>

                <div className="group space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                    <Mail className="h-4 w-4 text-emerald-500" />
                    {t('fields.email')}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => {
                      handleChange('email')(e);
                      if (emailError) setEmailError(null);
                    }}
                    placeholder={t('placeholders.email')}
                    maxLength={40}
                    className={`h-11 w-full rounded-xl border px-4 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 ${emailError
                      ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-100 placeholder:text-red-300'
                      : 'border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-200'
                      }`}
                  />
                  {emailError && (
                    <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1">
                      <XCircle className="mr-1 h-3 w-3" />
                      {emailError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Personal Info Section */}
            <div className="space-y-6">
              <h3 className="flex items-center text-sm font-semibold uppercase tracking-wider text-slate-500">
                <User className="mr-2 h-4 w-4" />
                {t('sections.personalInfo') || 'Thông tin cá nhân'}
              </h3>

              <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
                <div className="group space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                    <User className="h-4 w-4 text-emerald-500" />
                    {t('fields.fullName')}
                  </label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => {
                      handleChange('fullName')(e);
                      if (fullNameError) setFullNameError(null);
                    }}
                    placeholder={t('placeholders.fullName')}
                    className={`h-11 w-full rounded-xl border px-4 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 ${fullNameError
                      ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-100 placeholder:text-red-300'
                      : 'border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-200'
                      }`}
                  />
                  {fullNameError && (
                    <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1">
                      <XCircle className="mr-1 h-3 w-3" />
                      {fullNameError}
                    </div>
                  )}
                </div>

                <div className="group space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                    <Phone className="h-4 w-4 text-emerald-500" />
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

                <div className="group space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                    <CreditCard className="h-4 w-4 text-emerald-500" />
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

                <div className="group space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                    <MapPin className="h-4 w-4 text-emerald-500" />
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
            </div>

            <div className="h-px bg-slate-100" />

            {/* Role Section */}
            <div className="space-y-6">
              <h3 className="flex items-center text-sm font-semibold uppercase tracking-wider text-slate-500">
                <Shield className="mr-2 h-4 w-4" />
                {t('sections.roleInfo') || 'Vai trò'}
              </h3>

              <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    {t('fields.role')}
                  </label>
                  <Select
                    options={STAFF_ROLE_OPTIONS}
                    value={form.role}
                    onSelect={(option) => {
                      handleRoleSelect(option.id);
                      if (roleError) setRoleError(null);
                    }}
                    renderItem={(option) => option.label}
                    getValue={(option) => option.id}
                    placeholder={t('placeholders.role')}
                    error={!!roleError}
                  />
                  {roleError && (
                    <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1">
                      <XCircle className="mr-1 h-3 w-3" />
                      {roleError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-end border-t border-slate-100">

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('buttons.creating')}
                  </>
                ) : (
                  t('buttons.create')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      {isImportModalOpen && (
        <StaffImportModal
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            router.push('/accountList?created=true');
            setIsImportModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
