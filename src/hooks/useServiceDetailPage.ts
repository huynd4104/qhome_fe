import { useCallback, useEffect, useState } from 'react';
import { getService, updateService } from '@/src/services/asset-maintenance/serviceService';
import { Service, UpdateServicePayload } from '@/src/types/service';

export const useServiceDetailPage = (serviceId: string | string[] | undefined) => {
  const [serviceData, setServiceData] = useState<Service | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    if (!serviceId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getService(serviceId.toString());
      setServiceData(result);
    } catch (err) {
      console.error('Failed to load service detail', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const editService = useCallback(
    async (id: string, payload: UpdateServicePayload) => {
      setIsSubmitting(true);
      setError(null);
      try {
        await updateService(id, payload);
        await fetchData();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchData],
  );

  return {
    serviceData,
    loading,
    error,
    isSubmitting,
    editService,
    refetch: fetchData,
  };
};


