import { useState, useEffect, useCallback } from 'react';
import { Project } from '@/src/types/project';
import { createTenant } from '@/src/services/base/tenantService';

export const useProjectAdd = () => {
    
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const addProject = async(data: Project) =>{
        setIsSubmitting(true);
        setError(null);
        try {
            await createTenant(data);
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    }

    return { 
        addProject, 
        loading, 
        error,
        isSubmitting,
    };
};
