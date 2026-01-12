import { Request } from "@/src/types/request";
import axios from "@/src/lib/axios";
export interface BulkUpdateResponse {
  success: boolean;
  message: string;
  updatedCount?: number;
}

export interface GetRequestsParams {
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

export class RequestService {
    private getBaseUrl(): string {
        return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';
    }

    private mapMaintenanceRequestToRequest(mr: any): Request {
        // Map MaintenanceRequestDto to Request type
        // For IN_PROGRESS status, use progressNotes if available, otherwise use note
        const displayNote = (mr.status === 'IN_PROGRESS' && mr.progressNotes) 
            ? mr.progressNotes 
            : mr.note;
        
        return {
            id: mr.id,
            requestCode: mr.id, // Use id as requestCode if no code field
            residentId: mr.residentId,
            residentName: mr.contactName || 'N/A',
            unitId: mr.unitId,
            imagePath: mr.attachments && mr.attachments.length > 0 ? mr.attachments[0] : null,
            title: mr.title,
            content: mr.description || '',
            status: this.mapStatus(mr.status),
            createdAt: mr.createdAt ? new Date(mr.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: mr.updatedAt ? new Date(mr.updatedAt).toISOString() : new Date().toISOString(),
            fee: mr.estimatedCost ? Number(mr.estimatedCost) : undefined,
            category: mr.category,
            type: mr.category, // Map category to type for compatibility
            location: mr.location,
            contactPhone: mr.contactPhone,
            note: displayNote,
            preferredDatetime: mr.preferredDatetime ? new Date(mr.preferredDatetime).toISOString() : undefined,
            attachments: mr.attachments || [],
            priority: mr.priority || undefined,
        };
    }

    private mapStatus(status: string): string {
        // Map backend status to frontend status
        const statusMap: Record<string, string> = {
            'NEW': 'New',
            'PENDING': 'Pending',
            'IN_PROGRESS': 'Processing',
            'DONE': 'Done',
            'CANCELLED': 'Cancelled'
        };
        return statusMap[status] || status;
    }

    async getAllRequests(): Promise<Request[]> {
        const url = `${this.getBaseUrl()}/api/maintenance-requests/all`;
        console.log('Get all requests URL:', url);

        try {
            const response = await axios.get(url, {
                withCredentials: true
            });

            const result: any[] = response.data;
            console.log('Fetched all requests:', result);
            return result.map(mr => this.mapMaintenanceRequestToRequest(mr));

        } catch (error) {
            console.error('An error occurred while fetching all requests:', error);
            throw error;
        }
    }

    async getRequestList(params: GetRequestsParams = {}): Promise<Page<Request>> {
        const query = new URLSearchParams();

        // Map status from frontend to backend
        let statusParam = params.status;
        if (statusParam) {
            const statusMap: Record<string, string> = {
                'New': 'PENDING',
                'Pending': 'PENDING',
                'Processing': 'IN_PROGRESS',
                'Done': 'DONE',
                'Cancelled': 'CANCELLED'
            };
            statusParam = statusMap[statusParam] || statusParam;
        }

        // Add parameters to the query string (exclude search as it's frontend only)
        if (statusParam) {
            query.append('status', statusParam);
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
        console.log('Request params:', params);
        console.log('Query string:', queryString);
        
        // Construct the full URL
        const url = `${this.getBaseUrl()}/api/maintenance-requests${queryString ? `?${queryString}` : ''}`;
        console.log('Full URL:', url);

        try {
            const response = await axios.get(url, {
                withCredentials: true
            });

            const result: any = response.data;
            console.log('Fetched requests:', result);
            
            // Map the response
            return {
                content: result.content.map((mr: any) => this.mapMaintenanceRequestToRequest(mr)),
                totalPages: result.totalPages,
                totalElements: result.totalElements,
                size: result.size,
                number: result.number
            };

        } catch (error) {
            console.error('An error occurred while fetching requests:', error);
            throw error;
        }
    }

    async getRequestCounts(params: GetRequestsParams = {}): Promise<StatusCounts> {
        const query = new URLSearchParams();

        // Only include dateFrom and dateTo for counts
        if (params.dateFrom) {
            query.append('dateFrom', params.dateFrom);
        }
        if (params.dateTo) {
            query.append('dateTo', params.dateTo);
        }

        const queryString = query.toString();
        console.log('Counts params:', params);
        console.log('Counts query string:', queryString);
        
        const url = `${this.getBaseUrl()}/api/maintenance-requests/counts${queryString ? `?${queryString}` : ''}`;
        console.log('Counts URL:', url);

        try {
            const response = await axios.get(url, {
                withCredentials: true
            });
            
            const result: StatusCounts = response.data;
            return result;

        } catch (error) {
            console.error('An error occurred while fetching request counts:', error);
            throw error;
        }
    }

    async getRequestDetails(requestId: string): Promise<Request> {
        const url = `${this.getBaseUrl()}/api/maintenance-requests/${requestId}`;
        console.log('Get request details URL:', url);

        try {
            const response = await axios.get(url, {
                withCredentials: true
            });

            const result: any = response.data;
            console.log('Fetched request details:', result);
            return this.mapMaintenanceRequestToRequest(result);

        } catch (error) {
            console.error('An error occurred while fetching request details:', error);
            throw error;
        }
    }

    async respondToRequest(requestId: string, adminResponse: string, estimatedCost: number, note?: string, preferredDatetime?: string): Promise<Request> {
        const url = `${this.getBaseUrl()}/api/maintenance-requests/admin/${requestId}/respond`;
        console.log('Respond to request URL:', url);

        try {
            const payload: any = {
                adminResponse,
                estimatedCost,
                note: note || ''
            };
            
            if (preferredDatetime) {
                payload.preferredDatetime = preferredDatetime;
            }

            console.log('Respond to request payload:', JSON.stringify(payload, null, 2));

            const response = await axios.post(url, payload, {
                withCredentials: true
            });

            const result: any = response.data;
            console.log('Responded to request:', result);
            return this.mapMaintenanceRequestToRequest(result);

        } catch (error) {
            console.error('An error occurred while responding to request:', error);
            throw error;
        }
    }

    async denyRequest(requestId: string, note?: string): Promise<Request> {
        const url = `${this.getBaseUrl()}/api/maintenance-requests/admin/${requestId}/deny`;
        console.log('Deny request URL:', url);

        try {
            const response = await axios.patch(url, {
                note: note || ''
            }, {
                withCredentials: true
            });

            const result: any = response.data;
            console.log('Denied request:', result);
            return this.mapMaintenanceRequestToRequest(result);

        } catch (error) {
            console.error('An error occurred while denying request:', error);
            throw error;
        }
    }

    async updateFee(requestId: string, fee: number): Promise<Request> {
        const url = `${process.env.NEXT_PUBLIC_CUSTOMER_INTERACTION_API_URL}/requests/${requestId}/fee`;

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fee }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: Request = await response.json();
            return result;

        } catch (error) {
            console.error('An error occurred while updating fee:', error);
            throw error;
        }
    }

    async addProgressNote(requestId: string, note: string, cost?: number): Promise<Request> {
        const url = `${this.getBaseUrl()}/api/maintenance-requests/admin/${requestId}/add-progress-note`;
        console.log('Add progress note URL:', url);

        try {
            const payload: any = {
                note: note || ''
            };
            
            if (cost !== undefined && cost !== null) {
                payload.cost = cost;
            }

            const response = await axios.post(url, payload, {
                withCredentials: true
            });

            const result: any = response.data;
            console.log('Added progress note:', result);
            return this.mapMaintenanceRequestToRequest(result);

        } catch (error) {
            console.error('An error occurred while adding progress note:', error);
            throw error;
        }
    }

    async completeRequest(requestId: string, note?: string): Promise<Request> {
        const url = `${this.getBaseUrl()}/api/maintenance-requests/admin/${requestId}/complete`;
        console.log('Complete request URL:', url);

        try {
            const payload = {
                note: note || ''
            };

            const response = await axios.patch(url, payload, {
                withCredentials: true
            });

            const result: any = response.data;
            console.log('Completed request:', result);
            return this.mapMaintenanceRequestToRequest(result);

        } catch (error) {
            console.error('An error occurred while completing request:', error);
            throw error;
        }
    }
}
