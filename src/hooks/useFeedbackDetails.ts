import { useState, useEffect, useCallback } from 'react';
import { Request } from '@/src/types/request';
import { FeedbackService } from '@/src/services/customer-interaction/feedbackService';

const feedbackService = new FeedbackService();

export const useFeedbackDetails = (feedbackId: string | string[] | undefined) => {
    const [feedbackData, setFeedbackData] = useState<Request | null>(null);
    
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const fetchData = useCallback(async () => {
        if (!feedbackId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const feedback = await feedbackService.getFeedbackDetails(feedbackId.toString());
            setFeedbackData(feedback);
        } catch (err) {
            setError(err as Error);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [feedbackId]); 

    useEffect(() => {
        fetchData();
    }, [fetchData]); 

    const replyFeedback = async (note: string) => {
        if (!feedbackId) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await feedbackService.replyFeedback(feedbackId as string, note);
            await fetchData(); 
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    return { 
        feedbackData, 
        loading, 
        error,
        isSubmitting,
        replyFeedback
    };
};

