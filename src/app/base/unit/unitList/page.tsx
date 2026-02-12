'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Building as BuildingIcon, Layers, FileSpreadsheet } from 'lucide-react';

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

  // Count only ACTIVE units
  const activeUnitsCount = useMemo(() => {
    return unitsWithContext.filter((unit) => 
      unit.status?.toUpperCase() === 'ACTIVE'
    ).length;
  }, [unitsWithContext]);

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

    // Sort units by building code first, then by unit code
    return filtered.sort((a, b) => {
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

  const handleSelectAll = () => {
    setSelectedBuildingId('all');
    setSelectedFloor('all');
    setSelectedBedrooms('all');
    handlePageChange(0);
  };

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-[#02542D]">{t('unitList')}</h1>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-50"
          >
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="rounded-md border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            Import Excel
          </button>
          <button
            type="button"
            onClick={() => !isAddUnitDisabled && router.push('/base/unit/unitNew')}
            className={`rounded-md px-4 py-2 transition-colors ${
              isAddUnitDisabled
                ? 'cursor-not-allowed bg-slate-300 text-slate-500'
                : 'bg-[#02542D] text-white hover:bg-[#024428]'
            }`}
            disabled={isAddUnitDisabled}
            title={isAddUnitDisabled ? t('statusChange.buildingInactiveCannotAdd') : undefined}
          >
            {t('addUnit')}
          </button>
        </div>
      </div>

      <div
        className={`relative grid gap-6 ${
          isSidebarCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-[320px_1fr]'
        }`}
      >
        {!isSidebarCollapsed && (
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">{t('buildingFilter.title')}</h2>
                  <p className="text-sm text-slate-500">{t('buildingFilter.description')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  <span className="text-base leading-none">{'«'}</span>
                </button>
              </div>
              <div className="px-5 py-4">
                <div className="relative">
                  <input
                    type="text"
                    value={buildingSearch}
                    onChange={(event) => setBuildingSearch(event.target.value)}
                    placeholder={t('buildingFilter.searchPlaceholder')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                      selectedBuildingId === 'all'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <span>{t('buildingFilter.all')}</span>
                    <span className="text-xs text-slate-500">{activeUnitsCount}</span>
                  </button>

                  <div className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
                    {buildingFloorTree.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-slate-500">
                        {t('buildingFilter.noData')}
                      </div>
                    ) : (
                      buildingFloorTree.map(({ building, floors }) => {
                        const isInactive = building.status?.toUpperCase() === 'INACTIVE';
                        const totalUnitsInBuilding = floors.reduce((sum, f) => sum + f.units.length, 0);
                        const isExpanded = expandedBuildingId === building.id;

                        return (
                          <div
                            key={building.id}
                            className={`rounded-xl border transition ${
                              isInactive
                                ? 'border-slate-300 bg-slate-100'
                                : isExpanded
                                ? 'border-emerald-200 bg-emerald-50'
                                : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
                            }`}
                          >
                            <div className="flex w-full items-center justify-between px-3 py-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isInactive) return;
                                  const nextExpanded = isExpanded ? null : building.id;
                                  setExpandedBuildingId(nextExpanded);

                                  // Khi chọn tòa nhà, cập nhật filter bên phải
                                  setSelectedBuildingId(building.id);
                                  setSelectedFloor('all');
                                  setSelectedBedrooms('all');
                                  setExpandedFloorKey(null);
                                  handlePageChange(0);
                                }}
                                className="flex flex-1 items-center gap-3 text-left"
                              >
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                    isInactive ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  <BuildingIcon className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                  <span
                                    className={`font-semibold ${
                                      isInactive ? 'text-slate-500' : 'text-[#02542D]'
                                    }`}
                                  >
                                    {building.name}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {totalUnitsInBuilding} căn hộ
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
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                                    title="Export Excel"
                                  >
                                    <FileSpreadsheet className="w-4 h-4" />
                                  </button>
                                )}
                                <span className="ml-1 text-xs font-medium text-slate-500">
                                  {isExpanded ? '▴' : '▾'}
                                </span>
                              </div>
                            </div>

                            {/* Floors list */}
                            {isExpanded && floors.length > 0 && (
                              <div className="border-t border-emerald-100 bg-white/80 px-3 py-2">
                                <div className="space-y-2">
                                  {floors.map((floorInfo) => {
                                    const floorKey = `${building.id}-${floorInfo.floor}`;
                                    const isFloorSelected = expandedFloorKey === floorKey;
                                    return (
                                      <div
                                        key={floorKey}
                                        className={`rounded-lg border px-3 py-2 ${
                                          isFloorSelected
                                            ? 'border-emerald-300 bg-emerald-50'
                                            : 'border-slate-200 bg-slate-50'
                                        }`}
                                      >
                                        <div className="flex w-full items-center justify-between">
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
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                                              <Layers className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="flex flex-col">
                                              <span className="text-sm font-semibold text-slate-800">
                                                {t('floor')} {floorInfo.floor}
                                              </span>
                                              <span className="text-xs text-slate-500">
                                                {floorInfo.units.length} căn hộ
                                              </span>
                                            </div>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleExportFloor(building.id, floorInfo.floor, building.code ?? undefined);
                                            }}
                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                                            title="Export Excel"
                                          >
                                            <FileSpreadsheet className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}

        <section className="relative rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              className="absolute left-0 top-5 z-10 inline-flex -translate-x-1/2 items-center justify-center rounded-full border border-slate-300 bg-white p-2 text-slate-500 shadow transition hover:border-emerald-300 hover:text-emerald-700"
            >
              <span className="text-sm leading-none">{'»'}</span>
            </button>
          )}
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{t('unitList')}</h2>
              <p className="text-sm text-slate-500">
                {selectedBuildingId === 'all'
                  ? t('summary.total', { count: filteredUnits.length })
                  : t('summary.selectedBuilding', { count: filteredUnits.length })}
              </p>
            </div>
            <div className="w-full max-w-xs">
              <input
                type="text"
                value={unitSearch}
                onChange={(event) => {
                  setUnitSearch(event.target.value);
                  handlePageChange(0);
                }}
                placeholder={t('unitSearch.placeholder')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          {/* Bedroom filter only (floor is selected from the sidebar tree) */}
          {selectedBuildingId !== 'all' && availableBedrooms.length > 0 && (
            <div className="border-b border-slate-100 px-6 py-3 bg-slate-50/60">
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <label className="flex items-center gap-3">
                  <span className="font-medium text-slate-700">
                    Loại phòng:
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
                    className="min-w-[160px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="all">Tất cả</option>
                    {availableBedrooms.map((bed) => (
                      <option key={bed} value={bed}>
                        {bed} phòng ngủ
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('unitCode')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('areaM2')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('bedrooms')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('status')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('action')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {unitsToDisplay.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-sm text-slate-500"
                    >
                      {t('noUnit')}
                    </td>
                  </tr>
                ) : (
                  unitsToDisplay.map((unit) => {
                    const isBuildingInactive = unit.buildingStatus?.toUpperCase() === 'INACTIVE';
                    const isUnitInactive = unit.status?.toUpperCase() === 'INACTIVE';
                    const isDisabled = isBuildingInactive || isUnitInactive;
                    return (
                      <tr 
                        key={unit.id} 
                        className={isDisabled ? 'bg-slate-100' : 'hover:bg-emerald-50/40'}
                      >
                        <td className={`px-4 py-3 font-medium ${isDisabled ? 'text-slate-500' : 'text-slate-800'}`}>
                          {unit.code}
                        </td>
                        <td className={`px-4 py-3 ${isDisabled ? 'text-slate-500' : 'text-slate-600'}`}>
                          {unit.areaM2 ?? '-'}
                        </td>
                        <td className={`px-4 py-3 ${isDisabled ? 'text-slate-500' : 'text-slate-600'}`}>
                          {unit.bedrooms ?? '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-medium ${
                              unit.status === 'ACTIVE' || unit.status === 'Active'
                                ? 'rounded bg-emerald-100 text-emerald-700'
                                : 'rounded bg-slate-100 text-slate-600'
                            }`}
                          >
                            {unit.status === 'ACTIVE' || unit.status === 'Active' ? t('active') : t('inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/base/unit/unitDetail/${unit.id}`}
                              className="inline-flex items-center hover:opacity-80"
                            >
                              <Image src={EditTable} alt={t('altText.viewDetail')} width={24} height={24} />
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
          {totalPages > 0 && (
            <Pagination
              currentPage={pageNo + 1}
              totalPages={totalPages}
              onPageChange={(page) => handlePageChange(page - 1)}
            />
          )}
        </section>
      </div>
      <PopupConfirm
        isOpen={confirmOpen}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirmChange}
        popupTitle={t('statusChange.confirmTitle')}
        popupContext={selectedUnitStatus?.toUpperCase() === 'ACTIVE' 
          ? t('statusChange.confirmDeactivate')
          : t('statusChange.confirmActivate')}
        isDanger={false}
      />
      {errorMessage && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50">
          {errorMessage}
        </div>
      )}

      {/* Import Units Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Import danh sách căn hộ</h3>
              <button
                type="button"
                onClick={() => {
                  setIsImportOpen(false);
                  setImportFile(null);
                  setImportError(null);
                }}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                <p className="mb-2 font-medium text-slate-700">Chọn file Excel (.xlsx)</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setImportFile(file);
                    setImportError(null);
                  }}
                  className="text-xs text-slate-500"
                />
                {importFile && (
                  <p className="mt-2 text-xs font-medium text-emerald-700">
                    {importFile.name}
                  </p>
                )}
              </div>
              <div className="text-xs text-slate-500">
                <p>
                  Bạn có thể tải file mẫu để điền dữ liệu đúng định dạng.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadUnitTemplate}
                  className="mt-1 font-semibold text-emerald-700 hover:underline"
                >
                  Tải file mẫu căn hộ
                </button>
              </div>
              {importError && (
                <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">
                  {importError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportOpen(false);
                    setImportFile(null);
                    setImportError(null);
                  }}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!importFile || importing}
                  onClick={handleImport}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {importing ? 'Đang import...' : 'Bắt đầu import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

