import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createServiceCategory,
  getServiceCategories,
  updateServiceCategory,
} from '@/src/services/asset-maintenance/serviceService';
import {
  CreateServiceCategoryPayload,
  ServiceCategory,
  UpdateServiceCategoryPayload,
} from '@/src/types/service';

export const useServiceCategoryList = (loadOnMount: boolean = true) => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getServiceCategories();
      setCategories(result);
    } catch (err) {
      console.error('Failed to fetch service categories', err);
      setError('Failed to fetch service categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadOnMount) {
      fetchCategories();
    }
  }, [loadOnMount, fetchCategories]);

  const handleCreate = useCallback(
    async (payload: CreateServiceCategoryPayload) => {
      setIsSubmitting(true);
      setError(null);
      try {
        const created = await createServiceCategory(payload);
        setCategories((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        console.error('Failed to create service category', err);
        setError('Failed to create service category.');
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const handleUpdate = useCallback(
    async (id: string, payload: UpdateServiceCategoryPayload) => {
      setIsSubmitting(true);
      setError(null);
      try {
        console.log('payload', payload);
        const updated = await updateServiceCategory(id, payload);
        setCategories((prev) =>
          prev.map((category) => (category.id === id ? updated : category)),
        );
        return updated;
      } catch (err) {
        console.error('Failed to update service category', err);
        setError('Failed to update service category.');
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const sortOrderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const sortOrderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (sortOrderA !== sortOrderB) {
        return sortOrderA - sortOrderB;
      }
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }, [categories]);

  return {
    categories: sortedCategories,
    loading,
    error,
    isSubmitting,
    refetch: fetchCategories,
    createCategory: handleCreate,
    updateCategory: handleUpdate,
  };
};

