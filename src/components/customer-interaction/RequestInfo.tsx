import React, { useState, useEffect } from 'react';
import RequestInfoItem from './RequestInfoItem';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Request } from '@/src/types/request';
import NoImage from '@/src/assets/NoImage.svg';
import { getUnit } from '@/src/services/base/unitService';
import axios from '@/src/lib/axios';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

interface RequestInfoAndContextProps {
    value: Request;
    contextTitle: string;
    contextContextTitle: string;
    contextImageTitle: string;
    isTicket?: boolean;
}

const RequestInfoAndContext = ({ value, contextTitle, contextContextTitle, contextImageTitle, isTicket } : RequestInfoAndContextProps) => {
    const t = useTranslations('customer-interaction.Request');
    const [unitName, setUnitName] = useState<string>('');
    const [residentName, setResidentName] = useState<string>('');
    const [loadingUnit, setLoadingUnit] = useState(false);
    const [loadingResident, setLoadingResident] = useState(false);

    useEffect(() => {
        const fetchUnitName = async () => {
            if (!value.unitId) return;
            try {
                setLoadingUnit(true);
                const unit = await getUnit(value.unitId);
                setUnitName(unit.name || unit.code || 'N/A');
            } catch (err) {
                console.error('Failed to load unit:', err);
                setUnitName('N/A');
            } finally {
                setLoadingUnit(false);
            }
        };
        fetchUnitName();
    }, [value.unitId]);

    useEffect(() => {
        const fetchResidentName = async () => {
            if (!value.residentId) return;
            try {
                setLoadingResident(true);
                const response = await axios.get(`${BASE_URL}/api/residents/${value.residentId}`, {
                    withCredentials: true
                });
                setResidentName(response.data.fullName || 'N/A');
            } catch (err) {
                console.error('Failed to load resident:', err);
                setResidentName(value.residentName || 'N/A');
            } finally {
                setLoadingResident(false);
            }
        };
        fetchResidentName();
    }, [value.residentId, value.residentName]);

    const isVideoFile = (url: string): boolean => {
        const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
        const lowerUrl = url.toLowerCase();
        return videoExtensions.some(ext => lowerUrl.includes(ext)) || lowerUrl.includes('video');
    };

    return (
        <div className="space-y-6 h-full">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-full">
                {!isTicket && (
                    <>
                        {/* Phần 1: Tên căn hộ, Tên cư dân, Số điện thoại, Loại, Ngày đề xuất */}
                        <div className='border-b border-[#CDCDCD] pb-4 mb-4'>
                            {value.unitId && (
                                <RequestInfoItem
                                    title={t('unitName') || 'Tên căn hộ'}
                                    value={loadingUnit ? 'Loading...' : (unitName || 'N/A')}
                                    isHighlighted={false}
                                />
                            )}
                            {value.residentId && (
                                <RequestInfoItem
                                    title={t('residentName')}
                                    value={loadingResident ? 'Loading...' : (residentName || value.residentName || 'N/A')}
                                    isHighlighted={false}
                                />
                            )}
                            {value.contactPhone && (
                                <RequestInfoItem
                                    title={t('contactPhone') || 'Số điện thoại liên hệ'}
                                    value={value.contactPhone}
                                    isHighlighted={false}
                                />
                            )}
                            <RequestInfoItem
                                title={t('type') || 'Loại'}
                                value={value.type || value.category || ''}
                                isHighlighted={false}
                            />
                            {value.preferredDatetime && (
                                <RequestInfoItem
                                    title={t('preferredDatetime') || 'Ngày đề xuất'}
                                    value={new Date(value.preferredDatetime).toLocaleString('vi-VN', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                    isHighlighted={false}
                                />
                            )}
                        </div>

                        {/* Phần 2: Trạng thái, Phí sửa chữa, Ghi chú */}
                        <div className='border-b border-[#CDCDCD] pb-4 mb-4'>
                            <RequestInfoItem
                                title={t('status') || 'Trạng thái'}
                                value={value.status || ''}
                                isHighlighted={false}
                            />
                            <RequestInfoItem
                                title={t('total') || 'Phí sửa chữa'}
                                value={value.fee != null ? value.fee.toLocaleString('vi-VN') + ' VND' : ''}
                                isHighlighted={false}
                            />
                            {value.note && (
                                <RequestInfoItem
                                    title={t('note') || 'Ghi chú'}
                                    value={value.note}
                                    isHighlighted={false}
                                />
                            )}
                        </div>
                    </>
                )}
                <h3 className="text-lg font-semibold mb-2">{contextTitle}</h3>
                <p className="text-[#016637] font-medium mb-4">{value.title}</p>

                <h3 className="text-lg font-semibold mb-2">{contextContextTitle}</h3>
                <p className="text-[#016637] mb-4 leading-relaxed">{value.content}</p>

                <h3 className="text-lg font-semibold mb-2">{contextImageTitle}</h3>
                <div className='flex flex-wrap gap-4 justify-center'>
                    {value.attachments && value.attachments.length > 0 ? (
                        value.attachments.map((attachment, index) => {
                            const attachmentUrl = attachment.startsWith('http') ? attachment : `/${attachment}`;
                            const isVideo = isVideoFile(attachment);
                            
                            return (
                                <div key={index} className="w-64 h-64 border border-gray-300 rounded-md overflow-hidden">
                                    {isVideo ? (
                                        <video 
                                            src={attachmentUrl}
                                            controls
                                            className="w-full h-full object-cover rounded-md"
                                        >
                                            Your browser does not support the video tag.
                                        </video>
                                    ) : (
                                        <Image 
                                            src={attachmentUrl} 
                                            alt={`Request Attachment ${index + 1}`} 
                                            className="w-full h-full object-cover rounded-md" 
                                            width={256}
                                            height={256}
                                        />
                                    )}
                                </div>
                            );
                        })
                    ) : value.imagePath ? (
                        <div className="w-64 h-64 border border-gray-300 rounded-md overflow-hidden">
                            {isVideoFile(value.imagePath) ? (
                                <video 
                                    src={value.imagePath.startsWith('http') ? value.imagePath : `/${value.imagePath}`}
                                    controls
                                    className="w-full h-full object-cover rounded-md"
                                >
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <Image 
                                    src={value.imagePath.startsWith('http') ? value.imagePath : `/${value.imagePath}`} 
                                    alt="Request Image" 
                                    className="w-full h-full object-cover rounded-md" 
                                    width={256}
                                    height={256}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="w-64 h-64 border border-gray-300 rounded-md">
                           
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RequestInfoAndContext;
