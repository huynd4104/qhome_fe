import { Request } from "@/src/types/request";
import axios from "@/src/lib/axios";

export interface GetFeedbacksParams {
  status?: string;
  pageNo?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface StatusCounts {
    New?: number;
    Pending?: number;
    Processing?: number;
    Done?: number; 
    Cancelled?: number;
    total?: number;
    [key: string]: number | undefined;
}

export interface Page<Request> {
  content: Request[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number; 
}

export class FeedbackService {
    private getBaseUrl(): string {
        // Customer interaction service runs on port 8086
        return 'http://localhost:8086';
    }

    private mapFeedbackDtoToRequest(feedback: any): Request {
        return {
            id: feedback.id,
            requestCode: feedback.requestCode || feedback.id,
            residentId: feedback.residentId,
            residentName: feedback.residentName || 'N/A',
            unitId: undefined, // Feedback may not have unitId
            imagePath: feedback.imagePath,
            title: feedback.title,
            content: feedback.content,
            status: feedback.status,
            createdAt: feedback.createdAt ? new Date(feedback.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: feedback.updatedAt ? new Date(feedback.updatedAt).toISOString() : new Date().toISOString(),
            fee: feedback.fee ? Number(feedback.fee) : undefined,
            type: feedback.type,
        };
    }

    async getAllFeedbacks(): Promise<Request[]> {
        const url = `${this.getBaseUrl()}/api/customer-interaction/feedbacks/all`;
        console.log('Get all feedbacks URL:', url);

        try {
            const response = await axios.get(url, {
                withCredentials: true
            });

            const result: any[] = response.data;
            console.log('Fetched all feedbacks:', result);
            return result.map(feedback => this.mapFeedbackDtoToRequest(feedback));

        } catch (error: any) {
            console.error('An error occurred while fetching all feedbacks:', error);
            // Provide more detailed error information
            if (error?.response) {
                const status = error.response.status;
                const message = error.response.data?.message || error.response.data?.error || `Server error (${status})`;
                console.error(`Backend error ${status}:`, message);
                throw new Error(`Failed to fetch feedbacks: ${message}`);
            } else if (error?.request) {
                console.error('Network error: No response received from server');
                throw new Error('Network error: Unable to connect to server');
            } else {
                throw new Error(`Failed to fetch feedbacks: ${error?.message || 'Unknown error'}`);
            }
        }
    }

    async getFeedbackList(params: GetFeedbacksParams = {}): Promise<Page<Request>> {
        const query = new URLSearchParams();

        if (params.status) {
            query.append('status', params.status);
        }
        if (params.pageNo !== undefined) {
            query.append('pageNo', String(params.pageNo));
        }
        if (params.dateFrom) {
            query.append('dateFrom', params.dateFrom);
        }
        if (params.dateTo) {
            query.append('dateTo', params.dateTo);
        }

        const queryString = query.toString();
        console.log('Feedback params:', params);
        console.log('Feedback query string:', queryString);
        
        const url = `${this.getBaseUrl()}/api/customer-interaction/feedbacks${queryString ? `?${queryString}` : ''}`;
        console.log('Full URL:', url);

        try {
            const response = await axios.get(url, {
                withCredentials: true
            });

            const result: any = response.data;
            console.log('Fetched feedbacks:', result);
            
            return {
                content: result.content.map((feedback: any) => this.mapFeedbackDtoToRequest(feedback)),
                totalPages: result.totalPages,
                totalElements: result.totalElements,
                size: result.size,
                number: result.number
            };

        } catch (error) {
            console.error('An error occurred while fetching feedbacks:', error);
            throw error;
        }
    }

    async getFeedbackCounts(params: GetFeedbacksParams = {}): Promise<StatusCounts> {
        const query = new URLSearchParams();

        if (params.dateFrom) {
            query.append('dateFrom', params.dateFrom);
        }
        if (params.dateTo) {
            query.append('dateTo', params.dateTo);
        }

        const queryString = query.toString();
        console.log('Feedback counts params:', params);
        console.log('Feedback counts query string:', queryString);
        
        const url = `${this.getBaseUrl()}/api/customer-interaction/feedbacks/counts${queryString ? `?${queryString}` : ''}`;
        console.log('Feedback counts URL:', url);

        try {
            const response = await axios.get(url, {
                withCredentials: true
            });
            
            const result: StatusCounts = response.data;
            return result;

        } catch (error) {
            console.error('An error occurred while fetching feedback counts:', error);
            throw error;
        }
    }

    async getFeedbackDetails(feedbackId: string): Promise<Request> {
        const url = `${this.getBaseUrl()}/api/customer-interaction/feedbacks/${feedbackId}`;
        console.log('Get feedback details URL:', url);

        try {
            const response = await axios.get(url, {
                withCredentials: true
            });

            const result: any = response.data;
            console.log('Fetched feedback details:', result);
            return this.mapFeedbackDtoToRequest(result);

        } catch (error) {
            console.error('An error occurred while fetching feedback details:', error);
            throw error;
        }
    }

    async updateStatus(feedbackId: string, status: string): Promise<Request> {
        const url = `${this.getBaseUrl()}/api/customer-interaction/feedbacks/${feedbackId}/status`;

        try {
            const response = await axios.put(url, { status }, {
                withCredentials: true
            });

            const result: any = response.data;
            console.log('Updated feedback status:', result);
            return this.mapFeedbackDtoToRequest(result);

        } catch (error) {
            console.error('An error occurred while updating feedback status:', error);
            throw error;
        }
    }

    async replyFeedback(feedbackId: string, note: string): Promise<Request> {
        const url = `${this.getBaseUrl()}/api/customer-interaction/feedbacks/${feedbackId}/reply`;

        try {
            const response = await axios.post(url, { note }, {
                withCredentials: true
            });

            const result: any = response.data;
            console.log('Replied to feedback:', result);
            return this.mapFeedbackDtoToRequest(result);

        } catch (error) {
            console.error('An error occurred while replying to feedback:', error);
            throw error;
        }
    }
}

