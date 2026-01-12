import { useCallback, useEffect, useMemo, useState } from 'react';
import { PagedResponse } from '@/src/services/base/project/projectService';
import { Project } from '../types/project';
import { filters } from '@/src/components/base-service/FilterForm';
import { getAllTenants } from '@/src/services/base/tenantService';

const initialFilters: filters = {
    codeName: '',
    status: '',
    address: ''
};

const initialPageSize = 10;

export const useProjectPage = (loadOnMount: boolean = true) => {
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState<filters>(initialFilters);
    const [pageNo, setPageNo] = useState<number>(0);
    const [pageSize, setPageSize] = useState<number>(initialPageSize);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const listProject = await getAllTenants();
            console.log(listProject);
            setAllProjects(listProject as unknown as Project[]);
        } catch (err) {
            setError('Failed to fetch requests.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []); 

    useEffect(() => {
        if (loadOnMount) {
            fetchData(); 
        }
    }, [loadOnMount, fetchData]);

    const filteredProjects = useMemo(() => {
        if (!allProjects || allProjects.length === 0) {
            return [];
        }

        return allProjects.filter(project => {

            const codeNameMatch = filters.codeName 
                ? project?.name?.toLowerCase().includes(filters.codeName.toLowerCase()) || project?.code?.toLowerCase().includes(filters.codeName.toLowerCase())
                : true;
            
            const statusMatch = filters.status 
                ? project.status === filters.status 
                : true;
            
            const addressMatch = filters.address
                ? project?.address?.toLowerCase().includes(filters.address.toLowerCase())
                : true;

            return codeNameMatch && statusMatch && addressMatch;
        });
    }, [allProjects, filters]);

    const data: PagedResponse<Project> = useMemo(() => {
        const totalElements = filteredProjects.length;
        const startIndex = pageNo * pageSize;
        const endIndex = startIndex + pageSize;
        
        const content = filteredProjects.slice(startIndex, endIndex);

        return {
            content: content,
            pageable: { pageNumber: pageNo, pageSize: pageSize },
            totalElements: totalElements,
        };
    }, [filteredProjects, pageNo, pageSize]);

    const handleFilterChange = (name: keyof filters, value: string) => {
        setFilters(prevFilters => ({
            ...prevFilters,
            [name]: value,
        }));
    };

    const handleClear = () => {
        setFilters(initialFilters);
        setPageNo(0);
    };

    const handlePageChange = (newPage: number) => {
        setPageNo(newPage);
    };

    const handleStatusChange = (status: string) => {
        setFilters(prev => ({ ...prev, status: status }));
        setPageNo(0);
    };

    const totalPages = pageSize > 0 
        ? Math.ceil(data.totalElements / pageSize) 
        : 0;

    return {
        data,
        loading,
        error,
        filters,
        pageNo,
        totalPages: totalPages, 
        pageSize,
        setPageSize,       
        handleFilterChange,
        handleClear,
        handlePageChange,
        handleStatusChange
    }
}
