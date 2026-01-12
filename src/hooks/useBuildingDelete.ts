import { useState, useCallback } from "react";
import { deleteBuilding } from "@/src/services/base/buildingService";

export const useDeleteBuilding = () => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    const deleteBuildingById = useCallback(async (buildingId: string) => {
        if (!buildingId) {
            console.warn("No building ID provided to deleteBuilding function.");
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            console.log("buildingId", buildingId);
            await deleteBuilding(buildingId);
            setIsLoading(false);
            return true; 
        } catch (err) {
            setError(err as Error);
            setIsLoading(false);
            console.error("Lỗi khi xoá building:", err);
            return false;
        }
    }, []); 

    return {
        deleteBuildingById, 
        isLoading,     
        error          
    };
};

