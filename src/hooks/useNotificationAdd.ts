import { useState } from 'react';
import { Notification, CreateNotificationRequest, createNotification } from '@/src/services/customer-interaction/notiService';

interface UseNotificationAddResult {
    addNotification: (data: CreateNotificationRequest) => Promise<Notification>;
    loading: boolean;
    error: Error | null;
    isSubmitting: boolean;
}

export const useNotificationAdd = (): UseNotificationAddResult => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const addNotification = async (data: CreateNotificationRequest): Promise<Notification> => {
        setIsSubmitting(true);
        setError(null);
        
        try {
            const result = await createNotification(data);
            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        addNotification,
        loading,
        error,
        isSubmitting,
    };
};


