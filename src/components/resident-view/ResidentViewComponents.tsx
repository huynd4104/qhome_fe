'use client';

import { useState, useEffect } from 'react';
import {
    getBuildingsByYear,
    getFloorsByYearAndBuilding,
    getUnitsByYearBuildingAndFloor,
    getResidentsByUnit,
    exportResidents,
    importResidents,
    downloadTemplate,
    ResidentViewYearDto,
    ResidentViewBuildingDto,
    ResidentViewFloorDto,
    ResidentViewUnitDto,
    ResidentViewResidentDto
} from '@/src/services/base/residentViewService';
import { ChevronDown, ChevronRight, User, Home, Building as BuildingIcon, Layers, FileSpreadsheet, X, Users, Phone, Mail, FileText, Upload, Download, IdCard } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ExpandableRowProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
    children?: React.ReactNode;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
}

const ExpandableRow = ({ title, subtitle, isExpanded, onToggle, children, icon, actions }: ExpandableRowProps) => (
    <div className="border border-slate-200 rounded-lg mb-2 overflow-hidden shadow-sm bg-white">
        <div
            className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
            onClick={onToggle}
        >
            <div className="flex items-center gap-3">
                <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
                {icon && <div className="text-emerald-600">{icon}</div>}
                <div>
                    <div className="font-semibold text-slate-800">{title}</div>
                    {subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}
                </div>
            </div>
            <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                {actions}
            </div>
        </div>
        {isExpanded && (
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 pl-8">
                {children}
            </div>
        )}
    </div>
);

export const YearRow = ({ yearData }: { yearData: ResidentViewYearDto }) => {
    const t = useTranslations('ResidentDirectory');
    const [isExpanded, setIsExpanded] = useState(false);
    const [buildings, setBuildings] = useState<ResidentViewBuildingDto[]>([]);
    const [loading, setLoading] = useState(false);

    const handleToggle = async () => {
        if (!isExpanded && buildings.length === 0) {
            setLoading(true);
            try {
                const data = await getBuildingsByYear(yearData.year);
                setBuildings(data);
            } catch (error) {
                console.error("Failed to load buildings", error);
            } finally {
                setLoading(false);
            }
        }
        setIsExpanded(!isExpanded);
    };

    const handleExport = async () => {
        try {
            const blob = await exportResidents(yearData.year);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `residents_${yearData.year}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Export failed", error);
        }
    };

    return (
        <ExpandableRow
            title={`${t('year')} ${yearData.year}`}
            subtitle={`${t('totalResidents')}: ${yearData.totalResidents} • ${t('occupiedUnits')}: ${yearData.occupiedUnits}`}
            isExpanded={isExpanded}
            onToggle={handleToggle}
            // icon={<span className="font-bold text-lg text-emerald-700">{yearData.year}</span>} // Or maybe calendar icon? But text is clear.
            actions={
                <button
                    onClick={handleExport}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                    title={t('exportExcel')}
                >
                    <FileSpreadsheet className="w-5 h-5" />
                </button>
            }
        >
            {loading ? (
                <div className="text-center py-4 text-slate-500">{t('loading')}...</div>
            ) : (
                <div className="space-y-2">
                    {buildings.map(building => (
                        <BuildingRow key={building.buildingId} building={building} year={yearData.year} />
                    ))}
                    {buildings.length === 0 && !loading && (
                        <div className="text-center py-4 text-slate-500">{t('noData')}</div>
                    )}
                </div>
            )}
        </ExpandableRow>
    );
};

export const BuildingRow = ({ building, year }: { building: ResidentViewBuildingDto, year: number }) => {
    const t = useTranslations('ResidentDirectory');
    const [isExpanded, setIsExpanded] = useState(false);
    const [floors, setFloors] = useState<ResidentViewFloorDto[]>([]);
    const [loading, setLoading] = useState(false);

    const handleToggle = async () => {
        if (!isExpanded && floors.length === 0) {
            setLoading(true);
            try {
                const data = await getFloorsByYearAndBuilding(year, building.buildingId);
                // Sort floors nicely? usually number
                setFloors(data.sort((a, b) => a.floor - b.floor));
            } catch (error) {
                console.error("Failed to load floors", error);
            } finally {
                setLoading(false);
            }
        }
        setIsExpanded(!isExpanded);
    };

    const handleExport = async () => {
        try {
            const blob = await exportResidents(year, building.buildingId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `residents_${year}_${building.buildingCode}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Export failed", error);
        }
    };

    return (
        <ExpandableRow
            title={building.buildingName}
            subtitle={`${t('code')}: ${building.buildingCode} • ${t('residents')}: ${building.totalResidents}`}
            isExpanded={isExpanded}
            onToggle={handleToggle}
            icon={<BuildingIcon className="w-5 h-5" />}
            actions={
                <button
                    onClick={handleExport}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                    title={t('exportExcel')}
                >
                    <FileSpreadsheet className="w-5 h-5" />
                </button>
            }
        >
            {loading ? (
                <div className="text-center py-2 text-slate-500">{t('loading')}...</div>
            ) : (
                <div className="space-y-2">
                    {floors.map(floor => (
                        <FloorRow key={floor.floor} floor={floor} year={year} buildingId={building.buildingId} />
                    ))}
                    {floors.length === 0 && !loading && (
                        <div className="text-center py-2 text-slate-500">{t('noData')}</div>
                    )}
                </div>
            )}
        </ExpandableRow>
    );
};

export const FloorRow = ({ floor, year, buildingId }: { floor: ResidentViewFloorDto, year: number, buildingId: string }) => {
    const t = useTranslations('ResidentDirectory');
    const [isExpanded, setIsExpanded] = useState(false);
    const [units, setUnits] = useState<ResidentViewUnitDto[]>([]);
    const [loading, setLoading] = useState(false);

    const handleToggle = async () => {
        if (!isExpanded && units.length === 0) {
            setLoading(true);
            try {
                const data = await getUnitsByYearBuildingAndFloor(year, buildingId, floor.floor);
                setUnits(data.sort((a, b) => a.unitCode.localeCompare(b.unitCode)));
            } catch (error) {
                console.error("Failed to load units", error);
            } finally {
                setLoading(false);
            }
        }
        setIsExpanded(!isExpanded);
    };

    const handleExport = async () => {
        try {
            const blob = await exportResidents(year, buildingId, floor.floor);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `residents_${year}_floor_${floor.floor}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Export failed", error);
        }
    };

    return (
        <ExpandableRow
            title={`${t('floor')} ${floor.floor}`}
            subtitle={`${t('units')}: ${floor.totalUnits}`}
            isExpanded={isExpanded}
            onToggle={handleToggle}
            icon={<Layers className="w-5 h-5" />}
            actions={
                <button
                    onClick={handleExport}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                    title={t('exportExcel')}
                >
                    <FileSpreadsheet className="w-5 h-5" />
                </button>
            }
        >
            {loading ? (
                <div className="text-center py-2 text-slate-500">{t('loading')}...</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {units.map(unit => (
                        <UnitCard key={unit.unitId} unit={unit} year={year} />
                    ))}
                    {units.length === 0 && !loading && (
                        <div className="col-span-full text-center py-2 text-slate-500">{t('noData')}</div>
                    )}
                </div>
            )}
        </ExpandableRow>
    );
};

export const UnitCard = ({ unit, year }: { unit: ResidentViewUnitDto, year: number }) => {
    const t = useTranslations('ResidentDirectory');
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div
                onClick={() => setIsOpen(true)}
                className="border border-slate-200 rounded-lg p-3 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer bg-white group"
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-slate-700 group-hover:text-emerald-700">{unit.unitCode}</div>
                    <Home className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Users className="w-3.5 h-3.5" />
                    <span>{unit.residentCount} {t('residents')}</span>
                </div>
            </div>
            {isOpen && <ResidentModal unit={unit} year={year} onClose={() => setIsOpen(false)} />}
        </>
    );
};

export const ResidentModal = ({ unit, year, onClose }: { unit: ResidentViewUnitDto, year: number, onClose: () => void }) => {
    const t = useTranslations('ResidentDirectory');
    const [residents, setResidents] = useState<ResidentViewResidentDto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getResidentsByUnit(year, unit.unitId);
                setResidents(data);
            } catch (error) {
                console.error("Failed to load residents", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [unit.unitId, year]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{t('unit')} {unit.unitCode}</h3>
                        <p className="text-sm text-slate-500">{t('residentList')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 flex-1">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                        </div>
                    ) : residents.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">{t('noResidents')}</div>
                    ) : (
                        <div className="space-y-3">
                            {residents.map(resident => (
                                <div key={resident.residentId} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-emerald-100 p-2 rounded-full">
                                                <User className="w-5 h-5 text-emerald-700" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-800">{resident.fullName}</div>
                                                <div className="flex flex-wrap gap-2 text-xs mt-1">
                                                    <span className={`px-2 py-0.5 rounded-full font-medium ${resident.isPrimary ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {resident.isPrimary ? t('primaryYes') : t('member')}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                                        {resident.relation || t('unknown')}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full font-medium ${resident.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {resident.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600 pl-12 bg-slate-50/50 p-2 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{resident.phone || '—'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{resident.email || '—'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <IdCard className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{resident.nationalId || 'ID: —'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <User className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{t('dob')}: {resident.dob || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const ImportModal = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
    const t = useTranslations('ResidentDirectory');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);
        try {
            const errorReport = await importResidents(file);
            // The service returns Blob if responseType is blob, or JSON if error? 
            // My service definition says response.data. 
            // If error report (byte[]), it will be a Blob because I might change service to return Blob for error?
            // Actually, my importResidents endpoint returns 400 with Excel body if error. 
            // Axios might throw error on 400. I need to handle error response for 400 and get Blob.
            // But let's assume successful 200 means OK, and catch block handles 400.
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Upload failed", err);
            // If 400 and has data, it might be the excel file
            if (err.response && err.response.status === 400 && err.response.data) {
                const blob = new Blob([err.response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'import_errors.xlsx';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setError(t('importErrorsDesc'));
            } else {
                setError(err.message || t('uploadFailed'));
            }
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const blob = await downloadTemplate();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'resident_import_template.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Template download failed", error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-800">{t('importResidents')}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
                </div>

                <div className="space-y-4">
                    <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center bg-slate-50">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <label className="block">
                            <span className="sr-only">{t('chooseFile')}</span>
                            <input type="file" onChange={handleFileChange} accept=".xlsx, .xls" className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-emerald-50 file:text-emerald-700
                                hover:file:bg-emerald-100
                            "/>
                        </label>
                        {file && <p className="mt-2 text-sm text-emerald-600 font-medium">{file.name}</p>}
                    </div>

                    <div className="text-sm text-slate-500">
                        <p>{t('importInstruction')}</p>
                        <button onClick={handleDownloadTemplate} className="text-emerald-600 hover:underline font-medium flex items-center gap-1 mt-1">
                            <Download className="w-3 h-3" /> {t('downloadTemplate')}
                        </button>
                    </div>

                    {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}

                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="w-full py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                        {uploading ? t('uploading') : t('startImport')}
                    </button>
                </div>
            </div>
        </div>
    );
};
