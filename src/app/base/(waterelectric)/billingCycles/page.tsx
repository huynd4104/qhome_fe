'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  BillingCycleDto,
  BuildingInvoiceSummaryDto,
  InvoiceDto,
  MissingReadingCycleDto,
  loadBillingPeriod,
  loadBillingCycleBuildingSummary,
  loadMissingReadingCycles,
  loadBuildingInvoices,
  syncMissingBillingCycles,
} from '@/src/services/finance/billingCycleService';
import { getAllServices, ServiceDto, ALLOWED_SERVICE_CODES } from '@/src/services/base/waterService';
import { useNotifications } from '@/src/hooks/useNotifications';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const STATUS_BADGES: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-700',
};

export default function BillingCyclesPage() {
  const t = useTranslations('BillingCycles');
  const { show } = useNotifications();
  const { hasRole, isLoading } = useAuth();
  const router = useRouter();
  
  // Check user roles - ADMIN and ACCOUNTANT can view
  const isAdmin = hasRole('ADMIN') || hasRole('admin') || hasRole('ROLE_ADMIN') || hasRole('ROLE_admin');
  const isAccountant = hasRole('ACCOUNTANT') || hasRole('accountant') || hasRole('ROLE_ACCOUNTANT') || hasRole('ROLE_accountant');
  const canView = isAdmin || isAccountant;
  const canEdit = isAdmin || isAccountant; // ADMIN and ACCOUNTANT can edit/create/delete
  
  const [year, setYear] = useState(new Date().getFullYear());
  const [cycles, setCycles] = useState<BillingCycleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);
  const [syncingMissing, setSyncingMissing] = useState(false);
  const [syncMissingResult, setSyncMissingResult] = useState<string | null>(null);
  const [missingReadingCycles, setMissingReadingCycles] = useState<MissingReadingCycleDto[]>([]);
  const [loadingMissingCycles, setLoadingMissingCycles] = useState(false);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [detailCycle, setDetailCycle] = useState<BillingCycleDto | null>(null);
  const [buildingSummaries, setBuildingSummaries] = useState<BuildingInvoiceSummaryDto[]>([]);
  const [loadingBuildingSummaries, setLoadingBuildingSummaries] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [buildingInvoices, setBuildingInvoices] = useState<InvoiceDto[]>([]);
  const [loadingBuildingInvoices, setLoadingBuildingInvoices] = useState(false);

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
    loadMissingCycles();
  }, [year, canView, show, router, isLoading]);

  useEffect(() => {
    loadServices();
  }, []);

  const handleBuildingSelect = React.useCallback(
    async (buildingId: string | null) => {
      setSelectedBuildingId(buildingId);
      if (!buildingId || !detailCycle) {
        setBuildingInvoices([]);
        return;
      }

      setLoadingBuildingInvoices(true);
      try {
        const invoices = await loadBuildingInvoices(detailCycle.id, buildingId);
        setBuildingInvoices(invoices);
      } finally {
        setLoadingBuildingInvoices(false);
      }
    },
    [detailCycle]
  );

  useEffect(() => {
    if (!detailCycle) {
      setBuildingSummaries([]);
      setBuildingInvoices([]);
      setSelectedBuildingId(null);
      return;
    }

    const fetchSummaries = async () => {
      setLoadingBuildingSummaries(true);
      try {
        const data = await loadBillingCycleBuildingSummary(detailCycle.id);
        setBuildingSummaries(data);
        if (data.length > 0) {
          handleBuildingSelect(data[0].buildingId ?? null);
        }
      } finally {
        setLoadingBuildingSummaries(false);
      }
    };

    fetchSummaries();
  }, [detailCycle, handleBuildingSelect]);

  const loadCycles = async () => {
    try {
      setLoading(true);
      const data = await loadBillingPeriod(year);
      setCycles(data);
      setExpandedCycle(data.length ? data[0].id : null);
    } catch (error: any) {
      console.error('Failed to load billing cycles:', error);
      show(error?.response?.data?.message || error?.message || t('errors.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMissingCycles = async () => {
    try {
      setLoadingMissingCycles(true);
      const data = await loadMissingReadingCycles();
      setMissingReadingCycles(data);
    } catch (error: any) {
      console.error('Failed to load missing billing cycles', error);
      show(error?.response?.data?.message || error?.message || t('errors.loadMissingFailed'), 'error');
    } finally {
      setLoadingMissingCycles(false);
    }
  };

  const loadServices = async () => {
    try {
      const allServices = await getAllServices();
      // Only show water and electric services
      setServices(allServices.filter(service => ALLOWED_SERVICE_CODES.includes(service.code)));
    } catch (error) {
      console.error('Failed to load services for filter', error);
    }
  };

  const monthOptions = useMemo(() => {
    const monthSet = new Set<string>();
    [...cycles, ...missingReadingCycles].forEach((cycle) => {
      if (cycle.periodFrom) {
        monthSet.add(cycle.periodFrom.slice(0, 7));
      }
    });

    return Array.from(monthSet)
      .sort((a, b) => b.localeCompare(a))
      .map((value) => {
        const [yearPart, monthPart] = value.split('-');
        return {
          value,
          label: `${monthPart}/${yearPart}`,
        };
      });
  }, [cycles, missingReadingCycles]);

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

  const filteredMissingCycles = useMemo(
    () => missingReadingCycles.filter((cycle) => matchesFilters(cycle.periodFrom, cycle.serviceCode, cycle.name)),
    [missingReadingCycles, serviceFilter, monthFilter]
  );

  return (
    <div className="px-[41px] py-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">{t('subtitle')}</p>
          <h1 className="text-3xl font-semibold text-[#02542D]">{t('title')}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="border border-gray-200 rounded-md px-3 py-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">{t('year')}</span>
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(event) =>
                setYear(Number(event.target.value) || new Date().getFullYear())
              }
              className="w-16 text-sm font-semibold text-[#02542D] bg-transparent outline-none"
            />
          </div>
          <button
            onClick={() => loadCycles()}
            className="px-4 py-2 bg-[#14AE5C] text-white rounded-md hover:bg-[#0c793f] transition-colors text-sm leading-none whitespace-nowrap"
          >
            {t('buttons.refresh')}
          </button>
          <button
            onClick={async () => {
              setSyncingMissing(true);
              try {
                const created = await syncMissingBillingCycles();
                const msg =
                  created.length > 0
                    ? t('messages.syncSuccessWithCount', { count: created.length })
                    : t('messages.noCyclesToCreate');
                setSyncMissingResult(msg);
                show(t('messages.syncSuccess'), 'success');
                await loadCycles();
                await loadMissingCycles();
              } catch (error: any) {
                console.error('Sync missing billing cycles failed', error);
                show(
                  error?.response?.data?.message || error?.message || t('errors.syncFailed'),
                  'error'
                );
              } finally {
                setSyncingMissing(false);
              }
            }}
            disabled={syncingMissing || !canEdit}
            className="px-4 py-2 bg-[#02542D] text-white rounded-md hover:bg-[#014a26] transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm leading-none whitespace-nowrap"
            title={!canEdit ? 'Chỉ Admin và Accountant mới có quyền tạo billing cycles' : ''}
          >
            {syncingMissing ? t('buttons.creating') : t('buttons.createMissing')}
          </button>
          {canEdit ? (
            <Link
              href="/base/billingCycles/manage"
              className="px-4 py-2 border border-[#02542D] text-[#02542D] rounded-md text-sm font-semibold hover:bg-[#f2fff6]"
            >
              {t('buttons.manageDetails')}
            </Link>
          ) : (
            <button
              disabled
              className="px-4 py-2 border border-gray-300 text-gray-400 rounded-md text-sm font-semibold cursor-not-allowed"
              title="Chỉ Admin và Accountant mới có quyền quản lý chi tiết"
            >
              {t('buttons.manageDetails')}
            </button>
          )}
        </div>
      </div>
      <div className="mb-6 grid grid-cols-3 gap-3 items-end">
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
        <div className="flex justify-end">
          <button
            onClick={() => {
              setServiceFilter('ALL');
              setMonthFilter('ALL');
            }}
            className="text-sm text-[#02542D] font-semibold hover:underline"
          >
            {t('filters.clearFilters')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="text-sm text-gray-600">
          {t('summary.cyclesInYear', { count: filteredCycles.length, year })}
        </div>
        {syncMissingResult && (
          <div className="rounded-md bg-[#f0fdf4] border border-[#c6f6d5] text-[#0f5132] px-4 py-2 text-sm">
            {syncMissingResult}
          </div>
        )}
        <div className="rounded-xl border border-dashed border-[#d1e7dd] bg-[#f7fcf6] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-[#0f5132]">{t('summary.missingReadingCycles')}</div>
            <span className="text-xs text-[#0f5132]">
              {t('summary.cycles', { count: filteredMissingCycles.length })}
            </span>
          </div>
          {loadingMissingCycles ? (
            <div className="text-sm text-[#0f5132]">{t('loading.data')}</div>
          ) : filteredMissingCycles.length === 0 ? (
            <div className="text-sm text-[#0f5132]">{t('messages.allCyclesHaveBilling')}</div>
          ) : (
            <ul className="space-y-2 text-sm text-[#0f5132]">
              {filteredMissingCycles.map((cycle) => (
                <li key={cycle.id} className="border border-[#cfe2ff] rounded-lg p-3 bg-white/70">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{cycle.name}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0f5132] bg-[#d1e7dd]">
                      {cycle.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    {cycle.serviceName || cycle.serviceCode || t('fallbacks.unknownService')}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {new Date(cycle.periodFrom).toLocaleDateString()} — {new Date(cycle.periodTo).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        {loading ? (
          <div className="py-6 text-center text-gray-500">{t('loading.data')}</div>
        ) : filteredCycles.length === 0 ? (
          <div className="py-6 text-center text-gray-500">{t('empty.noCycles')}</div>
        ) : (
          <div className="space-y-3">
            {filteredCycles.map((cycle) => {
              const badgeClass = STATUS_BADGES[cycle.status] ?? STATUS_BADGES.OPEN;
              const isExpanded = expandedCycle === cycle.id;
              return (
                <div key={cycle.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedCycle(isExpanded ? null : cycle.id)}
                    className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between text-left"
                  >
                    <div>
                      <div className="text-lg font-semibold text-[#024023]">{cycle.name}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(cycle.periodFrom).toLocaleDateString()} – {new Date(cycle.periodTo).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded text-xs font-medium ${badgeClass}`}>{cycle.status}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 py-3 bg-white space-y-1 text-sm text-gray-700">
                      <div>{t('detail.id')} {cycle.id}</div>
                      <div>{t('detail.relatedCycle')} {cycle.externalCycleId ?? '—'}</div>
                      <div className="text-xs text-gray-500">{t('detail.status')} {cycle.status}</div>
                    </div>
                  )}
                  <div className="px-4 py-3 bg-gray-50 flex justify-end">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setDetailCycle(cycle);
                      }}
                      className="px-3 py-1 rounded-md bg-white border border-[#d1e7dd] text-[#02542D] text-sm font-semibold hover:bg-[#f0f5f0]"
                    >
                      {t('detail.viewDetails')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {detailCycle && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-[#02542D]">{t('detail.title') || 'Billing Cycle Detail'}</h3>
              <button
                onClick={() => setDetailCycle(null)}
                className="text-sm text-gray-500 hover:text-[#02542D]"
              >
                {t('buttons.close') || 'Close'}
              </button>
            </div>

            <div className="space-y-6">
              {/* Thông tin cycle */}
              <div className="border-b border-gray-200 pb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">{t('detail.name') || 'Name'}</span>
                    <div className="font-semibold text-[#02542D]">{detailCycle.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('detail.status') || 'Status'}</span>
                    <div className="font-semibold">
                      <span className={`px-2 py-1 rounded text-xs ${STATUS_BADGES[detailCycle.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {detailCycle.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('detail.service') || 'Service'}</span>
                    <div className="font-semibold text-[#02542D]">
                      {detailCycle.serviceName || detailCycle.serviceCode || '–'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('detail.period') || 'Period'}</span>
                    <div className="font-semibold text-[#02542D]">
                      {new Date(detailCycle.periodFrom).toLocaleDateString()} – {new Date(detailCycle.periodTo).toLocaleDateString()}
                    </div>
                  </div>
                  {detailCycle.externalCycleId && (
                    <div className="col-span-2">
                      <span className="text-gray-500">{t('detail.externalCycleId') || 'External Cycle ID'}</span>
                      <div className="font-semibold text-[#02542D]">
                        {detailCycle.externalCycleId}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Building Summary */}
              <div>
                <h4 className="text-base font-semibold text-[#02542D] mb-4">{t('statistics.buildingSummary') || 'Summary theo tòa'}</h4>
                {loadingBuildingSummaries ? (
                  <div className="text-sm text-gray-500">{t('loading.data') || 'Đang lấy số liệu...'}</div>
                ) : buildingSummaries.length === 0 ? (
                  <div className="text-sm text-gray-500">{t('detail.noData') || 'Không tìm thấy hóa đơn nào phân theo tòa'}</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {buildingSummaries.map((summary) => (
                      <button
                        key={`${summary.buildingId}-${summary.status}`}
                        onClick={() => handleBuildingSelect(summary.buildingId)}
                        className={`border rounded-lg p-2 text-left text-xs transition ${
                          selectedBuildingId === summary.buildingId
                            ? 'border-[#02542D] bg-[#e6f7eb]'
                            : 'border-gray-200 bg-white hover:border-[#739559]'
                        }`}
                      >
                        <div className="font-semibold text-[#02542D]">
                          Tòa {summary.buildingId?.slice(0, 8) ?? 'Chưa rõ'}
                        </div>
                        <div className="text-gray-500">
                          Trạng thái: {summary.status}
                        </div>
                        <div className="text-gray-500">
                          {summary.invoiceCount} hóa đơn · {summary.totalAmount?.toLocaleString('vi-VN') ?? 0} VNĐ
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-4">
                <h4 className="text-base font-semibold text-[#02542D] mb-2">{t('detail.invoiceList') || 'Danh sách hóa đơn'}</h4>
                {loadingBuildingInvoices ? (
                  <p className="text-xs text-gray-500">{t('loading.data') || 'Đang tải hóa đơn...'}</p>
                ) : buildingInvoices.length === 0 ? (
                  <p className="text-xs text-gray-500">{t('detail.noInvoices') || 'Chưa có hóa đơn cho tòa này'}</p>
                ) : (
                  <div className="space-y-2 text-xs text-gray-600">
                    {buildingInvoices
                      .sort((a, b) => {
                        if (!a.dueDate && !b.dueDate) return 0;
                        if (!a.dueDate) return 1;
                        if (!b.dueDate) return -1;
                        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                      })
                      .map((invoice) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
                        const isOverdue = dueDate && dueDate < today && invoice.status !== 'PAID';
                        const daysUntilDue = dueDate
                          ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                          : null;
                        const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;

                        return (
                          <div
                            key={invoice.id}
                            className={`border rounded-lg px-3 py-2 ${
                              isOverdue
                                ? 'border-red-300 bg-red-50'
                                : isDueSoon
                                ? 'border-yellow-300 bg-yellow-50'
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="font-semibold text-sm text-[#02542D]">
                              {invoice.code} · {invoice.status}
                            </div>
                            <div className="text-gray-500">
                              {invoice.payerUnitId ? `Căn: ${invoice.payerUnitId}` : 'Không xác định căn'}
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-gray-500">
                                {invoice.totalAmount?.toLocaleString('vi-VN')} VNĐ
                              </div>
                              <div className="flex items-center gap-2">
                                {dueDate ? (
                                  <>
                                    <span className={isOverdue ? 'text-red-600 font-semibold' : isDueSoon ? 'text-yellow-600 font-semibold' : 'text-gray-500'}>
                                      Đến hạn: {dueDate.toLocaleDateString('vi-VN')}
                                    </span>
                                    {isOverdue && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-200 text-red-800">
                                        Quá hạn {Math.abs(daysUntilDue!)} ngày
                                      </span>
                                    )}
                                    {isDueSoon && !isOverdue && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-200 text-yellow-800">
                                        Còn {daysUntilDue} ngày
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400">Chưa có hạn thanh toán</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
