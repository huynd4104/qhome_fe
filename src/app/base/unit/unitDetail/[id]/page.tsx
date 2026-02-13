'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUnitDetailPage } from '@/src/hooks/useUnitDetailPage';
import { getBuilding } from '@/src/services/base/buildingService';
import PopupConfirm from '@/src/components/common/PopupComfirm';
import { updateUnitStatus } from '@/src/services/base/unitService';
import { useNotifications } from '@/src/hooks/useNotifications';
import {
    ArrowLeft,
    Edit,
    History,
    Home,
    Layers,
    Maximize,
    Bed,
    Box,
    Power,
    Building2,
    Loader2
} from 'lucide-react';

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
            <div className="flex justify-center items-center h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <span className="text-slate-500 font-medium">{t('load')}</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-50 text-red-500 font-medium">
                {t('error')}: {error.message}
            </div>
        );
    }

    if (!unitData) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-50 text-slate-500 font-bold text-xl">
                {t('noData')}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans">
            <PopupConfirm
                isOpen={isPopupOpen}
                onClose={handleClosePopup}
                onConfirm={handleConfirmStatusChange}
                popupTitle={popupTitle}
                popupContext={popupContext}
                isDanger={isUnitActive}
            />

            {/* Back Button */}
            <div className="mb-6 flex items-center justify-between">
                <button
                    onClick={handleBack}
                    className="group flex items-center gap-2 rounded-lg py-2 pl-2 pr-4 text-slate-500 transition-all hover:bg-white hover:text-emerald-700 hover:shadow-sm"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition-colors group-hover:ring-emerald-200">
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                    </div>
                    <span className="font-semibold">{t('returnUnitList')}</span>
                </button>
            </div>

            <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="relative z-10 overflow-visible rounded-3xl border border-white/50 bg-white/80 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
                    <div className="border-b border-slate-100 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                {t('unitDetail')}
                            </h1>
                            <div className="mt-2 flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${unitData.status === 'INACTIVE'
                                    ? 'bg-slate-100 text-slate-600 ring-slate-200'
                                    : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                    }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${unitData.status === 'INACTIVE' ? 'bg-slate-400' : 'bg-emerald-500'
                                        }`} />
                                    {t((unitData.status ?? '').toLowerCase())}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => router.push(`/base/unit/unitHistory/${unitId}`)}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            >
                                <History className="mr-2 h-4 w-4 text-slate-500" />
                                {t('unitNew.history')}
                            </button>

                            <button
                                type="button"
                                disabled={unitData.status?.toUpperCase() === 'INACTIVE'}
                                onClick={() => unitData.status?.toUpperCase() !== 'INACTIVE' && router.push(`/base/unit/unitEdit/${unitId}`)}
                                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                {t('altText.edit')}
                            </button>

                            <button
                                type="button"
                                onClick={handleStatusClick}
                                className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${isUnitActive
                                    ? 'bg-red-500 hover:bg-red-600 shadow-red-200 focus:ring-red-500'
                                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 focus:ring-emerald-500'
                                    }`}
                                title={t('statusChange.buttonTitle')}
                            >
                                <Power className="mr-2 h-4 w-4" />
                                {isUnitActive ? t('statusChange.confirmDeactivate') : t('statusChange.confirmActivate')}
                            </button>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 space-y-8">
                        {/* Unit Info Section */}
                        <div className="space-y-6">

                            <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
                                <div className="group space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Box className="h-4 w-4 text-emerald-500" />
                                        {t('unitCode')}
                                    </label>
                                    <div className="h-11 w-full flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 shadow-sm">
                                        {unitData.code ?? ''}
                                    </div>
                                </div>

                                <div className="group space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-emerald-500" />
                                        {t('buildingName')}
                                    </label>
                                    <div className="h-11 w-full flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 shadow-sm">
                                        {loadingBuilding ? '...' : buildingName}
                                    </div>
                                </div>

                                <div className="group space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-emerald-500" />
                                        {t('floor')}
                                    </label>
                                    <div className="h-11 w-full flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 shadow-sm">
                                        {unitData.floor ?? ''}
                                    </div>
                                </div>

                                <div className="group space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Bed className="h-4 w-4 text-emerald-500" />
                                        {t('bedrooms')}
                                    </label>
                                    <div className="h-11 w-full flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 shadow-sm">
                                        {unitData.bedrooms ?? ''}
                                    </div>
                                </div>

                                <div className="group space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Maximize className="h-4 w-4 text-emerald-500" />
                                        {t('areaM2')}
                                    </label>
                                    <div className="h-11 w-full flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 shadow-sm">
                                        {unitData.areaM2 ?? ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
