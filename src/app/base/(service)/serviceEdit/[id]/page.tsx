'use client'

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import DetailField from '@/src/components/base-service/DetailField';
import Select from '@/src/components/customer-interaction/Select';
import TimeBox from '@/src/components/customer-interaction/TimeBox';
import { useServiceDetailPage } from '@/src/hooks/useServiceDetailPage';
import { ServicePricingType, UpdateServicePayload, ServiceAvailability } from '@/src/types/service';
import { useNotifications } from '@/src/hooks/useNotifications';
import {
  getServiceAvailabilities,
  deleteServiceAvailability,
  addServiceAvailability,
  updateServiceAvailability,
} from '@/src/services/asset-maintenance/serviceService';

type FormState = {
  name: string;
  description: string;
  location: string;
  mapUrl: string;
  pricingType: ServicePricingType | '';
  pricePerHour: string;
  pricePerSession: string;
  maxCapacity: string;
  minDurationHours: string;
  rules: string;
  isActive: boolean;
  availabilities: AvailabilityFormState[];
};

type AvailabilityFormState = {
  dayOfWeek: string[]; // Changed to array to support multiple days
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

type AvailabilityFormErrors = Partial<Record<keyof AvailabilityFormState, string>>;

// Database format: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday
const DAY_NAME_MAP: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

const initialState: FormState = {
  name: '',
  description: '',
  location: '',
  mapUrl: '',
  pricingType: '',
  pricePerHour: '',
  pricePerSession: '',
  maxCapacity: '',
  minDurationHours: '',
  rules: '',
  isActive: true,
  availabilities: [
    {
      dayOfWeek: [],
      startTime: '',
      endTime: '',
      isAvailable: true,
    },
  ],
};

export default function ServiceEditPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const serviceId = params?.id?.toString() ?? '';
  const { show } = useNotifications();

  const { serviceData, loading, error, isSubmitting, editService } = useServiceDetailPage(serviceId);

  const [formData, setFormData] = useState<FormState>(initialState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [availabilityErrors, setAvailabilityErrors] = useState<Record<number, AvailabilityFormErrors>>({});

  useEffect(() => {
    if (!serviceData) return;

    setFormData({
      name: serviceData.name ?? '',
      description: serviceData.description ?? '',
      location: serviceData.location ?? '',
      mapUrl: serviceData.mapUrl ?? '',
      pricingType: (serviceData.pricingType as ServicePricingType | '') ?? '',
      pricePerHour:
        serviceData.pricePerHour != null
          ? String(serviceData.pricePerHour)
          : serviceData.pricingType === ServicePricingType.FREE
          ? ''
          : '',
      pricePerSession:
        serviceData.pricePerSession != null
          ? String(serviceData.pricePerSession)
          : serviceData.pricingType === ServicePricingType.FREE
          ? ''
          : '',
      maxCapacity: serviceData.maxCapacity != null ? String(serviceData.maxCapacity) : '',
      minDurationHours: serviceData.minDurationHours != null ? String(serviceData.minDurationHours) : '',
      rules: serviceData.rules ?? '',
      isActive: serviceData.isActive ?? true,
      availabilities:
        serviceData.availabilities && serviceData.availabilities.length > 0
          ? (() => {
              // Group availabilities by startTime/endTime and combine dayOfWeek
              const grouped = new Map<string, {
                dayOfWeek: number[];
                startTime: string;
                endTime: string;
                isAvailable: boolean;
              }>();
              
              serviceData.availabilities.forEach((availability) => {
                const startTime = availability.startTime ? availability.startTime.slice(0, 5) : '';
                const endTime = availability.endTime ? availability.endTime.slice(0, 5) : '';
                const key = `${startTime}-${endTime}-${availability.isAvailable ?? true}`;
                
                if (availability.dayOfWeek !== undefined && availability.dayOfWeek !== null) {
                  // Use database format directly (1-7: Monday-Sunday)
                  const dayOfWeek = availability.dayOfWeek;
                  
                  if (grouped.has(key)) {
                    const existing = grouped.get(key)!;
                    if (!existing.dayOfWeek.includes(dayOfWeek)) {
                      existing.dayOfWeek.push(dayOfWeek);
                    }
                  } else {
                    grouped.set(key, {
                      dayOfWeek: [dayOfWeek],
                      startTime,
                      endTime,
                      isAvailable: availability.isAvailable ?? true,
                    });
                  }
                }
              });
              
              return Array.from(grouped.values()).map((group) => ({
                dayOfWeek: group.dayOfWeek.map((d) => String(d)),
                startTime: group.startTime,
                endTime: group.endTime,
                isAvailable: group.isAvailable,
              }));
            })()
          : [
              {
                dayOfWeek: [],
                startTime: '',
                endTime: '',
                isAvailable: true,
              },
            ],
    });
  }, [serviceData]);

  const handleBack = () => {
    if (serviceId) {
      router.push(`/base/serviceDetail/${serviceId}`);
    } else {
      router.push('/base/serviceList');
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    const availabilityValidationErrors: Record<number, AvailabilityFormErrors> = {};

    const name = formData.name.trim();
    const nameRegex = /^[a-zA-ZÀ-ỹĐđ0-9\s'-]+$/u;
    if (!name) {
      errors.name = t('Service.validation.name');
    } else if (name.length > 40) {
      errors.name = t('Service.validation.nameMax40');
    } else if (!nameRegex.test(name)) {
      errors.name = t('Service.validation.nameNoSpecialChars');
    }
    if (formData.pricingType === ServicePricingType.SESSION) {
      if (!formData.pricePerSession.trim()) {
        errors.pricePerSession = t('Service.validation.pricePerSession');
      } else if (parseNonNegativeNumber(formData.pricePerSession) === undefined) {
        errors.pricePerSession = t('Service.validation.pricePerSessionNonNegative');
      }
    }

    const maxCapacity = parsePositiveInteger(formData.maxCapacity);
    if (formData.maxCapacity.trim() !== '' && maxCapacity !== undefined) {
      if (maxCapacity < 1 || maxCapacity > 1000) {
        errors.maxCapacity = t('Service.validation.maxCapacityRange');
      }
    }

    const minDuration = parsePositiveInteger(formData.minDurationHours);
    if (formData.minDurationHours.trim() === '' || minDuration === undefined) {
      errors.minDurationHours = t('Service.validation.minDuration');
    } else if (minDuration < 1 || minDuration >= 24) {
      errors.minDurationHours = t('Service.validation.minDurationRange');
    }

    if (!formData.availabilities || formData.availabilities.length === 0) {
      errors.availabilities = t('Service.validation.availabilityRequired', {
        defaultMessage: 'Please add at least one availability entry.',
      });
    } else {
      formData.availabilities.forEach((availability, index) => {
        const entryErrors: AvailabilityFormErrors = {};
        if (!availability.dayOfWeek || availability.dayOfWeek.length === 0) {
          entryErrors.dayOfWeek = t('Service.validation.availabilityDay', {
            defaultMessage: 'Please select at least one day of the week.',
          });
        } else {
          // Validate each selected day (should be 1-7: Monday-Sunday)
          const invalidDays = availability.dayOfWeek.filter(
            (day) => {
              const parsedDay = Number(day);
              return Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 7;
            }
          );
          if (invalidDays.length > 0) {
            entryErrors.dayOfWeek = t('Service.validation.availabilityDay', {
              defaultMessage: 'Please select valid days of the week.',
            });
          }
        }
        if (!availability.startTime) {
          entryErrors.startTime = t('Service.validation.availabilityStart', {
            defaultMessage: 'Start time is required.',
          });
        }
        if (!availability.endTime) {
          entryErrors.endTime = t('Service.validation.availabilityEnd', {
            defaultMessage: 'End time is required.',
          });
        } else if (availability.startTime && availability.endTime <= availability.startTime) {
          entryErrors.endTime = t('Service.validation.availabilityRange', {
            defaultMessage: 'End time must be after start time.',
          });
        }
        if (Object.keys(entryErrors).length > 0) {
          availabilityValidationErrors[index] = entryErrors;
        }
      });

      if (Object.keys(availabilityValidationErrors).length > 0) {
        errors.availabilities = t('Service.validation.availabilityInvalid', {
          defaultMessage: 'Please review the availability entries.',
        });
      }
    }

    setAvailabilityErrors(availabilityValidationErrors);
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const parseNumber = (value: string) => {
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const parseNonNegativeNumber = (value: string) => {
    const parsed = parseNumber(value);
    if (parsed === undefined) return undefined;
    if (parsed < 0) return undefined;
    return parsed;
  };

  const parsePositiveNumber = (value: string) => {
    const parsed = parseNumber(value);
    if (parsed === undefined) return undefined;
    if (parsed <= 0) return undefined;
    return parsed;
  };

  const parsePositiveInteger = (value: string) => {
    if (!value.trim()) return undefined;
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return undefined;
    if (parsed <= 0) return undefined;
    return parsed;
  };

  const handleAvailabilityChange = (
    index: number,
    field: keyof AvailabilityFormState,
    value: string | boolean | string[],
  ) => {
    setFormData((prev) => {
      const updated = [...prev.availabilities];
      if (!updated[index]) return prev;
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return {
        ...prev,
        availabilities: updated,
      };
    });

    setAvailabilityErrors((prev) => {
      const current = prev[index];
      if (!current || current[field] === undefined) {
        return prev;
      }
      const entry = { ...current };
      delete entry[field];
      const next = { ...prev };
      if (Object.keys(entry).length === 0) {
        delete next[index];
      } else {
        next[index] = entry;
      }
      return next;
    });

    setFormErrors((prev) => {
      if (!prev.availabilities) return prev;
      const { availabilities, ...rest } = prev;
      return rest;
    });
  };

  const handleAddAvailability = () => {
    setFormData((prev) => ({
      ...prev,
      availabilities: [
        ...prev.availabilities,
        { dayOfWeek: [], startTime: '', endTime: '', isAvailable: true },
      ],
    }));
    setFormErrors((prev) => {
      if (!prev.availabilities) return prev;
      const { availabilities, ...rest } = prev;
      return rest;
    });
  };

  const handleRemoveAvailability = (index: number) => {
    setFormData((prev) => {
      const updated = prev.availabilities.filter((_, idx) => idx !== index);
      return {
        ...prev,
        availabilities: updated,
      };
    });

    setAvailabilityErrors((prev) => {
      if (!Object.keys(prev).length) return prev;
      const next: Record<number, AvailabilityFormErrors> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const numericKey = Number(key);
        if (numericKey === index) {
          return;
        }
        const newIndex = numericKey > index ? numericKey - 1 : numericKey;
        next[newIndex] = value;
      });
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!serviceId || isSubmitting) return;

    if (!validate()) {
      show(t('Service.validation.error'), 'error');
      return;
    }

    const pricingTypeValue = formData.pricingType || ServicePricingType.FREE;
    const maxCapacity = parsePositiveInteger(formData.maxCapacity);
    const minDuration = parsePositiveInteger(formData.minDurationHours);
    const availabilityPayload: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }> = [];
    
    (formData.availabilities ?? []).forEach((availability) => {
      if (
        availability.dayOfWeek.length > 0 &&
        availability.startTime &&
        availability.endTime
      ) {
        // Create one entry for each selected day
        // Form already uses database format (1-7: Monday-Sunday), send directly
        availability.dayOfWeek.forEach((dayStr) => {
          const dayOfWeek = Number(dayStr);
          availabilityPayload.push({
            dayOfWeek: dayOfWeek, // Already in 1-7 format (1=Monday, 7=Sunday) matching database
            startTime: availability.startTime,
            endTime: availability.endTime,
            isAvailable: availability.isAvailable ?? true,
          });
        });
      }
    });

    // Remove duplicates - if same dayOfWeek, startTime, endTime exists, keep only one
    const uniqueAvailabilities = availabilityPayload.filter((item, index, self) =>
      index === self.findIndex((t) => 
        t.dayOfWeek === item.dayOfWeek &&
        t.startTime === item.startTime &&
        t.endTime === item.endTime
      )
    );

    const payload: UpdateServicePayload = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      location: formData.location.trim() || undefined,
      mapUrl: formData.mapUrl.trim() || undefined,
      pricingType: pricingTypeValue || ServicePricingType.FREE,
      pricePerHour:
        pricingTypeValue === ServicePricingType.HOURLY
          ? parseNonNegativeNumber(formData.pricePerHour)
          : undefined,
      pricePerSession:
        pricingTypeValue === ServicePricingType.SESSION
          ? parseNonNegativeNumber(formData.pricePerSession)
          : undefined,
      maxCapacity: formData.maxCapacity.trim() !== '' ? maxCapacity : undefined,
      minDurationHours: minDuration,
      rules: formData.rules.trim() || undefined,
      isActive: formData.isActive ?? true,
      // Remove availabilities from payload as we'll handle them separately
    };

    try {
      // Update service first
      await editService(serviceId, payload);
      
      // Handle availabilities separately
      if (serviceId) {
        const failedAvailabilities: Array<{ availability: typeof uniqueAvailabilities[0]; error: any }> = [];
        
        try {
          // Get existing availabilities
          const existingAvailabilities = await getServiceAvailabilities(serviceId);
          
          // Create a map of existing availabilities by key (dayOfWeek-startTime-endTime)
          const existingMap = new Map<string, ServiceAvailability>();
          existingAvailabilities.forEach((av) => {
            if (av.id && av.dayOfWeek != null && av.startTime && av.endTime) {
              // Database format is already 1-7, use directly
              const key = `${av.dayOfWeek}-${av.startTime.slice(0, 5)}-${av.endTime.slice(0, 5)}`;
              existingMap.set(key, av);
            }
          });
          
          // Create a map of new availabilities by key
          // uniqueAvailabilities already has dayOfWeek in 1-7 format
          const newMap = new Map<string, typeof uniqueAvailabilities[0]>();
          uniqueAvailabilities.forEach((av) => {
            const key = `${av.dayOfWeek}-${av.startTime.slice(0, 5)}-${av.endTime.slice(0, 5)}`;
            newMap.set(key, av);
          });
          
          // Update existing availabilities that match new ones
          for (const [key, newAvailability] of newMap.entries()) {
            const existing = existingMap.get(key);
            if (existing && existing.id) {
              try {
                // Check if needs update (isAvailable might have changed)
                // newAvailability.dayOfWeek is already in 1-7 format
                if (existing.isAvailable !== (newAvailability.isAvailable ?? true)) {
                  await updateServiceAvailability(serviceId, existing.id, {
                    dayOfWeek: newAvailability.dayOfWeek, // Already in 1-7 format (1=Monday, 7=Sunday)
                    startTime: newAvailability.startTime,
                    endTime: newAvailability.endTime,
                    isAvailable: newAvailability.isAvailable ?? true,
                  });
                }
                // Remove from existing map so we don't delete it later
                existingMap.delete(key);
              } catch (error: any) {
                console.error('Failed to update availability', error);
                failedAvailabilities.push({ availability: newAvailability, error });
              }
            }
          }
          
          // Delete availabilities that no longer exist
          for (const existing of existingMap.values()) {
            if (existing.id) {
              try {
                await deleteServiceAvailability(serviceId, existing.id);
              } catch (error: any) {
                console.error('Failed to delete availability', error);
                failedAvailabilities.push({ 
                  availability: {
                    dayOfWeek: existing.dayOfWeek ?? 1,
                    startTime: existing.startTime || '',
                    endTime: existing.endTime || '',
                    isAvailable: existing.isAvailable ?? true,
                  }, 
                  error 
                });
              }
            }
          }
          
          // Add new availabilities that don't exist yet
          for (const [key, newAvailability] of newMap.entries()) {
            if (!existingAvailabilities.some(ex => {
              if (ex.id && ex.dayOfWeek != null && ex.startTime && ex.endTime) {
                const exKey = `${ex.dayOfWeek}-${ex.startTime.slice(0, 5)}-${ex.endTime.slice(0, 5)}`;
                return exKey === key;
              }
              return false;
            })) {
              try {
                // newAvailability.dayOfWeek is already in 1-7 format
                await addServiceAvailability(serviceId, {
                  dayOfWeek: newAvailability.dayOfWeek, // Already in 1-7 format (1=Monday, 7=Sunday)
                  startTime: newAvailability.startTime,
                  endTime: newAvailability.endTime,
                  isAvailable: newAvailability.isAvailable ?? true,
                });
              } catch (error: any) {
                console.error('Failed to add availability', error);
                failedAvailabilities.push({ availability: newAvailability, error });
              }
            }
          }
          
          // If some availabilities failed, show warning
          if (failedAvailabilities.length > 0) {
            const errorCount = failedAvailabilities.length;
            const totalCount = uniqueAvailabilities.length;
            if (errorCount === totalCount) {
              // All failed - show error
              show(
                t('Service.messages.availabilityError', {
                  defaultMessage: `Failed to update ${errorCount} availability entries. Please try again.`,
                }),
                'error',
              );
            } else {
              // Some failed - show info message
              show(
                t('Service.messages.availabilityPartialError', {
                  defaultMessage: `Service updated successfully, but ${errorCount} out of ${totalCount} availability entries could not be updated. Please try editing them manually.`,
                }),
                'info',
              );
            }
          }
        } catch (availabilityError) {
          console.error('Failed to update availabilities', availabilityError);
          // Still show success but warn about availability issue
          show(t('Service.messages.updateSuccess'), 'success');
          router.push(`/base/serviceDetail/${serviceId}`);
          return;
        }
      }
      
      show(t('Service.messages.updateSuccess'), 'success');
      router.push(`/base/serviceDetail/${serviceId}`);
    } catch (submitError) {
      console.error('Failed to update service', submitError);
      show(t('Service.messages.updateError'), 'error');
    }
  };

  // Validate individual field
  const validateField = (fieldName: string, value: string) => {
    const newErrors = { ...formErrors };
    
    switch (fieldName) {
      case 'name':
        const name = value.trim();
        const nameRegex = /^[a-zA-ZÀ-ỹĐđ0-9\s'-]+$/u;
        if (!name) {
          newErrors.name = t('Service.validation.name');
        } else if (name.length > 40) {
          newErrors.name = t('Service.validation.nameMax40');
        } else if (!nameRegex.test(name)) {
          newErrors.name = t('Service.validation.nameNoSpecialChars');
        } else {
          delete newErrors.name;
        }
        break;
      case 'pricePerSession':
        if (!value.trim()) {
          newErrors.pricePerSession = t('Service.validation.pricePerSession');
        } else if (parseNonNegativeNumber(value) === undefined) {
          newErrors.pricePerSession = t('Service.validation.pricePerSessionNonNegative');
        } else {
          delete newErrors.pricePerSession;
        }
        break;
      case 'maxCapacity':
        if (value.trim() !== '') {
          const num = parsePositiveInteger(value);
          if (num === undefined) {
            newErrors.maxCapacity = t('Service.validation.maxCapacityPositive');
          } else if (num >= 1000) {
            newErrors.maxCapacity = t('Service.validation.maxCapacityMax');
          } else {
            delete newErrors.maxCapacity;
          }
        } else {
          delete newErrors.maxCapacity;
        }
        break;
      case 'minDurationHours':
        if (!value.trim()) {
          newErrors.minDurationHours = t('Service.validation.minDurationHours');
        } else {
          const num = parsePositiveNumber(value);
          if (num === undefined) {
            newErrors.minDurationHours = t('Service.validation.minDurationHoursPositive');
          } else if (num >= 24) {
            newErrors.minDurationHours = t('Service.validation.minDurationHoursMax');
          } else {
            delete newErrors.minDurationHours;
          }
        }
        break;
      default:
        // Clear error for other fields
        if (fieldName in newErrors) {
          delete newErrors[fieldName];
        }
        break;
    }
    
    setFormErrors(newErrors);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Validate field on change
    if (name === 'name' || name === 'pricePerSession' || 
        name === 'maxCapacity' || name === 'minDurationHours') {
      validateField(name, value);
    } else if (name) {
      // Clear error for other fields
      setFormErrors((prev) => {
        if (!(name in prev)) return prev;
        const { [name]: _removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const dayOfWeekOptions = useMemo(
    () => {
      // Database format: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday
      // For display, we show Monday first, then Sunday last
      const dayOrder = [1, 2, 3, 4, 5, 6, 7]; // Monday to Sunday
      const frontendIndexMap: Record<number, number> = {
        1: 1, // Monday -> index 1 for translation
        2: 2, // Tuesday -> index 2
        3: 3, // Wednesday -> index 3
        4: 4, // Thursday -> index 4
        5: 5, // Friday -> index 5
        6: 6, // Saturday -> index 6
        7: 0, // Sunday -> index 0 for translation
      };
      
      return dayOrder.map((dayOfWeek) => ({
        label: t(`Service.weekday.${frontendIndexMap[dayOfWeek]}`, { 
          defaultMessage: DAY_NAME_MAP[dayOfWeek] || `Day ${dayOfWeek}` 
        }),
        value: String(dayOfWeek), // Use 1-7 format matching database
      }));
    },
    [t],
  );

  const shouldShowPricePerSession = formData.pricingType === ServicePricingType.SESSION;

  if (loading) {
    return (
      <div className="px-[41px] py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-2 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('Service.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-[41px] py-12 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{t('Service.error')}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-primary-2 text-white rounded-md hover:bg-primary-3"
          >
            {t('Service.returnList')}
          </button>
        </div>
      </div>
    );
  }

  if (!serviceData) {
    return (
      <div className="px-[41px] py-12 flex items-center justify-center">
        <div className="text-center text-gray-600">
          {t('Service.noData')}
        </div>
      </div>
    );
  }

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

      <form
        className="max-w-5xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b pb-4 mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#02542D]">
              {t('Service.editTitle')}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <DetailField
            label={t('Service.code')}
            value={serviceData.code ?? ''}
            readonly={true}
          />
          <DetailField
            label={t('Service.category')}
            value={serviceData.category?.name ?? '-'}
            readonly={true}
          />
          <DetailField
            label={t('Service.name')}
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            readonly={false}
            error={formErrors.name}
          />
          {shouldShowPricePerSession && (
            <DetailField
              label={t('Service.pricePerSession')}
              name="pricePerSession"
              value={formData.pricePerSession}
              onChange={handleInputChange}
              readonly={false}
              error={formErrors.pricePerSession}
              placeholder={t('Service.pricePerSession')}
              inputType="number"
            />
          )}
          <DetailField
            label={t('Service.maxCapacity')}
            name="maxCapacity"
            value={formData.maxCapacity}
            onChange={handleInputChange}
            readonly={false}
            error={formErrors.maxCapacity}
            placeholder={t('Service.maxCapacity')}
            inputType="number"
          />
          <DetailField
            label={t('Service.minDuration')}
            name="minDurationHours"
            value={formData.minDurationHours}
            onChange={handleInputChange}
            readonly={false}
            error={formErrors.minDurationHours}
            placeholder={t('Service.minDuration')}
            inputType="number"
          />
          <DetailField
            label={t('Service.location')}
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            readonly={false}
          />
          <DetailField
            label={t('Service.mapUrl')}
            name="mapUrl"
            value={formData.mapUrl}
            onChange={handleInputChange}
            readonly={false}
          />
          <DetailField
            label={t('Service.description')}
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            readonly={false}
            type="textarea"
            isFullWidth
          />
          <DetailField
            label={t('Service.rules')}
            name="rules"
            value={formData.rules}
            onChange={handleInputChange}
            readonly={false}
            type="textarea"
            isFullWidth
          />
          <div className="md:col-span-2">
            <div className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-[#02542D]">
                  {t('Service.availability.sectionTitle', { defaultMessage: 'Service availability' })}
                </h2>
                <button
                  type="button"
                  onClick={handleAddAvailability}
                  className="inline-flex items-center justify-center rounded-lg bg-[#02542D] px-4 py-2 text-sm font-semibold text-white transition hover:bg-opacity-80"
                  disabled={isSubmitting}
                >
                  {t('Service.availability.add', { defaultMessage: 'Add availability' })}
                </button>
              </div>
              {formErrors.availabilities && (
                <span className="text-xs text-red-500">{formErrors.availabilities}</span>
              )}
              <div className="space-y-4">
                {formData.availabilities.map((availability, index) => {
                  const errors = availabilityErrors[index] ?? {};
                  return (
                    <div
                      key={`availability-${index}`}
                      className="rounded-md border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#02542D]">
                          {t('Service.availability.slotLabel', {
                            defaultMessage: `Slot ${index + 1}`,
                            slot: index + 1,
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAvailability(index)}
                          className="text-sm font-medium text-red-500 hover:text-red-600"
                          disabled={isSubmitting}
                        >
                          {t('Service.availability.remove', { defaultMessage: 'Remove' })}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex flex-col md:col-span-4">
                          <label className="text-sm font-medium text-[#02542D] mb-2">
                            {t('Service.availability.dayOfWeek', { defaultMessage: 'Days of week' })}
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
                            {dayOfWeekOptions.map((option) => {
                              const isSelected = availability.dayOfWeek.includes(option.value);
                              // Get days selected in other availability slots (excluding current one)
                              const selectedDaysInOtherSlots = new Set<string>();
                              formData.availabilities.forEach((avail, idx) => {
                                if (idx !== index && avail.dayOfWeek) {
                                  avail.dayOfWeek.forEach((day) => selectedDaysInOtherSlots.add(day));
                                }
                              });
                              const isDisabled = !isSelected && selectedDaysInOtherSlots.has(option.value);
                              return (
                                <label
                                  key={option.value}
                                  className={`flex items-center gap-2 p-2 rounded-md border border-gray-300 transition-colors ${
                                    isDisabled 
                                      ? 'cursor-not-allowed bg-gray-100 opacity-60' 
                                      : 'cursor-pointer hover:bg-gray-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={isDisabled}
                                    onChange={(e) => {
                                      const currentDays = availability.dayOfWeek || [];
                                      const newDays = e.target.checked
                                        ? [...currentDays, option.value]
                                        : currentDays.filter((d) => d !== option.value);
                                      handleAvailabilityChange(index, 'dayOfWeek', newDays);
                                    }}
                                    className="h-4 w-4 rounded border-gray-300 text-[#02542D] focus:ring-[#02542D] disabled:cursor-not-allowed"
                                  />
                                  <span className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-[#02542D]'}`}>{option.label}</span>
                                </label>
                              );
                            })}
                          </div>
                          {errors.dayOfWeek && (
                            <span className="mt-1 text-xs text-red-500">{errors.dayOfWeek}</span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
                          <div className="flex flex-col">
                            <label className="text-sm font-medium text-[#02542D]">
                              {t('Service.availability.startTime', { defaultMessage: 'Start time' })}
                            </label>
                            <TimeBox
                              value={availability.startTime}
                              onChange={(value) => handleAvailabilityChange(index, 'startTime', value)}
                              placeholderText={t('Service.availability.startTime', {
                                defaultMessage: 'Start time',
                              })}
                              disabled={isSubmitting}
                            />
                            {errors.startTime && (
                              <span className="mt-1 text-xs text-red-500">{errors.startTime}</span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <label className="text-sm font-medium text-[#02542D]">
                              {t('Service.availability.endTime', { defaultMessage: 'End time' })}
                            </label>
                            <TimeBox
                              value={availability.endTime}
                              onChange={(value) => handleAvailabilityChange(index, 'endTime', value)}
                              placeholderText={t('Service.availability.endTime', {
                                defaultMessage: 'End time',
                              })}
                              disabled={isSubmitting}
                            />
                            {errors.endTime && (
                              <span className="mt-1 text-xs text-red-500">{errors.endTime}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-8 space-x-4">
          <button
            type="button"
            className="px-6 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            {t('Service.cancel')}
          </button>
          <button
            type="submit"
            className={`px-6 py-2 rounded-lg bg-[#02542D] text-white hover:bg-opacity-80 transition ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? t('Service.saving') : t('Service.save')}
          </button>
        </div>
      </form>
    </div>
  );
}

