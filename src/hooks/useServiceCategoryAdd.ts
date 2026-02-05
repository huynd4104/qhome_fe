import { useState } from 'react';
import { createServiceCategory } from '@/src/services/asset-maintenance/serviceService';
import { CreateServiceCategoryPayload, ServiceCategory } from '@/src/types/service';

export const useServiceCategoryAdd = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const addCategory = async (
    payload: CreateServiceCategoryPayload,
  ): Promise<ServiceCategory> => {
    setLoading(true);
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createServiceCategory(payload);
      return created;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return {
    addCategory,
    loading,
    error,
    isSubmitting,
  };
};

