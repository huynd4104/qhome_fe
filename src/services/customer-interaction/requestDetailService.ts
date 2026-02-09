import { Request } from "@/src/types/request";
import { LogUpdateData } from '@/src/components/customer-interaction/RequestLogUpdate';
import { ProcessLog } from '@/src/types/processLog';
import { RequestService as MaintenanceRequestService } from './requestService';

export interface BulkUpdateResponse {
    success: boolean;
    message: string;
    updatedCount?: number;
}

export class RequestService {
    private maintenanceRequestService = new MaintenanceRequestService();

    async getRequestDetails(requestId?: string): Promise<{ request: Request, logs: ProcessLog[] }> {
        if (!requestId) {
            throw new Error('Request ID is required');
        }

        try {
            const [request, logs] = await Promise.all([
                this.maintenanceRequestService.getRequestDetails(requestId),
                this.getRequestLogs(requestId)
            ]);

            return { request, logs };
        } catch (error) {
            console.error('An error occurred while fetching request details:', error);
            throw error;
        }
    }

    async getRequestLogs(requestId: string): Promise<ProcessLog[]> {
        const url = `${process.env.NEXT_PUBLIC_CUSTOMER_INTERACTION_API_URL}/requests-logs/${requestId}/logs`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) return [];
                throw new Error('Failed to fetch logs');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching logs:', error);
            return [];
        }
    }

    async addRequestLog(requestId: string, data: LogUpdateData): Promise<void> {
        const url = `${process.env.NEXT_PUBLIC_CUSTOMER_INTERACTION_API_URL}/requests-logs/${requestId}/logs`;

        console.log("url", url);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        console.log("requestId", requestId);
        console.log("data", data);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to add log entry.' }));
            throw new Error(errorData.message);
        }

    }

}
