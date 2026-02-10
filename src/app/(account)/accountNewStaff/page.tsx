'use client';

import { ChangeEvent, FormEvent, useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
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
      <div className="min-h-screen bg-slate-50 p-4 sm:p-8 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
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
      <div
        className="mx-auto mb-6 flex max-w-6xl cursor-pointer items-center"
        onClick={handleBack}
      >
        <Image src={Arrow} alt={t('back')} width={20} height={20} className="mr-2 h-5 w-5" />
        <span className="text-2xl font-bold text-[#02542D] transition hover:text-opacity-80">
          {t('back')}
        </span>
      </div>

      <div className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>
            <p className="text-sm text-slate-500">
              {t('subtitle')}
            </p>
          </div>

          {/* {(error || success) && (
          <div className="mb-6 space-y-3">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}
          </div>
        )} */}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">{t('fields.username')}</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => {
                    handleChange('username')(e);
                    if (usernameError) {
                      setUsernameError(null);
                    }
                  }}
                  placeholder={t('placeholders.username')}
                  maxLength={16}
                  className={`rounded-lg border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 ${usernameError
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
                    }`}
                />
                {usernameError && (
                  <p className="text-xs text-red-600">{usernameError}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">{t('fields.email')}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    handleChange('email')(e);
                    if (emailError) {
                      setEmailError(null);
                    }
                  }}
                  placeholder={t('placeholders.email')}
                  maxLength={40}
                  className={`rounded-lg border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 ${emailError
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
                    }`}
                />
                {emailError && (
                  <p className="text-xs text-red-600">{emailError}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">{t('fields.fullName')}</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => {
                    handleChange('fullName')(e);
                    if (fullNameError) {
                      setFullNameError(null);
                    }
                  }}
                  placeholder={t('placeholders.fullName')}
                  className={`rounded-lg border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 ${fullNameError
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
                    }`}
                />
                {fullNameError && (
                  <p className="text-xs text-red-600">{fullNameError}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">{t('fields.phone')}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  placeholder={t('placeholders.phone')}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">{t('fields.nationalId')}</label>
                <input
                  type="text"
                  value={form.nationalId}
                  onChange={handleChange('nationalId')}
                  placeholder={t('placeholders.nationalId')}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">{t('fields.address')}</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={handleChange('address')}
                  placeholder={t('placeholders.address')}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">{t('fields.role')}</label>
                <Select
                  options={STAFF_ROLE_OPTIONS}
                  value={form.role}
                  onSelect={(option) => {
                    handleRoleSelect(option.id);
                    if (roleError) {
                      setRoleError(null);
                    }
                  }}
                  renderItem={(option) => option.label}
                  getValue={(option) => option.id}
                  placeholder={t('placeholders.role')}
                  error={!!roleError}
                />
                {roleError && (
                  <p className="text-xs text-red-600">{roleError}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {t('buttons.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? t('buttons.creating') : t('buttons.create')}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-slate-800">{t('import.title')}</h2>
            <p className="text-sm text-slate-500">
              {t('import.description')}
            </p>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="inline-flex w-fit items-center justify-center rounded-md border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloadingTemplate ? t('buttons.downloadingTemplate') : t('buttons.downloadTemplate')}
            </button>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700">{t('import.fileLabel')}</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileChange}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              {importFile && (
                <p className="mt-2 text-xs text-slate-500">
                  {t('import.fileSelected')} <span className="font-medium text-slate-700">{importFile.name}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? t('buttons.importing') : t('buttons.import')}
            </button>
          </div>

          {(importError || importSummary) && (
            <div className="mt-6 space-y-3">
              {importError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {importError}
                </div>
              )}
              {importSummary && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {importSummary}
                </div>
              )}
            </div>
          )}

          {importResult && importResult.rows.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">{t('import.tableHeaders.row')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">{t('import.tableHeaders.username')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">{t('import.tableHeaders.email')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">{t('import.tableHeaders.roles')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">{t('import.tableHeaders.active')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">{t('import.tableHeaders.result')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importResult.rows.map((row) => (
                    <tr key={`${row.rowNumber}-${row.username}`}>
                      <td className="px-3 py-2 text-slate-600">{row.rowNumber}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{row.username}</td>
                      <td className="px-3 py-2 text-slate-700">{row.email}</td>
                      <td className="px-3 py-2 text-slate-600">{row.roles.join(', ')}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.active === null ? '-' : row.active ? t('import.status.yes') : t('import.status.no')}
                      </td>
                      <td className="px-3 py-2">
                        {row.success ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {t('import.status.success')}
                          </span>
                        ) : (
                          <div className="text-xs text-red-600">
                            {t('import.status.failure')}
                            {row.message && <p className="mt-1 text-[11px] text-red-500">{row.message}</p>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

