import { useState, useEffect, useCallback } from 'react';
import { Project } from '@/src/types/project';
import { getTenant, updateTenant } from '@/src/services/base/tenantService';

export const useProjectDetailPage = (requestId: string | string[] | undefined) => {
    const [projectData, setProjectData] = useState<Project | null>(null);
    
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const fetchData = useCallback(async () => {
        if (!requestId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const project = await getTenant(requestId.toString());
            console.log(project);
            setProjectData(project as unknown as Project);
        } catch (err) {
            setError(err as Error);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [requestId]); 

    useEffect(() => {
        fetchData();
    }, [fetchData]); 

    const editProject = async(projectId: string, data: Project) =>{
        if (!requestId) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await updateTenant(requestId as string, data);
            await fetchData(); 
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    }

    return { 
        projectData,
        editProject, 
        loading, 
        error,
        isSubmitting,
    };
};