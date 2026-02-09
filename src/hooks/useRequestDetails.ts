import { useState, useEffect, useCallback } from 'react';
import { Request } from '@/src/types/request';
import { RequestService } from '@/src/services/customer-interaction/requestDetailService';
import { RequestService as RequestListService } from '@/src/services/customer-interaction/requestService';
import { LogUpdateData } from '@/src/components/customer-interaction/RequestLogUpdate';
import { useAuth } from '@/src/contexts/AuthContext';

const requestService = new RequestService();
const requestListService = new RequestListService();

export const useRequestDetails = (requestId: string | string[] | undefined) => {
    const { user } = useAuth();
    const [requestData, setRequestData] = useState<Request | null>(null);

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
            const { request } = await requestService.getRequestDetails(requestId.toString());
            setRequestData(request);
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

    const updateFee = async (fee: number) => {
        if (!requestId) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await requestListService.updateFee(requestId as string, fee);
            await fetchData();
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    const acceptOrDenyRequest = async (action: string, adminResponse: string | null, fee: number | null, note: string, preferredDatetime?: string) => {
        if (!requestId) return;

        setIsSubmitting(true);
        setError(null);
        try {
            if (action === 'accept') {
                // Accept flow: Call respondToRequest API
                await requestListService.respondToRequest(
                    requestId as string,
                    adminResponse || '',
                    fee || 0,
                    note,
                    preferredDatetime
                );

            } else if (action === 'deny') {
                // Deny flow: Call denyRequest API (uses approve endpoint but sets status to CANCELLED)
                await requestListService.denyRequest(
                    requestId as string,
                    note
                );
            }

            await fetchData();
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    const addProgressNote = async (note: string, cost?: number) => {
        if (!requestId) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await requestListService.addProgressNote(
                requestId as string,
                note,
                cost
            );
            await fetchData();
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    const completeRequest = async (note?: string) => {
        if (!requestId) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await requestListService.completeRequest(
                requestId as string,
                note
            );
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
        loading,
        error,
        isSubmitting,
        addLog,
        updateFee,
        acceptOrDenyRequest,
        addProgressNote,
        completeRequest
    };
};