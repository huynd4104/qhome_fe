'use client';

import { ChangeEvent, FormEvent, useMemo, useState, useEffect, useRef } from 'react';
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
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import Select from '@/src/components/customer-interaction/Select';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  CreateStaffAccountPayload,
  StaffImportResponse,
  createStaffAccount,
  checkUsernameExists,
  checkEmailExists,
  downloadStaffImportTemplate,
  importStaffAccounts,
} from '@/src/services/iam/userService';

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
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<StaffImportResponse | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // IMPORTANT: All hooks must be called before any conditional returns
  const importSummary = useMemo(() => {
    if (!importResult) return null;
    return t('messages.importResult', {
      totalRows: importResult.totalRows,
      successCount: importResult.successCount,
      failureCount: importResult.failureCount
    });
  }, [importResult, t]);

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

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Don't render if not admin (will redirect to 404)
  const isAdmin = user?.roles?.some(role => role.toUpperCase() === 'ADMIN') ?? false;
  if (!user || !isAdmin) {
    return null;
  }
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportResult(null);
    const file = event.target.files?.[0];
    setImportFile(file ?? null);
    // Reset input value after a short delay to allow selecting the same file again
    // This ensures onChange fires even when selecting the same file
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 0);
  };

  const handleImport = async () => {
    setImportError(null);
    setImportResult(null);

    if (!importFile) {
      setImportError(t('validation.excelFileRequired'));
      return;
    }

    if (!importFile.name.toLowerCase().endsWith('.xlsx')) {
      setImportError(t('validation.excelFileFormat'));
      return;
    }

    try {
      setImporting(true);
      const result = await importStaffAccounts(importFile);
      setImportResult(result);
      // Clear the file after successful import to allow re-selecting
      setImportFile(null);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('errors.importFailed');
      setImportError(message);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setImportError(null);
    try {
      setDownloadingTemplate(true);
      const blob = await downloadStaffImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'staff_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('errors.templateDownloadFailed');
      setImportError(message);
    } finally {
      setDownloadingTemplate(false);
    }
  };

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
        {/* Main Form Card */}
        <div className="overflow-hidden rounded-3xl border border-white/50 bg-white/80 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
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

              <div className="grid gap-6 md:grid-cols-2">
                <div className="group space-y-2">
                  <label className="text-sm font-medium text-slate-700 transition-colors group-focus-within:text-emerald-600">{t('fields.username')}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => {
                        handleChange('username')(e);
                        if (usernameError) setUsernameError(null);
                      }}
                      placeholder={t('placeholders.username')}
                      maxLength={16}
                      className={`w-full rounded-xl border bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 ${usernameError
                          ? 'border-red-200 focus:border-red-500 focus:ring-red-100'
                          : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
                        }`}
                    />
                  </div>
                  {usernameError && (
                    <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1">
                      <XCircle className="mr-1 h-3 w-3" />
                      {usernameError}
                    </div>
                  )}
                </div>

                <div className="group space-y-2">
                  <label className="text-sm font-medium text-slate-700 transition-colors group-focus-within:text-emerald-600">{t('fields.email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => {
                        handleChange('email')(e);
                        if (emailError) setEmailError(null);
                      }}
                      placeholder={t('placeholders.email')}
                      maxLength={40}
                      className={`w-full rounded-xl border bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 ${emailError
                          ? 'border-red-200 focus:border-red-500 focus:ring-red-100'
                          : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
                        }`}
                    />
                  </div>
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

              <div className="grid gap-6 md:grid-cols-2">
                <div className="group space-y-2">
                  <label className="text-sm font-medium text-slate-700 transition-colors group-focus-within:text-emerald-600">{t('fields.fullName')}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => {
                        handleChange('fullName')(e);
                        if (fullNameError) setFullNameError(null);
                      }}
                      placeholder={t('placeholders.fullName')}
                      className={`w-full rounded-xl border bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 ${fullNameError
                          ? 'border-red-200 focus:border-red-500 focus:ring-red-100'
                          : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
                        }`}
                    />
                  </div>
                  {fullNameError && (
                    <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1">
                      <XCircle className="mr-1 h-3 w-3" />
                      {fullNameError}
                    </div>
                  )}
                </div>

                <div className="group space-y-2">
                  <label className="text-sm font-medium text-slate-700 transition-colors group-focus-within:text-emerald-600">{t('fields.phone')}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={handleChange('phone')}
                      placeholder={t('placeholders.phone')}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 transition-all placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>
                </div>

                <div className="group space-y-2">
                  <label className="text-sm font-medium text-slate-700 transition-colors group-focus-within:text-emerald-600">{t('fields.nationalId')}</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
                    <input
                      type="text"
                      value={form.nationalId}
                      onChange={handleChange('nationalId')}
                      placeholder={t('placeholders.nationalId')}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 transition-all placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>
                </div>

                <div className="group space-y-2">
                  <label className="text-sm font-medium text-slate-700 transition-colors group-focus-within:text-emerald-600">{t('fields.address')}</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
                    <input
                      type="text"
                      value={form.address}
                      onChange={handleChange('address')}
                      placeholder={t('placeholders.address')}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 transition-all placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>
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

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">{t('fields.role')}</label>
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
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2"
              >
                {t('buttons.cancel')}
              </button>
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

        {/* Import Section */}
        <div className="overflow-hidden rounded-3xl border border-dashed border-emerald-200 bg-white/60 p-6 shadow-sm backdrop-blur-sm transition-all hover:bg-white/80 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h2 className="flex items-center text-xl font-semibold text-slate-800">
                <FileSpreadsheet className="mr-2 h-5 w-5 text-emerald-600" />
                {t('import.title')}
              </h2>
              <p className="text-sm text-slate-500 max-w-xl">
                {t('import.description')}
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="group inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-2 text-sm font-medium text-emerald-700 transition-all hover:bg-emerald-100 hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloadingTemplate ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {downloadingTemplate ? t('buttons.downloadingTemplate') : t('buttons.downloadTemplate')}
            </button>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="block text-sm font-medium text-slate-700">{t('import.fileLabel')}</label>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-700 hover:file:bg-emerald-100 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100"
                />
              </div>
              {importFile && (
                <p className="flex items-center text-xs text-emerald-600 animate-in slide-in-from-top-1">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {t('import.fileSelected')} <span className="ml-1 font-medium">{importFile.name}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="inline-flex items-center justify-center rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('buttons.importing')}
                </>
              ) : (
                t('buttons.import')
              )}
            </button>
          </div>

          {(importError || importSummary) && (
            <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-top-2">
              {importError && (
                <div className="flex items-start rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <XCircle className="mr-2 h-5 w-5 shrink-0 text-red-600" />
                  <span>{importError}</span>
                </div>
              )}
              {importSummary && (
                <div className="flex items-start rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <CheckCircle2 className="mr-2 h-5 w-5 shrink-0 text-emerald-600" />
                  <span>{importSummary}</span>
                </div>
              )}
            </div>
          )}

          {importResult && importResult.rows.length > 0 && (
            <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm animate-in fade-in slide-in-from-bottom-2">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50/80 backdrop-blur-sm">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">{t('import.tableHeaders.row')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">{t('import.tableHeaders.username')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">{t('import.tableHeaders.email')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">{t('import.tableHeaders.roles')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">{t('import.tableHeaders.active')}</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">{t('import.tableHeaders.result')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importResult.rows.map((row) => (
                      <tr key={`${row.rowNumber}-${row.username}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 font-medium">#{row.rowNumber}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{row.username}</td>
                        <td className="px-4 py-3 text-slate-600">{row.email}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {row.roles.map(r => (
                            <span key={r} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                              {r}
                            </span>
                          ))}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {row.active === null ? '-' : row.active ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                              {t('import.status.yes')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              {t('import.status.no')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.success ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t('import.status.success')}
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 border border-red-100">
                                <XCircle className="h-3.5 w-3.5" />
                                {t('import.status.failure')}
                              </span>
                              {row.message && <p className="ml-1 text-[11px] text-red-500">{row.message}</p>}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
