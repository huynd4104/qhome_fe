import { useState, useEffect, useCallback } from 'react';
import { Unit } from '@/src/types/unit';
import { getUnit, updateUnit } from '@/src/services/base/unitService';

export const useUnitDetailPage = (unitId: string | string[] | undefined) => {
    const [unitData, setUnitData] = useState<Unit | null>(null);
    
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const fetchData = useCallback(async () => {
        if (!unitId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const unit = await getUnit(unitId.toString());
            console.log('Unit data:', unit);
            setUnitData(unit as unknown as Unit);
        } catch (err) {
            setError(err as Error);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [unitId]); 

    useEffect(() => {
        fetchData();
    }, [fetchData]); 

    const editUnit = async(unitId: string, data: Partial<Unit>) =>{
        if (!unitId) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await updateUnit(unitId, data);
            await fetchData(); 
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    }

    return { 
        unitData,
        editUnit, 
        loading, 
        error,
        isSubmitting,
    };
};

