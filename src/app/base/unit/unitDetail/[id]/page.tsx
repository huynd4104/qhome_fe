'use client'
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import Delete from '@/src/assets/Delete.svg';
import Edit from '@/src/assets/Edit.svg';
import DetailField from '@/src/components/base-service/DetailField';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUnitDetailPage } from '@/src/hooks/useUnitDetailPage';
import { useAuth } from '@/src/contexts/AuthContext';
import { getBuilding } from '@/src/services/base/buildingService';
import PopupConfirm from '@/src/components/common/PopupComfirm';
import { deleteUnit, updateUnitStatus } from '@/src/services/base/unitService';

export default function UnitDetail () {

    const { user, hasRole } = useAuth();
    const t = useTranslations('Unit'); 
    const router = useRouter();
    const params = useParams();
    const unitId = params.id;
    const { unitData, loading, error, isSubmitting } = useUnitDetailPage(unitId);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [buildingName, setBuildingName] = useState<string>('');
    const [loadingBuilding, setLoadingBuilding] = useState(false);
    
    useEffect(() => {
        const loadBuildingName = async () => {
            if (!unitData?.buildingId) return;
            
            try {
                setLoadingBuilding(true);
                const building = await getBuilding(unitData.buildingId);
                setBuildingName(building.name);
            } catch (err: any) {
                console.error('Failed to load building:', err);
                setBuildingName(t('fallbacks.notAvailable'));
            } finally {
                setLoadingBuilding(false);
            }
        };

        loadBuildingName();
    }, [unitData?.buildingId]);
    
    const handleBack = () => {
        if (unitData?.buildingId) {
            router.back();
        } else {
            router.back();
        }
    }

    const handleDelete = () => {
        setIsPopupOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!unitId || typeof unitId !== 'string') {
            setIsPopupOpen(false);
            return;
        }

        try {
            await updateUnitStatus(unitId, 'INACTIVE');
            setIsPopupOpen(false);
            if (unitData?.buildingId) {
                router.push(`/base/building/buildingDetail/${unitData.buildingId}`);
            }
        } catch (err) {
            console.error('Failed to delete unit:', err);
            setIsPopupOpen(false);
        }
    };

    const handleClosePopup = () => {
        setIsPopupOpen(false);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">{t('load')}</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-500">{t('error')}: {error.message}</div>;
    }

    if (!unitData) {
        return <div className="flex justify-center text-xl font-bold items-center h-screen">{t('noData')}</div>;
    }

    return (
        <div className={`min-h-screen  p-4 sm:p-8 font-sans`}>
            <PopupConfirm
                isOpen={isPopupOpen}
                onClose={handleClosePopup}
                onConfirm={handleConfirmDelete}
                popupTitle={t('deleteUnitT')}
                popupContext={t('deleteUnitC')}
                isDanger={true}
            />
            
            <div className="max-w-4xl mx-auto mb-6 flex items-center cursor-pointer" onClick={handleBack}>
                <Image 
                    src={Arrow} 
                    alt={t('altText.back')} 
                    width={20} 
                    height={20}
                    className="w-5 h-5 mr-2" 
                />
                <span className={`text-[#02542D] font-bold text-2xl hover:text-opacity-80 transition duration-150 `}>
                    {t('returnUnitList')}
                </span>
            </div>

            <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200">
                
                <div className="flex justify-between items-start border-b pb-4 mb-6">
                    <div className="flex items-center">
                        <h1 className={`text-2xl font-semibold text-[#02542D] mr-3`}>
                            {t('unitDetail')}
                        </h1>
                        <span 
                            className={`text-sm font-semibold px-3 py-1 rounded-full ${unitData?.status === 'INACTIVE' ? 'bg-[#EEEEEE] text-[#02542D]' : 'bg-[#739559] text-white'}`}
                        >
                            {unitData?.status ? t(unitData?.status.toLowerCase() ?? '') : ''}
                        </span>
                    </div>

                    <div className="flex space-x-2">
                        <button 
                            className={`px-4 py-2 rounded-lg bg-blue-500 hover:bg-opacity-80 transition duration-150 text-white text-sm font-medium`}
                            onClick={() => router.push(`/base/unit/unitHistory/${unitId}`)}
                        >
                            Lịch sử
                        </button>
                        <button 
                            className={`p-2 rounded-lg bg-[#739559] hover:bg-opacity-80 transition duration-150`}
                            onClick={() => router.push(`/base/unit/unitEdit/${unitId}`)}
                        >
                            <Image 
                                src={Edit} 
                                alt={t('altText.edit')} 
                                width={24} 
                                height={24}
                                className="w-6 h-6" 
                            />
                        </button>
                        <button 
                            className="p-2 rounded-lg bg-red-500 hover:bg-opacity-80 transition duration-150"
                            onClick={handleDelete}
                        >
                            <Image 
                                src={Delete} 
                                alt={t('altText.delete')} 
                                width={24} 
                                height={24}
                                className="w-6 h-6" 
                            />
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    
                    <DetailField 
                        label={t('unitCode')}
                        value={unitData?.code ?? ""} 
                        readonly={true}
                    />
                    <div className="col-span-1 hidden md:block"></div>

                    {/* <DetailField 
                        label={t('unitName')}
                        value={unitData?.name ?? ""} 
                        readonly={true}
                    /> */}

                    <DetailField 
                        label={t('buildingName')} 
                        value={loadingBuilding ? t('loading.building') : buildingName || ""} 
                        readonly={true}
                    />

                    <DetailField 
                        label={t('floor')}
                        value={unitData?.floor?.toString() ?? ""} 
                        readonly={true}
                    />
                    
                    <DetailField 
                        label={t('bedrooms')}
                        value={unitData?.bedrooms?.toString() ?? ""} 
                        readonly={true}
                    />

                    <DetailField 
                        label={t('areaM2')}
                        value={unitData?.areaM2?.toString() ?? ""} 
                        readonly={true}
                    />
                    
                </div>
            </div>
        </div>
    );
};

