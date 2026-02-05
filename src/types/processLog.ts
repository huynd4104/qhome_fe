export interface ProcessLog{
    id: number;
    recordId: number;
    content: string;
    requestStatus: string;
    staffInChargeName: string;
    staffInChargeEmail?: string;
    createdAt: string;
}
