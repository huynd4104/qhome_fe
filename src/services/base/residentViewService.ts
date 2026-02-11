import axios from "@/src/lib/axios";

// Using the same base URL logic as buildingService
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

export interface ResidentViewYearDto {
    year: number;
    totalResidents: number;
    occupiedUnits: number;
}

export interface ResidentViewBuildingDto {
    buildingId: string;
    buildingCode: string;
    buildingName: string;
    totalResidents: number;
    occupiedUnits: number;
}

export interface ResidentViewFloorDto {
    floor: number;
    totalUnits: number;
    occupiedUnits: number;
}

export interface ResidentViewUnitDto {
    unitId: string;
    unitCode: string;
    residentCount: number;
}

export interface ResidentViewResidentDto {
    residentId: string;
    fullName: string;
    phone: string;
    email: string;
    nationalId: string;
    dob: string;
    relation: string;
    role: string;
    isPrimary: boolean;
    status: string;
}

export const getYears = async (): Promise<ResidentViewYearDto[]> => {
    const response = await axios.get(`${BASE_URL}/api/resident-view/years`, { withCredentials: true });
    return response.data;
};

export const getBuildingsByYear = async (year: number): Promise<ResidentViewBuildingDto[]> => {
    const response = await axios.get(`${BASE_URL}/api/resident-view/${year}/buildings`, { withCredentials: true });
    return response.data;
};

export const getFloorsByYearAndBuilding = async (year: number, buildingId: string): Promise<ResidentViewFloorDto[]> => {
    const response = await axios.get(`${BASE_URL}/api/resident-view/${year}/buildings/${buildingId}/floors`, { withCredentials: true });
    return response.data;
};

export const getUnitsByYearBuildingAndFloor = async (year: number, buildingId: string, floor: number): Promise<ResidentViewUnitDto[]> => {
    const response = await axios.get(`${BASE_URL}/api/resident-view/${year}/buildings/${buildingId}/floors/${floor}/units`, { withCredentials: true });
    return response.data;
};

export const getResidentsByUnit = async (year: number, unitId: string): Promise<ResidentViewResidentDto[]> => {
    const response = await axios.get(`${BASE_URL}/api/resident-view/${year}/units/${unitId}/residents`, { withCredentials: true });
    return response.data;
};

export const exportResidents = async (year: number, buildingId?: string, floor?: number) => {
    const response = await axios.get(`${BASE_URL}/api/resident-view/export`, {
        params: { year, buildingId, floor },
        responseType: 'blob',
        withCredentials: true,
    });
    return response.data;
};

export const importResidents = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${BASE_URL}/api/resident-view/import`, formData, {
        withCredentials: true,
        responseType: 'arraybuffer',
        validateStatus: (status) => status === 200 || status === 400,
    });
    return response;
};

export const downloadTemplate = async () => {
    const response = await axios.get(`${BASE_URL}/api/resident-view/template`, {
        responseType: 'blob',
        withCredentials: true,
    });
    return response.data;
};
