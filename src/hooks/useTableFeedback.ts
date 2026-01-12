import { useCallback, useEffect, useState, useRef } from 'react';
import { FeedbackService, StatusCounts, GetFeedbacksParams, Page } from '@/src/services/customer-interaction/feedbackService';
import { RequestFilters } from '@/src/components/customer-interaction/FilterForm';
import { Request } from '@/src/types/request';

const initialFilters: RequestFilters = {
    status: '',
    dateFrom: '',
    dateTo: '',
    search: ''
};

const feedbackService = new FeedbackService();

export const useFeedbacks = (loadOnMount: boolean = true) => {
    const [data, setData] = useState<Page<Request> | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [allFeedbacksList, setAllFeedbacksList] = useState<Request[] | null>(null); // Store full list when using getAllFeedbacks

    const [filters, setFilters] = useState<RequestFilters>(initialFilters);
    const [pageNo, setPageNo] = useState<number>(0);
    const [statusCounts, setStatusCounts] = useState<StatusCounts>({});
    const prevDateFromRef = useRef<string>('');
    const prevDateToRef = useRef<string>('');

    // Calculate status counts from feedback list
    const calculateStatusCounts = useCallback((feedbacks: Request[]): StatusCounts => {
        const counts: StatusCounts = {
            New: 0,
            Pending: 0,
            Processing: 0,
            Done: 0,
            Cancelled: 0,
            total: 0
        };

        feedbacks.forEach(feedback => {
            const status = feedback.status;
            if (status === 'New') {
                counts.New = (counts.New || 0) + 1;
            } else if (status === 'Pending') {
                counts.Pending = (counts.Pending || 0) + 1;
            } else if (status === 'Processing') {
                counts.Processing = (counts.Processing || 0) + 1;
            } else if (status === 'Done') {
                counts.Done = (counts.Done || 0) + 1;
            } else if (status === 'Cancelled') {
                counts.Cancelled = (counts.Cancelled || 0) + 1;
            }
        });

        counts.total = feedbacks.length;
        return counts;
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Always get full data from backend - all filtering, pagination, counting will be done in frontend
            const allFeedbacks = await feedbackService.getAllFeedbacks();
            setAllFeedbacksList(allFeedbacks);
            
            // Calculate counts from full data
            const calculatedCounts = calculateStatusCounts(allFeedbacks);
            setStatusCounts(calculatedCounts);
            
            // Set data structure for compatibility (but pagination will be handled in page component)
            const PAGE_SIZE = 10;
            setData({
                content: allFeedbacks,
                totalPages: Math.ceil(allFeedbacks.length / PAGE_SIZE),
                totalElements: allFeedbacks.length,
                size: PAGE_SIZE,
                number: 0
            });
        } catch (err: any) {
            const errorMessage = err?.message || 'Failed to fetch feedbacks. Please try again later.';
            setError(errorMessage);
            console.error('Error fetching feedbacks:', err);
            // Set empty data structure to prevent crashes
            setData({
                content: [],
                totalPages: 0,
                totalElements: 0,
                size: 10,
                number: 0
            });
            setAllFeedbacksList([]);
            setStatusCounts({
                New: 0,
                Pending: 0,
                Processing: 0,
                Done: 0,
                Cancelled: 0,
                total: 0
            });
        } finally {
            setLoading(false);
        }
    }, [calculateStatusCounts]);

    useEffect(() => {
        if (loadOnMount) {
            // Fetch full data once on mount - all filtering will be done in frontend
            fetchData();
        }
    }, [fetchData, loadOnMount]);

    const handleFilterChange = (name: keyof RequestFilters, value: string) => {
        setFilters(prevFilters => ({
            ...prevFilters,
            [name]: value,
        }));
    };

    // No need to refetch when filters change - all filtering is done in frontend
    const handleSearch = () => {
        setPageNo(0);
    };

    const handleClear = () => {
        setFilters(initialFilters);
        setPageNo(0);
    };

    const handlePageChange = (newPage: number) => {
        setPageNo(newPage);
    };

    const handleStatusChange = (status: string) => {
        // Update filter state - filtering will be done in page component
        setFilters(prevFilters => ({ ...prevFilters, status: status || '' }));
        setPageNo(0);
    };

    return {
        data,
        loading,
        error,
        filters,
        pageNo,
        totalPages: data?.totalPages ?? 0,
        statusCounts,
        allFeedbacksList, // Export full list for frontend pagination
        handleFilterChange,
        handleStatusChange,
        handleSearch,
        handleClear,
        handlePageChange,
    };
}

