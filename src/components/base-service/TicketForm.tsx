import { useMemo, useState, useEffect, useRef } from 'react';
import DetailField from '@/src/components/base-service/DetailField';
import {
  BaseFormProps,
  FormActions,
} from '@/src/components/base-service/ServiceFormControls';
import Select from '@/src/components/customer-interaction/Select';
import { createServiceTicket, updateServiceTicket, checkTicketCodeExistsGlobally, getService, getServiceTicket } from '@/src/services/asset-maintenance/serviceService';
import { CreateServiceTicketPayload, UpdateServiceTicketPayload, ServiceTicketType } from '@/src/types/service';
import { formatCurrency, parseCurrency } from '@/src/utils/formatCurrency';

function TicketForm({ serviceId, editId, onSuccess, onCancel, t, show }: BaseFormProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    ticketType: ServiceTicketType.DAY,
    durationHours: '',
    price: '',
    maxPeople: '',
    description: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serviceName, setServiceName] = useState<string>('');
  const [serviceMinDurationHours, setServiceMinDurationHours] = useState<number | null>(null);
  const [serviceMaxCapacity, setServiceMaxCapacity] = useState<number | null>(null);
  const codeGenerationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const ticketTypeOptions = useMemo(
    () =>
      Object.values(ServiceTicketType).map((value) => ({
        name: t(`Service.ticketType.${value.toLowerCase()}`),
        value,
      })),
    [t],
  );

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

  // Generate auto ticket code: TK-<service abbreviation>-<ticket abbreviation>-<ddmmyy>
  const generateAutoTicketCode = (serviceAbbr: string, ticketAbbr: string): string => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    return `TK-${serviceAbbr}-${ticketAbbr}-${day}${month}${year}`;
  };

  // Fetch service name and ticket data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (serviceId) {
        try {
          const service = await getService(serviceId);
          setServiceName(service.name || '');
          setServiceMinDurationHours(service.minDurationHours ?? null);
          setServiceMaxCapacity(service.maxCapacity ?? null);
        } catch (error) {
          console.error('Failed to fetch service:', error);
        }
      }
      
      // Load ticket data if editing
      if (editId) {
        try {
          const ticket = await getServiceTicket(editId);
          setFormData({
            code: ticket.code || '',
            name: ticket.name || '',
            ticketType: (ticket.ticketType as ServiceTicketType) || ServiceTicketType.DAY,
            durationHours: ticket.durationHours?.toString() || '',
            price: ticket.price?.toString() || '',
            maxPeople: ticket.maxPeople?.toString() || '',
            description: ticket.description || '',
            isActive: ticket.isActive ?? true,
          });
        } catch (error) {
          console.error('Failed to fetch ticket:', error);
          show(t('Service.error'), 'error');
        }
      }
    };
    fetchData();
  }, [serviceId, editId, t, show]);

  // Generate and set ticket code when service name or ticket name changes (only for create mode)
  useEffect(() => {
    if (editId) return; // Don't auto-generate code when editing
    
    const generateCode = async () => {
      if (!serviceId || !serviceName || !formData.name.trim()) {
        return;
      }
      
      const serviceAbbr = createAbbreviation(serviceName);
      const ticketAbbr = createAbbreviation(formData.name);
      
      if (!serviceAbbr || !ticketAbbr) {
        return;
      }
      
      const baseCode = generateAutoTicketCode(serviceAbbr, ticketAbbr);
      let newCode = baseCode;
      let suffix = 1;
      
      // Check if base code exists globally
      const baseExists = await checkTicketCodeExistsGlobally(baseCode);
      if (!baseExists) {
        setFormData((prev) => ({ ...prev, code: baseCode }));
        return;
      }
      
      // If base code exists, try with suffix
      while (suffix <= 100) {
        newCode = baseCode + suffix.toString();
        const exists = await checkTicketCodeExistsGlobally(newCode);
        if (!exists) {
          setFormData((prev) => ({ ...prev, code: newCode }));
          return;
        }
        suffix++;
      }
      
      // If all attempts fail, use the last generated code (backend will handle uniqueness)
      setFormData((prev) => ({ ...prev, code: newCode }));
    };

    // Debounce code generation when ticket name changes
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

  // Validate ticket name: not null, no special chars but allow spaces and Vietnamese accents
  const validateTicketName = (name: string): string | null => {
    if (!name.trim()) {
      return t('Service.validation.ticketName') || 'Tên vé không được để trống';
    }
    // Allow letters (including Vietnamese with all accents), numbers, spaces, and common punctuation
    const nameRegex = /^[\p{L}\p{N}\s'-]+$/u;
    if (!nameRegex.test(name)) {
      return 'Tên vé không được chứa ký tự đặc biệt';
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
          setErrors((prev) => ({ ...prev, code: t('Service.validation.ticketCode') }));
        } else {
          // Check code exists globally in database
          try {
            const exists = await checkTicketCodeExistsGlobally(stringValue.trim());
            if (exists) {
              setErrors((prev) => ({ ...prev, code: t('Service.validation.ticketCodeExists') || 'Mã vé đã tồn tại trong hệ thống' }));
            }
          } catch (err: any) {
            console.error('Error checking ticket code:', err);
          }
        }
        break;
      case 'name':
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.name;
          return updated;
        });
        const nameError = validateTicketName(stringValue);
        if (nameError) {
          setErrors((prev) => ({ ...prev, name: nameError }));
        }
        break;
      case 'ticketType':
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.ticketType;
          return updated;
        });
        if (!stringValue) {
          setErrors((prev) => ({ ...prev, ticketType: t('Service.validation.ticketType') }));
        }
        break;
      case 'price':
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.price;
          return updated;
        });
        if (!stringValue.trim()) {
          setErrors((prev) => ({ ...prev, price: 'Giá vé không được để trống' }));
        } else {
          const price = Number(stringValue);
          if (Number.isNaN(price) || price <= 0) {
            setErrors((prev) => ({ ...prev, price: 'Giá vé phải lớn hơn 0' }));
          }
        }
        break;
      case 'durationHours':
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.durationHours;
          return updated;
        });
        if (!stringValue.trim()) {
          setErrors((prev) => ({ ...prev, durationHours: 'Thời lượng không được để trống' }));
        } else {
          const duration = Number(stringValue);
          if (Number.isNaN(duration) || duration <= 0) {
            setErrors((prev) => ({ ...prev, durationHours: 'Thời lượng phải lớn hơn 0' }));
          } else if (serviceMinDurationHours !== null && duration <= serviceMinDurationHours) {
            setErrors((prev) => ({ 
              ...prev, 
              durationHours: t('Service.validation.ticketDurationMin') || `Thời lượng phải lớn hơn ${serviceMinDurationHours} giờ (thời lượng tối thiểu của service)` 
            }));
          }
        }
        break;
      case 'maxPeople':
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.maxPeople;
          return updated;
        });
        if (!stringValue.trim()) {
          setErrors((prev) => ({ ...prev, maxPeople: 'Số người tối đa không được để trống' }));
        } else {
          const maxPeople = Number(stringValue);
          if (Number.isNaN(maxPeople) || maxPeople <= 0) {
            setErrors((prev) => ({ ...prev, maxPeople: 'Số người tối đa phải lớn hơn 0' }));
          } else if (maxPeople >= 1000) {
            setErrors((prev) => ({ ...prev, maxPeople: 'Số người tối đa phải nhỏ hơn 1000' }));
          } else if (serviceMaxCapacity !== null && maxPeople > serviceMaxCapacity) {
            setErrors((prev) => ({ 
              ...prev, 
              maxPeople: t('Service.validation.ticketMaxPeopleMax') || `Số người tối đa phải nhỏ hơn hoặc bằng ${serviceMaxCapacity} (sức chứa tối đa của service)` 
            }));
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
    if (name === 'code' || name === 'name' || name === 'ticketType' || name === 'price' || name === 'durationHours' || name === 'maxPeople') {
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
      nextErrors.code = t('Service.validation.ticketCode');
    } else if (!editId) {
      // Check code exists globally in database (only for create mode)
      try {
        const exists = await checkTicketCodeExistsGlobally(formData.code.trim());
        if (exists) {
          nextErrors.code = t('Service.validation.ticketCodeExists') || 'Mã vé đã tồn tại trong hệ thống';
        }
      } catch (err: any) {
        console.error('Error checking ticket code:', err);
      }
    }
    
    // Validate name: not null, no special chars but allow spaces and Vietnamese accents
    const nameError = validateTicketName(formData.name);
    if (nameError) {
      nextErrors.name = nameError;
    }
    
    // Validate ticketType: not null
    if (!formData.ticketType) {
      nextErrors.ticketType = t('Service.validation.ticketType');
    }
    
    // Validate price: not null, > 0
    const price = Number(formData.price);
    if (!formData.price.trim() || Number.isNaN(price) || price <= 0) {
      nextErrors.price = t('Service.validation.ticketPrice');
    }
    
    // Validate durationHours: not null, > 0, >= service minDurationHours
    if (!formData.durationHours.trim()) {
      nextErrors.durationHours = t('Service.validation.ticketDurationHours');
    } else {
      const duration = Number(formData.durationHours);
      if (Number.isNaN(duration) || duration <= 0) {
        nextErrors.durationHours = 'Thời lượng phải lớn hơn 0';
      } else if (serviceMinDurationHours !== null && duration <= serviceMinDurationHours) {
        nextErrors.durationHours = t('Service.validation.ticketDurationMin') || `Thời lượng phải lớn hơn ${serviceMinDurationHours} giờ (thời lượng tối thiểu của service)`;
      }
    }
    
    // Validate maxPeople: not null, > 0, < 1000, <= service maxCapacity
    if (!formData.maxPeople.trim()) {
      nextErrors.maxPeople = 'Số người tối đa không được để trống';
    } else {
      const maxPeople = Number(formData.maxPeople);
      if (Number.isNaN(maxPeople) || maxPeople <= 0) {
        nextErrors.maxPeople = 'Số người tối đa phải lớn hơn 0';
      } else if (maxPeople >= 1000) {
        nextErrors.maxPeople = 'Số người tối đa phải nhỏ hơn 1000';
      } else if (serviceMaxCapacity !== null && maxPeople > serviceMaxCapacity) {
        nextErrors.maxPeople = t('Service.validation.ticketMaxPeopleMax') || `Số người tối đa phải nhỏ hơn hoặc bằng ${serviceMaxCapacity} (sức chứa tối đa của service)`;
      }
    }
    
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
        const payload: UpdateServiceTicketPayload = {
          name: formData.name.trim(),
          ticketType: formData.ticketType,
          durationHours: formData.durationHours.trim()
            ? Number(formData.durationHours)
            : null,
          price: Number(formData.price),
          maxPeople: formData.maxPeople.trim() ? Number(formData.maxPeople) : null,
          description: formData.description.trim() || undefined,
          isActive: formData.isActive,
        };
        await updateServiceTicket(editId, payload);
        show(t('Service.messages.updateTicketSuccess'), 'success');
      } else {
        // Create mode
        const payload: CreateServiceTicketPayload = {
          code: formData.code.trim(),
          name: formData.name.trim(),
          ticketType: formData.ticketType,
          durationHours: formData.durationHours.trim()
            ? Number(formData.durationHours)
            : null,
          price: Number(formData.price),
          maxPeople: formData.maxPeople.trim() ? Number(formData.maxPeople) : null,
          description: formData.description.trim() || undefined,
          isActive: true, // Always active
        };
        
        // Retry logic for unique code generation
        let attempts = 0;
        let success = false;
        while (attempts < 3 && !success) {
          try {
            await createServiceTicket(serviceId, payload);
            success = true;
          } catch (error: any) {
            if (error?.response?.status === 409 || error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
              // Code conflict, regenerate with suffix and retry
              attempts++;
              if (attempts < 10) {
                const serviceAbbr = createAbbreviation(serviceName);
                const ticketAbbr = createAbbreviation(formData.name);
                const baseCode = generateAutoTicketCode(serviceAbbr, ticketAbbr);
                // Try with increasing suffix
                let suffix = attempts;
                let newCode = baseCode + suffix.toString();
                // Check if this code also exists, if so try next suffix
                while (suffix < 100 && await checkTicketCodeExistsGlobally(newCode)) {
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
        show(t('Service.messages.createTicketSuccess'), 'success');
      }
      onSuccess();
    } catch (error) {
      console.error(`Failed to ${editId ? 'update' : 'create'} ticket`, error);
      show(t(`Service.messages.${editId ? 'updateTicketError' : 'createTicketError'}`), 'error');
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
            label={t('Service.ticketCode')}
            name="code"
            value={formData.code}
            onChange={(event) => handleChange('code', event.target.value)}
            readonly={true}
            error={errors.code}
          />
        )}
        <DetailField
          label={`${t('Service.ticketName')} *`}
          name="name"
          value={formData.name}
          onChange={(event) => handleChange('name', event.target.value)}
          readonly={false}
          error={errors.name}
        />
        <div className="flex flex-col gap-2">
          <label className="text-md font-bold text-[#02542D] mb-1">
            {t('Service.ticketTypeLabel')} <span className="text-red-500">*</span>
          </label>
          <Select
            options={ticketTypeOptions}
            value={formData.ticketType}
            onSelect={(item) => handleChange('ticketType', item.value)}
            renderItem={(item) => item.name}
            getValue={(item) => item.value}
            placeholder={t('Service.ticketTypeLabel')}
            error={!!errors.ticketType}
          />
          {errors.ticketType && (
            <span className="text-red-500 text-xs mt-1">{errors.ticketType}</span>
          )}
        </div>
        <DetailField
          label={`${t('Service.ticketPrice')} *`}
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
          label={`${t('Service.ticketDuration')} *`}
          name="durationHours"
          value={formData.durationHours}
          onChange={(event) => handleChange('durationHours', event.target.value)}
          readonly={false}
          error={errors.durationHours}
          inputType="number"
        />
        <DetailField
          label={`${t('Service.ticketMaxPeople')} *`}
          name="maxPeople"
          value={formData.maxPeople}
          onChange={(event) => handleChange('maxPeople', event.target.value)}
          readonly={false}
          error={errors.maxPeople}
          inputType="number"
        />
        <DetailField
          label={t('Service.ticketDescription')}
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

export default TicketForm;


