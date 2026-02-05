import React from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import Edit from '@/src/assets/Edit.svg';
import EditTable from '@/src/assets/EditTable.svg';
import Delete from '@/src/assets/Delete.svg';
import { useNotifications } from '@/src/hooks/useNotifications';

interface TableItemProps {
    projectId?: string;
    projectCode?: string;
    projectName?: string;
    address?: string;
    contact?: string;
    email?: string,
    status?: string;
    createBy?: string,
    createdAt?: string;
    buildingId?: string;
    buildingCode?: string;
    buildingName?: string;
    floors?: number;
    categoryId?: string;
    categoryCode?: string;
    sortOrder?: number | null;
    disableDelete?: boolean;
    serviceId?: string;
    serviceCode?: string;
    serviceName?: string;
    categoryName?: string;
    pricingType?: string;
    bookingType?: string;
    isActive?: boolean;
    // News fields
    newsId?: string;
    title?: string;
    summary?: string;
    publishAt?: string;
    expireAt?: string;
    // Notification fields
    notificationId?: string;
    message?: string;
    type?: string;
    scope?: string;
    target?: string;
    // Account fields
    userId?: string;
    username?: string;
    roles?: string;
    active?: boolean;
    accountId?: string;
    accountType?: 'staff' | 'resident';
}

interface TableProps {
    data: TableItemProps[];
    headers?: string[];
    type: string;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    onStatusChange?: (id: string, accountType: 'staff' | 'resident') => void;
    onBuildingStatusChange?: (buildingId: string) => void;
    onServiceCategoryStatusChange?: (categoryId: string) => void;
    onNewsChangeStatusAndTarget?: (newsId: string) => void;
    onNotificationChangeScope?: (notificationId: string) => void;
}

const Table = ({ data, headers, type, onEdit, onDelete, onStatusChange, onBuildingStatusChange, onServiceCategoryStatusChange, onNewsChangeStatusAndTarget, onNotificationChangeScope }: TableProps) => {
    const t = useTranslations('Table');
    const tProject = useTranslations('Project');
    const tBuilding = useTranslations('Building');
    const tService = useTranslations('Service');
    const tServiceCategory = useTranslations('ServiceCategory');
    const { show } = useNotifications();

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN');
        } catch {
            return '-';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'DRAFT':
                return t('status.draft');
            case 'PUBLISHED':
                return t('status.published');
            case 'ARCHIVED':
                return t('status.archived');
            default:
                return status;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT':
                return 'text-gray-600 bg-gray-100';
            case 'PUBLISHED':
                return 'text-green-700 bg-green-100';
            case 'ARCHIVED':
                return 'text-orange-700 bg-orange-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const getTypeLabel = (type: string) => {
        const typeMap: { [key: string]: string } = {
            'INFO': t('type.info'),
            'WARNING': t('type.warning'),
            'ALERT': t('type.alert'),
            'SUCCESS': t('type.success'),
            'ANNOUNCEMENT': t('type.announcement'),
        };
        return typeMap[type] || type;
    };

    const getTypeColor = (type: string) => {
        const colorMap: { [key: string]: string } = {
            'INFO': 'text-blue-700 bg-blue-100',
            'WARNING': 'text-yellow-700 bg-yellow-100',
            'ALERT': 'text-red-700 bg-red-100',
            'SUCCESS': 'text-green-700 bg-green-100',
            'ANNOUNCEMENT': 'text-purple-700 bg-purple-100',
        };
        return colorMap[type] || 'text-gray-600 bg-gray-100';
    };

    const getScopeLabel = (scope: string) => {
        return scope === 'INTERNAL' ? t('scope.internal') : t('scope.external');
    };

    const getRoleBadge = (role: string) => {
        const normalized = role.trim().toUpperCase();
        switch (normalized) {
            case 'ADMIN':
                return { label: t('roles.admin'), className: 'bg-red-100 text-red-700' };
            case 'ACCOUNTANT':
                return { label: t('roles.accountant'), className: 'bg-blue-100 text-blue-700' };
            case 'TECHNICIAN':
                return { label: t('roles.technician'), className: 'bg-orange-100 text-orange-700' };
            case 'SUPPORTER':
                return { label: t('roles.supporter'), className: 'bg-purple-100 text-purple-700' };
            case 'RESIDENT':
                return { label: t('roles.resident'), className: 'bg-gray-100 text-gray-700' };
            case 'UNIT_OWNER':
                return { label: t('roles.unitOwner'), className: 'bg-teal-100 text-teal-700' };
            default:
                return { label: role, className: 'bg-slate-100 text-slate-700' };
        }
    };

    return (
        <div className="overflow-x-auto bg-white mt-6 border-t-4 bolder-solid border-[#14AE5C] h-[600px] overflow-y-auto">
            <table className="w-full rounded-xl">
                
                <thead>
                    <tr className="border-b-2 border-solid border-[#14AE5C] ">
                        {headers?.map((header, index) => (
                            <th
                                key={index}
                                className={`px-4 py-3 text-[14px] font-bold text-[#024023] uppercase tracking-wider text-center whitespace-nowrap`}
                                style={{ width: header === tProject('projectCode') || header === tProject('createAt') || header === tProject('createBy') || header === tProject('status') || header === tProject('action') 
                                    || header === tBuilding('buildingCode') || header === tBuilding('createAt') || header === tBuilding('createBy') || header === tBuilding('status') || header === tBuilding('action') || header === tBuilding('floors') ? '5%' : 'auto' }}
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={headers?.length ?? 1}
                                className="px-4 py-6 text-center text-sm text-gray-500"
                            >
                                {t('noData')}
                            </td>
                        </tr>
                    ) : (
                        data.map((item, index) => {
                            const rowClass = 'hover:bg-gray-50';
                            const borderClass = index < data.length - 1
                                ? 'border-b border-solid border-[#CDCDCD]'
                                : 'border-b-0';
                            
                            if(type === "building"){
                                return (
                                    <tr 
                                        key={item.buildingId} 
                                        className={`${rowClass} ${borderClass} cursor-pointer`}
                                    >
        
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[#024023] font-semibold text-center">
                                                {item.buildingCode}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-center text-[#024023] font-semibold truncate">{item.buildingName}</td>
                                        {/* <td className="px-4 py-3 whitespace-nowrap text-[14px] text-center font-semibold">
                                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                                (item.status || '').toUpperCase() === 'ACTIVE'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : 'bg-gray-50 text-gray-700 border border-gray-200'
                                            }`}>
                                                {(item.status || '').toUpperCase() === 'ACTIVE' ? tBuilding('active') : tBuilding('inactive')}
                                            </span>
                                        </td> */}
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-center font-semibold text-[#024023]">{item.createdAt}</td>
        
                                        <td className={`px-4 py-3 whitespace-nowrap text-center font-semibold text-[#024023]`}>{item.createBy}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] font-semibold text-[#024023] text-center">
                                            <div className="flex space-x-2 justify-center">
                                                <Link 
                                                    href={`/base/building/buildingDetail/${item.buildingId}`}
                                                    className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-blue-500 hover:bg-blue-600 transition"
                                                    title={t('actions.viewDetail')}
                                                >
                                                    <Image 
                                                        src={Edit} 
                                                        alt={t('actions.viewDetail')} 
                                                        width={24} 
                                                        height={24}
                                                    />
                                                </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => onBuildingStatusChange && onBuildingStatusChange(item.buildingId as string)}
                                                        className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-red-500 border border-gray-300 hover:bg-red-600 transition"
                                                        title={t('actions.changeStatus')}
                                                    >
                                                        {/* <svg 
                                                            xmlns="http://www.w3.org/2000/svg" 
                                                            viewBox="0 0 16 16" 
                                                            height="16" 
                                                            width="16"
                                                            fill="currentColor"
                                                        >
                                                            <g fill="none" fillRule="nonzero">
                                                                <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
                                                                <path fill="currentColor" d="M13.333333333333332 9.333333333333332a1 1 0 0 1 0.09599999999999999 1.9953333333333332L13.333333333333332 11.333333333333332H5.080666666666667l0.96 0.96a1 1 0 0 1 -1.3386666666666667 1.4826666666666668l-0.076 -0.06866666666666665 -2.5526666666666666 -2.5533333333333332c-0.6493333333333333 -0.6493333333333333 -0.22666666666666668 -1.7446666666666666 0.6606666666666666 -1.8166666666666667l0.09333333333333334 -0.004H13.333333333333332ZM9.959999999999999 2.293333333333333a1 1 0 0 1 1.338 -0.06933333333333333l0.076 0.06866666666666665 2.5526666666666666 2.5533333333333332c0.6493333333333333 0.6493333333333333 0.22666666666666668 1.7446666666666666 -0.6606666666666666 1.8166666666666667l-0.09333333333333334 0.004H2.6666666666666665a1 1 0 0 1 -0.09599999999999999 -1.9953333333333332L2.6666666666666665 4.666666666666666h8.252666666666666l-0.96 -0.96a1 1 0 0 1 0 -1.4133333333333333Z" strokeWidth="0.6667"></path>
                                                            </g>
                                                        </svg> */}
                                                        <Image 
                                                            src={Delete} 
                                                            alt={t('actions.viewDetail')} 
                                                            width={24} 
                                                            height={24}
                                                        />
                                                    </button>
                                                {/* )} */}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }
                            if(type === "service"){
                                return (
                                    <tr
                                        key={item.serviceId}
                                        className={`${rowClass} ${borderClass} cursor-pointer`}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-center text-[#024023] font-semibold">
                                            {item.serviceCode}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[#024023] font-semibold text-center truncate">
                                            {item.serviceName}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-center text-[#024023] font-semibold">
                                            {item.categoryName || '-'}
                                        </td>
                                        {/* <td className="px-4 py-3 whitespace-nowrap text-center">
                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                            <span
                                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                                    item.isActive
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-gray-200 text-gray-600'
                                                }`}
                                            >
                                                {item.isActive ? tService('active') : tService('inactive')}
                                            </span>
                                        </td> */}
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-center text-[#024023] font-semibold">
                                            {item.createdAt || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] font-semibold text-[#024023] text-center">
                                            <div className="flex space-x-2 justify-center">
                                                <Link
                                                    href={`/base/serviceDetail/${item.serviceId}`}
                                                    className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-blue-500 hover:bg-blue-600 transition"
                                                    title={t('actions.viewDetail')}
                                                >
                                                    <Image
                                                        src={Edit}
                                                        alt={t('actions.viewDetail')}
                                                        width={24}
                                                        height={24}
                                                    />
                                                </Link>
                                                <button
                                                    onClick={() => item.serviceId && onDelete && onDelete(item.serviceId)}
                                                    className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-red-500 hover:bg-red-600 transition"
                                                >
                                                    <Image
                                                        src={Delete}
                                                        alt={t('actions.delete')}
                                                        width={24}
                                                        height={24}
                                                    />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }
                            if(type === "service-category"){
                                const isDeleteDisabled = item.disableDelete ?? false;
                                return (
                                    <tr
                                        key={item.categoryId}
                                        className={`${rowClass} ${borderClass} cursor-pointer`}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-center text-[#024023] font-semibold">
                                            {item.categoryCode}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[#024023] font-semibold text-center truncate">
                                            {item.categoryName}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                            <span
                                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                                    item.isActive
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-gray-200 text-gray-600'
                                                }`}
                                            >
                                                {item.isActive ? tServiceCategory('active') : tServiceCategory('inactive')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-center text-[#024023] font-semibold">
                                            {item.createdAt || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] font-semibold text-[#024023] text-center">
                                            <div className="flex space-x-2 justify-center">
                                                {onServiceCategoryStatusChange && (
                                                    <button
                                                        type="button"
                                                        onClick={() => item.categoryId && onServiceCategoryStatusChange(item.categoryId)}
                                                        className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-white border border-gray-300 hover:bg-gray-100 transition"
                                                        title={t('actions.changeStatus')}
                                                    >
                                                        <svg 
                                                            xmlns="http://www.w3.org/2000/svg" 
                                                            viewBox="0 0 16 16" 
                                                            height="16" 
                                                            width="16"
                                                            fill="currentColor"
                                                        >
                                                            <g fill="none" fillRule="nonzero">
                                                                <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
                                                                <path fill="currentColor" d="M13.333333333333332 9.333333333333332a1 1 0 0 1 0.09599999999999999 1.9953333333333332L13.333333333333332 11.333333333333332H5.080666666666667l0.96 0.96a1 1 0 0 1 -1.3386666666666667 1.4826666666666668l-0.076 -0.06866666666666665 -2.5526666666666666 -2.5533333333333332c-0.6493333333333333 -0.6493333333333333 -0.22666666666666668 -1.7446666666666666 0.6606666666666666 -1.8166666666666667l0.09333333333333334 -0.004H13.333333333333332ZM9.959999999999999 2.293333333333333a1 1 0 0 1 1.338 -0.06933333333333333l0.076 0.06866666666666665 2.5526666666666666 2.5533333333333332c0.6493333333333333 0.6493333333333333 0.22666666666666668 1.7446666666666666 -0.6606666666666666 1.8166666666666667l-0.09333333333333334 0.004H2.6666666666666665a1 1 0 0 1 -0.09599999999999999 -1.9953333333333332L2.6666666666666665 4.666666666666666h8.252666666666666l-0.96 -0.96a1 1 0 0 1 0 -1.4133333333333333Z" strokeWidth="0.6667"></path>
                                                            </g>
                                                        </svg>
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => item.categoryId && onEdit && onEdit(item.categoryId)}
                                                    className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-[#739559] hover:bg-opacity-80 transition"
                                                >
                                                    <Image
                                                        src={Edit}
                                                        alt={t('actions.edit')}
                                                        width={24}
                                                        height={24}
                                                    />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (isDeleteDisabled) {
                                                            return;
                                                        }
                                                        if (item.categoryId && onDelete) {
                                                            onDelete(item.categoryId);
                                                        }
                                                    }}
                                                    disabled={isDeleteDisabled}
                                                    className={`w-[47px] h-[34px] flex items-center justify-center rounded-md transition ${
                                                        isDeleteDisabled
                                                            ? 'bg-gray-300 cursor-not-allowed opacity-70'
                                                            : 'bg-red-500 hover:bg-red-600'
                                                    }`}
                                                >
                                                    <Image
                                                        src={Delete}
                                                        alt={t('actions.delete')}
                                                        width={24}
                                                        height={24}
                                                    />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }
                            if(type === "account"){
                                const isActive = item.active ?? false;
                                const roleTokens = (item.roles ?? '')
                                    .split(',')
                                    .map(token => token.trim())
                                    .filter(Boolean);
                                const roleTokensUpper = roleTokens.map(r => r.toUpperCase());
                                const isAdmin = roleTokensUpper.includes('ADMIN');
                                const accountType = item.accountType ?? 'staff';
                                const detailHref = accountType === 'resident'
                                    ? `/accountDetailRe/${item.accountId ?? item.userId ?? ''}`
                                    : isAdmin ? `/accountDetailStaff/${item.accountId ?? item.userId ?? ''}` : `/accountEditStaff/${item.accountId ?? item.userId ?? ''}`;
                                return (
                                    <tr
                                        key={item.userId ?? `account-${index}`}
                                        className={`${rowClass} ${borderClass}`}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] font-semibold text-[#024023] text-center">
                                            {item.username ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[#024023] text-center">
                                            {item.email ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[#024023] text-center">
                                            {roleTokens.length === 0 ? (
                                                '—'
                                            ) : (
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {roleTokens.map((roleValue, roleIdx) => {
                                                        const badge = getRoleBadge(roleValue);
                                                        return (
                                                            <span
                                                                key={`${roleValue}-${roleIdx}`}
                                                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
                                                            >
                                                                {badge.label}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] font-semibold text-center">
                                            <span
                                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                                    isActive
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-gray-200 text-gray-600'
                                                }`}
                                            >
                                                {isActive ? t('status.active') : t('status.inactive')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-[14px] font-semibold text-[#024023] text-center">
                                            <div className="flex space-x-2 justify-center">
                                                <Link
                                                    href={detailHref}
                                                    className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-blue-500 hover:bg-blue-600 transition"
                                                >
                                                    <Image
                                                        src={Edit}
                                                        alt={t('actions.viewDetail')}
                                                        width={24}
                                                        height={24}
                                                    />
                                                </Link>
                                                {onStatusChange && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (isAdmin) {
                                                                show(t('errors.cannotChangeAdminStatus'));
                                                                return;
                                                            }
                                                            const targetId = item.accountId ?? item.userId;
                                                            if (!targetId) {
                                                                show(t('errors.cannotIdentifyAccountForStatusChange'));
                                                                return;
                                                            }
                                                            onStatusChange(targetId, accountType);
                                                        }}
                                                        disabled={isAdmin}
                                                        className={`w-[47px] h-[34px] flex items-center justify-center rounded-md border transition ${
                                                            isAdmin
                                                                ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                                                                : 'bg-white border-gray-300 hover:bg-gray-100'
                                                        }`}
                                                        title={isAdmin ? t('errors.cannotChangeAdminStatus') : t('actions.changeStatus')}
                                                    >
                                                        <svg 
                                                            xmlns="http://www.w3.org/2000/svg" 
                                                            viewBox="0 0 16 16" 
                                                            height="16" 
                                                            width="16"
                                                            fill="currentColor"
                                                        >
                                                            <g fill="none" fillRule="nonzero">
                                                                <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
                                                                <path fill="currentColor" d="M13.333333333333332 9.333333333333332a1 1 0 0 1 0.09599999999999999 1.9953333333333332L13.333333333333332 11.333333333333332H5.080666666666667l0.96 0.96a1 1 0 0 1 -1.3386666666666667 1.4826666666666668l-0.076 -0.06866666666666665 -2.5526666666666666 -2.5533333333333332c-0.6493333333333333 -0.6493333333333333 -0.22666666666666668 -1.7446666666666666 0.6606666666666666 -1.8166666666666667l0.09333333333333334 -0.004H13.333333333333332ZM9.959999999999999 2.293333333333333a1 1 0 0 1 1.338 -0.06933333333333333l0.076 0.06866666666666665 2.5526666666666666 2.5533333333333332c0.6493333333333333 0.6493333333333333 0.22666666666666668 1.7446666666666666 -0.6606666666666666 1.8166666666666667l-0.09333333333333334 0.004H2.6666666666666665a1 1 0 0 1 -0.09599999999999999 -1.9953333333333332L2.6666666666666665 4.666666666666666h8.252666666666666l-0.96 -0.96a1 1 0 0 1 0 -1.4133333333333333Z" strokeWidth="0.6667"></path>
                                                            </g>
                                                        </svg>
                                                    </button>
                                                )}
                                                {isAdmin ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (isActive) {
                                                                show(t('errors.cannotDeleteActiveAdmin'));
                                                                return;
                                                            }
                                                            const targetId = item.accountId ?? item.userId;
                                                            if (!targetId) {
                                                                show(t('errors.cannotIdentifyAccountForDelete'));
                                                                return;
                                                            }
                                                            if (onDelete) {
                                                                onDelete(targetId);
                                                            } else {
                                                                show(t('errors.deleteNotConfigured'));
                                                            }
                                                        }}
                                                        disabled={isActive}
                                                        className={`w-[47px] h-[34px] flex items-center justify-center rounded-md transition ${
                                                            !isActive
                                                                ? 'bg-red-500 hover:bg-red-600 cursor-pointer'
                                                                : 'bg-gray-300 cursor-not-allowed opacity-50'
                                                        }`}
                                                        title={!isActive ? t('actions.deleteAccount') : t('errors.cannotDeleteActiveAdmin')}
                                                    >
                                                        <Image
                                                            src={Delete}
                                                            alt={t('actions.delete')}
                                                            width={24}
                                                            height={24}
                                                        />
                                                    </button>
                                                ) : accountType === 'resident' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (isActive) {
                                                                show(t('errors.cannotDeleteActiveResident'));
                                                                return;
                                                            }
                                                            const targetId = item.accountId ?? item.userId;
                                                            if (!targetId) {
                                                                show(t('errors.cannotIdentifyAccountForDelete'));
                                                                return;
                                                            }
                                                            if (onDelete) {
                                                                onDelete(targetId);
                                                            } else {
                                                                show(t('errors.deleteNotConfigured'));
                                                            }
                                                        }}
                                                        disabled={isActive}
                                                        className={`w-[47px] h-[34px] flex items-center justify-center rounded-md transition ${
                                                            !isActive
                                                                ? 'bg-red-500 hover:bg-red-600 cursor-pointer'
                                                                : 'bg-gray-300 cursor-not-allowed opacity-50'
                                                        }`}
                                                        title={!isActive ? t('actions.deleteAccount') : t('errors.cannotDeleteActiveResident')}
                                                    >
                                                        <Image
                                                            src={Delete}
                                                            alt={t('actions.delete')}
                                                            width={24}
                                                            height={24}
                                                        />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const targetId = item.accountId ?? item.userId;
                                                            if (!targetId) {
                                                                show(t('errors.cannotIdentifyAccountForDelete'));
                                                                return;
                                                            }
                                                            if (onDelete) {
                                                                onDelete(targetId);
                                                            } else {
                                                                show(t('errors.deleteNotConfigured'));
                                                            }
                                                        }}
                                                        className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-red-500 hover:bg-red-600 transition cursor-pointer"
                                                        title={t('actions.deleteAccount')}
                                                    >
                                                        <Image
                                                            src={Delete}
                                                            alt={t('actions.delete')}
                                                            width={24}
                                                            height={24}
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }
                            if(type === "news"){
                                return (
                                    <tr 
                                        key={item.newsId} 
                                        className={`${rowClass} ${borderClass} cursor-pointer`}
                                    >
        
                                        <td className="px-4 py-3 text-[14px] text-[#024023] font-semibold text-left max-w-xs truncate">
                                            {item.title}
                                        </td>
                                        <td className="px-4 py-3 text-[14px] text-gray-700 text-left max-w-sm truncate">{item.summary}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status || '')}`}>
                                                {getStatusLabel(item.status || '')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-[14px] text-gray-700">{formatDate(item.publishAt || '')}</td>
                                        <td className="px-4 py-3 text-center text-[14px] text-gray-700">{formatDate(item.expireAt || '')}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex space-x-2 justify-center">
                                                {onNewsChangeStatusAndTarget && (
                                                    <button 
                                                        className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-white border border-gray-300 hover:bg-gray-100 transition disabled:opacity-40"
                                                        onClick={() => item.newsId && onNewsChangeStatusAndTarget(item.newsId)}
                                                        title={t('actions.changeStatus')}
                                                    >
                                                        <svg 
                                                            xmlns="http://www.w3.org/2000/svg" 
                                                            viewBox="0 0 16 16" 
                                                            height="16" 
                                                            width="16"
                                                            fill="currentColor"
                                                        >
                                                            <g fill="none" fillRule="nonzero">
                                                                <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
                                                                <path fill="currentColor" d="M13.333333333333332 9.333333333333332a1 1 0 0 1 0.09599999999999999 1.9953333333333332L13.333333333333332 11.333333333333332H5.080666666666667l0.96 0.96a1 1 0 0 1 -1.3386666666666667 1.4826666666666668l-0.076 -0.06866666666666665 -2.5526666666666666 -2.5533333333333332c-0.6493333333333333 -0.6493333333333333 -0.22666666666666668 -1.7446666666666666 0.6606666666666666 -1.8166666666666667l0.09333333333333334 -0.004H13.333333333333332ZM9.959999999999999 2.293333333333333a1 1 0 0 1 1.338 -0.06933333333333333l0.076 0.06866666666666665 2.5526666666666666 2.5533333333333332c0.6493333333333333 0.6493333333333333 0.22666666666666668 1.7446666666666666 -0.6606666666666666 1.8166666666666667l-0.09333333333333334 0.004H2.6666666666666665a1 1 0 0 1 -0.09599999999999999 -1.9953333333333332L2.6666666666666665 4.666666666666666h8.252666666666666l-0.96 -0.96a1 1 0 0 1 0 -1.4133333333333333Z" strokeWidth="0.6667"></path>
                                                            </g>
                                                        </svg>
                                                    </button>
                                                )}
                                                {onEdit && (
                                                    <button 
                                                        className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-blue-500 hover:bg-blue-600 transition disabled:opacity-40"
                                                        onClick={() => item.newsId && onEdit(item.newsId)}
                                                        title={t('actions.edit')}
                                                    >
                                                        <Image 
                                                            src={Edit} 
                                                            alt={t('actions.edit')} 
                                                            width={24} 
                                                            height={24}
                                                        />
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button 
                                                        className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-red-500 hover:bg-red-600 transition disabled:opacity-40"
                                                        onClick={() => item.newsId && onDelete(item.newsId)}
                                                        title={t('actions.delete')}
                                                    >
                                                        <Image 
                                                            src={Delete} 
                                                            alt={t('actions.delete')} 
                                                            width={24} 
                                                            height={24}
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }
                            if(type === "notification"){
                                return (
                                    <tr 
                                        key={item.notificationId} 
                                        className={`${rowClass} ${borderClass} cursor-pointer`}
                                    >
        
                                        <td className="px-4 py-3 text-[14px] text-[#024023] font-semibold text-left max-w-xs truncate">
                                            {item.title}
                                        </td>
                                        <td className="px-4 py-3 text-[14px] text-gray-700 text-left max-w-sm truncate">{item.message}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(item.type || '')}`}>
                                                {getTypeLabel(item.type || '')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-[14px] text-gray-700">{formatDate(item.createdAt || '')}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex space-x-2 justify-center">
                                                {/* {onNotificationChangeScope && (
                                                    <button
                                                        className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-white border border-gray-300 hover:bg-gray-50 transition disabled:opacity-40"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (item.notificationId) onNotificationChangeScope(item.notificationId);
                                                        }}
                                                        title="Thay đổi phạm vi"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" id="Transfer-Fill--Streamline-Mingcute-Fill" height="16" width="16" className="text-gray-700">
                                                            <g fill="none" fillRule="nonzero">
                                                                <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
                                                                <path fill="currentColor" d="M13.333333333333332 9.333333333333332a1 1 0 0 1 0.09599999999999999 1.9953333333333332L13.333333333333332 11.333333333333332H5.080666666666667l0.96 0.96a1 1 0 0 1 -1.3386666666666667 1.4826666666666668l-0.076 -0.06866666666666665 -2.5526666666666666 -2.5533333333333332c-0.6493333333333333 -0.6493333333333333 -0.22666666666666668 -1.7446666666666666 0.6606666666666666 -1.8166666666666667l0.09333333333333334 -0.004H13.333333333333332ZM9.959999999999999 2.293333333333333a1 1 0 0 1 1.338 -0.06933333333333333l0.076 0.06866666666666665 2.5526666666666666 2.5533333333333332c0.6493333333333333 0.6493333333333333 0.22666666666666668 1.7446666666666666 -0.6606666666666666 1.8166666666666667l-0.09333333333333334 0.004H2.6666666666666665a1 1 0 0 1 -0.09599999999999999 -1.9953333333333332L2.6666666666666665 4.666666666666666h8.252666666666666l-0.96 -0.96a1 1 0 0 1 0 -1.4133333333333333Z" strokeWidth="0.6667"></path>
                                                            </g>
                                                        </svg>
                                                    </button>
                                                )} */}
                                                {onEdit && (
                                                    <button 
                                                        className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-blue-500 hover:bg-blue-600 transition disabled:opacity-40"
                                                        onClick={() => item.notificationId && onEdit(item.notificationId)}
                                                        title={t('actions.edit')}
                                                    >
                                                        <Image 
                                                            src={Edit} 
                                                            alt={t('actions.edit')} 
                                                            width={24} 
                                                            height={24}
                                                        />
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button 
                                                        className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-red-500 hover:bg-red-600 transition disabled:opacity-40"
                                                        onClick={() => item.notificationId && onDelete(item.notificationId)}
                                                        title={t('actions.delete')}
                                                    >
                                                        <Image 
                                                            src={Delete} 
                                                            alt={t('actions.delete')} 
                                                            width={24} 
                                                            height={24}
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }
                            return null;
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Table;