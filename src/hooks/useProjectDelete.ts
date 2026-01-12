// import { useState, useCallback } from "react";
// import { deleteTenant } from "@/src/services/base/tenantService";

// export const useDeleteProject = () => {
//     const [isLoading, setIsLoading] = useState<boolean>(false);
//     const [error, setError] = useState<Error | null>(null);

//     const deleteProject = useCallback(async (projectId: string) => {
//         if (!projectId) {
//             console.warn("No project ID provided to deleteProject function.");
//             return;
//         }

//         setIsLoading(true);
//         setError(null);

//         try {
//             await deleteTenant(projectId);

//             setIsLoading(false);
//             return true; 
//         } catch (err) {
//             setError(err as Error);
//             setIsLoading(false);
//             console.error("Lỗi khi xoá project:", err);
//             return false;
//         }
//     }, []); 

//     return {
//         deleteProject, 
//         isLoading,     
//         error          
//     };
// };