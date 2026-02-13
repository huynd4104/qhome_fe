'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUnitDetailPage } from '@/src/hooks/useUnitDetailPage';
import { Unit } from '@/src/types/unit';
import { useAuth } from '@/src/contexts/AuthContext';
import { getBuilding } from '@/src/services/base/buildingService';
import { useNotifications } from '@/src/hooks/useNotifications';
import {
    ArrowLeft,
    Building2,
    Box,
    Layers,
    Bed,
    Maximize,
    Save,
    Loader2,
    XCircle,
    Edit
} from 'lucide-react';

export default function UnitEdit() {
    const { user, hasRole } = useAuth();
    const t = useTranslations('Unit');
    const tProject = useTranslations('Project');
    const router = useRouter();
    const params = useParams();
    const unitId = params.id as string;
    const { show } = useNotifications();

    const { unitData, loading, error, isSubmitting, editUnit } = useUnitDetailPage(unitId);

    const [formData, setFormData] = useState<Partial<Unit> & {
        floorStr: string;
        areaStr: string;
        bedroomsStr: string;
        status: string
    }>({
        name: '',
        floor: 0,
        areaM2: 0,
        bedrooms: 0,
        ownerName: '',
        ownerContact: '',
        floorStr: '0',
        areaStr: '0',
        bedroomsStr: '0',
        status: 'ACTIVE',
    });

    const [buildingName, setBuildingName] = useState<string>('');
    const [buildingCode, setBuildingCode] = useState<string>('');
    const [loadingBuilding, setLoadingBuilding] = useState(false);
    const [errors, setErrors] = useState<{
        name?: string;
        floor?: string;
        bedrooms?: string;
        area?: string;
    }>({});

    useEffect(() => {
        if (unitData) {
            setFormData({
                name: unitData.name ?? '',
                floor: unitData.floor ?? 0,
                areaM2: unitData.areaM2 ?? 0,
                bedrooms: unitData.bedrooms ?? 0,
                ownerName: unitData.ownerName ?? '',
                ownerContact: unitData.ownerContact ?? '',
                floorStr: unitData.floor?.toString() ?? '0',
                areaStr: unitData.areaM2?.toString() ?? '0',
                bedroomsStr: unitData.bedrooms?.toString() ?? '0',
                status: unitData.status ?? 'INACTIVE',
            });
        }
    }, [unitData]);

    useEffect(() => {
        const loadBuildingInfo = async () => {
            if (!unitData?.buildingId) return;

            try {
                setLoadingBuilding(true);
                const building = await getBuilding(unitData.buildingId);
                setBuildingName(building.name);
                setBuildingCode(building.code);
            } catch (err: any) {
                console.error('Failed to load building:', err);
                setBuildingName(t('fallbacks.notAvailable'));
            } finally {
                setLoadingBuilding(false);
            }
        };

        loadBuildingInfo();
    }, [unitData?.buildingId]);

    const handleBack = () => {
        router.back();
    };

    // Generate unit code from building code + floor + bedrooms
    const generateUnitCode = (floor: number, bedrooms: number): string => {
        if (!buildingCode) return unitData?.code || '';
        return `${buildingCode}${floor}${bedrooms}`;
    };

    const validateField = (fieldName: string, value: string | number) => {
        const newErrors = { ...errors };

        switch (fieldName) {
            case 'name':
                {
                    const v = String(value ?? '').trim();
                    const nameRegex = /^[a-zA-ZÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐđ0-9\s'-]+$/;
                    if (!v) newErrors.name = t('nameError');
                    else if (v.length > 40) newErrors.name = t('unitNew.nameMaxError');
                    else if (!nameRegex.test(v)) newErrors.name = t('unitNew.nameSpecialCharError');
                    else delete newErrors.name;
                }
                break;
            case 'floor':
                {
                    const floor = typeof value === 'number' ? value : parseInt(String(value));
                    if (!floor || floor <= 0) newErrors.floor = t('floorError');
                    else delete newErrors.floor;
                }
                break;
            case 'bedrooms':
                {
                    const bedrooms = typeof value === 'number' ? value : parseInt(String(value));
                    if (!bedrooms || bedrooms <= 0 || bedrooms >= 10) newErrors.bedrooms = t('unitNew.bedroomsErrorRange');
                    else delete newErrors.bedrooms;
                }
                break;
            case 'area':
                {
                    const area = typeof value === 'number' ? value : parseFloat(String(value));
                    if (!area || area <= 0 || area >= 150) newErrors.area = t('unitNew.areaErrorRange');
                    else delete newErrors.area;
                }
                break;
        }

        setErrors(newErrors);
    };

    const validateAllFields = () => {
        const newErrors: {
            name?: string;
            floor?: string;
            bedrooms?: string;
            area?: string;
        } = {};

        // Validate floor
        if (formData.floor === undefined || formData.floor <= 0) {
            newErrors.floor = t('floorError');
        }

        // Validate bedrooms
        if (formData.bedrooms === undefined || formData.bedrooms <= 0 || formData.bedrooms >= 10) {
            newErrors.bedrooms = t('unitNew.bedroomsErrorRange');
        }

        // Validate area
        if (formData.areaM2 === undefined || formData.areaM2 <= 0 || formData.areaM2 >= 150) {
            newErrors.area = t('unitNew.areaErrorRange');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'floor') {
            const floorNum = parseInt(value) || 0;
            setFormData(prev => ({
                ...prev,
                floorStr: value,
                floor: floorNum,
            }));
            validateField('floor', floorNum);
        } else if (name === 'bedrooms') {
            const bedroomsNum = parseInt(value) || 0;
            setFormData(prev => ({
                ...prev,
                bedroomsStr: value,
                bedrooms: bedroomsNum,
            }));
            validateField('bedrooms', bedroomsNum);
        } else if (name === 'area') {
            const areaNum = parseFloat(value) || 0;
            setFormData(prev => ({
                ...prev,
                areaStr: value,
                areaM2: areaNum,
            }));
            validateField('area', areaNum);
        } else if (name === 'name') {
            setFormData(prevData => ({
                ...prevData,
                [name]: value,
            }));
            validateField('name', value);
        } else {
            setFormData(prevData => ({
                ...prevData,
                [name]: value,
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;

        const isValid = validateAllFields();

        if (!isValid) {
            show(t('error'), 'error');
            return;
        }

        try {
            const { floorStr, areaStr, bedroomsStr, ...unitUpdateData } = formData;
            // Generate new code based on floor and bedrooms
            const newCode = generateUnitCode(formData.floor || 0, formData.bedrooms || 0);
            const dataToSubmit = {
                ...unitUpdateData,
                code: newCode,
            };
            console.log(t('saving'), dataToSubmit);
            await editUnit(unitId, dataToSubmit);
            router.push(`/base/unit/unitDetail/${unitId}`);
        } catch (submitError) {
            console.error(t('updateUnitError'), submitError);
        }
    };

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
            {/* Back Button */}
            <div className="mb-6 flex items-center justify-between">
                <button
                    onClick={handleBack}
                    className="group flex items-center gap-2 rounded-lg py-2 pl-2 pr-4 text-slate-500 transition-all hover:bg-white hover:text-emerald-700 hover:shadow-sm"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition-colors group-hover:ring-emerald-200">
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                    </div>
                    <span className="font-semibold">{t('return')}</span>
                </button>
            </div>

            <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Main Form Card */}
                <div className="relative z-10 overflow-visible rounded-3xl border border-white/50 bg-white/80 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
                    <div className="border-b border-slate-100 p-6 md:p-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                {t('unitEdit')}
                            </h1>
                            <div className="mt-2 flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${formData.status === 'INACTIVE'
                                        ? 'bg-slate-100 text-slate-600 ring-slate-200'
                                        : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                    }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${formData.status === 'INACTIVE' ? 'bg-slate-400' : 'bg-emerald-500'
                                        }`} />
                                    {formData.status ? t(formData.status.toLowerCase() ?? '') : ''}
                                </span>
                            </div>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-2xl">
                            <Edit className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">

                            <div className="group space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                                    <Building2 className="h-4 w-4 text-emerald-500" />
                                    {t('buildingName')}
                                </label>
                                <div className="h-11 w-full flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 shadow-sm">
                                    {loadingBuilding ? t('loading.building') : buildingName || ""}
                                </div>
                            </div>

                            <div className="group space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                                    <Box className="h-4 w-4 text-emerald-500" />
                                    {t('unitCode')} (Tự động)
                                </label>
                                <div className="h-11 w-full flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-500 shadow-sm cursor-not-allowed">
                                    {generateUnitCode(formData.floor || 0, formData.bedrooms || 0) || unitData?.code || ""}
                                </div>
                            </div>

                            <div className="group space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                                    <Layers className="h-4 w-4 text-emerald-500" />
                                    {t('floor')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="floor"
                                    value={formData.floorStr}
                                    onChange={handleChange}
                                    placeholder={t('floor')}
                                    className={`h-11 w-full rounded-xl border px-4 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 ${errors.floor
                                        ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-100 placeholder:text-red-300'
                                        : 'border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-200'
                                        }`}
                                />
                                {errors.floor && (
                                    <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1">
                                        <XCircle className="mr-1 h-3 w-3" />
                                        {errors.floor}
                                    </div>
                                )}
                            </div>

                            <div className="group space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                                    <Bed className="h-4 w-4 text-emerald-500" />
                                    {t('bedrooms')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="bedrooms"
                                    value={formData.bedroomsStr}
                                    onChange={handleChange}
                                    placeholder={t('bedrooms')}
                                    className={`h-11 w-full rounded-xl border px-4 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 ${errors.bedrooms
                                        ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-100 placeholder:text-red-300'
                                        : 'border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-200'
                                        }`}
                                />
                                {errors.bedrooms && (
                                    <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1">
                                        <XCircle className="mr-1 h-3 w-3" />
                                        {errors.bedrooms}
                                    </div>
                                )}
                            </div>

                            <div className="group space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                                    <Maximize className="h-4 w-4 text-emerald-500" />
                                    {t('areaM2')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="area"
                                    value={formData.areaStr}
                                    onChange={handleChange}
                                    placeholder={t('areaM2')}
                                    className={`h-11 w-full rounded-xl border px-4 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 ${errors.area
                                        ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-100 placeholder:text-red-300'
                                        : 'border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-emerald-200'
                                        }`}
                                />
                                {errors.area && (
                                    <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1">
                                        <XCircle className="mr-1 h-3 w-3" />
                                        {errors.area}
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-end border-t border-slate-100">
                            <button
                                type="button"
                                onClick={handleBack}
                                disabled={isSubmitting}
                                className="inline-flex items-center justify-center rounded-xl bg-white border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
                            >
                                {t('cancel')}
                            </button>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('saving')}
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        {t('save')}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
