import { useCallback, useEffect, useState } from 'react';
import { Notification, NotificationType } from '@/src/types/notification';
import { getNotificationsList } from '@/src/services/customer-interaction/notiService';

export const useNotificationList = (typeFilter?: NotificationType) => {
    const [notificationList, setNotificationList] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getNotificationsList();
            
            // Apply type filter if provided
            let filtered = data;
            if (typeFilter) {
                filtered = data.filter(notification => notification.type === typeFilter);
            }
            
            setNotificationList(filtered);
        } catch (err) {
            setError('Failed to fetch notifications list');
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [typeFilter]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    return {
        notificationList,
        loading,
        error,
        refetch: fetchNotifications,
    };
};

