import { useState, useEffect, useCallback } from 'react';
import { Notification, UpdateNotificationRequest, getNotificationDetail, updateNotification } from '@/src/services/customer-interaction/notiService';

interface UseNotificationEditResult {
    notification: Notification | null;
    updateNotificationItem: (data: UpdateNotificationRequest) => Promise<Notification>;
    loading: boolean;
    error: Error | null;
    isSubmitting: boolean;
    refetch: () => Promise<void>;
}

export const useNotificationEdit = (notificationId: string | string[] | undefined): UseNotificationEditResult => {
    const [notification, setNotification] = useState<Notification | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const fetchNotification = useCallback(async () => {
        if (!notificationId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await getNotificationDetail(notificationId.toString());
            setNotification(data);
        } catch (err) {
            setError(err as Error);
            console.error('Error fetching notification:', err);
        } finally {
            setLoading(false);
        }
    }, [notificationId]);

    useEffect(() => {
        fetchNotification();
    }, [fetchNotification]);

    const updateNotificationItem = async (data: UpdateNotificationRequest): Promise<Notification> => {
        if (!notificationId) {
            throw new Error('Notification ID is required');
        }

        setIsSubmitting(true);
        setError(null);
        
        try {
            const result = await updateNotification(notificationId.toString(), data);
            await fetchNotification(); // Refresh data after update
            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        notification,
        updateNotificationItem,
        loading,
        error,
        isSubmitting,
        refetch: fetchNotification,
    };
};


