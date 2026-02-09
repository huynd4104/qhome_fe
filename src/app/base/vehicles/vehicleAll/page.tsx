'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import DropdownArrow from '@/src/assets/DropdownArrow.svg';
import EditTable from '@/src/assets/EditTable.svg';
import { useVehiclePage } from '@/src/hooks/useVehiclePage';
import { Vehicle, VehicleKind } from '@/src/types/vehicle';
import { fetchResidentById, fetchResidentByUserId, Resident } from '@/src/services/base/residentService';
import Pagination from '@/src/components/customer-interaction/Pagination';

type VehicleWithContext = Vehicle & {
  buildingId: string;
  buildingName?: string | null;
  buildingCode?: string | null;
  unitName?: string | null;
  unitCode?: string | null;
};

const normalizeText = (value?: string | null) => value?.toLowerCase().trim() ?? '';

export default function VehicleAllPage() {
  const t = useTranslations('Vehicle');
  const router = useRouter();
  const { buildings, loading, error, toggleBuilding, toggleUnit, refresh } = useVehiclePage('active');

  const [selectedBuildingId, setSelectedBuildingId] = useState<'all' | string>('all');
  const [selectedUnitId, setSelectedUnitId] = useState<'all' | string>('all');
  const [buildingSearch, setBuildingSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [residentLookup, setResidentLookup] = useState<Record<string, Resident>>({});

  // Pagination
  const initialPageSize = 10;
  const [pageNo, setPageNo] = useState<number>(0);
  const [pageSize] = useState<number>(initialPageSize);

  const vehicleKindLabels = useMemo(
    () => ({
      [VehicleKind.CAR]: t('car'),
      [VehicleKind.MOTORCYCLE]: t('motorcycle'),
      [VehicleKind.BICYCLE]: t('bicycle'),
      [VehicleKind.OTHER]: t('other'),
    }),
    [t],
  );

  const getVehicleKindLabel = (kind: VehicleKind) => vehicleKindLabels[kind] ?? kind;

  const vehiclesWithContext = useMemo<VehicleWithContext[]>(() => {
    const result: VehicleWithContext[] = [];

    buildings.forEach((building) => {
      building.units?.forEach((unit) => {
        unit.vehicles?.forEach((vehicle) => {
          result.push({
            ...vehicle,
            buildingId: building.id,
            buildingName: building.name,
            buildingCode: building.code,
            unitName: unit.name,
            unitCode: unit.code,
          });
        });
      });
    });

    return result;
  }, [buildings]);

  useEffect(() => {
    if (selectedBuildingId === 'all') {
      return;
    }

    const buildingExists = buildings.some((building) => building.id === selectedBuildingId);

    if (!buildingExists) {
      setSelectedBuildingId('all');
      setSelectedUnitId('all');
      return;
    }

    if (selectedUnitId !== 'all') {
      const unitExists = buildings.some((building) =>
        building.units?.some((unit) => unit.id === selectedUnitId),
      );

      if (!unitExists) {
        setSelectedUnitId('all');
      }
    }
  }, [buildings, selectedBuildingId, selectedUnitId]);

  const filteredBuildings = useMemo(() => {
    const query = normalizeText(buildingSearch);
    if (!query) {
      return buildings;
    }

    return buildings
      .map((building) => {
        const buildingMatch = normalizeText(`${building.name ?? ''} ${building.code ?? ''}`).includes(query);

        const filteredUnits = building.units
          ?.filter((unit) =>
            normalizeText(`${unit.name ?? ''} ${unit.code ?? ''}`).includes(query),
          )
          .map((unit) => ({ ...unit }));

        if (buildingMatch) {
          return {
            ...building,
            units: filteredUnits?.length ? filteredUnits : building.units,
          };
        }

        if (filteredUnits && filteredUnits.length > 0) {
          return {
            ...building,
            units: filteredUnits,
          };
        }

        return null;
      })
      .filter((building): building is NonNullable<typeof building> => Boolean(building));
  }, [buildingSearch, buildings]);

  const residentLookupKey = useMemo(
    () => Object.keys(residentLookup).sort().join('|'),
    [residentLookup],
  );

  useEffect(() => {
    const uniqueResidentIds = Array.from(
      new Set(
        vehiclesWithContext
          .map((vehicle) => vehicle.residentId)
          .filter((residentId): residentId is string => Boolean(residentId)),
      ),
    );

    const missingResidentIds = uniqueResidentIds.filter((residentId) => !residentLookup[residentId]);

    if (missingResidentIds.length === 0) {
      return;
    }

    let active = true;

    const loadResidents = async () => {
      const results = await Promise.allSettled(
        missingResidentIds.map(async (userId) => {
          // Use by-user endpoint to get resident by userId
          const resident = await fetchResidentByUserId(userId);
          return { residentId: userId, resident };
        }),
      );

      if (!active) return;

      setResidentLookup((previous) => {
        const next = { ...previous };
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            const { residentId, resident } = result.value;
            next[residentId] = resident;
          } else {
            console.error('Failed to fetch resident information', result.reason);
          }
        });
        return next;
      });
    };

    void loadResidents();

    return () => {
      active = false;
    };
  }, [residentLookupKey, vehiclesWithContext]);

  const filteredVehicles = useMemo(() => {
    const vehicleQuery = normalizeText(vehicleSearch);

    let scopedVehicles = vehiclesWithContext;

    if (selectedUnitId !== 'all') {
      scopedVehicles = scopedVehicles.filter((vehicle) => vehicle.unitId === selectedUnitId);
    } else if (selectedBuildingId !== 'all') {
      scopedVehicles = scopedVehicles.filter((vehicle) => vehicle.buildingId === selectedBuildingId);
    }

    if (!vehicleQuery) {
      return scopedVehicles;
    }

    return scopedVehicles.filter((vehicle) => {
      const resolvedResidentName =
        (vehicle.residentId ? residentLookup[vehicle.residentId]?.fullName : undefined) ??
        vehicle.residentName;

      const combined = [
        vehicle.plateNo,
        resolvedResidentName,
        vehicleKindLabels[vehicle.kind] ?? vehicle.kind,
        vehicle.color,
        vehicle.unitName,
        vehicle.unitCode,
        vehicle.buildingName,
        vehicle.buildingCode,
      ]
        .map(normalizeText)
        .join(' ');

      return combined.includes(vehicleQuery);
    });
  }, [
    selectedBuildingId,
    selectedUnitId,
    vehicleKindLabels,
    vehicleSearch,
    vehiclesWithContext,
    residentLookupKey,
  ]);

  // Apply pagination to filtered vehicles
  const vehiclesToDisplay = useMemo(() => {
    const startIndex = pageNo * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredVehicles.slice(startIndex, endIndex);
  }, [filteredVehicles, pageNo, pageSize]);

  const totalPages = useMemo(() => {
    return pageSize > 0 ? Math.ceil(filteredVehicles.length / pageSize) : 0;
  }, [filteredVehicles.length, pageSize]);

  const handlePageChange = useCallback((newPage: number) => {
    setPageNo(newPage);
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setPageNo(0);
  }, [selectedBuildingId, selectedUnitId, vehicleSearch]);

  const handleNavigateToPending = () => {
    router.push('/base/vehicles/vehicleRegis');
  };

  const handleSelectAll = () => {
    setSelectedBuildingId('all');
    setSelectedUnitId('all');
    setPageNo(0);
  };

  const handleSelectBuilding = (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    setSelectedUnitId('all');
    setPageNo(0);
  };

  const handleSelectUnit = (buildingId: string, unitId: string) => {
    setSelectedBuildingId(buildingId);
    setSelectedUnitId(unitId);
    setPageNo(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center px-[41px] py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary-2"></div>
          <p className="text-gray-600">{t('loading')}</p>
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
        <h1 className="text-2xl font-semibold text-[#02542D]">{t('vehicleList')}</h1>
        <button
          onClick={handleNavigateToPending}
          className="rounded-md bg-[#02542D] px-4 py-2 text-white transition-colors hover:bg-[#024428]"
        >
          {t('showPendingRegistrations')}
        </button>
      </div>

      <div
        className={`relative grid gap-6 ${isSidebarCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-[320px_1fr]'
          }`}
      >
        {!isSidebarCollapsed && (
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">{t('buildingUnitList')}</h2>
                  <p className="text-sm text-slate-500">{t('buildingUnitListDescription')}</p>
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
                    placeholder={t('searchBuildingUnit')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${selectedBuildingId === 'all'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-transparent hover:bg-slate-50'
                      }`}
                  >
                    <span>{t('all')}</span>
                    <span className="text-xs text-slate-500">{vehiclesWithContext.length}</span>
                  </button>

                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {filteredBuildings.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-slate-500">
                        {t('noData')}
                      </div>
                    ) : (
                      filteredBuildings.map((building) => (
                        <div key={building.id} className="rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                            <button
                              type="button"
                              onClick={() => toggleBuilding(building.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"
                            >
                              <Image
                                src={DropdownArrow}
                                alt="toggle"
                                width={16}
                                height={16}
                                className={`transition-transform duration-200 ${building.isExpanded ? 'rotate-180' : ''
                                  }`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectBuilding(building.id)}
                              className={`flex flex-1 flex-col rounded-lg px-3 py-2 text-left transition ${selectedBuildingId === building.id && selectedUnitId === 'all'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'hover:bg-white'
                                }`}
                            >
                              <span className="font-semibold text-[#02542D]">{building.name}</span>
                              <span className="text-xs text-slate-500">{building.code}</span>
                            </button>
                            <span className="text-xs font-medium text-slate-500">
                              {building.units?.length ?? 0} {t('unit')}
                            </span>
                          </div>

                          {building.isExpanded && building.units && building.units.length > 0 && (
                            <div className="space-y-1 px-3 py-2">
                              {building.units.map((unit) => (
                                <button
                                  key={unit.id}
                                  type="button"
                                  onClick={() => handleSelectUnit(building.id, unit.id)}
                                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${selectedUnitId === unit.id
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'hover:bg-slate-100'
                                    }`}
                                >
                                  <div>
                                    <span className="font-medium text-[#02542D]">{unit.name}</span>
                                    <span className="ml-2 text-xs text-slate-500">{unit.code}</span>
                                  </div>
                                  <span className="text-xs text-slate-500">
                                    {unit.vehicles?.length ?? 0}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
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
              <h2 className="text-lg font-semibold text-slate-800">{t('vehiclePanelTitle')}</h2>
              <p className="text-sm text-slate-500">
                {selectedUnitId === 'all' && selectedBuildingId === 'all'
                  ? t('vehiclePanelDescriptionAll', { total: filteredVehicles.length })
                  : selectedUnitId === 'all'
                    ? t('vehiclePanelDescriptionBuilding', { total: filteredVehicles.length })
                    : t('vehiclePanelDescriptionUnit', { total: filteredVehicles.length })}
              </p>
            </div>
            <div className="w-full max-w-xs">
              <input
                type="text"
                value={vehicleSearch}
                onChange={(event) => {
                  setVehicleSearch(event.target.value);
                  setPageNo(0);
                }}
                placeholder={t('searchVehicle')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('plateNo')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('residentName')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('vehicleKind')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('building')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('unit')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('color')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('approvedDate')}
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
                {vehiclesToDisplay.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-6 text-center text-sm text-slate-500"
                    >
                      {t('noData')}
                    </td>
                  </tr>
                ) : (
                  vehiclesToDisplay.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-emerald-50/40">
                      <td className="px-4 py-3 font-medium text-slate-800">{vehicle.plateNo}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {(vehicle.residentId
                          ? residentLookup[vehicle.residentId]?.fullName
                          : undefined) ??
                          vehicle.residentName ??
                          '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{getVehicleKindLabel(vehicle.kind)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex flex-col">
                          <span>{vehicle.buildingName ?? '-'}</span>
                          <span className="text-xs text-slate-500">{vehicle.buildingCode ?? '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex flex-col">
                          <span>{vehicle.unitName ?? '-'}</span>
                          <span className="text-xs text-slate-500">{vehicle.unitCode ?? '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{vehicle.color}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {vehicle.registrationApprovedAt?.slice(0, 10).replace(/-/g, '/') || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium ${vehicle.active
                            ? 'rounded bg-emerald-100 text-emerald-700'
                            : 'rounded bg-slate-100 text-slate-600'
                            }`}
                        >
                          {vehicle.active ? t('active') : t('inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/base/vehicles/vehicleDetail/${vehicle.id}`}
                          className="inline-flex items-center"
                        >
                          <Image src={EditTable} alt="View Detail" width={24} height={24} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 0 && (
            <div className="px-6 py-4 border-t border-slate-200">
              <Pagination
                currentPage={pageNo + 1}
                totalPages={totalPages}
                onPageChange={(page) => handlePageChange(page - 1)}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}