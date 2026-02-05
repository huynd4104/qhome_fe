import { useState } from 'react';
import { createService } from '@/src/services/asset-maintenance/serviceService';
import { CreateServicePayload, Service } from '@/src/types/service';

export const useServiceAdd = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const addService = async (payload: CreateServicePayload): Promise<Service> => {
    setIsSubmitting(true);
    setLoading(true);
    setError(null);
    try {
      const created = await createService(payload);
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
    addService,
    loading,
    error,
    isSubmitting,
  };
};


