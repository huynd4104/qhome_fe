'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import DropdownArrow from '@/src/assets/DropdownArrow.svg';
import { getBuildings, type Building } from '@/src/services/base/buildingService';
import {
  fetchCurrentHouseholdByUnit,
  fetchHouseholdMembersByHousehold,
  type HouseholdMemberDto,
} from '@/src/services/base/householdService';
import { getUnitsByBuilding, type Unit } from '@/src/services/base/unitService';
import { useTranslations } from 'next-intl';
import Pagination from '@/src/components/customer-interaction/Pagination';

type UnitWithResidents = Unit & {
  residents: HouseholdMemberDto[];
  isExpanded?: boolean;
};

type BuildingWithUnits = Building & {
  units: UnitWithResidents[];
  isExpanded?: boolean;
};

type ResidentWithContext = HouseholdMemberDto & {
  buildingId: string;
  buildingName?: string | null;
  buildingCode?: string | null;
  unitId: string;
  unitCode?: string | null;
  unitName?: string | null;
};

const normalize = (value?: string | null) => value?.toLowerCase().trim() ?? '';

export default function ResidentDirectoryPage() {
  const router = useRouter();
  const t = useTranslations('ResidentDirectory');

  const [buildings, setBuildings] = useState<BuildingWithUnits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [buildingSearch, setBuildingSearch] = useState('');
  const [residentSearch, setResidentSearch] = useState('');

  const [selectedBuildingId, setSelectedBuildingId] = useState<'all' | string>('all');
  const [selectedUnitId, setSelectedUnitId] = useState<'all' | string>('all');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Pagination state
  const [pageNo, setPageNo] = useState<number>(0);
  const [pageSize] = useState<number>(10);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const buildingList = await getBuildings();

        const buildingsWithUnits = await Promise.all(
          buildingList.map(async (building) => {
            try {
              const units = await getUnitsByBuilding(building.id);

              const unitsWithResidents = await Promise.all(
                units.map(async (unit) => {
                  try {
                    const household = await fetchCurrentHouseholdByUnit(unit.id);
                    if (!household?.id) {
                      return { ...unit, residents: [] };
                    }
                    const residents = await fetchHouseholdMembersByHousehold(household.id);
                    return { ...unit, residents };
                  } catch (err) {
                    console.error('Failed to fetch residents for unit', unit.id, err);
                    return { ...unit, residents: [] };
                  }
                }),
              );

              // Sort units by code (ABC order)
              const sortedUnits = unitsWithResidents.sort((a, b) => {
                const codeA = (a.code || '').toUpperCase();
                const codeB = (b.code || '').toUpperCase();
                return codeA.localeCompare(codeB);
              });

              return {
                ...building,
                units: sortedUnits,
                isExpanded: false,
              };
            } catch (err) {
              console.error('Failed to fetch units for building', building.id, err);
              return {
                ...building,
                units: [],
                isExpanded: false,
              };
            }
          }),
        );

        // Sort buildings by code (ABC order)
        const sortedBuildings = buildingsWithUnits.sort((a, b) => {
          const codeA = (a.code || '').toUpperCase();
          const codeB = (b.code || '').toUpperCase();
          return codeA.localeCompare(codeB);
        });

        setBuildings(sortedBuildings);
      } catch (err: any) {
        const message =
          err?.response?.data?.message || err?.message || t('error');
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

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
      const unitExists = buildings
        .find((building) => building.id === selectedBuildingId)
        ?.units.some((unit) => unit.id === selectedUnitId);

      if (!unitExists) {
        setSelectedUnitId('all');
      }
    }
  }, [buildings, selectedBuildingId, selectedUnitId]);

  const toggleBuilding = (buildingId: string) => {
    setBuildings((prev) =>
      prev.map((building) =>
        building.id === buildingId
          ? {
              ...building,
              isExpanded: !building.isExpanded,
            }
          : building,
      ),
    );
  };

  const toggleUnit = (buildingId: string, unitId: string) => {
    setBuildings((prev) =>
      prev.map((building) =>
        building.id === buildingId
          ? {
              ...building,
              units: building.units.map((unit) =>
                unit.id === unitId
                  ? {
                      ...unit,
                      isExpanded: !unit.isExpanded,
                    }
                  : unit,
              ),
            }
          : building,
      ),
    );
  };

  const filteredBuildings = useMemo(() => {
    const query = normalize(buildingSearch);
    if (!query) {
      return buildings;
    }

    return buildings
      .map((building) => {
        const buildingMatch = normalize(`${building.name ?? ''} ${building.code ?? ''}`).includes(query);

        const filteredUnits = building.units.filter((unit) =>
          normalize(`${unit.name ?? ''} ${unit.code ?? ''}`).includes(query),
        );

        if (buildingMatch) {
          return {
            ...building,
            units: filteredUnits.length ? filteredUnits : building.units,
          };
        }

        if (filteredUnits.length) {
          return {
            ...building,
            units: filteredUnits,
          };
        }

        return null;
      })
      .filter((item): item is BuildingWithUnits => Boolean(item));
  }, [buildingSearch, buildings]);

  const residentsWithContext = useMemo<ResidentWithContext[]>(() => {
    const result: ResidentWithContext[] = [];

    buildings.forEach((building) => {
      building.units.forEach((unit) => {
        unit.residents.forEach((resident) => {
          result.push({
            ...resident,
            buildingId: building.id,
            buildingName: building.name,
            buildingCode: building.code,
            unitId: unit.id,
            unitCode: unit.code,
            unitName: unit.name,
          });
        });
      });
    });

    return result;
  }, [buildings]);

  const filteredResidents = useMemo(() => {
    let scoped = residentsWithContext;

    if (selectedUnitId !== 'all') {
      scoped = scoped.filter((resident) => resident.unitId === selectedUnitId);
    } else if (selectedBuildingId !== 'all') {
      scoped = scoped.filter((resident) => resident.buildingId === selectedBuildingId);
    }

    const query = normalize(residentSearch);
    if (!query) {
      return scoped;
    }

    return scoped.filter((resident) => {
      const combined = [
        resident.residentName,
        resident.residentEmail,
        resident.residentPhone,
        resident.relation,
        resident.buildingName,
        resident.buildingCode,
        resident.unitName,
        resident.unitCode,
      ]
        .map(normalize)
        .join(' ');

      return combined.includes(query);
    });
  }, [residentSearch, residentsWithContext, selectedBuildingId, selectedUnitId]);

  // Paginated residents
  const residentsToDisplay = useMemo(() => {
    const startIndex = pageNo * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredResidents.slice(startIndex, endIndex);
  }, [filteredResidents, pageNo, pageSize]);

  const totalPages = useMemo(() => {
    return pageSize > 0 ? Math.ceil(filteredResidents.length / pageSize) : 0;
  }, [filteredResidents.length, pageSize]);

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

  const handlePageChange = (newPage: number) => {
    setPageNo(newPage - 1); // Convert from 1-indexed to 0-indexed
  };

  // Reset page when search changes
  useEffect(() => {
    setPageNo(0);
  }, [residentSearch, selectedBuildingId, selectedUnitId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary-2"></div>
          <p className="text-sm text-slate-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="text-center">
          <p className="mb-4 text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-md bg-[#02542D] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#024428]"
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
        <h1 className="text-2xl font-semibold text-[#02542D]">{t('title')}</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => router.push('/base/regisresiView')}
            className="inline-flex items-center justify-center rounded-lg border border-green-600 bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:border-green-700 hover:bg-green-700"
          >
            {t('viewRegistrationButton')}
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
                  <h2 className="text-lg font-semibold text-slate-800">{t('buildingUnitList')}</h2>
                  <p className="text-sm text-slate-500">{t('buildingUnitDescription')}</p>
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
                <input
                  type="text"
                  value={buildingSearch}
                  onChange={(event) => setBuildingSearch(event.target.value)}
                  placeholder={t('searchBuildingUnit')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />

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
                    <span>{t('all')}</span>
                    <span className="text-xs text-slate-500">{residentsWithContext.length}</span>
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
                                alt="Toggle"
                                width={16}
                                height={16}
                                className={`transition-transform duration-200 ${building.isExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectBuilding(building.id)}
                              className={`flex flex-1 flex-col rounded-lg px-3 py-2 text-left transition ${
                                selectedBuildingId === building.id && selectedUnitId === 'all'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'hover:bg-white'
                              }`}
                            >
                              <span className="font-semibold text-[#02542D]">{building.name}</span>
                              <span className="text-xs text-slate-500">{building.code}</span>
                            </button>
                            <span className="text-xs font-medium text-slate-500">
                              {t('unitCount', { count: building.units.length })}
                            </span>
                          </div>

                          {building.isExpanded && building.units.length > 0 && (
                            <div className="space-y-1 px-3 py-2">
                              {building.units.map((unit) => (
                                <button
                                  key={unit.id}
                                  type="button"
                                  onClick={() => handleSelectUnit(building.id, unit.id)}
                                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                                    selectedUnitId === unit.id
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'hover:bg-slate-100'
                                  }`}
                                >
                                  <div>
                                    <span className="font-medium text-[#02542D]">{unit.name ?? '—'}</span>
                                    <span className="ml-2 text-xs text-slate-500">{unit.code}</span>
                                  </div>
                                  <span className="text-xs text-slate-500">{unit.residents.length}</span>
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
              <h2 className="text-lg font-semibold text-slate-800">{t('residentsPanelTitle')}</h2>
              <p className="text-sm text-slate-500">
                {selectedUnitId === 'all' && selectedBuildingId === 'all'
                  ? t('residentsPanelAll', { count: filteredResidents.length })
                  : selectedUnitId === 'all'
                  ? t('residentsPanelBuilding', { count: filteredResidents.length })
                  : t('residentsPanelUnit', { count: filteredResidents.length })}
              </p>
            </div>
            <div className="w-full max-w-xs">
              <input
                type="text"
                value={residentSearch}
                onChange={(event) => setResidentSearch(event.target.value)}
                placeholder={t('searchResident')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('tableName')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('tableContact')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('tableRelation')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('tableBuilding')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('tableUnit')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('tablePrimary')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {residentsToDisplay.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                      {t('noResidents')}
                    </td>
                  </tr>
                ) : (
                  residentsToDisplay.map((resident) => (
                    <tr key={resident.id} className="hover:bg-emerald-50/40">
                      <td className="px-4 py-3 font-medium text-slate-800">{resident.residentName ?? t('notUpdated')}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex flex-col">
                          <span>{resident.residentPhone ?? '—'}</span>
                          <span className="text-xs text-slate-500">{resident.residentEmail ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{resident.relation ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex flex-col">
                          <span>{resident.buildingName ?? '—'}</span>
                          <span className="text-xs text-slate-500">{resident.buildingCode ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-500">{resident.unitCode ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            resident.isPrimary ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {resident.isPrimary ? t('primaryYes') : t('primaryNo')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 0 && (
            <div className="border-t border-slate-200 px-6 py-4">
              <Pagination
                currentPage={pageNo + 1}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
