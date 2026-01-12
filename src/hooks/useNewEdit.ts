import { useState, useEffect, useCallback } from 'react';
import { News, UpdateNewsRequest, getNewsDetail, updateNews } from '@/src/services/customer-interaction/newService';

interface UseNewEditResult {
    news: News | null;
    updateNewsItem: (data: UpdateNewsRequest) => Promise<News>;
    loading: boolean;
    error: Error | null;
    isSubmitting: boolean;
    refetch: () => Promise<void>;
}

export const useNewEdit = (newsId: string | string[] | undefined): UseNewEditResult => {
    const [news, setNews] = useState<News | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const fetchNews = useCallback(async () => {
        if (!newsId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await getNewsDetail(newsId.toString());
            setNews(data);
        } catch (err) {
            setError(err as Error);
            console.error('Error fetching news:', err);
        } finally {
            setLoading(false);
        }
    }, [newsId]);

    useEffect(() => {
        fetchNews();
    }, [fetchNews]);

    const updateNewsItem = async (data: UpdateNewsRequest): Promise<News> => {
        if (!newsId) {
            throw new Error('News ID is required');
        }

        setIsSubmitting(true);
        setError(null);
        
        try {
            const result = await updateNews(newsId.toString(), data);
            await fetchNews(); // Refresh data after update
            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        news,
        updateNewsItem,
        loading,
        error,
        isSubmitting,
        refetch: fetchNews,
    };
};

