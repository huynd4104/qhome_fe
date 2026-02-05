import { useState } from 'react';
import { Unit } from '@/src/types/unit';
import { createUnit } from '@/src/services/base/unitService';

export const useUnitAdd = () => {
    
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const addUnit = async(data: Partial<Unit>) =>{
        setIsSubmitting(true);
        setError(null);
        try {
            await createUnit(data);
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    }

    return { 
        addUnit, 
        loading, 
        error,
        isSubmitting,
    };
};

