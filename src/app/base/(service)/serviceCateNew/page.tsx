'use client'

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import DetailField from '@/src/components/base-service/DetailField';
import Select from '@/src/components/customer-interaction/Select';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useNotifications } from '@/src/hooks/useNotifications';
import { useServiceCategoryAdd } from '@/src/hooks/useServiceCategoryAdd';
import { CreateServiceCategoryPayload } from '@/src/types/service';

type FormState = {
  code: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: string;
};

const initialState: FormState = {
  code: '',
  name: '',
  description: '',
  icon: '',
  sortOrder: '',
};

export default function ServiceCategoryCreatePage() {
  const t = useTranslations('ServiceCategory');
  const router = useRouter();
  const { show } = useNotifications();
  const { addCategory, isSubmitting } = useServiceCategoryAdd();

  const [formState, setFormState] = useState<FormState>(initialState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // VN normalize and acronym helpers
  const normalizeVN = (input: string) =>
    input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd');

  const buildAcronym = (name: string) => {
    const cleaned = normalizeVN(name).trim();
    if (!cleaned) return '';
    const parts = cleaned.split(/\s+/);
    const acronym = parts
      .map((p) => (p.match(/[A-Za-z]/) ? p.match(/[A-Za-z]/)![0] : ''))
      .join('')
      .toUpperCase();
    const last = parts[parts.length - 1];
    const numericSuffix = /^\d+$/.test(last) ? last : '';
    return `${acronym}${numericSuffix}`;
  };

  const formatDateDDMMYY = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}${mm}${yy}`;
  };

  // Generate code per spec: SVC-<acronym>-<ddmmyy><attempt?>
  const generateCodeFromName = (name: string, attempt: number = 0) => {
    const acronym = buildAcronym(name);
    const today = formatDateDDMMYY(new Date());
    const base = `SVC-${acronym}-${today}`;
    return attempt > 0 ? `${base}${attempt}` : base;
  };

  // Auto-update code when name changes
  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      code: generateCodeFromName(prev.name || '', 0),
    }));
  }, [formState.name]);

  const handleBack = () => {
    router.push('/base/serviceCateList');
  };

  // Validate individual field
  // const validateField = (fieldName: string, value: string) => {
  //   const newErrors = { ...formErrors };
    
  //   switch (fieldName) {
  //     case 'name':
  //       const name = value.trim();
  //       const nameRegex = /^[a-zA-ZÀ-ỹĐđ0-9\s'-]+$/u;
  //       if (!name) {
  //         newErrors.name = t('validation.name');
  //       } else if (name.length > 40) {
  //         newErrors.name = t('validation.nameMax40');
  //       } else if (!nameRegex.test(name)) {
  //         newErrors.name = t('validation.nameNoSpecialChars');
  //       } else {
  //         delete newErrors.name;
  //       }
  //       break;
  //     case 'code':
  //       if (!value.trim()) {
  //         newErrors.code = t('validation.code');
  //       } else {
  //         delete newErrors.code;
  //       }
  //       break;
  //   }
    
  //   setFormErrors(newErrors);
  // };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing (optional UX improvement)
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formState.code.trim()) {
      errors.code = t('validation.code');
    }
    const name = formState.name.trim();
    const nameRegex = /^[a-zA-ZÀ-ỹĐđ0-9\s'-]+$/u;
    if (name.length == 0) {
      errors.name = t('validation.name');
    } else if (name.length > 40) {
      errors.name = t('validation.nameMax40');
    } else if (!nameRegex.test(name)) {
      errors.name = t('validation.nameNoSpecialChars');
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildPayload = (): CreateServiceCategoryPayload => ({
    code: formState.code.trim(),
    name: formState.name.trim(),
    description: formState.description.trim() || undefined,
    icon: formState.icon.trim() || undefined,
    sortOrder: formState.sortOrder ? Number(formState.sortOrder) : null,
    isActive: true, // always active on creation
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!validate()) {
      show(t('validation.error'), 'error');
      return;
    }

    try {
      // Retry up to 5 times if backend rejects code as duplicate by incrementing suffix
      let attempts = 0;
      let created = null as any;
      let lastError: any = null;
      while (attempts < 5) {
        attempts += 1;
        const nextCode = generateCodeFromName(formState.name || '', attempts - 1);
        setFormState((prev) => ({ ...prev, code: nextCode }));
        const payload = {
          ...buildPayload(),
          code: nextCode,
        };
        try {
          created = await addCategory(payload);
          lastError = null;
          break;
        } catch (err: any) {
          const msg = err?.response?.data?.message?.toString() || err?.message?.toString() || '';
          lastError = err;
          if (
            msg.toLowerCase().includes('code') &&
            (msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('duplicate'))
          ) {
            // increment and retry
            continue;
          }
          throw err;
        }
      }
      if (lastError) {
        throw lastError;
      }
      show(t('messages.createSuccess'), 'success');
      if (created?.id) {
        router.push('/base/serviceCateList');
      }
    } catch (submitError) {
      console.error('Failed to create service category', submitError);
      show(t('messages.createError'), 'error');
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 font-sans">
      <div
        className="max-w-4xl mx-auto mb-6 flex items-center cursor-pointer"
        onClick={handleBack}
      >
        <Image
          src={Arrow}
          alt="Back"
          width={20}
          height={20}
          className="w-5 h-5 mr-2"
        />
        <span className="text-[#02542D] font-bold text-2xl hover:text-opacity-80 transition duration-150">
          {t('return')}
        </span>
      </div>

      <form
        className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b pb-4 mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#02542D]">
              {t('newTitle')}
            </h1>
          </div>
          
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <DetailField
            label={t('code')}
            name="code"
            value={formState.code}
            onChange={() => {}}
            readonly={true}
            error={formErrors.code}
          />
          <DetailField
            label={t('name')}
            name="name"
            value={formState.name}
            onChange={handleInputChange}
            readonly={false}
            error={formErrors.name}
          />
          <DetailField
            label={t('description')}
            name="description"
            value={formState.description}
            onChange={handleInputChange}
            readonly={false}
            type="textarea"
            isFullWidth
          />
        </div>

        <div className="flex justify-center mt-8 space-x-4">
          <button
            type="button"
            className="px-6 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            className={`px-6 py-2 rounded-lg bg-[#02542D] text-white hover:bg-opacity-80 transition ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? t('saving') : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
