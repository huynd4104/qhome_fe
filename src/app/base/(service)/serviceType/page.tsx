'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Arrow from '@/src/assets/Arrow.svg';
import DetailField from '@/src/components/base-service/DetailField';
import ComboForm from '@/src/components/base-service/ComboForm';
import OptionForm from '@/src/components/base-service/OptionForm';
import TicketForm from '@/src/components/base-service/TicketForm';
import {
  BaseFormProps,
  BooleanOption,
  FormActions,
  RequiredSelect,
} from '@/src/components/base-service/ServiceFormControls';
import { useNotifications } from '@/src/hooks/useNotifications';
import {
  createServiceOptionGroup,
} from '@/src/services/asset-maintenance/serviceService';
import {
  CreateServiceOptionGroupPayload,
} from '@/src/types/service';

type FormType = 'combo' | 'option' | 'option-group' | 'ticket';

const VALID_TYPES: FormType[] = ['combo', 'option', 'option-group', 'ticket'];
function OptionGroupForm({ serviceId, onSuccess, onCancel, t, show }: BaseFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    minSelect: '',
    maxSelect: '',
    isRequired: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const yesNoOptions = useMemo<BooleanOption[]>(
    () => [
      { value: true, label: t('Popup.yes') },
      { value: false, label: t('Popup.no') },
    ],
    [t],
  );

  const handleChange = (name: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as string]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name as string];
        return updated;
      });
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.code.trim()) {
      nextErrors.code = t('Service.validation.optionGroupCode');
    }
    if (!formData.name.trim()) {
      nextErrors.name = t('Service.validation.optionGroupName');
    }
    if (formData.minSelect.trim()) {
      const min = Number(formData.minSelect);
      if (Number.isNaN(min) || min < 0) {
        nextErrors.minSelect = t('Service.validation.nonNegative');
      }
    }
    if (formData.maxSelect.trim()) {
      const max = Number(formData.maxSelect);
      if (Number.isNaN(max) || max < 0) {
        nextErrors.maxSelect = t('Service.validation.nonNegative');
      }
    }
    if (
      formData.minSelect.trim() &&
      formData.maxSelect.trim() &&
      Number(formData.maxSelect) < Number(formData.minSelect)
    ) {
      nextErrors.range = t('Service.validation.optionGroupRange');
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: CreateServiceOptionGroupPayload = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        minSelect: formData.minSelect.trim() ? Number(formData.minSelect) : null,
        maxSelect: formData.maxSelect.trim() ? Number(formData.maxSelect) : null,
        isRequired: formData.isRequired,
      };
      await createServiceOptionGroup(serviceId, payload);
      show(t('Service.messages.createOptionGroupSuccess'), 'success');
      onSuccess();
    } catch (error) {
      console.error('Failed to create option group', error);
      show(t('Service.messages.createOptionGroupError'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200"
      onSubmit={handleSubmit}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        <DetailField
          label={t('Service.optionGroupCode')}
          name="code"
          value={formData.code}
          onChange={(event) => handleChange('code', event.target.value)}
          readonly={false}
          error={errors.code}
        />
        <DetailField
          label={t('Service.optionGroupName')}
          name="name"
          value={formData.name}
          onChange={(event) => handleChange('name', event.target.value)}
          readonly={false}
          error={errors.name}
        />
        <DetailField
          label={t('Service.optionGroupMinSelect')}
          name="minSelect"
          value={formData.minSelect}
          onChange={(event) => handleChange('minSelect', event.target.value)}
          readonly={false}
          error={errors.minSelect}
          inputType="number"
        />
        <DetailField
          label={t('Service.optionGroupMaxSelect')}
          name="maxSelect"
          value={formData.maxSelect}
          onChange={(event) => handleChange('maxSelect', event.target.value)}
          readonly={false}
          error={errors.maxSelect || errors.range}
          inputType="number"
        />
        <RequiredSelect
          label={t('Service.optionGroupIsRequired')}
          value={formData.isRequired}
          onChange={(value) => handleChange('isRequired', value)}
          options={yesNoOptions}
          placeholder={t('Popup.yes')}
        />
        <DetailField
          label={t('Service.optionGroupDescription')}
          name="description"
          value={formData.description}
          onChange={(event) => handleChange('description', event.target.value)}
          readonly={false}
          type="textarea"
          isFullWidth
        />
      </div>
      <FormActions
        submitting={submitting}
        onCancel={onCancel}
        cancelLabel={t('Service.cancel')}
        submitLabel={t('Service.save')}
      />
    </form>
  );
}

export default function ServiceTypeCreatePage() {
  const t = useTranslations();
  const router = useRouter();
  const { show } = useNotifications();
  const searchParams = useSearchParams();

  const typeParam = (searchParams.get('type') ?? '').toLowerCase() as FormType;
  const serviceId = searchParams.get('serviceId') ?? '';
  const editId = searchParams.get('editId') ?? undefined;

  const handleBack = () => {
    if (serviceId) {
      router.push(`/base/serviceDetail/${serviceId}`);
    } else {
      router.push('/base/serviceList');
    }
  };

  const handleSuccess = () => {
    if (serviceId) {
      router.push(`/base/serviceDetail/${serviceId}`);
    } else {
      router.push('/base/serviceList');
    }
  };

  const titleMap: Record<FormType, string> = {
    combo: editId ? t('Service.editComboTitle') : t('Service.createComboTitle'),
    option: editId ? t('Service.editOptionTitle') : t('Service.createOptionTitle'),
    'option-group': editId ? t('Service.editOptionGroupTitle') : t('Service.createOptionGroupTitle'),
    ticket: editId ? t('Service.editTicketTitle') : t('Service.createTicketTitle'),
  };

  const isValid = serviceId && VALID_TYPES.includes(typeParam);

  return (
    <div className="min-h-screen p-4 sm:p-8 font-sans">
      <div
        className="max-w-5xl mx-auto mb-6 flex items-center cursor-pointer"
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
          {t('Service.returnDetail')}
        </span>
      </div>

      {!isValid ? (
        <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-red-200 text-center">
          <p className="text-red-600 mb-4">{t('Service.invalidType')}</p>
          <button
            type="button"
            className="px-6 py-2 rounded-lg bg-[#02542D] text-white hover:bg-opacity-80 transition"
            onClick={handleBack}
          >
            {t('Service.returnDetail')}
          </button>
        </div>
      ) : (
        <>
          <div className="max-w-5xl mx-auto mb-6">
            <h1 className="text-2xl font-semibold text-[#02542D]">
              {titleMap[typeParam]}
            </h1>
          </div>
          {typeParam === 'combo' && (
            <ComboForm
              serviceId={serviceId}
              onSuccess={handleSuccess}
              onCancel={handleBack}
              t={t}
              show={show}
            />
          )}
          {typeParam === 'option' && (
            <OptionForm
              serviceId={serviceId}
              editId={editId}
              onSuccess={handleSuccess}
              onCancel={handleBack}
              t={t}
              show={show}
            />
          )}
          {/* {typeParam === 'option-group' && (
            <OptionGroupForm
              serviceId={serviceId}
              onSuccess={handleSuccess}
              onCancel={handleBack}
              t={t}
              show={show}
            />
          )} */}
          {typeParam === 'ticket' && (
            <TicketForm
              serviceId={serviceId}
              editId={editId}
              onSuccess={handleSuccess}
              onCancel={handleBack}
              t={t}
              show={show}
            />
          )}
        </>
      )}
    </div>
  );
}

