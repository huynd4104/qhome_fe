import { useState, useEffect, useCallback } from 'react';
import { SupplierResponse, getAllSuppliers, Page } from '@/src/services/asset-maintenance/supplierService';

export const useSupplierPage = (loadOnMount: boolean = true) => {
    const [data, setData] = useState<Page<SupplierResponse> | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    const [pageNo, setPageNo] = useState<number>(0);
    const [pageSize] = useState<number>(20);
    const [filters, setFilters] = useState<{
        isActive?: boolean;
        type?: string;
        search?: string;
    }>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getAllSuppliers({
                isActive: filters.isActive,
                type: filters.type,
                page: pageNo,
                size: pageSize,
                sortBy: 'createdAt',
                sortDir: 'DESC',
            });
            setData(result);
        } catch (err) {
            setError('Failed to fetch suppliers.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [pageNo, pageSize, filters]); 

    useEffect(() => {
        if (loadOnMount) {
            fetchData(); 
        }
    }, [loadOnMount, fetchData]);

    const handlePageChange = (page: number) => {
        setPageNo(page);
    };

    const handleFilterChange = (newFilters: typeof filters) => {
        setFilters(newFilters);
        setPageNo(0);
    };

    const handleClear = () => {
        setFilters({});
        setPageNo(0);
    };

    return {
        data,
        loading,
        error,
        pageNo,
        totalPages: data?.totalPages || 0,
        filters,
        handlePageChange,
        handleFilterChange,
        handleClear,
    };
};

