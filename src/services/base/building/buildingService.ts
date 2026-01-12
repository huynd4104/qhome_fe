import { filters } from "@/src/components/base-service/FilterForm";
import { Building } from "@/src/types/building";
import { da } from "zod/locales";
export interface BulkUpdateResponse {
  success: boolean;
  message: string;
  updatedCount?: number;
}

export interface PagedResponse<T> {
    content: T[];
    pageable: {
        pageNumber: number;
        pageSize: number;
    };
    totalElements: number;
}

const TOKEN_REQUEST_BODY = {
    "username": "qhomebase_user_fresh",
    "uid": "550e8400-e29b-41d4-a716-446655440008",
    "tenantId": "550e8400-e29b-41d4-a716-446655440007",
    "roles": ["tenant_manager", "tenant_owner"],
    "permissions": ["base.tenant.create", "base.tenant.read", "base.tenant.update", "base.tenant.delete", "base.tenant.delete.request", "base.tenant.delete.approve"]
};

export class BuildingService {
    async getBuildingsByProjectId(projectId?: string): Promise<Building[]> {
        let url = `${process.env.NEXT_PUBLIC_BASE_PROJECT_APT_URL}buildings?tenantId=`;
        
        try {
            const tokenResponse = await fetch('http://localhost:8088/api/test/generate-token', {
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json', 
                },
                body: JSON.stringify(TOKEN_REQUEST_BODY), 
            });            
            if (!tokenResponse.ok) {
                throw new Error(`Failed to fetch token! status: ${tokenResponse.status}`);
            }
            const tokenData = await tokenResponse.json(); 
            const token = tokenData.token; 

            const headers = {
                "User-Agent": "PostmanRuntime/7.49.0",
                "Accept": "*/*",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
                "Authorization": `Bearer ${token}`, 
            };

            const response = await fetch(url + projectId, {
                method: 'GET', 
                headers: headers, 
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Building', data);
            if (Array.isArray(data)) {
                return data as Building[];
            } else {
                return [];
            }

        } catch (error) {
            console.error('An error occurred while fetching requests:', error);
            throw error;
        }
    }

    async getBuildingDetails(buildingId? : string) : Promise<Building> {
            
        const url = `${process.env.NEXT_PUBLIC_BASE_PROJECT_APT_URL}buildings/${buildingId}`;

        try {
            const tokenResponse = await fetch('http://localhost:8088/api/test/generate-token', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify(TOKEN_REQUEST_BODY), 
        });            
        if (!tokenResponse.ok) {
            throw new Error(`Failed to fetch token! status: ${tokenResponse.status}`);
        }
        const tokenData = await tokenResponse.json(); 
        const token = tokenData.token; 

        const headers = {
            "User-Agent": "PostmanRuntime/7.49.0",
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Authorization": `Bearer ${token}`, 
        };

        const response = await fetch(url, {
            method: 'GET', 
            headers: headers, 
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;

        } catch (error) {
            console.error('An error occurred while fetching requests:', error);
            throw error;
        }
    }

    async editBuilding(buildingId: string, data: Building) {
        const url = `${process.env.NEXT_PUBLIC_BASE_PROJECT_APT_URL}buildings//${buildingId}`;
        try {
            const tokenResponse = await fetch('http://localhost:8088/api/test/generate-token', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify(TOKEN_REQUEST_BODY), 
        });            
        if (!tokenResponse.ok) {
            throw new Error(`Failed to fetch token! status: ${tokenResponse.status}`);
        }
        const tokenData = await tokenResponse.json(); 
        const token = tokenData.token; 

        const headers = {
            'Content-Type': 'application/json', 
            "Authorization": `Bearer ${token}`,
            "Accept": "*/*",
        };

        const response = await fetch(url, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(data) 
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Error body:", errorBody);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData;

        } catch (error) {
            console.error('An error occurred while fetching requests:', error);
            throw error;
        } 
    }

    async addProject(data: Building) {
        const url = `${process.env.NEXT_PUBLIC_BASE_PROJECT_APT_URL}building`;
        try {
            const tokenResponse = await fetch('http://localhost:8088/api/test/generate-token', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify(TOKEN_REQUEST_BODY), 
        });            
        if (!tokenResponse.ok) {
            throw new Error(`Failed to fetch token! status: ${tokenResponse.status}`);
        }
        const tokenData = await tokenResponse.json(); 
        const token = tokenData.token; 

        const headers = {
            "User-Agent": "PostmanRuntime/7.49.0",
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            'Content-Type': 'application/json', 
            "Authorization": `Bearer ${token}`,
        };

        console.log(" JSON.stringify(data)",token, JSON.stringify(data))
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data) 
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Error body:", errorBody);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData;

        } catch (error) {
            console.error('An error occurred while fetching requests:', error);
            throw error;
        } 
    }

    async deleteProject(buildingId: string) {
        const url = `${process.env.NEXT_PUBLIC_BASE_PROJECT_APT_URL}delete-buildings/${buildingId}`;

        try {
            const tokenResponse = await fetch('http://localhost:8088/api/test/generate-token', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify(TOKEN_REQUEST_BODY), 
        });            
        if (!tokenResponse.ok) {
            throw new Error(`Failed to fetch token! status: ${tokenResponse.status}`);
        }
        const tokenData = await tokenResponse.json(); 
        const token = tokenData.token; 

        const headers = {
            "User-Agent": "PostmanRuntime/7.49.0",
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Authorization": `Bearer ${token}`, 
        };

        const response = await fetch(url, {
            method: 'DELETE', 
            headers: headers, 
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;

        } catch (error) {
            console.error('An error occurred while fetching requests:', error);
            throw error;
        } 
    }
}
