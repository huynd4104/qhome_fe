'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useNotifications } from '@/src/hooks/useNotifications';
import {
  BillingCycleDto,
  BuildingInvoiceSummaryDto,
  InvoiceDto,
  loadBillingCycleBuildingSummary,
  loadBillingPeriod,
  loadBuildingInvoices,
  exportBillingCycleToExcel,
  getMissingServicesInCycle,
} from '@/src/services/finance/billingCycleService';
import { getAllServices, ServiceDto, ALLOWED_SERVICE_CODES } from '@/src/services/base/waterService';
import { getBuildings, Building } from '@/src/services/base/buildingService';
import { getUnitsByBuilding, Unit } from '@/src/services/base/unitService';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const STATUS_BADGES: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-700',
  PUBLISHED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  VOID: 'bg-red-100 text-red-700',
  DRAFT: 'bg-gray-100 text-gray-700',
};

export default function BillingCycleManagePage() {
  const t = useTranslations('BillingCyclesManage');
  const { show } = useNotifications();
  const { hasRole, isLoading } = useAuth();
  const router = useRouter();
  
  // Check user roles - only ADMIN and ACCOUNTANT can view
  const isAdmin = hasRole('ADMIN') || hasRole('admin');
  const isAccountant = hasRole('ACCOUNTANT') || hasRole('accountant');
  const canView = isAdmin || isAccountant;
  const canEdit = isAdmin || isAccountant; // ADMIN and ACCOUNTANT can edit/create/delete
  
  const [year, setYear] = useState(new Date().getFullYear());
  const [cycles, setCycles] = useState<BillingCycleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [selectedCycle, setSelectedCycle] = useState<BillingCycleDto | null>(null);
  const [buildingSummaries, setBuildingSummaries] = useState<BuildingInvoiceSummaryDto[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [buildingInvoices, setBuildingInvoices] = useState<InvoiceDto[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [allBuildings, setAllBuildings] = useState<Building[]>([]);
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<number | null>(null);
  const [unitNamesMap, setUnitNamesMap] = useState<Record<string, Unit>>({});
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('ALL');
  const [missingServices, setMissingServices] = useState<string[]>([]);
  const [loadingMissingServices, setLoadingMissingServices] = useState(false);

  useEffect(() => {
    // Wait for user to load before checking permissions
    if (isLoading) {
      return;
    }
    
    // Check if user has permission to view
    if (!canView) {
      show('Bạn không có quyền truy cập trang này', 'error');
      router.push('/');
      return;
    }
    loadCycles();
    loadServices();
    loadBuildings();
  }, [year, canView, show, router, isLoading]);

  const loadCycles = async () => {
    try {
      setLoading(true);
      const data = await loadBillingPeriod(year);
      setCycles(data);
    } catch (error: any) {
      console.error('Loading billing cycles failed', error);
      show(t('errors.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const data = await getAllServices();
      // Only show water and electric services
      setServices(data.filter(service => ALLOWED_SERVICE_CODES.includes(service.code)));
    } catch (error) {
      console.error('Failed to load services', error);
    }
  };

  const loadBuildings = async () => {
    try {
      const data = await getBuildings();
      setAllBuildings(data);
    } catch (error) {
      console.error('Failed to load buildings', error);
    }
  };

  const matchesFilters = (
    periodFrom: string | undefined,
    serviceCode?: string | null,
    cycleName?: string
  ) => {
    const normalizedMonth = periodFrom ? periodFrom.slice(0, 7) : null;

    if (serviceFilter !== 'ALL') {
      const normalizedFilter = serviceFilter.toLowerCase();
      const matchesCode = serviceCode?.toLowerCase() === normalizedFilter;
      const matchesName = cycleName?.toLowerCase().includes(normalizedFilter);
      if (!matchesCode && !matchesName) {
        return false;
      }
    }

    if (monthFilter !== 'ALL' && normalizedMonth !== monthFilter) {
      return false;
    }

    return true;
  };

  const filteredCycles = useMemo(
    () => cycles.filter((cycle) => matchesFilters(cycle.periodFrom, cycle.serviceCode, cycle.name)),
    [cycles, serviceFilter, monthFilter]
  );

  const monthOptions = useMemo(() => {
    if (!cycles.length) {
      return [];
    }
    
    const monthSet = new Set<string>();
    cycles.forEach(cycle => {
      const start = new Date(cycle.periodFrom);
      const end = new Date(cycle.periodTo);
      
      const startYear = start.getFullYear();
      const startMonth = start.getMonth();
      const endYear = end.getFullYear();
      const endMonth = end.getMonth();
      
      let currentYear = startYear;
      let currentMonth = startMonth;
      
      while (
        currentYear < endYear ||
        (currentYear === endYear && currentMonth <= endMonth)
      ) {
        const yearStr = currentYear;
        const monthStr = String(currentMonth + 1).padStart(2, '0');
        monthSet.add(`${yearStr}-${monthStr}`);
        
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
      }
    });
    
    const sortedMonths = Array.from(monthSet).sort();
    return sortedMonths.map(month => {
      const [year, monthNum] = month.split('-');
      return {
        value: month,
        label: `${monthNum}/${year}`
      };
    });
  }, [cycles]);

  // Tự động chọn cycle đầu tiên khi filter thay đổi
  useEffect(() => {
    if (filteredCycles.length > 0) {
      const cycleToSelect = filteredCycles.find(c => c.id === selectedCycle?.id) || filteredCycles[0];
      if (cycleToSelect.id !== selectedCycle?.id) {
        setSelectedCycle(cycleToSelect);
      }
    } else {
      setSelectedCycle(null);
    }
  }, [filteredCycles, selectedCycle?.id]);

  // Load building summaries và missing services khi cycle được chọn
  useEffect(() => {
    if (!selectedCycle) {
      setBuildingSummaries([]);
      setSelectedBuildingId(null);
      setBuildingInvoices([]);
      setMissingServices([]);
      return;
    }

    const fetchSummaries = async () => {
      setLoadingSummaries(true);
      try {
        const data = await loadBillingCycleBuildingSummary(selectedCycle.id);
        setBuildingSummaries(data);
        if (data.length > 0) {
          setSelectedBuildingId(data[0].buildingId);
        }
      } catch (error) {
        console.error('Failed to load building summaries', error);
        show(t('errors.loadBuildingsFailed'), 'error');
      } finally {
        setLoadingSummaries(false);
      }
    };

    const fetchMissingServices = async () => {
      setLoadingMissingServices(true);
      try {
        const missing = await getMissingServicesInCycle(selectedCycle.id);
        setMissingServices(missing);
      } catch (error) {
        console.error('Failed to load missing services', error);
      } finally {
        setLoadingMissingServices(false);
      }
    };

    fetchSummaries();
    fetchMissingServices();
  }, [selectedCycle, show]);

  // Load invoices khi building được chọn
  useEffect(() => {
    if (!selectedCycle || !selectedBuildingId) {
      setBuildingInvoices([]);
      return;
    }

    const fetchInvoices = async () => {
      setLoadingInvoices(true);
      try {
        const invoices = await loadBuildingInvoices(selectedCycle.id, selectedBuildingId);
        setBuildingInvoices(invoices);
      } catch (error) {
        console.error('Failed to load invoices', error);
        show(t('errors.loadInvoicesFailed'), 'error');
      } finally {
        setLoadingInvoices(false);
      }
    };

    fetchInvoices();
  }, [selectedCycle, selectedBuildingId, show]);

  // Load units khi selectedBuildingFilter thay đổi
  useEffect(() => {
    if (!selectedBuildingFilter) {
      setUnits([]);
      setUnitNamesMap({});
      setSelectedFloorFilter(null);
      return;
    }

    const fetchUnits = async () => {
      setLoadingUnits(true);
      try {
        const buildingUnits = await getUnitsByBuilding(selectedBuildingFilter);
        setUnits(buildingUnits);
        
        const map: Record<string, Unit> = {};
        buildingUnits.forEach(unit => {
          map[unit.id] = unit;
        });
        setUnitNamesMap(map);
      } catch (error) {
        console.error('Failed to load units', error);
        show(t('errors.loadUnitsFailed'), 'error');
      } finally {
        setLoadingUnits(false);
      }
    };

    fetchUnits();
  }, [selectedBuildingFilter, show]);

  // Tạo danh sách tầng từ units
  const floorOptions = useMemo(() => {
    const floorSet = new Set<number>();
    units.forEach(unit => {
      if (unit.floor != null) {
        floorSet.add(unit.floor);
      }
    });
    return Array.from(floorSet).sort((a, b) => a - b);
  }, [units]);

  // Filter building summaries theo selectedBuildingFilter
  const filteredBuildingSummaries = useMemo(() => {
    if (!selectedBuildingFilter) {
      return buildingSummaries;
    }
    return buildingSummaries.filter(summary => summary.buildingId === selectedBuildingFilter);
  }, [buildingSummaries, selectedBuildingFilter]);

  // Filter invoices theo floor và status
  const filteredBuildingInvoices = useMemo(() => {
    let filtered = buildingInvoices;

    // Filter theo status
    if (invoiceStatusFilter !== 'ALL') {
      filtered = filtered.filter(invoice => invoice.status === invoiceStatusFilter);
    }

    // Filter theo floor
    if (selectedFloorFilter) {
      filtered = filtered.filter(invoice => {
        if (!invoice.payerUnitId) return false;
        const unit = unitNamesMap[invoice.payerUnitId];
        return unit && unit.floor === selectedFloorFilter;
      });
    }

    return filtered;
  }, [buildingInvoices, selectedFloorFilter, invoiceStatusFilter, unitNamesMap]);

  const totalStats = useMemo(() => {
    const count = filteredBuildingSummaries.length;
    const totalAmount = filteredBuildingSummaries
      .map((summary) => summary.totalAmount ?? 0)
      .reduce((sum, value) => sum + (value ?? 0), 0);
    return { count, totalAmount };
  }, [filteredBuildingSummaries]);

  const handleExportExcel = async () => {
    if (!selectedCycle) {
      show(t('errors.selectCycleRequired'), 'error');
      return;
    }

    setExporting(true);
    try {
      const params: {
        serviceCode?: string;
        month?: string;
        buildingId?: string;
      } = {};

      if (serviceFilter !== 'ALL') {
        params.serviceCode = serviceFilter;
      }
      if (monthFilter !== 'ALL') {
        params.month = monthFilter;
      }
      if (selectedBuildingFilter) {
        params.buildingId = selectedBuildingFilter;
      }

      const blob = await exportBillingCycleToExcel(selectedCycle.id, params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `billing_cycle_${selectedCycle.name.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      show(t('messages.exportSuccess'), 'success');
    } catch (error: any) {
      console.error('Export Excel failed', error);
      show(error?.response?.data?.message || t('errors.exportFailed'), 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="px-[41px] py-12 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">{t('subtitle')}</p>
          <h1 className="text-3xl font-semibold text-[#02542D]">{t('title')}</h1>
        </div>
        <Link
          href="/base/billingCycles"
          className="px-4 py-2 border border-[#02542D] text-[#02542D] rounded-md hover:bg-[#f2fff6]"
        >
          {t('buttons.backToOverview')}
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="border border-gray-300 rounded-md px-3 py-2 flex items-center gap-2">
          <span className="text-xs text-gray-500">{t('year')}</span>
          <input
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(event) => setYear(Number(event.target.value) || new Date().getFullYear())}
            className="w-20 text-sm font-semibold text-[#02542D] bg-transparent outline-none"
          />
        </div>
        <button
          onClick={() => loadCycles()}
          className="px-4 py-2 bg-[#14AE5C] text-white rounded-md hover:bg-[#0c793f] transition-colors text-sm"
        >
          {t('buttons.refresh')}
        </button>
        <button
          onClick={handleExportExcel}
          disabled={!selectedCycle || exporting || !canEdit}
          className="px-4 py-2 bg-[#02542D] text-white rounded-md hover:bg-[#014a26] transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm flex items-center gap-2"
          title={!canEdit ? 'Chỉ Admin và Accountant mới có quyền export Excel' : ''}
        >
          {exporting ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>{t('buttons.exporting')}</span>
            </>
          ) : (
            <>
              <span>📥</span>
              <span>{t('buttons.exportExcel')}</span>
            </>
          )}
        </button>
      </div>

      {filteredCycles.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <label className="block text-xs font-semibold text-gray-500 mb-2">{t('labels.selectCycle')}</label>
          <select
            value={selectedCycle?.id || ''}
            onChange={(event) => {
              const cycleId = event.target.value;
              const cycle = filteredCycles.find(c => c.id === cycleId);
              setSelectedCycle(cycle || null);
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#739559]"
          >
            <option value="">{t('selectCycle.placeholder')}</option>
            {filteredCycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name} ({new Date(cycle.periodFrom).toLocaleDateString()} - {new Date(cycle.periodTo).toLocaleDateString()})
                {cycle.serviceCode && ` - ${cycle.serviceCode}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">{t('filters.service')}</label>
          <select
            value={serviceFilter}
            onChange={(event) => setServiceFilter(event.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#739559]"
          >
            <option value="ALL">{t('filters.allServices')}</option>
            {services.map((service) => (
              <option key={service.code} value={service.code}>
                {service.name} ({service.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">{t('filters.month')}</label>
          <select
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#739559]"
          >
            <option value="ALL">{t('filters.allMonths')}</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">{t('filters.building')}</label>
          <select
            value={selectedBuildingFilter ?? ''}
            onChange={(event) => {
              setSelectedBuildingFilter(event.target.value || null);
              setSelectedFloorFilter(null);
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#739559]"
          >
            <option value="">{t('filters.allBuildings')}</option>
            {allBuildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.code} - {building.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">{t('filters.floor')}</label>
          <select
            value={selectedFloorFilter ?? ''}
            onChange={(event) => setSelectedFloorFilter(event.target.value ? Number(event.target.value) : null)}
            disabled={!selectedBuildingFilter || loadingUnits || floorOptions.length === 0}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#739559] disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">{t('filters.allFloors')}</option>
            {floorOptions.map((floor) => (
              <option key={floor} value={floor}>
                {t('labels.floor', { floor })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">{t('filters.invoiceStatus')}</label>
          <select
            value={invoiceStatusFilter}
            onChange={(event) => setInvoiceStatusFilter(event.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#739559]"
          >
            <option value="ALL">{t('filters.allStatuses')}</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="PAID">PAID</option>
            <option value="VOID">VOID</option>
          </select>
        </div>
      </div>

      {selectedCycle && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{t('labels.currentCycle')}</span>{' '}
              {selectedCycle.name} ({new Date(selectedCycle.periodFrom).toLocaleDateString()} - {new Date(selectedCycle.periodTo).toLocaleDateString()})
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-sm text-gray-600 mb-2">
              <span className="font-semibold">{t('labels.missingServices')}</span>
            </div>
            {loadingMissingServices ? (
              <div className="text-xs text-gray-500">{t('loading.missingServices')}</div>
            ) : missingServices.length === 0 ? (
              <div className="text-xs text-green-600 font-semibold">{t('labels.allServicesHaveInvoices')}</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {missingServices.map((service) => (
                  <span
                    key={service}
                    className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold"
                  >
                    {service}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div className="text-sm text-gray-600">
          {t('summary.buildingsCount', { count: totalStats.count, amount: totalStats.totalAmount.toLocaleString('vi-VN') })}
        </div>
        {loadingSummaries ? (
          <div className="text-sm text-gray-500">{t('loading.summaries')}</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              {filteredBuildingSummaries.map((summary) => (
                <div
                  key={`${summary.buildingId}-${summary.status}`}
                  className={`border rounded-xl p-4 cursor-pointer transition ${
                    selectedBuildingId === summary.buildingId
                      ? 'border-[#02542D] bg-[#e6f7eb]'
                      : 'border-gray-200 bg-white hover:border-[#739559]'
                  }`}
                  onClick={() => setSelectedBuildingId(summary.buildingId)}
                >
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{t('labels.building')}</div>
                  <div className="text-lg font-semibold text-[#02542D]">
                    {summary.buildingCode || summary.buildingName || summary.buildingId?.slice(0, 8)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{t('labels.status')} {summary.status}</div>
                  <div className="text-sm text-gray-600 mt-2">
                    {t('summary.invoicesCount', { count: summary.invoiceCount, amount: (summary.totalAmount?.toLocaleString('vi-VN') ?? 0) })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#02542D]">{t('labels.invoiceList')}</h2>
          <span className="text-sm text-gray-500">
            {(() => {
              if (!selectedBuildingId) return t('labels.noBuildingSelected');
              const buildingSummary = buildingSummaries.find(s => s.buildingId === selectedBuildingId);
              const building = allBuildings.find(b => b.id === selectedBuildingId);
              const buildingName = buildingSummary?.buildingCode || buildingSummary?.buildingName || building?.code || building?.name;
              return buildingName ? `${t('labels.building')} ${buildingName}` : `${t('labels.building')} ${selectedBuildingId.slice(0, 8)}`;
            })()}
          </span>
        </div>
        {loadingInvoices ? (
          <div className="text-sm text-gray-500">{t('loading.invoices')}</div>
        ) : filteredBuildingInvoices.length === 0 ? (
          <div className="text-sm text-gray-500">
            {selectedFloorFilter 
              ? t('empty.noInvoicesForFloor', { floor: selectedFloorFilter })
              : t('empty.noInvoicesForBuilding')}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBuildingInvoices.map((invoice) => {
              const unit = invoice.payerUnitId ? unitNamesMap[invoice.payerUnitId] : null;
              return (
              <div key={invoice.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[#02542D]">{invoice.code}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(invoice.issuedAt).toLocaleDateString()} · Status:{' '}
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        STATUS_BADGES[invoice.status] ?? 'bg-gray-100 text-gray-700'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                    {unit && (
                      <div className="text-xs text-gray-500 mt-1">
                        {t('labels.unit')} {unit.name || unit.code || invoice.payerUnitId} 
                        {unit.floor != null && ` · ${t('labels.floor', { floor: unit.floor })}`}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-[#02542D]">
                    {invoice.totalAmount?.toLocaleString('vi-VN')} VNĐ
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {t('labels.due')} {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '–'}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
