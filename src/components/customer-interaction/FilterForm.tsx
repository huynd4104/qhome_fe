'use client'
import React from 'react';
import Select from './Select';
import DateBox from './DateBox';
import { useTranslations } from 'next-intl';

export interface RequestFilters {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}

interface FilterFormProps {
    filters: RequestFilters;
    onFilterChange: (name: keyof RequestFilters, value: string) => void;
    onClear: () => void;
}

const FilterForm = ({ filters, onFilterChange, onClear }: FilterFormProps) => {
    const t = useTranslations('customer-interaction.Request');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
    };

    const labelClass = 'text-gray-600 font-medium';

    return (
        <div className="bg-white p-6 rounded-xl w-full">
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={labelClass}>{t('filterBy')}</span>
                        <input
                            type="text"
                            value={filters.search || ''}
                            onChange={(e) => onFilterChange('search', e.target.value)}
                            placeholder={t('searchByTitleOrCode')}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                        />
                    </div>
                    <div className="flex-[1.5] min-w-0">
                        <div className="flex items-center gap-2 h-full">
                            <span className={labelClass}>From:</span>
                            <DateBox
                                value={filters.dateFrom || ''}
                                onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                            />
                            <span className={`${labelClass} pl-2`}>To:</span>
                            <DateBox
                                value={filters.dateTo || ''}
                                onChange={(e) => onFilterChange('dateTo', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClear}
                            className="flex items-center justify-center px-6 py-2.5 bg-white text-gray-700 font-semibold border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
                        >
                            {t('clear')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default FilterForm;
