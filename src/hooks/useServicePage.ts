import { useCallback, useEffect, useMemo, useState } from 'react';
import type { filters as FilterFormFilters } from '@/src/components/base-service/FilterForm';
import {
  getServiceCategories,
  getServices,
} from '@/src/services/asset-maintenance/serviceService';
import { Page, Service, ServiceCategory } from '@/src/types/service';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

interface ServiceFilters {
  search: string;
  categoryId: string;
  status: StatusFilter;
}

const initialFilters: ServiceFilters = {
  search: '',
  categoryId: '',
  status: 'ALL',
};

const DEFAULT_PAGE_SIZE = 10;

export const useServicePage = (loadOnMount: boolean = true) => {
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ServiceFilters>(initialFilters);
  const [pageNo, setPageNo] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const fetchCategories = useCallback(async () => {
    try {
      const result = await getServiceCategories();
      setCategories(result);
    } catch (err) {
      console.error('Failed to load service categories', err);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getServices();

      let servicesArray: Service[] = [];
      const raw = result as unknown;

      if (Array.isArray(raw)) {
        servicesArray = raw as Service[];
      } else if (
        raw &&
        typeof raw === 'object' &&
        Array.isArray((raw as Page<Service>).content)
      ) {
        servicesArray = (raw as Page<Service>).content;
      }

      setAllServices(servicesArray);
      setPageNo(0);
    } catch (err) {
      console.error('Failed to fetch services', err);
      setError('Failed to fetch services.');
      setAllServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadOnMount) {
      fetchCategories();
      fetchServices();
    }
  }, [loadOnMount, fetchCategories, fetchServices]);

  const handleFilterChange: (
    name: keyof FilterFormFilters,
    value: string
  ) => void = (name, value) => {
    setFilters((prev) => {
      switch (name) {
        case 'search':
          return { ...prev, search: value };
        case 'categoryId':
          return { ...prev, categoryId: value };
        case 'status':
          return {
            ...prev,
            status: (value as StatusFilter) || 'ALL',
          };
        default:
          return prev;
      }
    });
    setPageNo(0);
  };

  const handleClear = () => {
    setFilters(initialFilters);
    setPageNo(0);
  };

  const handlePageChange = (nextPage: number) => {
    setPageNo(nextPage);
  };

  const filteredServices = useMemo(() => {
    return allServices.filter((service) => {
      const matchesSearch = filters.search
        ? service.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
          service.code?.toLowerCase().includes(filters.search.toLowerCase())
        : true;

      const matchesCategory = filters.categoryId
        ? service.categoryId === filters.categoryId ||
          service.category?.id === filters.categoryId
        : true;

      const matchesStatus =
        filters.status === 'ALL'
          ? true
          : filters.status === 'ACTIVE'
          ? service.isActive ?? false
          : !(service.isActive ?? false);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [allServices, filters]);

  const paginatedData = useMemo(() => {
    const totalElements = filteredServices.length;
    const startIndex = pageNo * pageSize;
    const endIndex = startIndex + pageSize;
    const content = filteredServices.slice(startIndex, endIndex);
    const totalPages =
      pageSize > 0 ? Math.max(1, Math.ceil(totalElements / pageSize)) : 0;

    return {
      content,
      totalElements,
      totalPages,
    };
  }, [filteredServices, pageNo, pageSize]);

  return {
    data: paginatedData,
    categories,
    filters,
    loading,
    error,
    pageNo,
    pageSize,
    totalPages: paginatedData.totalPages,
    setPageSize,
    handleFilterChange,
    handleClear,
    handlePageChange,
    refetch: fetchServices,
  };
};
