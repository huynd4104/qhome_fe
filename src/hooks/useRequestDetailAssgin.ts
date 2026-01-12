import { useState, useEffect, useCallback } from 'react';
import { Request } from '@/src/types/request';
import { ProcessLog } from '@/src/types/processLog';
import { RequestService } from '@/src/services/customer-interaction/requestDetailService';
import { LogUpdateData } from '@/src/components/customer-interaction/RequestLogUpdate';

const requestService = new RequestService();

export const useRequestDetails = (requestId: string | string[] | undefined) => {
    const [requestData, setRequestData] = useState<Request | null>(null);
    const [logData, setLogData] = useState<ProcessLog[]>([]);
    
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const fetchData = useCallback(async () => {
        if (!requestId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { request, logs } = await requestService.getRequestDetails(requestId.toString());
            setRequestData(request);
            setLogData(logs);
        } catch (err) {
            setError(err as Error);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [requestId]); 

    useEffect(() => {
        fetchData();
    }, [fetchData]); 

    const addLog = async (data: LogUpdateData) => {
        if (!requestId) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await requestService.addRequestLog(requestId as string, data);
            await fetchData(); 
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    return { 
        requestData, 
        logData, 
        loading, 
        error,
        isSubmitting,
        addLog         
    };
};