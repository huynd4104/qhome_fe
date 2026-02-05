import { useState } from 'react';
import { News, CreateNewsRequest, createNews } from '@/src/services/customer-interaction/newService';

interface UseNewAddResult {
    addNews: (data: CreateNewsRequest) => Promise<News>;
    loading: boolean;
    error: Error | null;
    isSubmitting: boolean;
}

export const useNewAdd = (): UseNewAddResult => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const addNews = async (data: CreateNewsRequest): Promise<News> => {
        setIsSubmitting(true);
        setError(null);
        
        try {
            const result = await createNews(data);
            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        addNews,
        loading,
        error,
        isSubmitting,
    };
};

