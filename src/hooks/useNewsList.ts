import { useCallback, useEffect, useState } from 'react';
import { News, NewsStatus } from '@/src/types/news';
import { getNewsList } from '@/src/services/customer-interaction/newService';

export const useNewsList = (statusFilter?: NewsStatus) => {
    const [newsList, setNewsList] = useState<News[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNews = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getNewsList();
            // Filter out ARCHIVED status
            let filtered = data.filter(news => news.status !== 'ARCHIVED');
            
            // Apply status filter if provided
            if (statusFilter) {
                filtered = filtered.filter(news => news.status === statusFilter);
            }
            
            setNewsList(filtered);
        } catch (err) {
            setError('Failed to fetch news list');
            console.error('Error fetching news:', err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchNews();
    }, [fetchNews]);

    return {
        newsList,
        loading,
        error,
        refetch: fetchNews,
    };
};

