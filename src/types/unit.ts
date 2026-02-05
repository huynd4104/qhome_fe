export interface Unit {
    id: string;
    buildingId: string;
    code: string;
    name: string;
    floor: number;
    areaM2?: number;
    bedrooms?: number;
    status?: string;
    ownerName?: string;
    ownerContact?: string;
}
