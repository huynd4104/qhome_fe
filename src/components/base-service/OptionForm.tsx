import { useMemo, useState, useEffect, useRef } from 'react';
import DetailField from '@/src/components/base-service/DetailField';
import {
  BaseFormProps,
  BooleanOption,
  FormActions,
  RequiredSelect,
} from '@/src/components/base-service/ServiceFormControls';
import { createServiceOption, updateServiceOption, checkOptionCodeExistsGlobally, getService, getServiceOption } from '@/src/services/asset-maintenance/serviceService';
import { CreateServiceOptionPayload, UpdateServiceOptionPayload } from '@/src/types/service';
import { formatCurrency, parseCurrency } from '@/src/utils/formatCurrency';

function OptionForm({ serviceId, editId, onSuccess, onCancel, t, show }: BaseFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    price: '',
    unit: '',
    isRequired: false,
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serviceName, setServiceName] = useState<string>('');
  const codeGenerationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const yesNoOptions = useMemo<BooleanOption[]>(
    () => [
      { value: true, label: t('Popup.yes') },
      { value: false, label: t('Popup.no') },
    ],
    [t],
  );

  // Create abbreviation from Vietnamese text (keep accents)
  const createAbbreviation = (text: string): string => {
    if (!text || !text.trim()) return '';
    
    // Keep Vietnamese accents, just uppercase and split
    const normalized = text.trim().toUpperCase();
    const words = normalized.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length === 0) return '';
    if (words.length === 1) {
      // If only one word, take first character (keep accent)
      return words[0].charAt(0);
    }
    
    // Take first character of each word (keep accents)
    return words.map(word => word.charAt(0)).join('');
  };

  // Generate auto option code: OP-<service abbreviation>-<option abbreviation>-<ddmmyy>
  const generateAutoOptionCode = (serviceAbbr: string, optionAbbr: string): string => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    return `OP-${serviceAbbr}-${optionAbbr}-${day}${month}${year}`;
  };

  // Fetch service name and option data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (serviceId) {
        try {
          const service = await getService(serviceId);
          setServiceName(service.name || '');
        } catch (error) {
          console.error('Failed to fetch service:', error);
        }
      }
      
      // Load option data if editing
      if (editId) {
        try {
          const option = await getServiceOption(editId);
          setFormData({
            code: option.code || '',
            name: option.name || '',
            description: option.description || '',
            price: option.price?.toString() || '',
            unit: option.unit || '',
            isRequired: option.isRequired ?? false,
            isActive: option.isActive ?? true,
          });
        } catch (error) {
          console.error('Failed to fetch option:', error);
          show(t('Service.error'), 'error');
        }
      }
    };
    fetchData();
  }, [serviceId, editId, t, show]);

  // Generate and set option code when service name or option name changes (only for create mode)
  useEffect(() => {
    if (editId) return; // Don't auto-generate code when editing
    
    const generateCode = async () => {
      if (!serviceId || !serviceName || !formData.name.trim()) {
        return;
      }
      
      const serviceAbbr = createAbbreviation(serviceName);
      const optionAbbr = createAbbreviation(formData.name);
      
      if (!serviceAbbr || !optionAbbr) {
        return;
      }
      
      const baseCode = generateAutoOptionCode(serviceAbbr, optionAbbr);
      let newCode = baseCode;
      let suffix = 1;
      
      // Check if base code exists globally
      const baseExists = await checkOptionCodeExistsGlobally(baseCode);
      if (!baseExists) {
        setFormData((prev) => ({ ...prev, code: baseCode }));
        return;
      }
      
      // If base code exists, try with suffix
      while (suffix <= 100) {
        newCode = baseCode + suffix.toString();
        const exists = await checkOptionCodeExistsGlobally(newCode);
        if (!exists) {
          setFormData((prev) => ({ ...prev, code: newCode }));
          return;
        }
        suffix++;
      }
      
      // If all attempts fail, use the last generated code (backend will handle uniqueness)
      setFormData((prev) => ({ ...prev, code: newCode }));
    };

    // Debounce code generation when option name changes
    if (codeGenerationTimeoutRef.current) {
      clearTimeout(codeGenerationTimeoutRef.current);
    }
    
    codeGenerationTimeoutRef.current = setTimeout(() => {
      generateCode();
    }, 500);
    
    // Cleanup timeout on unmount
    return () => {
      if (codeGenerationTimeoutRef.current) {
        clearTimeout(codeGenerationTimeoutRef.current);
      }
    };
  }, [serviceId, serviceName, formData.name, editId]);

  // Validate option name: not null, max 40 chars, no special chars but allow spaces and Vietnamese accents
  const validateOptionName = (name: string): string | null => {
    if (!name.trim()) {
      return t('Service.validation.optionName') || 'Tên tùy chọn không được để trống';
    }
    if (name.length > 40) {
      return 'Tên tùy chọn không được vượt quá 40 ký tự';
    }
    // Allow letters (including Vietnamese with all accents), numbers, spaces, and common punctuation
    const nameRegex = /^[\p{L}\p{N}\s'-]+$/u;
    if (!nameRegex.test(name)) {
      return 'Tên tùy chọn không được chứa ký tự đặc biệt';
    }
    return null;
  };

  // Validate individual field
  const validateField = async (field: keyof typeof formData, value: string | boolean) => {
    const stringValue = String(value);
    
    switch (field) {
      case 'code':
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.code;
          return updated;
        });
        if (!stringValue.trim()) {
          setErrors((prev) => ({ ...prev, code: t('Service.validation.optionCode') }));
        } else {
          // Check code exists globally in database
          try {
            const exists = await checkOptionCodeExistsGlobally(stringValue.trim());
            if (exists) {
              setErrors((prev) => ({ ...prev, code: t('Service.validation.optionCodeExists') || 'Mã tùy chọn đã tồn tại trong hệ thống' }));
            }
          } catch (err: any) {
            console.error('Error checking option code:', err);
          }
        }
        break;
      case 'name':
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.name;
          return updated;
        });
        const nameError = validateOptionName(stringValue);
        if (nameError) {
          setErrors((prev) => ({ ...prev, name: nameError }));
        }
        break;
      case 'price':
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.price;
          return updated;
        });
        if (!stringValue.trim()) {
          setErrors((prev) => ({ ...prev, price: 'Giá không được để trống' }));
        } else {
          const price = Number(stringValue);
          if (Number.isNaN(price) || price <= 0) {
            setErrors((prev) => ({ ...prev, price: 'Giá phải lớn hơn 0' }));
          }
        }
        break;
      case 'unit':
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.unit;
          return updated;
        });
        if (!stringValue.trim()) {
          setErrors((prev) => ({ ...prev, unit: 'Đơn vị không được để trống' }));
        }
        break;
      case 'isRequired':
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.isRequired;
          return updated;
        });
        // isRequired is boolean, so it's always set (not null)
        break;
    }
  };

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
    
    // Real-time validation with debounce for async checks
    if (name === 'code' || name === 'name' || name === 'price' || name === 'unit') {
      if (codeGenerationTimeoutRef.current) {
        clearTimeout(codeGenerationTimeoutRef.current);
      }
      codeGenerationTimeoutRef.current = setTimeout(() => {
        validateField(name, value);
      }, name === 'code' ? 500 : 300);
    }
  };

  const validate = async () => {
    const nextErrors: Record<string, string> = {};
    
    // Validate code (only check uniqueness when creating, not editing)
    if (!formData.code.trim()) {
      nextErrors.code = t('Service.validation.optionCode');
    } else if (!editId) {
      // Check code exists globally in database (only for create mode)
      try {
        const exists = await checkOptionCodeExistsGlobally(formData.code.trim());
        if (exists) {
          nextErrors.code = t('Service.validation.optionCodeExists') || 'Mã tùy chọn đã tồn tại trong hệ thống';
        }
      } catch (err: any) {
        console.error('Error checking option code:', err);
      }
    }
    
    // Validate name: not null, max 40 chars, no special chars but allow spaces and Vietnamese accents
    const nameError = validateOptionName(formData.name);
    if (nameError) {
      nextErrors.name = nameError;
    }
    
    // Validate price: not null, > 0
    const price = Number(formData.price);
    if (!formData.price.trim() || Number.isNaN(price) || price <= 0) {
      nextErrors.price = 'Giá phải lớn hơn 0';
    }
    
    // Validate unit: not null
    if (!formData.unit.trim()) {
      nextErrors.unit = 'Đơn vị không được để trống';
    }
    
    // Validate isRequired: not null (always set as boolean, but check if it's explicitly set)
    // Since it's a boolean with default false, it's always set, so no validation needed
    
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(await validate())) return;
    setSubmitting(true);
    try {
      if (editId) {
        // Update mode
        const payload: UpdateServiceOptionPayload = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          price: Number(formData.price),
          unit: formData.unit.trim() || undefined,
          isRequired: formData.isRequired,
          isActive: formData.isActive,
        };
        await updateServiceOption(editId, payload);
        show(t('Service.messages.updateOptionSuccess'), 'success');
      } else {
        // Create mode
        const payload: CreateServiceOptionPayload = {
          code: formData.code.trim(),
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          price: Number(formData.price),
          unit: formData.unit.trim() || undefined,
          isRequired: formData.isRequired,
          isActive: true, // Always active
        };
        
        // Retry logic for unique code generation
        let attempts = 0;
        let success = false;
        while (attempts < 3 && !success) {
          try {
            await createServiceOption(serviceId, payload);
            success = true;
          } catch (error: any) {
            if (error?.response?.status === 409 || error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
              // Code conflict, regenerate with suffix and retry
              attempts++;
              if (attempts < 10) {
                const serviceAbbr = createAbbreviation(serviceName);
                const optionAbbr = createAbbreviation(formData.name);
                const baseCode = generateAutoOptionCode(serviceAbbr, optionAbbr);
                // Try with increasing suffix
                let suffix = attempts;
                let newCode = baseCode + suffix.toString();
                // Check if this code also exists, if so try next suffix
                while (suffix < 100 && await checkOptionCodeExistsGlobally(newCode)) {
                  suffix++;
                  newCode = baseCode + suffix.toString();
                }
                payload.code = newCode;
                setFormData((prev) => ({ ...prev, code: newCode }));
              } else {
                throw error;
              }
            } else {
              throw error;
            }
          }
        }
        show(t('Service.messages.createOptionSuccess'), 'success');
      }
      onSuccess();
    } catch (error) {
      console.error(`Failed to ${editId ? 'update' : 'create'} option`, error);
      show(t(`Service.messages.${editId ? 'updateOptionError' : 'createOptionError'}`), 'error');
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
        {!editId && (
          <DetailField
            label={t('Service.optionCode')}
            name="code"
            value={formData.code}
            onChange={(event) => handleChange('code', event.target.value)}
            readonly={true}
            error={errors.code}
          />
        )}
        <DetailField
          label={`${t('Service.optionName')} *`}
          name="name"
          value={formData.name}
          onChange={(event) => {
            const value = event.target.value;
            if (value.length <= 40) {
              handleChange('name', value);
            }
          }}
          readonly={false}
          error={errors.name}
        />
        <DetailField
          label={`${t('Service.optionPrice')} *`}
          name="price"
          value={formatCurrency(formData.price)}
          onChange={(event) => {
            const parsed = parseCurrency(event.target.value);
            handleChange('price', parsed);
          }}
          readonly={false}
          error={errors.price}
        />
        <DetailField
          label={`${t('Service.optionUnit')} *`}
          name="unit"
          value={formData.unit}
          onChange={(event) => handleChange('unit', event.target.value)}
          readonly={false}
          error={errors.unit}
        />
        <RequiredSelect
          label={`${t('Service.optionIsRequired')} *`}
          value={formData.isRequired}
          onChange={(value) => handleChange('isRequired', value)}
          options={yesNoOptions}
          placeholder={t('Popup.yes')}
        />
        <DetailField
          label={t('Service.optionDescription')}
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

export default OptionForm;


