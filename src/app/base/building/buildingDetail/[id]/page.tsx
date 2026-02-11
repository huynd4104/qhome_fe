'use client'
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import Delete from '@/src/assets/Delete.svg';
import Edit from '@/src/assets/Edit.svg';
import EditTable from '@/src/assets/EditTable.svg';
import DetailField from '@/src/components/base-service/DetailField';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useBuildingDetailPage } from '@/src/hooks/useBuildingDetailPage';
import { useAuth } from '@/src/contexts/AuthContext';
import { getUnitsByBuildingId } from '@/src/services/base/buildingService';
import { Unit } from '@/src/types/unit';
import { fetchCurrentHouseholdByUnit, fetchHouseholdMembersByHousehold, type HouseholdDto, type HouseholdMemberDto } from '@/src/services/base/householdService';
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
import FormulaPopup from '@/src/components/common/FormulaPopup';
import { downloadUnitImportTemplate, importUnits, exportUnits, type UnitImportResponse } from '@/src/services/base/unitImportService';

export default function BuildingDetail () {

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
    const [householdsMap, setHouseholdsMap] = useState<Record<string, HouseholdDto | null>>({});
    const [primaryResidentNamesMap, setPrimaryResidentNamesMap] = useState<Record<string, string | null>>({});
    const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
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
        console.log('buildingData', buildingData);
        const loadUnits = async () => {
            if (!buildingId || typeof buildingId !== 'string') return;
            
            try {
                setLoadingUnits(true);
                setUnitsError(null);
                const data = await getUnitsByBuildingId(buildingId);
                const activeUnits = data.filter(unit => unit.status?.toUpperCase() === 'ACTIVE');
                setUnits(activeUnits);
                
                // Load current household for each unit
                const householdsData: Record<string, HouseholdDto | null> = {};
                const residentNamesData: Record<string, string | null> = {};
                
                await Promise.all(
                    activeUnits.map(async (unit) => {
                        try {
                            const household = await fetchCurrentHouseholdByUnit(unit.id);
                            householdsData[unit.id] = household;
                            
                            // Get primary resident name from resident table only
                            let primaryName: string | null = null;
                            console.log('household', household);
                            if (household?.primaryResidentId) {
                                try {
                                    const resident = await fetchResidentById(household.primaryResidentId);
                                    console.log('resident', resident);
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
                            if (err && typeof err === 'object' && 'response' in err && (err as any).response?.status === 404) {
                                householdsData[unit.id] = null;
                                residentNamesData[unit.id] = null;
                            } else {
                                console.error(`Failed to load household for unit ${unit.id}:`, err);
                                householdsData[unit.id] = null;
                                residentNamesData[unit.id] = null;
                            }
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

    const floorOptions = useMemo(() => {
        const uniqueFloors = Array.from(new Set(units.map(unit => unit.floor?.toString()).filter(Boolean)));
        return uniqueFloors.sort((a, b) => {
            const na = Number(a);
            const nb = Number(b);
            if (Number.isNaN(na) || Number.isNaN(nb)) {
                return a.localeCompare(b);
            }
            return na - nb;
        });
    }, [units]);

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

    const filteredUnits = selectedFloor
        ? units.filter(unit => unit.floor?.toString() === selectedFloor)
        : units;

    // Helper function to get primary resident name from current household
    const getPrimaryResidentName = (unitId: string): string | null => {
        return primaryResidentNamesMap[unitId] || null;
    };

    useEffect(() => {
        if (selectedFloor && !floorOptions.includes(selectedFloor)) {
            setSelectedFloor(null);
        }
    }, [floorOptions, selectedFloor]);
    
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
        <div className={`min-h-screen p-4 sm:p-8 font-sans`}>
            <PopupConfirm
                isOpen={isPopupOpen}
                onClose={handleClosePopup}
                onConfirm={handleConfirmDelete}
                popupTitle={t('deleteBuilding')}
                popupContext={t('deleteBuildingConfirm')}
                isDanger={true}
            />
            <div className="max-w-4xl mx-auto mb-6 flex items-center cursor-pointer" onClick={handleBack}>
                <Image 
                    src={Arrow} 
                    alt="Back" 
                    width={20} 
                    height={20}
                    className="w-5 h-5 mr-2" 
                />
                <span className={`text-[#02542D] font-bold text-2xl hover:text-opacity-80 transition duration-150 `}>
                    {t('return')}
                </span>
            </div>

            <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200">
                
                <div className="flex justify-between items-start border-b pb-4 mb-6">
                    <div className="flex items-center">
                        <h1 className={`text-2xl font-semibold text-[#02542D] mr-3`}>
                            {t('buildingDetail')}
                        </h1>
                        <span 
                            className={`text-sm font-semibold px-3 py-1 rounded-full ${buildingData?.status === 'Inactive' ? 'bg-[#EEEEEE] text-[#02542D]' : 'bg-[#739559] text-white'}`}
                        >
                            {buildingData?.status === 'Inactive' ? t('inactive') : t('active')}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => router.push('/base/unit/unitNew')}
                            className="px-4 py-2 rounded-lg bg-[#14AE5C] text-white text-sm font-medium hover:bg-[#0c793f] transition duration-150 flex items-center gap-2"
                        >
                            {tUnits('addUnit')}
                        </button>
                        <button 
                            className={`p-2 rounded-lg bg-[#739559] hover:bg-opacity-80 transition duration-150`}
                            onClick={() => router.push(`/base/building/buildingEdit/${buildingId}`)}
                        >
                            <Image 
                                src={Edit} 
                                alt="Edit" 
                                width={24} 
                                height={24}
                                className="w-6 h-6" 
                            />
                        </button>
                        {/* <button 
                            className="p-2 rounded-lg bg-red-500 hover:bg-opacity-80 transition duration-150"
                            onClick={handleDelete}
                        >
                            <Image 
                                src={Delete} 
                                alt="Delete" 
                                width={24} 
                                height={24}
                                className="w-6 h-6" 
                            />
                        </button> */}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    
                    <DetailField 
                        label={t('buildingCode')}
                        value={buildingData?.code ?? ""} 
                        readonly={true}
                    />
                    {/* <div className="col-span-1 hidden md:block"></div> */}

                    <DetailField 
                        label={t('buildingName')}
                        value={buildingData?.name ?? ""} 
                        readonly={true}
                    />

                    <DetailField 
                        label={t('address')}
                        value={buildingData?.address ?? ""} 
                        readonly={true}
                    />
                    <DetailField 
                        label="Số tầng"
                        value={displayFloorsMax} 
                        readonly={true}
                    />

                    {/* <DetailField 
                        label={t('createAt')}
                        value={buildingData?.createdAt ?? ""} 
                        readonly={true}
                    />
                    
                    <DetailField 
                        label={t('createBy')} 
                        value={buildingData?.createdBy ?? ""} 
                        readonly={true}
                    /> */}
                    
                </div>
            </div>

            {/* Units List Section */}
            <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200 mt-6">
                <div className="border-b pb-4 mb-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-[#02542D]">
                            {tUnits('unitList')}
                        </h2>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onDownloadUnitTemplate}
                                className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 transition text-sm"
                            >
                                {t('downloadUnitTemplate')}
                            </button>
                            <button
                                onClick={onPickUnitFile}
                                disabled={importing}
                                className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition text-sm disabled:opacity-50"
                            >
                                {importing ? t('importing') : t('selectExcelFile')}
                            </button>
                            <button
                                onClick={onExportUnits}
                                className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition text-sm"
                            >
                                Xuất Excel
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx"
                                className="hidden"
                                onChange={onUnitFileChange}
                            />
                            <button
                                onClick={() => router.push(`/base/unit/unitNew?buildingId=${buildingId}`)}
                                className="px-4 py-2 bg-[#14AE5C] text-white text-sm rounded-lg hover:bg-[#0c793f] transition flex items-center gap-2 shadow-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                {tUnits('addUnit')}
                            </button>
                            <button
                                onClick={() => {
                                    setMeterStatus(null);
                                    setMeterFormVisible(prev => !prev);
                                }}
                                className="px-4 py-2 bg-[#1f8b4e] text-white rounded-lg hover:bg-[#166333] transition text-sm flex items-center gap-2 shadow-sm"
                            >
                                <span className="text-sm font-semibold">{t('addMeter')}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {meterFormVisible && (
                    <div className="border-b pb-4 mb-6 relative z-10" data-meter-form>
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                <label className="text-sm text-gray-600">
                                    {t('service')}
                                    <select
                                        value={meterForm.serviceId}
                                        onChange={(e) => {
                                            setMeterForm(prev => ({ 
                                                ...prev, 
                                                serviceId: e.target.value,
                                                unitId: '' // Reset unit when service changes
                                            }));
                                        }}
                                        className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#739559] focus:border-[#739559]"
                                    >
                                        <option value="">{t('selectService')}</option>
                                        {services.map(service => (
                                            <option key={service.id} value={service.id}>
                                                {service.name} ({service.code})
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-sm text-gray-600">
                                    {t('unit')}
                                    <select
                                        value={meterForm.unitId}
                                        onChange={(e) => setMeterForm(prev => ({ ...prev, unitId: e.target.value }))}
                                        disabled={!meterForm.serviceId || loadingUnitsWithoutMeter}
                                        className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#739559] focus:border-[#739559] relative z-20"
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
                                                {unit.unitCode}{unit.floor != null ? ` (Tầng ${unit.floor})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {loadingUnitsWithoutMeter && (
                                        <div className="text-xs text-gray-500 mt-1">Đang tải danh sách căn hộ chưa có công tơ...</div>
                                    )}
                                    {!loadingUnitsWithoutMeter && meterForm.serviceId && unitsWithoutMeter.length === 0 && (
                                        <div className="text-xs text-green-600 mt-1">✓ Tất cả căn hộ đã có công tơ cho dịch vụ này</div>
                                    )}
                                </label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <div className="text-sm text-gray-600">
                                    <span className="block mb-1">{t('installedDate')}</span>
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
                                            className="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-left bg-white"
                                        >
                                            {meterForm.installedAt || 'mm/dd/yyyy'}
                                        </button>
                                    </div>
                                    <span className="text-xs text-gray-500 mt-1">{t('messages.installedDateHelper') || 'Ngày lắp đặt phải là hôm nay hoặc trước đó'}</span>
                                </div>
                            </div>
                                <div className="flex flex-wrap gap-3 mb-3">
                                    <button
                                        type="button"
                                        onClick={onExportMeters}
                                        className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition text-sm"
                                    >
                                        {t('exportMeterExcel')}
                                    </button>
                                </div>
                            {meterStatus && (
                                <div className={`text-sm mb-3 ${
                                    meterStatus.includes('thành công') || meterStatus.includes('successfully') 
                                        ? 'text-green-600' 
                                        : 'text-red-600'
                                }`}>
                                    {meterStatus}
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={creatingMeter}
                                    className="px-4 py-2 bg-[#02542D] text-white rounded-lg text-sm hover:bg-[#024428] transition"
                                >
                                    {creatingMeter ? t('creating') : t('saveMeter')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMeterFormVisible(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition"
                                >
                                    {t('cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}


                {importError && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="font-semibold">Lỗi import:</span>
                        </div>
                        <p className="mt-1 text-red-600 text-sm">{importError}</p>
                    </div>
                )}
                {importResult && (
                    <div className="mb-4">
                        {/* Validation Errors */}
                        {importResult.hasValidationErrors && importResult.validationErrors && importResult.validationErrors.length > 0 && (
                            <div className="mb-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center gap-2 text-red-700 mb-3">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-semibold text-lg">Lỗi template/định dạng file</span>
                                </div>
                                <ul className="list-disc list-inside space-y-1">
                                    {importResult.validationErrors.map((err, idx) => (
                                        <li key={idx} className="text-red-600 text-sm">{err}</li>
                                    ))}
                                </ul>
                                <div className="mt-3 pt-3 border-t border-red-200">
                                    <p className="text-red-700 text-sm font-medium">
                                        💡 Vui lòng tải template mẫu và kiểm tra lại file Excel của bạn.
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {/* Summary - Only show if no validation errors */}
                        {!importResult.hasValidationErrors && (
                            <div className="mb-3 p-3 rounded-lg border" style={{
                                backgroundColor: importResult.errorCount > 0 ? '#fef2f2' : '#f0fdf4',
                                borderColor: importResult.errorCount > 0 ? '#fecaca' : '#bbf7d0'
                            }}>
                                <div className="flex items-center gap-2 mb-1">
                                    {importResult.errorCount > 0 ? (
                                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                    <span className={`font-semibold ${importResult.errorCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                        {t('totalRows', { totalRows: importResult.totalRows, successCount: importResult.successCount, errorCount: importResult.errorCount })}
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {/* Results Table - Only show if no validation errors */}
                        {!importResult.hasValidationErrors && importResult.rows.length > 0 && (
                        <div className="max-h-96 overflow-auto border rounded-lg shadow-sm">
                            <table className="min-w-full">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">Dòng</th>
                                        <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">Trạng thái</th>
                                        <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">Thông báo</th>
                                        <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">Unit ID</th>
                                        <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">Mã căn hộ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importResult.rows.map((r, i) => (
                                        <tr 
                                            key={i}
                                            className={r.success ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'}
                                        >
                                            <td className="border px-3 py-2 text-sm font-medium">{r.rowNumber}</td>
                                            <td className="border px-3 py-2 text-sm">
                                                {r.success ? (
                                                    <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                        Thành công
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                        </svg>
                                                        Lỗi
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`border px-3 py-2 text-sm ${r.success ? 'text-green-800' : 'text-red-800 font-medium'}`}>
                                                {r.message}
                                            </td>
                                            <td className="border px-3 py-2 text-sm text-gray-600">{r.unitId || '—'}</td>
                                            <td className="border px-3 py-2 text-sm text-gray-600">{r.code || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        )}
                    </div>
                )}

                {loadingUnits ? (
                    <div className="text-center py-8 text-gray-500">{t('loading')}</div>
                ) : unitsError ? (
                    <div className="text-center py-8 text-red-500">{unitsError}</div>
                ) : units.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">{tUnits('noUnit')}</div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {floorOptions.length > 0 && (
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-4 py-3 border-b border-gray-200">
                                <div className="text-sm text-gray-600">
                                    Hiện {filteredUnits.length} trên tổng {units.length} căn hộ
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <label htmlFor="floorFilter" className="font-medium text-gray-700">
                                        Chọn tầng
                                    </label>
                                    <select
                                        id="floorFilter"
                                        value={selectedFloor ?? ''}
                                        onChange={(e) => setSelectedFloor(e.target.value || null)}
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                    >
                                        <option value="">Tất cả tầng</option>
                                        {floorOptions.map(floor => (
                                            <option key={floor} value={floor}>
                                                {floor}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">{tUnits('unitCode')}</th>
                                    <th className="px-4 py-3 text-center font-medium text-gray-600">{tUnits('floor')}</th>
                                    <th className="px-4 py-3 text-center font-medium text-gray-600">{tUnits('areaM2')}</th>
                                    <th className="px-4 py-3 text-center font-medium text-gray-600">{tUnits('status')}</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600">{tUnits('ownerName')}</th>
                                    <th className="px-4 py-3 text-center font-medium text-gray-600">{tUnits('action')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredUnits.map((unit) => (
                                    <tr key={unit.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-[#739559]">{unit.code}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">{unit.floor}</td>
                                        <td className="px-4 py-3 text-center">{unit.areaM2 || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                unit.status === 'ACTIVE' || unit.status === 'Active'
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {unit.status ? tUnits(unit.status.toLowerCase() ?? '') : ''}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {getPrimaryResidentName(unit.id) || '-'}
                                                </div>
                                                {unit.ownerContact && (
                                                    <div className="text-xs text-gray-500">{unit.ownerContact ? unit.ownerContact : '-'}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center">
                                                <Link href={`/base/unit/unitDetail/${unit.id}`}>
                                                    <button 
                                                        className="hover:bg-opacity-80 transition duration-150"
                                                    >
                                                        <Image 
                                                            src={EditTable} 
                                                            alt="View Detail" 
                                                            width={24} 
                                                            height={24}
                                                        />
                                                    </button>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};




