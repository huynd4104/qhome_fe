'use client'
import React, { useEffect, useState } from 'react';
import Select from '../customer-interaction/Select';
import AddIcon from '@/src/assets/AddIcon.svg'
import Image from 'next/image';
import Delete from '@/src/assets/Delete.svg';
import { useTranslations } from 'next-intl';
import { Project } from '@/src/types/project';
import { useAuth } from '@/src/contexts/AuthContext';
import { ServiceCategory } from '@/src/types/service';

export interface filters {
    codeName?: string,
    address?: string,
    status?: string,
    projectId?: string,
    categoryId?: string,
    search?: string,
}

interface FilterFormProps {
    filters: filters; 
    page: string;
    onFilterChange: (name: keyof filters, value: string) => void; 
    onAdd: () => void; 
    onClear: () => void;
    onDelete: () => void;
    projectList?: Project[];
    categoryList?: ServiceCategory[];
}

const FilterForm = ({ filters, page, onFilterChange, onAdd, onClear, onDelete, projectList, categoryList }: FilterFormProps) => {
    const t = useTranslations();
    const { user, hasRole } = useAuth();

    const [isProjectLocked, setIsProjectLocked] = useState(false);

    const projectId = user?.tenantId;
    console.log('projectId', projectId);
    
    useEffect(() => {
        if (projectId && projectList && projectList.length > 0) {
            // Tự động set projectId vào filter khi có user.tenantId
            onFilterChange('projectId', projectId);
            setIsProjectLocked(true);
        }
    }, [projectId, projectList]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFilterChange(e.target.name as keyof filters, e.target.value);
    };

    console.log("projectList", projectList);

    const inputClass = "w-full px-4 h-10 border-[1px] border-[#2ad47a] rounded-lg text-[#81A996] focus:outline-none transition duration-150 ease-in-out";

    if(page == "project"){

        return (
            <div className="bg-white rounded-xl w-full">
                <div className="flex flex-col lg:flex-row gap-4">
                    <span className='whitespace-nowrap py-2.5'>
                        {t('Project.fillterBy')}
                    </span>
                    <input
                        type="text"
                        name="codeName"
                        placeholder={t('Project.projectcodename')}
                        value={filters.codeName || ''}
                        className={inputClass}
                        onChange={handleInputChange}
                    />    
                    <Select
                        options={[{ name: t('Project.active'), value: 'ACTIVE' }, { name: t('Project.inactive'), value: 'INACTIVE' }]}
                        value={filters.status}
                        onSelect={(item) => onFilterChange('status', item.value)}
                        renderItem={(item) => item.name}
                        getValue={(item) => item.value}
                        placeholder={t('Project.status')}
                    />
                    <input
                        type="text"
                        name="address"
                        placeholder={t('Project.address')}
                        value={filters.address || ''}
                        className={inputClass}
                        onChange={handleInputChange}
                    />

                    <button
                        type="button"
                        onClick={onClear}
                        className="flex items-center justify-center px-6 py-2.5 bg-white text-[#02542D] font-semibold border border-gray-300 rounded-lg shadow-sm hover:bg-[#d9dadb]"
                    >
                        {t('Project.clear')}
                    </button>

                    <button
                        type="button"
                        onClick={onAdd}
                        className="flex items-center justify-center px-6 py-2.5 bg-[#14AE5C] text-white font-semibold border border-gray-300 rounded-lg shadow-sm hover:bg-[#0c793f] whitespace-nowrap gap-2"
                    >
                        <Image
                            src={AddIcon}
                            alt="AddIcon"
                            width={16}
                            height={16}
                        />
                        {t('Project.addProject')}
                    </button>
                    <button 
                        type="button"
                        className="flex items-center justify-center px-6 py-2.5 bg-red-700 text-white font-semibold border border-gray-300 rounded-lg shadow-sm hover:bg-red-900 whitespace-nowrap gap-2"
                        onClick={onDelete}
                    >
                        <Image 
                            src={Delete} 
                            alt="Delete" 
                            width={16} 
                            height={16}
                        />
                        {t('Project.deleteProject')}
                    </button>
                </div>
            </div>
        );
    }

    if(page == "building"){

        return (
            <div className="bg-white rounded-xl w-full">
                <div className="flex flex-col lg:flex-row gap-4">
                    <span className='whitespace-nowrap py-2.5'>
                        {t('Building.fillterBy')}
                    </span>
                    <input
                        type="text"
                        name="codeName"
                        placeholder={t('Building.buildingcodename')}
                        value={filters.codeName || ''}
                        className={inputClass}
                        onChange={handleInputChange}
                    />    
                    <Select
                        options={[{ name: t('Building.active'), value: 'ACTIVE' }, { name: t('Building.inactive'), value: 'INACTIVE' }]}
                        value={filters.status}
                        onSelect={(item) => onFilterChange('status', item.value)}
                        renderItem={(item) => item.name}
                        getValue={(item) => item.value}
                        placeholder={t('Building.status')}
                    />

                    <button
                        type="button"
                        onClick={onClear}
                        className="flex items-center justify-center px-6 py-2.5 bg-white text-[#02542D] font-semibold border border-gray-300 rounded-lg shadow-sm hover:bg-[#d9dadb]"
                    >
                        {t('Building.clear')}
                    </button>

                    <button
                        type="button"
                        onClick={onAdd}
                        className="flex items-center justify-center px-6 py-2.5 bg-[#14AE5C] text-white font-semibold border border-gray-300 rounded-lg shadow-sm hover:bg-[#0c793f] whitespace-nowrap gap-2"
                    >
                        <Image
                            src={AddIcon}
                            alt="AddIcon"
                            width={16}
                            height={16}
                        />
                        {t('Building.addBuilding')}
                    </button>
                    
                </div>
            </div>
        );
    }

    if(page == "service"){

        const categoryOptions = [
            { name: t('Service.categoryAll'), value: '' },
            ...(categoryList ?? []).map((category) => ({
                name: category.name ?? '',
                value: category.id ?? '',
            })),
        ];

        const statusOptions = [
            { name: t('Service.statusAll'), value: 'ALL' },
            { name: t('Service.active'), value: 'ACTIVE' },
            { name: t('Service.inactive'), value: 'INACTIVE' },
        ];

        return (
            <div className="bg-white rounded-xl w-full">
                <div className="flex flex-col lg:flex-row gap-4">
                    <span className='whitespace-nowrap py-2.5'>
                        {t('Service.filterBy')}
                    </span>
                    <input
                        type="text"
                        name="search"
                        placeholder={t('Service.searchPlaceholder')}
                        value={filters.search || ''}
                        className={inputClass}
                        onChange={handleInputChange}
                    />
                    {categoryOptions.length > 1 && (
                        <Select
                            options={categoryOptions}
                            value={filters.categoryId ?? ''}
                            onSelect={(item) => onFilterChange('categoryId', item.value)}
                            renderItem={(item) => item.name}
                            getValue={(item) => item.value}
                            placeholder={t('Service.category')}
                        />
                    )}
                    <Select
                        options={statusOptions}
                        value={filters.status ?? 'ALL'}
                        onSelect={(item) => onFilterChange('status', item.value)}
                        renderItem={(item) => item.name}
                        getValue={(item) => item.value}
                        placeholder={t('Service.status')}
                    />
                    <button
                        type="button"
                        onClick={onClear}
                        className="flex items-center justify-center px-6 py-2.5 bg-white text-[#02542D] font-semibold border border-gray-300 rounded-lg shadow-sm hover:bg-[#d9dadb]"
                    >
                        {t('Service.clear')}
                    </button>

                    <button
                        type="button"
                        onClick={onAdd}
                        className="flex items-center justify-center px-6 py-2.5 bg-[#14AE5C] text-white font-semibold border border-gray-300 rounded-lg shadow-sm hover:bg-[#0c793f] whitespace-nowrap gap-2"
                    >
                        <Image
                            src={AddIcon}
                            alt="AddIcon"
                            width={16}
                            height={16}
                        />
                        {t('Service.addService')}
                    </button>
                </div>
            </div>
        );
    }
};

export default FilterForm;
