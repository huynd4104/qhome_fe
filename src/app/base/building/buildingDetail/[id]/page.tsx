'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useBuildingDetailPage } from '@/src/hooks/useBuildingDetailPage';
import { useAuth } from '@/src/contexts/AuthContext';
import { getUnitsByBuildingId } from '@/src/services/base/buildingService';
import { Unit } from '@/src/types/unit';
import { fetchCurrentHouseholdByUnit } from '@/src/services/base/householdService';
import { fetchResidentById } from '@/src/services/base/residentService';
import {
    ServiceDto,
    createMeter,
    getAllServices,
    exportMeters,
    getUnitsWithoutMeter,
    UnitWithoutMeterDto,
    ALLOWED_SERVICE_CODES,
} from '@/src/services/base/waterService';
import PopupConfirm from '@/src/components/common/PopupComfirm';
import { useDeleteBuilding } from '@/src/hooks/useBuildingDelete';
import { downloadUnitImportTemplate, importUnits, exportUnits, type UnitImportResponse } from '@/src/services/base/unitImportService';
import {
    ArrowLeft,
    Building2,
    MapPin,
    Layers,
    Edit,
    Plus,
    Download,
    Upload,
    FileSpreadsheet,
    Gauge,
    Loader2,
    XCircle,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import Pagination from '@/src/components/customer-interaction/Pagination';

export default function BuildingDetail() {

    const { user, hasRole } = useAuth();
    const t = useTranslations('Building');
    const tUnits = useTranslations('Unit');
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const buildingId = params.id;
    const { buildingData, loading, error, isSubmitting } = useBuildingDetailPage(buildingId);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loadingUnits, setLoadingUnits] = useState(false);
    const [unitsError, setUnitsError] = useState<string | null>(null);
    const [householdsMap, setHouseholdsMap] = useState<Record<string, any>>({});
    const [primaryResidentNamesMap, setPrimaryResidentNamesMap] = useState<Record<string, string | null>>({});
    const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;
    const { deleteBuildingById, isLoading: isDeleting } = useDeleteBuilding();
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<UnitImportResponse | null>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [services, setServices] = useState<ServiceDto[]>([]);
    const [meterFormVisible, setMeterFormVisible] = useState(false);
    const [meterForm, setMeterForm] = useState({
        unitId: '',
        serviceId: '',
        installedAt: '',
    });
    const [meterStatus, setMeterStatus] = useState<string | null>(null);
    const [creatingMeter, setCreatingMeter] = useState(false);
    const [unitsWithoutMeter, setUnitsWithoutMeter] = useState<UnitWithoutMeterDto[]>([]);
    const [loadingUnitsWithoutMeter, setLoadingUnitsWithoutMeter] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const meterDateInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const loadUnits = async () => {
            if (!buildingId || typeof buildingId !== 'string') return;

            try {
                setLoadingUnits(true);
                setUnitsError(null);
                const data = await getUnitsByBuildingId(buildingId);
                // Removed filtering to show all units including inactive ones
                const allUnits = data;
                setUnits(allUnits);

                // Load current household for each unit
                const householdsData: Record<string, any> = {};
                const residentNamesData: Record<string, string | null> = {};

                await Promise.all(
                    allUnits.map(async (unit) => {
                        try {
                            const household = await fetchCurrentHouseholdByUnit(unit.id);
                            householdsData[unit.id] = household;

                            // Get primary resident name from resident table only
                            let primaryName: string | null = null;
                            if (household?.primaryResidentId) {
                                try {
                                    const resident = await fetchResidentById(household.primaryResidentId);
                                    if (resident?.fullName) {
                                        primaryName = resident.fullName;
                                    }
                                } catch (residentErr) {
                                    console.error(`Failed to load resident ${household.primaryResidentId} for unit ${unit.id}:`, residentErr);
                                }
                            }

                            residentNamesData[unit.id] = primaryName;
                        } catch (err) {
                            // If no current household found (404), set to null
                            householdsData[unit.id] = null;
                            residentNamesData[unit.id] = null;
                        }
                    })
                );
                setHouseholdsMap(householdsData);
                setPrimaryResidentNamesMap(residentNamesData);
            } catch (err: any) {
                console.error('Failed to load units:', err);
                setUnitsError(err?.message || t('messages.failedToLoadUnits'));
            } finally {
                setLoadingUnits(false);
            }
        };

        const loadServices = async () => {
            try {
                const data = await getAllServices();
                // Only show active water and electric services
                setServices(data.filter(service =>
                    service.active && ALLOWED_SERVICE_CODES.includes(service.code)
                ));
            } catch (err) {
                console.error('Failed to load services:', err);
            }
        };

        loadUnits();
        loadServices();
    }, [buildingId]);

    // Load units without meter when service is selected
    useEffect(() => {
        const loadUnitsWithoutMeter = async () => {
            if (!meterForm.serviceId || typeof buildingId !== 'string') {
                setUnitsWithoutMeter([]);
                return;
            }

            try {
                setLoadingUnitsWithoutMeter(true);
                const unitsWithoutMeterData = await getUnitsWithoutMeter(meterForm.serviceId, buildingId);
                setUnitsWithoutMeter(unitsWithoutMeterData);
            } catch (err) {
                console.error('Failed to load units without meter:', err);
                setUnitsWithoutMeter([]);
            } finally {
                setLoadingUnitsWithoutMeter(false);
            }
        };

        loadUnitsWithoutMeter();
    }, [meterForm.serviceId, buildingId]);

    // Auto-open meter form and pre-fill when unitId and serviceId are in query params
    useEffect(() => {
        const unitIdParam = searchParams.get('unitId');
        const serviceIdParam = searchParams.get('serviceId');

        if (unitIdParam && serviceIdParam && units.length > 0 && services.length > 0) {
            // Check if unit exists in the building
            const unitExists = units.some(unit => unit.id === unitIdParam);
            // Check if service exists
            const serviceExists = services.some(service => service.id === serviceIdParam);

            if (unitExists && serviceExists) {
                // Pre-fill form and open it
                setMeterForm({
                    unitId: unitIdParam,
                    serviceId: serviceIdParam,
                    installedAt: '',
                });
                setMeterFormVisible(true);

                // Scroll to meter form after a short delay to ensure it's rendered
                setTimeout(() => {
                    const meterFormElement = document.querySelector('[data-meter-form]');
                    if (meterFormElement) {
                        meterFormElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 300);

                // Clean up URL params after opening form
                const newParams = new URLSearchParams(searchParams.toString());
                newParams.delete('unitId');
                newParams.delete('serviceId');
                const newUrl = newParams.toString()
                    ? `${window.location.pathname}?${newParams.toString()}`
                    : window.location.pathname;
                router.replace(newUrl, { scroll: false });
            }
        }
    }, [searchParams, units, services, router]);

    const maxFloorFromUnits = useMemo(() => {
        const floors = units.map(unit => unit.floor).filter(floor => floor != null && !Number.isNaN(floor)) as number[];
        return floors.length > 0 ? Math.max(...floors) : null;
    }, [units]);

    const displayFloorsMax = useMemo(() => {
        // Use buildingData.floorsMax if available, otherwise calculate from units
        if (buildingData?.floorsMax != null && buildingData.floorsMax !== undefined) {
            return buildingData.floorsMax.toString();
        }
        if (maxFloorFromUnits != null) {
            return maxFloorFromUnits.toString();
        }
        return "";
    }, [buildingData?.floorsMax, maxFloorFromUnits]);

    const floorOptions = useMemo(() => {
        const floors = new Set<string>();
        units.forEach(unit => {
            if (unit.floor !== undefined && unit.floor !== null) {
                floors.add(unit.floor.toString());
            }
        });
        return Array.from(floors).sort((a, b) => parseInt(a) - parseInt(b));
    }, [units]);

    const filteredUnits = useMemo(() => {
        let result = units;
        if (selectedFloor) {
            result = result.filter(unit => unit.floor?.toString() === selectedFloor);
        }
        return result.sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }));
    }, [units, selectedFloor]);

    const paginatedUnits = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredUnits.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredUnits, currentPage]);

    const totalPages = Math.ceil(filteredUnits.length / itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedFloor]);

    const handleBack = () => {
        router.push(`/base/building/buildingList`);
    }

    const handleDelete = () => {
        setIsPopupOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!buildingId || typeof buildingId !== 'string') {
            setIsPopupOpen(false);
            return;
        }

        const success = await deleteBuildingById(buildingId);

        setIsPopupOpen(false);
        if (success) {
            router.push(`/base/building/buildingList`);
        }
    };

    const handleClosePopup = () => {
        setIsPopupOpen(false);
    };

    const onDownloadUnitTemplate = async () => {
        try {
            const blob = await downloadUnitImportTemplate();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "unit_import_template.xlsx";
            a.click();
            URL.revokeObjectURL(url);
        } catch (e: any) {
            setImportError(e?.response?.data?.message || t('messages.failedToDownloadTemplate'));
        }
    };

    const onExportUnits = async () => {
        if (!buildingId || typeof buildingId !== 'string') return;
        try {
            const blob = await exportUnits(buildingId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `units_export_${buildingData?.code || buildingId}_${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e: any) {
            setImportError(e?.response?.data?.message || t('messages.failedToExportExcel'));
        }
    };

    const onPickUnitFile = () => {
        setImportError(null);
        setImportResult(null);
        fileInputRef.current?.click();
    };

    const onUnitFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setImporting(true);
        setImportError(null);
        setImportResult(null);
        try {
            const res = await importUnits(f);
            setImportResult(res);
        } catch (e: any) {
            console.error('Import units error:', e);
            let errorMessage = t('messages.importFailed');

            if (e?.response?.data) {
                // Try to get error message from different possible locations
                errorMessage = e.response.data.message
                    || e.response.data.error
                    || e.response.data
                    || errorMessage;

                // If it's an object, try to stringify it
                if (typeof errorMessage === 'object') {
                    errorMessage = JSON.stringify(errorMessage);
                }
            } else if (e?.message) {
                errorMessage = e.message;
            } else if (e?.response?.statusText) {
                errorMessage = `${e.response.status} ${e.response.statusText}`;
            }

            setImportError(errorMessage);
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const openMeterDatePicker = () => {
        const input = meterDateInputRef.current;
        if (!input) return;
        input.showPicker?.();
        input.focus();
    };

    const onExportMeters = async () => {
        if (!buildingId || typeof buildingId !== 'string') return;
        try {
            const blob = await exportMeters(buildingId);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `meters_export_${buildingData?.code || buildingId}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            setImportError(err?.response?.data?.message || t('messages.failedToExportMeterExcel'));
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans">
            <PopupConfirm
                isOpen={isPopupOpen}
                onClose={handleClosePopup}
                onConfirm={handleConfirmDelete}
                popupTitle={t('deleteBuilding')}
                popupContext={t('deleteBuildingConfirm')}
                isDanger={true}
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
                    <span className="font-semibold">{t('return')}</span>
                </button>
            </div>

            <div className="mx-auto max-w-5xl space-y-6">
                {/* Main Building Info Card */}
                <div className="relative z-10 overflow-visible rounded-3xl border border-white/50 bg-white/80 shadow-xl shadow-slate-200/50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="border-b border-slate-100 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                {t('buildingDetail.title')}
                            </h1>
                            <div className="mt-2 flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${buildingData?.status === 'Inactive'
                                    ? 'bg-slate-100 text-slate-600 ring-slate-200'
                                    : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                    }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${buildingData?.status === 'Inactive' ? 'bg-slate-400' : 'bg-emerald-500'
                                        }`} />
                                    {buildingData?.status === 'Inactive' ? t('inactive') : t('active')}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => router.push('/base/unit/unitNew')}
                                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                {tUnits('addUnit')}
                            </button>
                            <button
                                onClick={() => router.push(`/base/building/buildingEdit/${buildingId}`)}
                                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 shadow-sm hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                                title="Edit Building"
                            >
                                <Edit className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 md:p-8">
                        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
                            <div className="group space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-emerald-500" />
                                    {t('buildingCode')}
                                </label>
                                <div className="h-11 w-full flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 shadow-sm">
                                    {buildingData?.code ?? ""}
                                </div>
                            </div>

                            <div className="group space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-emerald-500" />
                                    {t('buildingName')}
                                </label>
                                <div className="h-11 w-full flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 shadow-sm">
                                    {buildingData?.name ?? ""}
                                </div>
                            </div>

                            <div className="group space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-emerald-500" />
                                    {t('address')}
                                </label>
                                <div className="h-11 w-full flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 shadow-sm">
                                    {buildingData?.address ?? ""}
                                </div>
                            </div>

                            <div className="group space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-emerald-500" />
                                    {t('buildingDetail.floorsLabel')}
                                </label>
                                <div className="h-11 w-full flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 shadow-sm">
                                    {displayFloorsMax}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Units List Section */}
                <div className="relative z-10 overflow-visible rounded-3xl border border-white/50 bg-white/80 shadow-xl shadow-slate-200/50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-8 duration-500">
                    <div className="border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-xl font-bold text-slate-800">
                            {tUnits('unitList')}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx"
                                className="hidden"
                                onChange={onUnitFileChange}
                            />
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={onDownloadUnitTemplate}
                                    className="p-2 rounded-md hover:bg-white hover:shadow-sm text-slate-600 hover:text-emerald-600 transition-all text-sm font-medium flex items-center gap-2"
                                    title={t('downloadUnitTemplate')}
                                >
                                    <Download className="h-4 w-4" />
                                    <span className="hidden sm:inline">Template</span>
                                </button>
                                <button
                                    onClick={onPickUnitFile}
                                    disabled={importing}
                                    className="p-2 rounded-md hover:bg-white hover:shadow-sm text-slate-600 hover:text-emerald-600 transition-all text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                                    title={importing ? t('importing') : t('selectExcelFile')}
                                >
                                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                    <span className="hidden sm:inline">Import</span>
                                </button>
                                <button
                                    onClick={onExportUnits}
                                    className="p-2 rounded-md hover:bg-white hover:shadow-sm text-slate-600 hover:text-emerald-600 transition-all text-sm font-medium flex items-center gap-2"
                                    title="Export Excel"
                                >
                                    <FileSpreadsheet className="h-4 w-4" />
                                    <span className="hidden sm:inline">Export</span>
                                </button>
                            </div>

                            <button
                                onClick={() => router.push(`/base/unit/unitNew?buildingId=${buildingId}`)}
                                className="hidden sm:flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                {tUnits('addUnit')}
                            </button>

                            <button
                                onClick={() => {
                                    setMeterStatus(null);
                                    setMeterFormVisible(prev => !prev);
                                }}
                                className={`flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all border ${meterFormVisible
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
                                    }`}
                            >
                                <Gauge className="mr-2 h-4 w-4" />
                                {t('addMeter')}
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {meterFormVisible && (
                            <div className="mb-8 p-6 bg-slate-50/50 rounded-2xl border border-slate-100" data-meter-form>
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        setMeterStatus(null);
                                        if (!meterForm.unitId || !meterForm.serviceId) {
                                            setMeterStatus(t('messages.pleaseSelectUnitAndService'));
                                            return;
                                        }

                                        // Validate installation date is not in the future
                                        if (meterForm.installedAt) {
                                            const installedDate = new Date(meterForm.installedAt);
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            installedDate.setHours(0, 0, 0, 0);

                                            if (installedDate > today) {
                                                setMeterStatus(t('messages.installedDateFuture') || 'Ngày lắp đặt không thể là ngày tương lai');
                                                return;
                                            }
                                        }

                                        setCreatingMeter(true);
                                        try {
                                            await createMeter({
                                                unitId: meterForm.unitId,
                                                serviceId: meterForm.serviceId,
                                                installedAt: meterForm.installedAt || undefined,
                                            });
                                            setMeterStatus(t('messages.meterAddedSuccess'));
                                            // Reload units without meter for the current service
                                            if (typeof buildingId === 'string') {
                                                const updatedUnits = await getUnitsWithoutMeter(meterForm.serviceId, buildingId);
                                                setUnitsWithoutMeter(updatedUnits);
                                            }
                                            // Reset form but keep service selected
                                            setMeterForm({
                                                unitId: '',
                                                serviceId: meterForm.serviceId,
                                                installedAt: '',
                                            });
                                        } catch (err: any) {
                                            console.error('Failed to create meter:', err);
                                            setMeterStatus(err?.response?.data?.message || t('messages.failedToCreateMeter'));
                                        } finally {
                                            setCreatingMeter(false);
                                        }
                                    }}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700">{t('service')}</label>
                                            <select
                                                value={meterForm.serviceId}
                                                onChange={(e) => {
                                                    setMeterForm(prev => ({
                                                        ...prev,
                                                        serviceId: e.target.value,
                                                        unitId: '' // Reset unit when service changes
                                                    }));
                                                }}
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                            >
                                                <option value="">{t('selectService')}</option>
                                                {services.map(service => (
                                                    <option key={service.id} value={service.id}>
                                                        {service.name} ({service.code})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700">{t('unit')}</label>
                                            <select
                                                value={meterForm.unitId}
                                                onChange={(e) => setMeterForm(prev => ({ ...prev, unitId: e.target.value }))}
                                                disabled={!meterForm.serviceId || loadingUnitsWithoutMeter}
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                            >
                                                <option value="">
                                                    {!meterForm.serviceId
                                                        ? 'Chọn dịch vụ trước'
                                                        : loadingUnitsWithoutMeter
                                                            ? t('loading')
                                                            : unitsWithoutMeter.length === 0
                                                                ? 'Tất cả căn hộ đã có công tơ'
                                                                : t('selectUnit')
                                                    }
                                                </option>
                                                {unitsWithoutMeter.map(unit => (
                                                    <option key={unit.unitId} value={unit.unitId}>
                                                        {unit.unitCode}{unit.floor != null ? ` (${t('buildingDetail.floorN', { n: unit.floor })})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {loadingUnitsWithoutMeter && (
                                                <div className="text-xs text-slate-500">Đang tải danh sách căn hộ...</div>
                                            )}
                                            {!loadingUnitsWithoutMeter && meterForm.serviceId && unitsWithoutMeter.length === 0 && (
                                                <div className="text-xs text-emerald-600 font-medium">✓ Tất cả căn hộ đã có công tơ</div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <span className="block text-sm font-semibold text-slate-700">{t('installedDate')}</span>
                                            <div className="relative">
                                                <input
                                                    ref={meterDateInputRef}
                                                    type="date"
                                                    value={meterForm.installedAt}
                                                    max={new Date().toISOString().split('T')[0]}
                                                    onChange={(e) => setMeterForm(prev => ({ ...prev, installedAt: e.target.value }))}
                                                    className="absolute inset-0 opacity-0 pointer-events-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={openMeterDatePicker}
                                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                >
                                                    {meterForm.installedAt || 'mm/dd/yyyy'}
                                                </button>
                                            </div>
                                            <span className="text-xs text-slate-500">{t('messages.installedDateHelper') || 'Ngày lắp đặt phải là hôm nay hoặc trước đó'}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <button
                                            type="button"
                                            onClick={onExportMeters}
                                            className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-sm font-medium flex items-center gap-2"
                                        >
                                            <Download className="h-4 w-4" />
                                            {t('exportMeterExcel')}
                                        </button>

                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setMeterFormVisible(false)}
                                                className="px-6 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition"
                                            >
                                                {t('cancel')}
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={creatingMeter}
                                                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 flex items-center gap-2"
                                            >
                                                {creatingMeter ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                {creatingMeter ? t('creating') : t('saveMeter')}
                                            </button>
                                        </div>
                                    </div>

                                    {meterStatus && (
                                        <div className={`mt-4 p-3 rounded-xl border ${meterStatus.includes('thành công') || meterStatus.includes('successfully')
                                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                            : 'bg-red-50 border-red-100 text-red-700'
                                            } flex items-center gap-2 text-sm`}>
                                            {meterStatus.includes('thành công') || meterStatus.includes('successfully')
                                                ? <CheckCircle2 className="h-5 w-5" />
                                                : <AlertCircle className="h-5 w-5" />
                                            }
                                            {meterStatus}
                                        </div>
                                    )}
                                </form>
                            </div>
                        )}

                        {importError && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl relative overflow-hidden">
                                <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
                                    <XCircle className="w-5 h-5" />
                                    <span>Lỗi import:</span>
                                </div>
                                <p className="text-red-600 text-sm ml-7">{importError}</p>
                            </div>
                        )}

                        {importResult && (
                            <div className="mb-6">
                                {importResult.hasValidationErrors && importResult.validationErrors && importResult.validationErrors.length > 0 ? (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                        <div className="flex items-center gap-2 text-red-700 font-semibold text-lg mb-3">
                                            <AlertCircle className="w-5 h-5" />
                                            <span>Lỗi template/định dạng file</span>
                                        </div>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            {importResult.validationErrors.map((err, idx) => (
                                                <li key={idx} className="text-red-600 text-sm">{err}</li>
                                            ))}
                                        </ul>
                                        <div className="mt-4 pt-3 border-t border-red-200 text-sm text-red-700 font-medium">
                                            💡 Vui lòng tải template mẫu và kiểm tra lại file Excel của bạn.
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`p-4 rounded-xl border ${importResult.errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                        <div className={`flex items-center gap-2 font-semibold ${importResult.errorCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                            {importResult.errorCount > 0 ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                                            {t('totalRows', { totalRows: importResult.totalRows, successCount: importResult.successCount, errorCount: importResult.errorCount })}
                                        </div>

                                        {importResult.rows.length > 0 && (
                                            <div className="mt-4 max-h-96 overflow-auto border border-white/50 rounded-lg bg-white shadow-sm">
                                                <table className="min-w-full divide-y divide-slate-100">
                                                    <thead className="bg-slate-50 sticky top-0">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Dòng</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Thông báo</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Unit Code</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {importResult.rows.map((r, i) => (
                                                            <tr key={i} className={r.success ? 'bg-emerald-50/50' : 'bg-red-50/50'}>
                                                                <td className="px-4 py-2 text-sm font-medium text-slate-900">{r.rowNumber}</td>
                                                                <td className="px-4 py-2 text-sm">
                                                                    {r.success ? (
                                                                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-xs">
                                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Thành công
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-red-700 font-medium text-xs">
                                                                            <XCircle className="w-3.5 h-3.5" /> Lỗi
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className={`px-4 py-2 text-sm ${r.success ? 'text-slate-600' : 'text-red-600'}`}>{r.message}</td>
                                                                <td className="px-4 py-2 text-sm text-slate-600">{r.code || '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Floor Selection */}
                        <div className="mb-6 overflow-x-auto pb-2">
                            <div className="flex gap-2 min-w-max">
                                <button
                                    onClick={() => setSelectedFloor(null)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedFloor === null
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                        : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200'
                                        }`}
                                >
                                    {t('buildingDetail.allFloors')}
                                </button>
                                {floorOptions.map(floor => (
                                    <button
                                        key={floor}
                                        onClick={() => setSelectedFloor(floor)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedFloor === floor
                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                            : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200'
                                            }`}
                                    >
                                        {t('buildingDetail.floorN', { n: floor })}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Loading State */}
                        {loadingUnits ? (
                            <div className="flex justify-center items-center py-12">
                                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                            </div>
                        ) : unitsError ? (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-center">
                                {unitsError}
                            </div>
                        ) : filteredUnits.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <div className="p-3 bg-slate-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                                    <Layers className="w-6 h-6 text-slate-400" />
                                </div>
                                <p className="text-slate-500 font-medium">Chưa có căn hộ nào{selectedFloor ? ` ở tầng ${selectedFloor}` : ''}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                                {paginatedUnits.map((unit) => {
                                    const household = householdsMap[unit.id];
                                    const residentName = primaryResidentNamesMap[unit.id];
                                    const isInactive = unit.status?.toUpperCase() === 'INACTIVE';

                                    return (
                                        <div
                                            key={unit.id}
                                            onClick={() => router.push(`/base/unit/unitDetail/${unit.id}`)}
                                            className={`group relative bg-white rounded-2xl p-4 border transition-all cursor-pointer hover:shadow-lg ${isInactive
                                                ? 'border-slate-200 opacity-75 hover:border-slate-300'
                                                : 'border-slate-200 hover:border-emerald-200 hover:ring-1 hover:ring-emerald-200/50'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className={`p-2 rounded-xl ${isInactive ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${isInactive
                                                    ? 'bg-slate-50 text-slate-500 border-slate-100'
                                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    }`}>
                                                    {isInactive ? t('inactive') : t('active')}
                                                </span>
                                            </div>

                                            <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">
                                                {unit.code}
                                            </h3>

                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center text-sm text-slate-600">
                                                    <Layers className="w-4 h-4 mr-2 text-slate-400" />
                                                    {t('buildingDetail.floorN', { n: unit.floor })}
                                                </div>
                                                <div className="flex items-center text-sm text-slate-600">
                                                    <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                                                    {unit.areaM2} m² • {unit.bedrooms} PN
                                                </div>
                                            </div>

                                            {residentName && (
                                                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-700 font-medium">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    {residentName}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {filteredUnits.length > 0 && (
                            <div className="mt-8">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

