import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface TableItemProps {
    id?: string;
    unitCode?: string;
    residentName?: string;
    title?: string;
    status?: string;
    createdAt?: string;
}

interface TableProps {
    data: TableItemProps[];
    headers?: string[];
    // onRowClick: (id: string) => void; 
}

const Table = ({ data, headers }: TableProps) => {
    const t = useTranslations('customer-interaction.Request');
    const [selectedId, setSelectedId] = useState<string | undefined>();

    const [isChecked, setIsChecked] = useState(false); 

    // const handleToggle = () => {
    //     setIsChecked(prev => !prev); 
    // };

    return (
        <div className="overflow-x-auto bg-white rounded-xl mt-6">
            <table className="w-full">
                
                <thead>
                    <tr className="border-b-2 border-solid border-[#14AE5C]">
                        {headers?.map((header, index) => (
                            <th
                                key={index}
                                className={`px-4 py-3 text-[14px] font-bold text-[#024023] uppercase tracking-wider ${header === t('requestTitle') || header === t('residentName') || header === t('assignee') ? 'text-left' : 'text-center'} whitespace-nowrap`}
                                style={{ width: header === (t('unitCode') || 'Mã căn hộ') || header === t('status') ? '5%' : 'auto' }}
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                
                <tbody>
                    {data.map((item, index) => {
                        const isSelected = item.id === selectedId;
                        
                        const rowClass = isSelected 
                            ? 'bg-green-50 transition duration-150 ease-in-out' 
                            : 'hover:bg-gray-50';

                        const borderClass = index < data.length - 1 
                            ? 'border-b border-solid border-[#CDCDCD]' 
                            : 'border-b-0';

                        const handleCellClick = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            setSelectedId(item.id); 
                            // onRowClick(item.id);
                        };
                        
                        const isDone = item.status?.toLowerCase() === 'done';
                        const actionClass = isDone
                            ? 'px-3 py-1 bg-gray-800 text-white rounded-md text-sm cursor-pointer'
                            : 'px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition';

                        return (
                            <tr 
                                key={item.id} 
                                className={`${rowClass} ${borderClass} cursor-pointer`}
                            >
                                {/* <td className="px-4 py-3 whitespace-nowrap">
                                    <Checkbox
                                        checked={isChecked} 
                                        onClick={handleToggle} 
                                    />
                                </td> */}

                                <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[#024023] font-semibold text-center">
                                    {item.unitCode || 'N/A'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[#024023] font-semibold truncate">{item.title}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-[14px] font-semibold text-[#024023]">{item.residentName}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-[14px] text-center font-semibold text-[#024023]">{item.createdAt}</td>
                                <td className={`px-4 py-3 whitespace-nowrap text-center font-semibold text-[#024023]`}>{item.status}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <Link
                                        href={`/customer-interaction/requestDetail/${item.id}`}
                                        className={actionClass}
                                    >
                                        View
                                    </Link>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default Table;
