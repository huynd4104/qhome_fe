export interface Request {
    id: string;
    requestCode: string;
    residentId: string;
    residentName: string;
    unitId?: string;
    imagePath: string | null;
    title: string;
    content: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    type?: string;
    category?: string;
    fee?: number;
    repairedDate?: string;
    location?: string;
    contactPhone?: string;
    note?: string;
    preferredDatetime?: string;
    attachments?: string[];
    priority?: string;
}
