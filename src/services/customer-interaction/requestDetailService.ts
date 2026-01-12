import { Request } from "@/src/types/request";
import { LogUpdateData } from '@/src/components/customer-interaction/RequestLogUpdate';
import { RequestService as MaintenanceRequestService } from './requestService';

export interface BulkUpdateResponse {
  success: boolean;
  message: string;
  updatedCount?: number;
}

export class RequestService {
    private maintenanceRequestService = new MaintenanceRequestService();

    async getRequestDetails(requestId? : string) : Promise<Request> {
        if (!requestId) {
            throw new Error('Request ID is required');
        }
        
        try {
            const request = await this.maintenanceRequestService.getRequestDetails(requestId);
            return request;
        } catch (error) {
            console.error('An error occurred while fetching request details:', error);
            throw error;
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
