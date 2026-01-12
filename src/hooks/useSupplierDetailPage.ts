import { useState, useEffect, useCallback } from 'react';
import { SupplierResponse, getSupplierById, updateSupplier, UpdateSupplierRequest } from '@/src/services/asset-maintenance/supplierService';

export const useSupplierDetailPage = (supplierId: string | string[] | undefined) => {
    const [supplierData, setSupplierData] = useState<SupplierResponse | null>(null);
    
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const fetchData = useCallback(async () => {
        if (!supplierId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await getSupplierById(supplierId.toString());
            setSupplierData(data);
        } catch (err) {
            setError(err as Error);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [supplierId]); 

    useEffect(() => {
        fetchData();
    }, [fetchData]); 

    const editSupplier = async(supplierId: string, data: UpdateSupplierRequest) =>{
        if (!supplierId) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await updateSupplier(supplierId, data);
            await fetchData(); 
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    }

    return { 
        supplierData,
        editSupplier, 
        loading, 
        error,
        isSubmitting,
    };
};

