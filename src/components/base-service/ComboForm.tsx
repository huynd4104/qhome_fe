import { useState, useEffect, useRef, useMemo } from 'react';
import DetailField from '@/src/components/base-service/DetailField';
import {
  BaseFormProps,
  FormActions,
} from '@/src/components/base-service/ServiceFormControls';
import { createServiceCombo, checkComboCodeExistsGlobally, checkComboItemCodeExistsGlobally, getService } from '@/src/services/asset-maintenance/serviceService';
import { CreateServiceComboPayload, ServiceComboItemPayload } from '@/src/types/service';
import { formatCurrency, parseCurrency } from '@/src/utils/formatCurrency';

interface ComboItemFormState {
  id: string;
  code: string;
  name: string;
  price: string;
  durationMinutes: string;
  quantity: string;
  note: string;
}

type ComboItemField = 'code' | 'name' | 'price' | 'durationMinutes' | 'quantity' | 'note';

type ComboItemErrorState = Partial<Record<ComboItemField, string>>;

const createEmptyItem = (): ComboItemFormState => ({
  id:
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `combo-item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  code: '',
  name: '',
  price: '',
  durationMinutes: '',
  quantity: '1',
  note: '',
});

function ComboForm({ serviceId, onSuccess, onCancel, t, show }: BaseFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    servicesIncluded: '',
    durationMinutes: '',
    price: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [comboItems, setComboItems] = useState<ComboItemFormState[]>([]);
  const [itemErrors, setItemErrors] = useState<Record<string, ComboItemErrorState>>({});
  const [generalItemsError, setGeneralItemsError] = useState<string | null>(null);
  const codeGenerationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [serviceName, setServiceName] = useState<string>('');

  // Create abbreviation from Vietnamese text (keep accents)
  // Example: "sân golf" -> "SG", "gói đầy đủ đồ golf" -> "GĐĐĐĐG"
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

  // Generate auto combo code: COMBO-<service abbreviation>-<combo abbreviation>-<ddmmyy>
  const generateAutoComboCode = (serviceAbbr: string, comboAbbr: string): string => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    return `CB-${serviceAbbr}-${comboAbbr}-${day}${month}${year}`;
  };

  // Fetch service name on mount
  useEffect(() => {
    const fetchService = async () => {
      if (serviceId) {
        try {
          const service = await getService(serviceId);
          setServiceName(service.name || '');
        } catch (error) {
          console.error('Failed to fetch service:', error);
        }
      }
    };
    fetchService();
  }, [serviceId]);

  // Generate and set combo code when service name or combo name changes
  useEffect(() => {
    const generateCode = async () => {
      if (!serviceId || !serviceName || !formData.name.trim()) {
        return;
      }
      
      const serviceAbbr = createAbbreviation(serviceName);
      const comboAbbr = createAbbreviation(formData.name);
      
      if (!serviceAbbr || !comboAbbr) {
        return;
      }
      
      const baseCode = generateAutoComboCode(serviceAbbr, comboAbbr);
      let newCode = baseCode;
      let suffix = 1;
      
      // Check if base code exists globally
      const baseExists = await checkComboCodeExistsGlobally(baseCode);
      if (!baseExists) {
        setFormData((prev) => ({ ...prev, code: baseCode }));
        return;
      }
      
      // If base code exists, try with suffix
      while (suffix <= 100) {
        newCode = baseCode + suffix.toString();
        const exists = await checkComboCodeExistsGlobally(newCode);
        if (!exists) {
          setFormData((prev) => ({ ...prev, code: newCode }));
          return;
        }
        suffix++;
      }
      
      // If all attempts fail, use the last generated code (backend will handle uniqueness)
      setFormData((prev) => ({ ...prev, code: newCode }));
    };

    // Debounce code generation when combo name changes
    if (codeGenerationTimeoutRef.current) {
      clearTimeout(codeGenerationTimeoutRef.current);
    }
    
    codeGenerationTimeoutRef.current = setTimeout(() => {
      generateCode();
    }, 100);
    
    // Cleanup timeout on unmount
    return () => {
      if (codeGenerationTimeoutRef.current) {
        clearTimeout(codeGenerationTimeoutRef.current);
      }
    };
  }, [serviceId, serviceName, formData.name]);

  // Memoize item names to avoid unnecessary re-renders
  const itemNamesKey = useMemo(
    () => comboItems.map((i) => `${i.id}:${i.name}:${i.code}`).join('|'),
    [comboItems]
  );

  // Auto-generate combo item codes when service name, combo name, or item names change
  useEffect(() => {
    const generateItemCodes = async () => {
      if (!serviceId || !serviceName || !formData.name.trim()) {
        return;
      }

      // Generate codes for all items that have names but no codes yet
      const itemsToUpdate = comboItems.filter(
        (item) => item.name.trim() && !item.code.trim()
      );

      if (itemsToUpdate.length === 0) {
        return;
      }

      // Update all items at once to avoid multiple re-renders
      const updates: Array<{ id: string; code: string }> = [];
      for (const item of itemsToUpdate) {
        const newCode = await generateComboItemCode(item.name.trim(), item.id);
        if (newCode) {
          updates.push({ id: item.id, code: newCode });
        }
      }

      if (updates.length > 0) {
        setComboItems((prev) =>
          prev.map((i) => {
            const update = updates.find((u) => u.id === i.id);
            return update ? { ...i, code: update.code } : i;
          })
        );
      }
    };

    // Debounce to avoid too many calls
    const timeoutId = setTimeout(() => {
      generateItemCodes();
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, serviceName, formData.name, itemNamesKey]);

  const resetItemError = (id: string, field?: ComboItemField) => {
    setItemErrors((prev) => {
      if (!prev[id]) {
        return prev;
      }
      if (!field) {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }

      const fieldErrors = { ...prev[id] };
      if (!fieldErrors[field]) {
        return prev;
      }
      delete fieldErrors[field];

      if (Object.keys(fieldErrors).length === 0) {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [id]: fieldErrors,
      };
    });
  };

  // Generate combo item code: CB-<service abbr>-<combo abbr>-<item abbr>-ddmmyy
  const generateComboItemCode = async (itemName: string, itemId: string): Promise<string> => {
    if (!serviceName || !formData.name.trim() || !itemName.trim()) {
      return '';
    }
    
    const serviceAbbr = createAbbreviation(serviceName);
    const comboAbbr = createAbbreviation(formData.name);
    const itemAbbr = createAbbreviation(itemName);
    
    if (!serviceAbbr || !comboAbbr || !itemAbbr) {
      return '';
    }
    
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const baseCode = `CB-${serviceAbbr}-${comboAbbr}-${itemAbbr}-${day}${month}${year}`;
    
    // Check if base code exists
    const baseExists = await checkComboItemCodeExistsGlobally(baseCode);
    if (!baseExists) {
      return baseCode;
    }
    
    // If exists, try with suffix
    let suffix = 1;
    while (suffix <= 100) {
      const newCode = baseCode + suffix.toString();
      const exists = await checkComboItemCodeExistsGlobally(newCode);
      if (!exists) {
        return newCode;
      }
      suffix++;
    }
    
    // If all attempts fail, return base code with max suffix
    return baseCode + '100';
  };

  const handleAddItem = () => {
    const newItem = createEmptyItem();
    setComboItems((prev) => [...prev, newItem]);
    setGeneralItemsError(null);
  };

  const handleRemoveItem = (id: string) => {
    setComboItems((prev) => prev.filter((item) => item.id !== id));
    setItemErrors((prev) => {
      if (!prev[id]) {
        return prev;
      }
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
    setGeneralItemsError(null);
  };

  // Validate combo item name: not null, max 40 chars, no special chars but allow spaces and Vietnamese accents
  const validateComboItemName = (name: string): string | null => {
    if (!name.trim()) {
      return t('Service.validation.comboItemName') || 'Tên mục không được để trống';
    }
    if (name.length > 40) {
      return 'Tên mục không được vượt quá 40 ký tự';
    }
    // Allow letters (including Vietnamese with all accents), numbers, spaces, and common punctuation
    // Using Unicode property escapes to match all letters including Vietnamese
    const nameRegex = /^[\p{L}\p{N}\s'-]+$/u;
    if (!nameRegex.test(name)) {
      return 'Tên mục không được chứa ký tự đặc biệt';
    }
    return null;
  };

  const handleItemFieldChange = async (id: string, field: ComboItemField, value: string) => {
    // Update item state first
    setComboItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
    setGeneralItemsError(null);
    resetItemError(id, field);
    
    // Auto-generate code when item name changes
    if (field === 'name' && value.trim()) {
      // Use setTimeout to ensure state is updated
      setTimeout(async () => {
        const newCode = await generateComboItemCode(value.trim(), id);
        if (newCode) {
          setComboItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, code: newCode } : item)),
          );
        }
      }, 100);
    }
    
    // Real-time validation
    setTimeout(() => {
      validateComboItemField(id, field, value);
    }, 300);
  };

  // Validate individual combo item field
  const validateComboItemField = async (id: string, field: ComboItemField, value: string) => {
    const fieldErrors: ComboItemErrorState = {};
    
    switch (field) {
      case 'name':
        const nameError = validateComboItemName(value);
        if (nameError) {
          fieldErrors.name = nameError;
        }
        break;
      case 'price':
        const priceValue = Number(value);
        if (!value.trim()) {
          fieldErrors.price = 'Giá mục không được để trống';
        } else if (Number.isNaN(priceValue) || priceValue <= 0) {
          fieldErrors.price = 'Giá mục phải lớn hơn 0';
        }
        break;
      case 'durationMinutes':
        const durationValue = Number(value);
        const comboDuration = formData.durationMinutes.trim() ? Number(formData.durationMinutes) : null;
        if (!value.trim()) {
          fieldErrors.durationMinutes = 'Thời lượng mục không được để trống';
        } else if (Number.isNaN(durationValue) || durationValue <= 0) {
          fieldErrors.durationMinutes = 'Thời lượng mục phải lớn hơn 0';
        } else if (comboDuration !== null && durationValue >= comboDuration) {
          fieldErrors.durationMinutes = `Thời lượng mục phải nhỏ hơn thời lượng gói (${comboDuration} phút)`;
        }
        break;
      case 'quantity':
        const quantityValue = Number(value);
        if (!value.trim()) {
          fieldErrors.quantity = 'Số lượng không được để trống';
        } else if (Number.isNaN(quantityValue) || quantityValue <= 0) {
          fieldErrors.quantity = 'Số lượng phải lớn hơn 0';
        }
        break;
      case 'code':
        if (!value.trim()) {
          fieldErrors.code = t('Service.validation.comboItemCode');
        } else {
          try {
            const exists = await checkComboItemCodeExistsGlobally(value.trim());
            if (exists) {
              fieldErrors.code = 'Mã mục đã tồn tại trong hệ thống';
            }
          } catch (err: any) {
            console.error('Error checking combo item code:', err);
          }
        }
        break;
    }
    
    if (Object.keys(fieldErrors).length > 0) {
      setItemErrors((prev) => ({
        ...prev,
        [id]: { ...prev[id], ...fieldErrors },
      }));
    } else {
      resetItemError(id, field);
    }
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
          setErrors((prev) => ({ ...prev, code: t('Service.validation.comboCode') }));
        } else {
          // Check code exists globally in database
          try {
            const exists = await checkComboCodeExistsGlobally(stringValue.trim());
            if (exists) {
              setErrors((prev) => ({ ...prev, code: t('Service.validation.comboCodeExists') || 'Mã gói đã tồn tại trong hệ thống' }));
            }
          } catch (err: any) {
            console.error('Error checking combo code:', err);
          }
        }
        break;
      case 'name':
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.name;
          return updated;
        });
        if (!stringValue.trim()) {
          setErrors((prev) => ({ ...prev, name: t('Service.validation.comboName') }));
        } else if (stringValue.length > 40) {
          setErrors((prev) => ({ ...prev, name: t('Service.validation.comboNameMaxLength') || 'Tên gói không được vượt quá 40 ký tự' }));
        }
        break;
      case 'price':
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.price;
          return updated;
        });
        if (!stringValue.trim()) {
          setErrors((prev) => ({ ...prev, price: t('Service.validation.comboPrice') }));
        } else {
          const price = Number(stringValue);
          if (Number.isNaN(price) || price <= 0) {
            setErrors((prev) => ({ ...prev, price: t('Service.validation.comboPriceGreaterThanZero') || 'Giá gói phải lớn hơn 0' }));
          }
        }
        break;
      case 'durationMinutes':
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.durationMinutes;
          return updated;
        });
        if (!stringValue.trim()) {
          setErrors((prev) => ({ ...prev, durationMinutes: t('Service.validation.comboDurationRequired') || 'Thời lượng không được để trống' }));
        } else {
          const duration = Number(stringValue);
          if (Number.isNaN(duration) || duration <= 0) {
            setErrors((prev) => ({ ...prev, durationMinutes: t('Service.validation.comboDurationGreaterThanZero') || 'Thời lượng phải lớn hơn 0' }));
          }
        }
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
    if (name === 'code' || name === 'name' || name === 'price' || name === 'durationMinutes') {
      if (codeGenerationTimeoutRef.current) {
        clearTimeout(codeGenerationTimeoutRef.current);
      }
      codeGenerationTimeoutRef.current = setTimeout(() => {
        validateField(name, value);
      }, name === 'code' ? 500 : 300);
    }
    
    // If combo duration changes, re-validate all combo items
    if (name === 'durationMinutes') {
      comboItems.forEach((item) => {
        if (item.durationMinutes.trim()) {
          setTimeout(() => {
            validateComboItemField(item.id, 'durationMinutes', item.durationMinutes);
          }, 300);
        }
      });
    }
  };

  const validate = async () => {
    const nextErrors: Record<string, string> = {};
    
    // Validate code
    if (!formData.code.trim()) {
      nextErrors.code = t('Service.validation.comboCode');
    } else {
      // Check code exists globally in database
      try {
        const exists = await checkComboCodeExistsGlobally(formData.code.trim());
        if (exists) {
          nextErrors.code = t('Service.validation.comboCodeExists') || 'Mã gói đã tồn tại trong hệ thống';
        }
      } catch (err: any) {
        console.error('Error checking combo code:', err);
      }
    }
    
    // Validate name: not null, max 40 characters
    if (!formData.name.trim()) {
      nextErrors.name = t('Service.validation.comboName');
    } else if (formData.name.length > 40) {
      nextErrors.name = t('Service.validation.comboNameMaxLength') || 'Tên gói không được vượt quá 40 ký tự';
    }
    
    // Validate price: not null, > 0
    const price = Number(formData.price);
    if (!formData.price.trim() || Number.isNaN(price) || price <= 0) {
      nextErrors.price = t('Service.validation.comboPriceGreaterThanZero') || 'Giá gói phải lớn hơn 0';
    }
    
    // Validate durationMinutes: not null, > 0
    if (!formData.durationMinutes.trim()) {
      nextErrors.durationMinutes = t('Service.validation.comboDurationRequired') || 'Thời lượng không được để trống';
    } else {
      const duration = Number(formData.durationMinutes);
      if (Number.isNaN(duration) || duration <= 0) {
        nextErrors.durationMinutes = t('Service.validation.comboDurationGreaterThanZero') || 'Thời lượng phải lớn hơn 0';
      }
    }
    
    setErrors(nextErrors);

    const nextItemErrors: Record<string, ComboItemErrorState> = {};
    let generalError: string | null = null;

    if (comboItems.length === 0) {
      generalError = t('Service.validation.comboItems');
    } else {
      const comboDuration = formData.durationMinutes.trim() ? Number(formData.durationMinutes) : null;
      
      for (const item of comboItems) {
        const fieldErrors: ComboItemErrorState = {};

        // Validate code
        if (!item.code.trim()) {
          fieldErrors.code = t('Service.validation.comboItemCode');
        } else {
          try {
            const exists = await checkComboItemCodeExistsGlobally(item.code.trim());
            if (exists) {
              fieldErrors.code = 'Mã mục đã tồn tại trong hệ thống';
            }
          } catch (err: any) {
            console.error('Error checking combo item code:', err);
          }
        }

        // Validate name: not null, max 40 chars, no special chars but allow spaces
        const nameError = validateComboItemName(item.name);
        if (nameError) {
          fieldErrors.name = nameError;
        }

        // Validate price: not null, > 0
        const priceValue = Number(item.price);
        if (!item.price.trim()) {
          fieldErrors.price = 'Giá mục không được để trống';
        } else if (Number.isNaN(priceValue) || priceValue <= 0) {
          fieldErrors.price = 'Giá mục phải lớn hơn 0';
        }

        // Validate durationMinutes: not null, > 0, < combo duration
        if (!item.durationMinutes.trim()) {
          fieldErrors.durationMinutes = 'Thời lượng mục không được để trống';
        } else {
          const durationValue = Number(item.durationMinutes);
          if (Number.isNaN(durationValue) || durationValue <= 0) {
            fieldErrors.durationMinutes = 'Thời lượng mục phải lớn hơn 0';
          } else if (comboDuration !== null && durationValue >= comboDuration) {
            fieldErrors.durationMinutes = `Thời lượng mục phải nhỏ hơn thời lượng gói (${comboDuration} phút)`;
          }
        }

        // Validate quantity: not null, > 0
        const quantityValue = Number(item.quantity);
        if (!item.quantity.trim()) {
          fieldErrors.quantity = 'Số lượng không được để trống';
        } else if (Number.isNaN(quantityValue) || quantityValue <= 0) {
          fieldErrors.quantity = 'Số lượng phải lớn hơn 0';
        }

        if (Object.keys(fieldErrors).length > 0) {
          nextItemErrors[item.id] = fieldErrors;
        }
      }
    }

    setItemErrors(nextItemErrors);
    setGeneralItemsError(generalError);

    const hasFieldErrors = Object.keys(nextErrors).length > 0;
    const hasItemErrors = Object.keys(nextItemErrors).length > 0 || Boolean(generalError);

    return !hasFieldErrors && !hasItemErrors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(await validate())) return;
    setSubmitting(true);
    try {
      const itemsPayload: ServiceComboItemPayload[] = comboItems.map((item, index) => {
        const quantityValue = Number(item.quantity);
        const priceValue = Number(item.price);
        const durationValue = item.durationMinutes.trim()
          ? Number(item.durationMinutes)
          : null;
        const payload: ServiceComboItemPayload = {
          itemName: item.code.trim(),
          itemDescription: item.name.trim() || undefined,
          itemPrice: Number.isNaN(priceValue) || priceValue < 0 ? 0 : priceValue,
          itemDurationMinutes:
            durationValue !== null && Number.isNaN(durationValue) ? null : durationValue,
          quantity: Number.isNaN(quantityValue) || quantityValue <= 0 ? 1 : quantityValue,
          note: item.note.trim() || undefined,
          sortOrder: index + 1,
        };
        return payload;
      });

      const payload: CreateServiceComboPayload = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        servicesIncluded: formData.servicesIncluded.trim() || undefined,
        durationMinutes: formData.durationMinutes.trim()
          ? Number(formData.durationMinutes)
          : null,
        price: Number(formData.price),
        isActive: true, // Always active
        items: itemsPayload,
      };
      
      // Retry logic for unique code generation
      let attempts = 0;
      let success = false;
      while (attempts < 3 && !success) {
        try {
          await createServiceCombo(serviceId, payload);
          success = true;
        } catch (error: any) {
          if (error?.response?.status === 409 || error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
            // Code conflict, regenerate with suffix and retry
            attempts++;
            if (attempts < 10) {
              const serviceAbbr = createAbbreviation(serviceName);
              const comboAbbr = createAbbreviation(formData.name);
              const baseCode = generateAutoComboCode(serviceAbbr, comboAbbr);
              // Try with increasing suffix
              let suffix = attempts;
              let newCode = baseCode + suffix.toString();
              // Check if this code also exists, if so try next suffix
              while (suffix < 100 && await checkComboCodeExistsGlobally(newCode)) {
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
      show(t('Service.messages.createComboSuccess'), 'success');
      onSuccess();
    } catch (error) {
      console.error('Failed to create combo', error);
      show(t('Service.messages.createComboError'), 'error');
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
          label={t('Service.comboCode')}
          name="code"
          value={formData.code}
          onChange={(event) => handleChange('code', event.target.value)}
          readonly={true}
          error={errors.code}
        />
        <DetailField
          label={t('Service.comboName')}
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
          label={t('Service.comboPrice')}
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
          label={t('Service.comboDuration')}
          name="durationMinutes"
          value={formData.durationMinutes}
          onChange={(event) => handleChange('durationMinutes', event.target.value)}
          readonly={false}
          error={errors.durationMinutes}
          inputType="number"
        />
        <DetailField
          label={t('Service.description')}
          name="description"
          value={formData.description}
          onChange={(event) => handleChange('description', event.target.value)}
          readonly={false}
          type="textarea"
          isFullWidth
        />
        <DetailField
          label={t('Service.comboServicesIncluded')}
          name="servicesIncluded"
          value={formData.servicesIncluded}
          onChange={(event) => handleChange('servicesIncluded', event.target.value)}
          readonly={false}
          type="textarea"
          isFullWidth
        />
        <div className="md:col-span-2 border border-dashed border-gray-300 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#02542D]">
              {t('Service.comboItems')}
            </h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-2 rounded-lg bg-[#02542D] px-3 py-2 text-sm font-semibold text-white hover:bg-opacity-80 transition"
            >
              {t('Service.addComboItem')}
            </button>
          </div>
          {generalItemsError && <p className="text-sm text-red-500">{generalItemsError}</p>}
          {comboItems.length === 0 ? (
            <p className="text-sm text-gray-500">{t('Service.comboItemNoItems')}</p>
          ) : (
            <div className="space-y-4">
              {comboItems.map((item, index) => {
                const errorsForItem = itemErrors[item.id] ?? {};
                return (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-end justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      {t('Service.comboItemRemove')}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2 text-sm">
                      <label className="font-medium text-[#02542D]">
                        {t('Service.comboItemCode')}
                      </label>
                      <input
                        className="h-10 rounded-md border border-gray-300 px-3 py-2 text-sm text-[#02542D] focus:outline-none focus:ring-2 focus:ring-[#02542D]/30 bg-gray-100"
                        value={item.code}
                        onChange={(event) => handleItemFieldChange(item.id, 'code', event.target.value)}
                        readOnly
                      />
                      {errorsForItem.code && (
                        <span className="text-sm text-red-500">{errorsForItem.code}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      <label className="font-medium text-[#02542D]">
                        {t('Service.comboName')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        className={`h-10 rounded-md border px-3 py-2 text-sm text-[#02542D] focus:outline-none focus:ring-2 ${
                          errorsForItem.name
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-300 focus:ring-[#02542D]/30'
                        }`}
                        value={item.name}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value.length <= 40) {
                            handleItemFieldChange(item.id, 'name', value);
                          }
                        }}
                        maxLength={40}
                      />
                      {errorsForItem.name && (
                        <span className="text-sm text-red-500">{errorsForItem.name}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      <label className="font-medium text-[#02542D]">
                        {t('Service.comboItemPrice')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formatCurrency(item.price)}
                        onChange={(event) => {
                          const parsed = parseCurrency(event.target.value);
                          handleItemFieldChange(item.id, 'price', parsed);
                        }}
                        className={`h-10 rounded-md border px-3 py-2 text-sm text-[#02542D] focus:outline-none focus:ring-2 ${
                          errorsForItem.price
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-300 focus:ring-[#02542D]/30'
                        }`}
                      />
                      {errorsForItem.price && (
                        <span className="text-sm text-red-500">{errorsForItem.price}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      <label className="font-medium text-[#02542D]">
                        {t('Service.comboItemDuration')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={item.durationMinutes}
                        onChange={(event) =>
                          handleItemFieldChange(item.id, 'durationMinutes', event.target.value)
                        }
                        className={`h-10 rounded-md border px-3 py-2 text-sm text-[#02542D] focus:outline-none focus:ring-2 ${
                          errorsForItem.durationMinutes
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-300 focus:ring-[#02542D]/30'
                        }`}
                      />
                      {errorsForItem.durationMinutes && (
                        <span className="text-sm text-red-500">
                          {errorsForItem.durationMinutes}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      <label className="font-medium text-[#02542D]">
                        {t('Service.comboItemQuantity')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(event) =>
                          handleItemFieldChange(item.id, 'quantity', event.target.value)
                        }
                        className={`h-10 rounded-md border px-3 py-2 text-sm text-[#02542D] focus:outline-none focus:ring-2 ${
                          errorsForItem.quantity
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-gray-300 focus:ring-[#02542D]/30'
                        }`}
                      />
                      {errorsForItem.quantity && (
                        <span className="text-sm text-red-500">{errorsForItem.quantity}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 text-sm md:col-span-2">
                      <label className="font-medium text-[#02542D]">
                        {t('Service.comboItemNote')}
                      </label>
                      <textarea
                        rows={2}
                        value={item.note}
                        onChange={(event) =>
                          handleItemFieldChange(item.id, 'note', event.target.value)
                        }
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-[#02542D] focus:outline-none focus:ring-2 focus:ring-[#02542D]/30"
                      />
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>
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

export default ComboForm;


