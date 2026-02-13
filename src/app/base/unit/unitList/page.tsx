'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Building as BuildingIcon, Layers, FileSpreadsheet, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, ArrowUp, ArrowDown, ArrowUpDown, AlertCircle } from 'lucide-react';

import EditTable from '@/src/assets/EditTable.svg';
import { useUnitPage } from '@/src/hooks/useUnitPage';
import { Unit } from '@/src/types/unit';
import { updateUnitStatus, exportUnits, downloadUnitTemplate, importUnits } from '@/src/services/base/unitService';
import PopupConfirm from '@/src/components/common/PopupComfirm';
import { getAllInspections, AssetInspection, InspectionStatus } from '@/src/services/base/assetInspectionService';
import Pagination from '@/src/components/customer-interaction/Pagination';

type UnitWithContext = Unit & {
  buildingId: string;
  buildingName?: string | null;
  buildingCode?: string | null;
  buildingStatus?: string | null;
};

const normalizeText = (value?: string | null) => value?.toLowerCase().trim() ?? '';

export default function UnitListPage() {
  const t = useTranslations('Unit');
  const router = useRouter();
  const { buildings, loading, error, refresh, pageNo, pageSize, handlePageChange } = useUnitPage();

  const [selectedBuildingId, setSelectedBuildingId] = useState<'all' | string>('all');
  const [selectedFloor, setSelectedFloor] = useState<'all' | number>('all');
  const [selectedBedrooms, setSelectedBedrooms] = useState<'all' | number>('all');
  const [buildingSearch, setBuildingSearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedBuildingId, setExpandedBuildingId] = useState<string | null>(null);
  const [expandedFloorKey, setExpandedFloorKey] = useState<string | null>(null);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc',
  });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Change unit status with confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedUnitStatus, setSelectedUnitStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Asset inspection data
  const [inspections, setInspections] = useState<AssetInspection[]>([]);
  const [loadingInspections, setLoadingInspections] = useState(false);

  // Import modal state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const unitsWithContext = useMemo<UnitWithContext[]>(() => {
    const result: UnitWithContext[] = [];

    // Include units from all buildings (ACTIVE and INACTIVE) so INACTIVE buildings can be selected for testing
    buildings.forEach((building) => {
      building.units?.forEach((unit) => {
        result.push({
          ...unit,
          buildingId: building.id,
          buildingName: building.name,
          buildingCode: building.code,
          buildingStatus: building.status,
        });
      });
    });

    return result;
  }, [buildings]);


  // Create map of unitId -> latest inspection
  const unitInspectionMap = useMemo(() => {
    const map = new Map<string, AssetInspection>();
    inspections.forEach((inspection) => {
      if (inspection.unitId) {
        const existing = map.get(inspection.unitId);
        // Keep the most recent inspection (by inspectionDate)
        if (!existing || new Date(inspection.inspectionDate) > new Date(existing.inspectionDate)) {
          map.set(inspection.unitId, inspection);
        }
      }
    });
    return map;
  }, [inspections]);

  // Load inspections on mount
  useEffect(() => {
    const loadInspections = async () => {
      try {
        setLoadingInspections(true);
        const data = await getAllInspections();
        setInspections(data);
      } catch (err) {
        console.error('Failed to load inspections:', err);
      } finally {
        setLoadingInspections(false);
      }
    };
    loadInspections();
  }, []);

  useEffect(() => {
    if (selectedBuildingId === 'all') {
      return;
    }

    const buildingExists = buildings.some((building) => building.id === selectedBuildingId);

    if (!buildingExists) {
      setSelectedBuildingId('all');
      return;
    }
  }, [buildings, selectedBuildingId]);

  const filteredBuildings = useMemo(() => {
    // Show all buildings (ACTIVE and INACTIVE) so user can select INACTIVE building for testing
    const query = normalizeText(buildingSearch);
    if (!query) {
      return buildings;
    }
    return buildings.filter((building) => {
      const buildingMatch = normalizeText(`${building.name ?? ''} ${building.code ?? ''}`).includes(query);
      return buildingMatch;
    });
  }, [buildingSearch, buildings]);

  // Hierarchical data: buildings -> floors -> units (for sidebar tree)
  const buildingFloorTree = useMemo(() => {
    return filteredBuildings.map((building) => {
      const unitsOfBuilding = unitsWithContext.filter((u) => u.buildingId === building.id);
      const floorMap = new Map<number, UnitWithContext[]>();

      unitsOfBuilding.forEach((unit) => {
        if (typeof unit.floor !== 'number') return;
        if (!floorMap.has(unit.floor)) {
          floorMap.set(unit.floor, []);
        }
        floorMap.get(unit.floor)!.push(unit);
      });

      const floors = Array.from(floorMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([floor, units]) => ({
          floor,
          units: units.sort((a, b) => normalizeText(a.code).localeCompare(normalizeText(b.code), 'vi', { numeric: true, sensitivity: 'base' })),
        }));

      return {
        building,
        floors,
      };
    });
  }, [filteredBuildings, unitsWithContext]);

  // Available floors for the currently selected building
  const availableFloors = useMemo(() => {
    if (selectedBuildingId === 'all') {
      return [] as number[];
    }

    const floorSet = new Set<number>();
    unitsWithContext
      .filter((unit) => unit.buildingId === selectedBuildingId && typeof unit.floor === 'number')
      .forEach((unit) => {
        floorSet.add(unit.floor as number);
      });

    return Array.from(floorSet).sort((a, b) => a - b);
  }, [selectedBuildingId, unitsWithContext]);

  // Available bedroom types for current selection (building + floor)
  const availableBedrooms = useMemo(() => {
    let scopedUnits = unitsWithContext;

    if (selectedBuildingId !== 'all') {
      scopedUnits = scopedUnits.filter((unit) => unit.buildingId === selectedBuildingId);
    }

    if (selectedFloor !== 'all') {
      scopedUnits = scopedUnits.filter((unit) => unit.floor === selectedFloor);
    }

    const bedroomSet = new Set<number>();
    scopedUnits.forEach((unit) => {
      if (typeof unit.bedrooms === 'number' && !Number.isNaN(unit.bedrooms)) {
        bedroomSet.add(unit.bedrooms);
      }
    });

    return Array.from(bedroomSet).sort((a, b) => a - b);
  }, [selectedBuildingId, selectedFloor, unitsWithContext]);

  const filteredUnits = useMemo(() => {
    const unitQuery = normalizeText(unitSearch);

    // Include all units (ACTIVE and INACTIVE) so units of INACTIVE building are visible when selected
    let scopedUnits = unitsWithContext;

    if (selectedBuildingId !== 'all') {
      scopedUnits = scopedUnits.filter((unit) => unit.buildingId === selectedBuildingId);
    }

    if (selectedFloor !== 'all') {
      scopedUnits = scopedUnits.filter((unit) => unit.floor === selectedFloor);
    }

    if (selectedBedrooms !== 'all') {
      scopedUnits = scopedUnits.filter((unit) => unit.bedrooms === selectedBedrooms);
    }

    let filtered = scopedUnits;
    if (unitQuery) {
      filtered = scopedUnits.filter((unit) => {
        const combined = [
          unit.code,
          unit.name,
          unit.floor?.toString(),
          unit.areaM2?.toString(),
          unit.ownerName,
          unit.ownerContact,
          unit.buildingName,
          unit.buildingCode,
        ]
          .map(normalizeText)
          .join(' ');

        return combined.includes(unitQuery);
      });
    }

    // Sort units
    return [...filtered].sort((a, b) => {
      // If custom sort is active
      if (sortConfig.key) {
        if (sortConfig.key === 'code') {
          const valA = normalizeText(a.code);
          const valB = normalizeText(b.code);
          return sortConfig.direction === 'asc'
            ? valA.localeCompare(valB, 'vi', { numeric: true, sensitivity: 'base' })
            : valB.localeCompare(valA, 'vi', { numeric: true, sensitivity: 'base' });
        }
        if (sortConfig.key === 'areaM2') {
          const valA = a.areaM2 || 0;
          const valB = b.areaM2 || 0;
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
      }

      // Default sort behavior: Building Code -> Unit Code
      // First sort by building code
      const buildingCodeA = normalizeText(a.buildingCode ?? '');
      const buildingCodeB = normalizeText(b.buildingCode ?? '');
      if (buildingCodeA !== buildingCodeB) {
        return buildingCodeA.localeCompare(buildingCodeB, 'vi', { numeric: true, sensitivity: 'base' });
      }

      // Then sort by unit code
      const unitCodeA = normalizeText(a.code ?? '');
      const unitCodeB = normalizeText(b.code ?? '');
      return unitCodeA.localeCompare(unitCodeB, 'vi', { numeric: true, sensitivity: 'base' });
    });
  }, [
    selectedBuildingId,
    selectedFloor,
    selectedBedrooms,
    unitSearch,
    unitsWithContext,
    sortConfig, // Add sortConfig to dependency array
  ]);

  // Apply pagination to filtered units
  const unitsToDisplay = useMemo(() => {
    const startIndex = pageNo * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredUnits.slice(startIndex, endIndex);
  }, [filteredUnits, pageNo, pageSize]);

  const totalPages = useMemo(() => {
    return pageSize > 0 ? Math.ceil(filteredUnits.length / pageSize) : 0;
  }, [filteredUnits.length, pageSize]);



  const handleSelectBuilding = (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    setSelectedFloor('all');
    setSelectedBedrooms('all');
    setExpandedBuildingId(buildingId);
    setExpandedFloorKey(null);
    handlePageChange(0);
  };

  const handleSelectFloor = (floor: 'all' | number) => {
    setSelectedFloor(floor);
    if (selectedBuildingId !== 'all' && floor !== 'all') {
      setExpandedFloorKey(`${selectedBuildingId}-${floor}`);
    } else {
      setExpandedFloorKey(null);
    }
    handlePageChange(0);
  };

  const handleSelectBedrooms = (bedrooms: 'all' | number) => {
    setSelectedBedrooms(bedrooms);
    handlePageChange(0);
  };

  const handleExport = async () => {
    try {
      // Export tất cả căn hộ
      const blob = await exportUnits(undefined, undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'units_export.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export units:', error);
    }
  };

  const handleExportBuilding = async (buildingId: string, buildingCode?: string) => {
    try {
      const blob = await exportUnits(buildingId, undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `units_${buildingCode || buildingId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export building units:', error);
    }
  };

  const handleExportFloor = async (buildingId: string, floor: number, buildingCode?: string) => {
    try {
      const blob = await exportUnits(buildingId, floor);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `units_${buildingCode || buildingId}_floor_${floor}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export floor units:', error);
    }
  };

  const handleDownloadUnitTemplate = async () => {
    try {
      const blob = await downloadUnitTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'unit_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download unit template:', error);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportError(null);
    try {
      const response = await importUnits(importFile);
      console.log('Import units response', response);
      setIsImportOpen(false);
      setImportFile(null);
      refresh();
    } catch (error: any) {
      console.error('Failed to import units:', error);
      setImportError(error?.response?.data?.message || error.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const onUnitStatusChange = (unitId: string) => {
    const unit = unitsToDisplay.find(u => u.id === unitId);
    setSelectedUnitId(unitId);
    setSelectedUnitStatus(unit?.status ?? null);
    setConfirmOpen(true);
    setErrorMessage(null);
  };

  const handleConfirmChange = async () => {
    if (!selectedUnitId || !selectedUnitStatus) {
      setConfirmOpen(false);
      return;
    }
    const newStatus = selectedUnitStatus?.toUpperCase() === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateUnitStatus(selectedUnitId, newStatus);

      setConfirmOpen(false);
      setSelectedUnitId(null);
      setSelectedUnitStatus(null);
      window.location.reload();
    } catch (e: any) {
      console.error('Error updating unit status:', e);
      const errorMsg = e?.response?.data?.message || e?.message || t('statusChange.updateFailed');
      setErrorMessage(errorMsg);
      setConfirmOpen(false);
      // Auto hide error message after 5 seconds
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    }
  };

  const handleCloseConfirm = () => {
    setConfirmOpen(false);
    setSelectedUnitId(null);
    setSelectedUnitStatus(null);
    setErrorMessage(null);
  };

  const selectedBuilding = useMemo(
    () => (selectedBuildingId === 'all' ? null : buildings.find((b) => b.id === selectedBuildingId)),
    [buildings, selectedBuildingId]
  );
  const isAddUnitDisabled = selectedBuilding?.status?.toUpperCase() === 'INACTIVE';

  if (loading) {
    return (
      <div className="flex items-center justify-center px-[41px] py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary-2"></div>
          <p className="text-gray-600">{t('load')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center px-[41px] py-12">
        <div className="text-center">
          <p className="mb-4 text-red-600">{t('error')}</p>
          <button
            onClick={refresh}
            className="rounded-md bg-primary-2 px-4 py-2 text-white transition-colors hover:bg-primary-3"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {t('unitList')}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2 text-slate-500" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2 text-slate-500" />
            Import Excel
          </button>
          <button
            type="button"
            onClick={() => !isAddUnitDisabled && router.push('/base/unit/unitNew')}
            className={`inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg shadow-emerald-500/25 ${isAddUnitDisabled
              ? 'cursor-not-allowed bg-slate-100 text-slate-400'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-emerald-500/40 hover:from-emerald-600 hover:to-teal-700'
              }`}
            disabled={isAddUnitDisabled}
            title={isAddUnitDisabled ? t('statusChange.buildingInactiveCannotAdd') : undefined}
          >
            {t('addUnit')}
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-6 transition-all duration-300 ${isSidebarCollapsed ? '' : 'lg:grid-cols-[320px_1fr]'}`}>
        {!isSidebarCollapsed && (
          <aside className="space-y-4 min-w-[320px]">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white/50 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">{t('buildingFilter.title')}</h2>
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="relative group">
                  <input
                    type="text"
                    value={buildingSearch}
                    onChange={(event) => setBuildingSearch(event.target.value)}
                    placeholder={t('buildingFilter.searchPlaceholder')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>

                <div className="max-h-[600px] overflow-y-auto space-y-2 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {/* All Units Option */}
                  <div
                    className={`rounded-xl border transition-all duration-200 ${selectedBuildingId === 'all'
                      ? 'border-emerald-200 bg-emerald-50/50 shadow-sm'
                      : 'border-transparent bg-white hover:bg-slate-50 border-slate-100'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBuildingId('all');
                        setSelectedFloor('all');
                        setSelectedBedrooms('all');
                        setExpandedBuildingId(null);
                        setExpandedFloorKey(null);
                        handlePageChange(0);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left group"
                    >
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${selectedBuildingId === 'all'
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600'
                          }`}
                      >
                        <Layers className="h-4.5 w-4.5" />
                      </div>
                      <span
                        className={`text-sm font-semibold transition-colors ${selectedBuildingId === 'all'
                          ? 'text-emerald-800'
                          : 'text-slate-700 group-hover:text-emerald-700'
                          }`}
                      >
                        {t('buildingFilter.allUnits')}
                      </span>
                    </button>
                  </div>

                  {buildingFloorTree.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-500">
                      {t('buildingFilter.noData')}
                    </div>
                  ) : (
                    buildingFloorTree.map(({ building, floors }) => {
                      const isInactive = building.status?.toUpperCase() === 'INACTIVE';
                      const totalUnitsInBuilding = floors.reduce((sum, f) => sum + f.units.length, 0);
                      const isExpanded = expandedBuildingId === building.id;
                      const isSelected = selectedBuildingId === building.id;

                      return (
                        <div
                          key={building.id}
                          className={`rounded-xl border transition-all duration-200 ${isInactive
                            ? 'border-slate-100 bg-slate-50 opacity-75'
                            : isSelected || isExpanded
                              ? 'border-emerald-200 bg-emerald-50/50 shadow-sm'
                              : 'border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/30'
                            }`}
                        >
                          <div className="flex w-full items-center justify-between px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (isInactive) return;
                                const nextExpanded = isExpanded ? null : building.id;
                                setExpandedBuildingId(nextExpanded);
                                setSelectedBuildingId(building.id);
                                setSelectedFloor('all');
                                setSelectedBedrooms('all');
                                setExpandedFloorKey(null);
                                handlePageChange(0);
                              }}
                              className="flex flex-1 items-center gap-3 text-left group"
                            >
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${isInactive
                                  ? 'bg-slate-200 text-slate-400'
                                  : isSelected
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                    : 'bg-emerald-100/50 text-emerald-600 group-hover:bg-emerald-100 group-hover:text-emerald-700'
                                  }`}
                              >
                                <BuildingIcon className="h-4.5 w-4.5" />
                              </div>
                              <div className="flex flex-col">
                                <span
                                  className={`text-sm font-semibold transition-colors ${isInactive ? 'text-slate-500' : isSelected ? 'text-emerald-800' : 'text-slate-700 group-hover:text-emerald-700'
                                    }`}
                                >
                                  {building.name}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                  {t('buildingFilter.unitCount', { count: totalUnitsInBuilding })}
                                </span>
                              </div>
                            </button>
                            <div className="flex items-center gap-1">
                              {!isInactive && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportBuilding(building.id, building.code ?? undefined);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Export Excel"
                                >
                                  <FileSpreadsheet className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {isExpanded && floors.length > 0 && (
                            <div className="px-3 pb-3 pt-1 space-y-1">
                              {floors.map((floorInfo) => {
                                const floorKey = `${building.id}-${floorInfo.floor}`;
                                const isFloorSelected = expandedFloorKey === floorKey;
                                return (
                                  <div
                                    key={floorKey}
                                    className={`rounded-lg border transition-all ${isFloorSelected
                                      ? 'border-emerald-200 bg-white shadow-sm'
                                      : 'border-transparent hover:bg-white/50'
                                      }`}
                                  >
                                    <div className="flex w-full items-center justify-between px-2 py-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedBuildingId(building.id);
                                          setSelectedFloor(floorInfo.floor);
                                          setSelectedBedrooms('all');
                                          setExpandedBuildingId(building.id);
                                          setExpandedFloorKey(floorKey);
                                          handlePageChange(0);
                                        }}
                                        className="flex flex-1 items-center gap-2 text-left"
                                      >
                                        <div className={`flex h-6 w-6 items-center justify-center rounded-md ${isFloorSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                          }`}>
                                          <Layers className="h-3.5 w-3.5" />
                                        </div>
                                        <span className={`text-sm font-medium ${isFloorSelected ? 'text-emerald-700' : 'text-slate-600'}`}>
                                          {t('floor')} {floorInfo.floor}
                                        </span>
                                        <span className="text-xs text-slate-400 ml-auto mr-2">
                                          {floorInfo.units.length}
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleExportFloor(building.id, floorInfo.floor, building.code ?? undefined);
                                        }}
                                        className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                        title="Export Excel"
                                      >
                                        <FileSpreadsheet className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </aside>
        )}

        <section className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white/50 overflow-hidden flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {isSidebarCollapsed && (
                  <button
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm"
                    title="Expand sidebar"
                  >
                    <PanelLeftOpen className="w-5 h-5" />
                  </button>
                )}
                <h2 className="text-lg font-bold text-slate-800">{t('unitList')}</h2>
              </div>
              <div className="relative group w-full sm:max-w-xs">
                <input
                  type="text"
                  value={unitSearch}
                  onChange={(event) => {
                    setUnitSearch(event.target.value);
                    handlePageChange(0);
                  }}
                  placeholder={t('unitSearch.placeholder')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            {selectedBuildingId !== 'all' && availableBedrooms.length > 0 && (
              <div className="flex items-center gap-3 pt-2">
                <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                  {t('bedroomFilter.label')}
                </span>
                <select
                  value={selectedBedrooms === 'all' ? 'all' : String(selectedBedrooms)}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'all') {
                      handleSelectBedrooms('all');
                    } else {
                      handleSelectBedrooms(Number(value));
                    }
                  }}
                  className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                >
                  <option value="all">{t('bedroomFilter.all')}</option>
                  {availableBedrooms.map((bed) => (
                    <option key={bed} value={bed}>
                      {t('bedroomFilter.count', { count: bed })}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                    onClick={() => handleSort('code')}
                  >
                    <div className="flex items-center gap-1">
                      {t('unitCode')}
                      {sortConfig?.key === 'code' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ArrowDown className="w-4 h-4 text-emerald-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                    onClick={() => handleSort('areaM2')}
                  >
                    <div className="flex items-center gap-1">
                      {t('areaM2')}
                      {sortConfig?.key === 'areaM2' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ArrowDown className="w-4 h-4 text-emerald-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t('bedrooms')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t('status')}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t('action')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {unitsToDisplay.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-sm text-slate-500"
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <Layers className="w-6 h-6" />
                        </div>
                        <p>{t('noUnit')}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  unitsToDisplay.map((unit) => {
                    const isBuildingInactive = unit.buildingStatus?.toUpperCase() === 'INACTIVE';
                    const isUnitInactive = unit.status?.toUpperCase() === 'INACTIVE';
                    const isDisabled = isBuildingInactive || isUnitInactive;
                    const isActive = unit.status === 'ACTIVE' || unit.status === 'Active';

                    return (
                      <tr
                        key={unit.id}
                        className={`transition-colors ${isDisabled ? 'bg-slate-50/50' : 'hover:bg-emerald-50/30'}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${isDisabled ? 'text-slate-500' : 'text-slate-900'}`}>
                            {unit.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm ${isDisabled ? 'text-slate-400' : 'text-slate-600'}`}>
                            {unit.areaM2 ?? '-'} m²
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm ${isDisabled ? 'text-slate-400' : 'text-slate-600'}`}>
                            {unit.bedrooms ?? '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${isActive
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-slate-50 text-slate-500 border-slate-100'
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {isActive ? t('active') : t('inactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/base/unit/unitDetail/${unit.id}`}
                              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title={t('altText.viewDetail')}
                            >
                              <AlertCircle className="w-5 h-5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-6 border-t border-slate-100 mt-auto">
            <Pagination
              currentPage={pageNo + 1}
              totalPages={totalPages}
              onPageChange={(page) => handlePageChange(page - 1)}
            />
          </div>
        </section>
      </div>

      <PopupConfirm
        isOpen={confirmOpen}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirmChange}
        popupTitle={t('statusChange.confirmTitle')}
        popupContext={
          selectedUnitStatus?.toUpperCase() === 'ACTIVE'
            ? t('statusChange.confirmDeactivate')
            : selectedBuilding?.status?.toUpperCase() === 'INACTIVE'
              ? t('statusChange.confirmActivateInInactiveBuilding')
              : t('statusChange.confirmActivate')
        }
        isDanger={selectedUnitStatus?.toUpperCase() === 'ACTIVE'}
      />

      {errorMessage && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md bg-red-100 px-4 py-2 text-red-700 shadow-lg border border-red-200">
          {errorMessage}
        </div>
      )}

      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-800">{t('import.title')}</h3>
              <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <button
                type="button"
                onClick={handleDownloadUnitTemplate}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                {t('import.downloadTemplate')}
              </button>

              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              {importError && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                  {importError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  setIsImportOpen(false);
                  setImportFile(null);
                  setImportError(null);
                }}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!importFile || importing}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all"
              >
                {importing ? t('import.importing') : t('import.import')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
