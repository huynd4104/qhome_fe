'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';
import { Unit } from '@/src/types/unit';
import { useUnitAdd } from '@/src/hooks/useUnitAdd';
import { getBuilding, getBuildings } from '@/src/services/base/buildingService';
import { checkUnitCodeExists } from '@/src/services/base/unitService';
import { useNotifications } from '@/src/hooks/useNotifications';
import { Building } from '@/src/types/building';
import Select from '@/src/components/customer-interaction/Select';
import {
    ArrowLeft,
    Building2,
    Layers,
    Bed,
    Maximize,
    Box,
    Save,
    Loader2,
    XCircle
} from 'lucide-react';

export default function UnitAdd() {

    const { user, hasRole } = useAuth();
    const t = useTranslations('Unit');
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSubmit, setIsSubmit] = useState(false);
    const { show } = useNotifications();

    // Get buildingId from URL params
    const buildingIdFromParams = searchParams.get('buildingId') || '';
    const [selectedBuildingId, setSelectedBuildingId] = useState<string>(buildingIdFromParams);
    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [loadingBuildings, setLoadingBuildings] = useState(false);
    const [buildingCode, setBuildingCode] = useState<string>('');
    const [codeError, setCodeError] = useState<string>('');
    const [errors, setErrors] = useState<{
        name?: string;
        floor?: string;
        bedrooms?: string;
        area?: string;
        building?: string;
    }>({});

    const { addUnit, loading, error, isSubmitting } = useUnitAdd();

    const [formData, setFormData] = useState<Partial<Unit> & {
        floorStr: string;
        areaStr: string;
        bedroomsStr: string;
        status: string
    }>({
        code: '',
        name: '',
        floor: 0,
        areaM2: 0,
        bedrooms: 0,
        floorStr: '0',
        areaStr: '0',
        bedroomsStr: '0',
        status: 'ACTIVE',
        ownerName: '',
        ownerContact: '',
    });

    // Fetch buildings list
    useEffect(() => {
        const fetchBuildings = async () => {
            setLoadingBuildings(true);
            try {
                if (buildingIdFromParams) {
                    // If buildingId is in params, fetch that specific building and add to list
                    const building = await getBuilding(buildingIdFromParams);
                    setBuildings([building]);
                    setSelectedBuilding(building);
                } else {
                    // Otherwise, fetch all buildings
                    const buildingsList = await getBuildings();
                    setBuildings(buildingsList);
                }
            } catch (err) {
                console.error('Failed to fetch buildings:', err);
                show(t('error') || 'Failed to fetch buildings', 'error');
            } finally {
                setLoadingBuildings(false);
            }
        };
        fetchBuildings();
    }, [buildingIdFromParams]);

    // Fetch building code when selectedBuildingId changes
    useEffect(() => {
        const fetchBuildingCode = async () => {
            if (!selectedBuildingId) {
                setBuildingCode('');
                setSelectedBuilding(null);
                return;
            }
            try {
                const building = await getBuilding(selectedBuildingId);
                console.log("building", building);
                setBuildingCode(building.code);
                setSelectedBuilding(building);
            } catch (err) {
                console.error('Failed to fetch building:', err);
                setBuildingCode('');
                setSelectedBuilding(null);
            }
        };
        fetchBuildingCode();
    }, [selectedBuildingId]);

    // Check code khi code hoặc selectedBuildingId thay đổi
    useEffect(() => {
        const checkCode = async () => {
            if (!formData.code || !selectedBuildingId) {
                setCodeError('');
                return;
            }

            const exists = await checkUnitCodeExists(formData.code, selectedBuildingId);
            if (exists) {
                setCodeError(t('codeError'));
            } else {
                setCodeError('');
            }
        };

        const timeoutId = setTimeout(checkCode, 500); // Debounce 500ms
        return () => clearTimeout(timeoutId);
    }, [formData.code, selectedBuildingId]);

    const handleBack = () => {
        router.back();
    }

    const handleCancel = () => {
        router.back();
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (isSubmitting) return;

        // Validate all fields first before making any API calls
        const isValid = validateAllFields();

        if (!selectedBuildingId) {
            setErrors(prev => ({ ...prev, building: t('buildingRequired') || 'Building is required' }));
            show(t('buildingRequired') || 'Please select a building', 'error');
            return;
        }

        if (codeError) {
            show(codeError, 'error');
            return;
        }

        if (!isValid) {
            show(t('error'), 'error');
            return;
        }

        setIsSubmit(true);
        try {
            const { floorStr, areaStr, bedroomsStr, ...unitData } = formData;
            const completeData = {
                ...unitData,
                buildingId: selectedBuildingId,
            };
            console.log('Dữ liệu gửi đi:', completeData);
            await addUnit(completeData);
            router.push(`/base/building/buildingDetail/${selectedBuildingId}`);
        } catch (error: any) {
            console.error('Lỗi khi tạo unit:', error);
            const message = error?.response?.data?.message || error?.message || t('errorUnit');
            show(message, 'error');
        } finally {
            setIsSubmit(false);
        }
    };

    // Generate unit code from building code + floor + bedrooms
    const generateUnitCode = (floor: number, bedrooms: number): string => {
        if (!buildingCode) return '';
        return `${buildingCode}${floor}${bedrooms}`;
    };

    const validateField = (fieldName: string, value: string | number) => {
        const newErrors = { ...errors };

        switch (fieldName) {
            case 'name': {
                const v = String(value ?? '').trim();
                const nameRegex = /^[a-zA-ZÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐđ0-9\s'-]+$/;
                if (!v) newErrors.name = t('nameError');
                else if (v.length > 40) newErrors.name = t('unitNew.nameMaxError');
                else if (!nameRegex.test(v)) newErrors.name = t('unitNew.nameSpecialCharError');
                else delete newErrors.name;
                break;
            }
            case 'floor': {
                const floor = typeof value === 'number' ? value : parseInt(String(value));
                if (!floor || floor <= 0) {
                    newErrors.floor = t('floorError');
                } else if (selectedBuilding && floor > selectedBuilding.floorsMax) {
                    newErrors.floor = t('unitNew.floorMaxError', { floorsMax: selectedBuilding.floorsMax });
                } else {
                    delete newErrors.floor;
                }
                break;
            }
            case 'bedrooms': {
                const bedrooms = typeof value === 'number' ? value : parseInt(String(value));
                if (!bedrooms || bedrooms <= 0 || bedrooms >= 10) newErrors.bedrooms = t('unitNew.bedroomsErrorRange');
                else delete newErrors.bedrooms;
                break;
            }
            case 'area': {
                const area = typeof value === 'number' ? value : parseFloat(String(value));
                if (!area || area <= 0 || area >= 150) newErrors.area = t('unitNew.areaErrorRange');
                else delete newErrors.area;
                break;
            }
        }

        setErrors(newErrors);
    };

    const validateAllFields = () => {
        const newErrors: {
            name?: string;
            floor?: string;
            bedrooms?: string;
            area?: string;
            building?: string;
        } = {};

        // Validate building
        if (!selectedBuildingId) {
            newErrors.building = t('buildingRequired') || 'Building is required';
        }

        // Validate floor
        if (formData.floor === undefined || formData.floor <= 0) {
            newErrors.floor = t('floorError');
        } else if (selectedBuilding && formData.floor > selectedBuilding.floorsMax) {
            newErrors.floor = t('unitNew.floorMaxError', { floorsMax: selectedBuilding.floorsMax });
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
            const newCode = generateUnitCode(floorNum, formData.bedrooms || 0);
            setFormData(prev => ({
                ...prev,
                floorStr: value,
                floor: floorNum,
                code: newCode,
            }));
            validateField('floor', floorNum);
        } else if (name === 'bedrooms') {
            const bedroomsNum = parseInt(value) || 0;
            const newCode = generateUnitCode(formData.floor || 0, bedroomsNum);
            setFormData(prev => ({
                ...prev,
                bedroomsStr: value,
                bedrooms: bedroomsNum,
                code: newCode,
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
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
            validateField('name', value);
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleBuildingChange = (building: Building) => {
        setSelectedBuildingId(building.id);
        setSelectedBuilding(building);
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.building;
            // Re-validate floor if building changed
            if (formData.floor && building.floorsMax && formData.floor > building.floorsMax) {
                newErrors.floor = t('unitNew.floorMaxError', { floorsMax: building.floorsMax });
            } else if (newErrors.floor && formData.floor && building.floorsMax && formData.floor <= building.floorsMax) {
                delete newErrors.floor;
            }
            return newErrors;
        });
    };

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
                    <div className="border-b border-slate-100 p-6 md:p-8">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                            {t('unitNew.title')}
                        </h1>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">

                            <div className="col-span-full">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2 transition-colors group-focus-within:text-emerald-600">
                                    <Building2 className="h-4 w-4 text-emerald-500" />
                                    {t('building')} <span className="text-red-500">*</span>
                                </label>
                                <Select
                                    options={buildings}
                                    value={selectedBuildingId}
                                    onSelect={handleBuildingChange}
                                    renderItem={(item) => `${item.code} - ${item.name}`}
                                    getValue={(item) => item.id}
                                    placeholder={loadingBuildings ? (t('load')) : (t('selectBuilding'))}
                                    disable={loadingBuildings || !!buildingIdFromParams}
                                    error={!!errors.building}
                                />
                                {errors.building && (
                                    <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1 mt-1">
                                        <XCircle className="mr-1 h-3 w-3" />
                                        {errors.building}
                                    </div>
                                )}
                            </div>

                            <div className="group space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 transition-colors group-focus-within:text-emerald-600">
                                    <Box className="h-4 w-4 text-emerald-500" />
                                    {t('unitNew.autoCode')}
                                </label>
                                <div className="h-11 w-full flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-500 shadow-sm cursor-not-allowed">
                                    {formData.code || '...'}
                                </div>
                                {codeError && (
                                    <div className="flex items-center text-xs text-red-600 animate-in slide-in-from-left-1">
                                        <XCircle className="mr-1 h-3 w-3" />
                                        {codeError}
                                    </div>
                                )}
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
                                onClick={handleCancel}
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
};
