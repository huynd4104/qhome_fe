import { useState } from 'react';
import { Building } from '@/src/types/building';
import { createBuilding } from '@/src/services/base/buildingService';

export const useBuildingAdd = () => {
    
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);


    const addBuilding = async(data: Partial<Building>) =>{
        setIsSubmitting(true);
        setError(null);
        try {
            await createBuilding(data);
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    }

    return { 
        addBuilding, 
        loading, 
        error,
        isSubmitting,
    };
};


