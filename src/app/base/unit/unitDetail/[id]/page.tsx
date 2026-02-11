'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import Delete from '@/src/assets/Delete.svg';
import Edit from '@/src/assets/Edit.svg';
import DetailField from '@/src/components/base-service/DetailField';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUnitDetailPage } from '@/src/hooks/useUnitDetailPage';
import { getBuilding } from '@/src/services/base/buildingService';
import PopupConfirm from '@/src/components/common/PopupComfirm';
import { updateUnitStatus } from '@/src/services/base/unitService';
import { useNotifications } from '@/src/hooks/useNotifications';

type ApiError = {
    message?: string;
    response?: { data?: { message?: string } };
};

export default function UnitDetail() {
    const t = useTranslations('Unit');
    const router = useRouter();
    const params = useParams();
    const unitId = params.id;

    const { unitData, loading, error } = useUnitDetailPage(unitId);
    const { show } = useNotifications();

    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [buildingName, setBuildingName] = useState<string>('');
    const [buildingStatus, setBuildingStatus] = useState<string | null>(null);
    const [loadingBuilding, setLoadingBuilding] = useState(false);

    useEffect(() => {
        const loadBuilding = async () => {
            if (!unitData?.buildingId) return;

            try {
                setLoadingBuilding(true);
                const building = await getBuilding(unitData.buildingId);
                setBuildingName(building.name);
                setBuildingStatus(building.status ?? null);
            } catch (err: unknown) {
                console.error('Failed to load building:', err);
                setBuildingName(t('fallbacks.notAvailable'));
                setBuildingStatus(null);
            } finally {
                setLoadingBuilding(false);
            }
        };

        loadBuilding();
    }, [unitData?.buildingId, t]);

    const handleBack = () => {
        router.back();
    };

    const isUnitActive = unitData?.status?.toUpperCase() === 'ACTIVE';
    const isBuildingInactive = buildingStatus?.toUpperCase() === 'INACTIVE';

    const handleStatusClick = () => {
        setIsPopupOpen(true);
    };

    const handleConfirmStatusChange = async () => {
        if (!unitId || typeof unitId !== 'string' || !unitData) {
            setIsPopupOpen(false);
            return;
        }

        const newStatus = isUnitActive ? 'INACTIVE' : 'ACTIVE';
        try {
            await updateUnitStatus(unitId, newStatus);
            setIsPopupOpen(false);

            if (newStatus === 'INACTIVE' && unitData.buildingId) {
                router.push(`/base/building/buildingDetail/${unitData.buildingId}`);
            } else {
                window.location.reload();
            }
        } catch (err: unknown) {
            const e = err as ApiError;
            const message = e?.response?.data?.message || e?.message || (typeof err === 'string' ? err : 'Cập nhật trạng thái thất bại.');
            console.error('Failed to update unit status:', message);
            show(message, 'error');
            setIsPopupOpen(false);
        }
    };

    const handleClosePopup = () => {
        setIsPopupOpen(false);
    };

    const popupTitle = t('statusChange.confirmTitle');
    const popupContext = isUnitActive
        ? t('statusChange.confirmDeactivate')
        : isBuildingInactive
            ? t('statusChange.confirmActivateInInactiveBuilding')
            : t('statusChange.confirmActivate');

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                {t('load')}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-screen text-red-500">
                {t('error')}: {error.message}
            </div>
        );
    }

    if (!unitData) {
        return (
            <div className="flex justify-center text-xl font-bold items-center h-screen">
                {t('noData')}
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8 font-sans">
            <PopupConfirm
                isOpen={isPopupOpen}
                onClose={handleClosePopup}
                onConfirm={handleConfirmStatusChange}
                popupTitle={popupTitle}
                popupContext={popupContext}
                isDanger={isUnitActive}
            />

            <div
                className="max-w-4xl mx-auto mb-6 flex items-center cursor-pointer"
                onClick={handleBack}
            >
                <Image src={Arrow} alt={t('altText.back')} width={20} height={20} />
                <span className="text-[#02542D] font-bold text-2xl ml-2">
                    {t('returnUnitList')}
                </span>
            </div>

            <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border">
                <div className="flex justify-between items-start border-b pb-4 mb-6">
                    <div className="flex items-center">
                        <h1 className="text-2xl font-semibold text-[#02542D] mr-3">
                            {t('unitDetail')}
                        </h1>
                        <span
                            className={`text-sm font-semibold px-3 py-1 rounded-full ${unitData.status === 'INACTIVE'
                                ? 'bg-[#EEEEEE] text-[#02542D]'
                                : 'bg-[#739559] text-white'
                                }`}
                        >
                            {t((unitData.status ?? '').toLowerCase())}
                        </span>
                    </div>

                    <div className="flex space-x-2">
                        <button
                            className="px-4 py-2 rounded-lg bg-blue-500 text-white"
                            onClick={() =>
                                router.push(`/base/unit/unitHistory/${unitId}`)
                            }
                        >
                            Lịch sử
                        </button>

                        <button
                            type="button"
                            className={`p-2 rounded-lg ${unitData.status?.toUpperCase() === 'INACTIVE' ? 'bg-slate-300 cursor-not-allowed opacity-70' : 'bg-[#739559] hover:bg-opacity-90'}`}
                            onClick={() => unitData.status?.toUpperCase() !== 'INACTIVE' && router.push(`/base/unit/unitEdit/${unitId}`)}
                            disabled={unitData.status?.toUpperCase() === 'INACTIVE'}
                            title={unitData.status?.toUpperCase() === 'INACTIVE' ? undefined : t('altText.edit')}
                        >
                            <Image src={Edit} alt={t('altText.edit')} width={24} height={24} />
                        </button>

                        <button
                            type="button"
                            className={`p-2 min-w-[40px] min-h-[40px] rounded-lg font-bold text-white text-lg leading-none flex items-center justify-center transition ${
                                isUnitActive ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
                            }`}
                            onClick={handleStatusClick}
                            title={t('statusChange.buttonTitle')}
                        >
                            O
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <DetailField
                        label={t('unitCode')}
                        value={unitData.code ?? ''}
                        readonly
                    />

                    <DetailField
                        label={t('buildingName')}
                        value={
                            loadingBuilding
                                ? t('loading.building')
                                : buildingName
                        }
                        readonly
                    />

                    <DetailField
                        label={t('floor')}
                        value={unitData.floor?.toString() ?? ''}
                        readonly
                    />

                    <DetailField
                        label={t('bedrooms')}
                        value={unitData.bedrooms?.toString() ?? ''}
                        readonly
                    />

                    <DetailField
                        label={t('areaM2')}
                        value={unitData.areaM2?.toString() ?? ''}
                        readonly
                    />
                </div>
            </div>
        </div>
    );
}
