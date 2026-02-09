'use client'
import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';
import Edit from '@/src/assets/Edit.svg';
import Delete from '@/src/assets/Delete.svg';
import {
  getAllReadingCycles,
  getAllServices,
  createReadingCycle,
  updateReadingCycle,
  changeReadingCycleStatus,
  deleteReadingCycle,
  ReadingCycleDto,
  ReadingCycleStatus,
  ReadingCycleCreateReq,
  ReadingCycleUpdateReq,
  ServiceDto,
  ALLOWED_SERVICE_CODES,
} from '@/src/services/base/waterService';
import { useNotifications } from '@/src/hooks/useNotifications';
import CycleModal from '@/src/components/water/CycleModal';
import StatusChangeModal from '@/src/components/water/StatusChangeModal';
import PopupConfirm from '@/src/components/common/PopupComfirm';

export default function ReadingCyclesPage() {
  const t = useTranslations('ReadingCycles');
  const { user, hasRole } = useAuth();
  const { show } = useNotifications();
  const [cycles, setCycles] = useState<ReadingCycleDto[]>([]);
  const [filteredCycles, setFilteredCycles] = useState<ReadingCycleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStatusChangeOpen, setIsStatusChangeOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<ReadingCycleDto | null>(null);
  const [cycleForStatusChange, setCycleForStatusChange] = useState<ReadingCycleDto | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReadingCycleStatus | 'ALL'>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [cycleToDelete, setCycleToDelete] = useState<string | null>(null);

  // Load cycles on mount
  useEffect(() => {
    loadCycles();
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await getAllServices();
      // Only show water and electric services that require meters
      setServices(data.filter((service) =>
        service.requiresMeter && ALLOWED_SERVICE_CODES.includes(service.code)
      ));
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  };

  const getCycleMonth = (cycle: ReadingCycleDto) => {
    const source = cycle.periodFrom || cycle.fromDate || cycle.createdAt;
    if (!source) {
      return null;
    }
    return source.slice(0, 7);
  };

  const isCurrentMonth = (cycle: ReadingCycleDto) => {
    const cycleMonth = getCycleMonth(cycle);
    if (!cycleMonth) {
      return false;
    }
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return cycleMonth === currentMonth;
  };

  const matchesFilters = (cycle: ReadingCycleDto) => {
    if (statusFilter !== 'ALL' && cycle.status !== statusFilter) {
      return false;
    }

    if (serviceFilter !== 'ALL') {
      const matchesCodeOrId =
        (cycle.serviceId && cycle.serviceId === serviceFilter) ||
        (cycle.serviceCode && cycle.serviceCode === serviceFilter);
      const matchesName = cycle.serviceName?.toLowerCase().includes(serviceFilter.toLowerCase());
      if (!matchesCodeOrId && !matchesName) {
        return false;
      }
    }

    if (monthFilter !== 'ALL') {
      const cycleMonth = getCycleMonth(cycle);
      if (cycleMonth !== monthFilter) {
        return false;
      }
    }

    return true;
  };

  const monthOptions = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const months = new Set<string>();
    cycles.forEach((cycle) => {
      const month = getCycleMonth(cycle);
      if (month) {
        months.add(month);
      }
    });
    return Array.from(months)
      .filter((month) => month <= currentMonth)
      .sort((a, b) => b.localeCompare(a))
      .map((value) => {
        const [yearPart, monthPart] = value.split('-');
        return {
          value,
          label: `${monthPart}/${yearPart}`,
        };
      });
  }, [cycles]);

  useEffect(() => {
    const filtered = cycles.filter(matchesFilters);
    setFilteredCycles(filtered);
  }, [cycles, statusFilter, serviceFilter, monthFilter]);

  const loadCycles = async () => {
    try {
      setLoading(true);
      const data = await getAllReadingCycles();
      setCycles(data);
    } catch (error) {
      console.error('Failed to load cycles:', error);
      show(t('messages.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // const handleCreate = async (req: ReadingCycleCreateReq | ReadingCycleUpdateReq) => {
  //   try {
  //     await createReadingCycle(req as ReadingCycleCreateReq);
  //     show(t('messages.createSuccess'), 'success');
  //     setIsCreateOpen(false);
  //     loadCycles();
  //   } catch (error: any) {
  //     show(error?.message || t('messages.createError'), 'error');
  //   }
  // };

  const handleUpdate = async (cycleId: string, req: ReadingCycleCreateReq | ReadingCycleUpdateReq) => {
    try {
      await updateReadingCycle(cycleId, req as ReadingCycleUpdateReq);
      show(t('messages.updateSuccess'), 'success');
      setIsEditOpen(false);
      setSelectedCycle(null);
      loadCycles();
    } catch (error: any) {
      show(error?.message || t('messages.updateError'), 'error');
    }
  };

  const handleStatusChange = async (cycleId: string, status: ReadingCycleStatus) => {
    try {
      await changeReadingCycleStatus(cycleId, status);
      show(t('messages.statusUpdateSuccess'), 'success');
      setIsStatusChangeOpen(false);
      setCycleForStatusChange(null);
      loadCycles();
    } catch (error: any) {
      show(error?.message || t('messages.statusUpdateError'), 'error');
    }
  };

  const handleOpenStatusChange = (cycle: ReadingCycleDto) => {
    // Chỉ cho phép đổi trạng thái nếu là tháng hiện tại
    if (!isCurrentMonth(cycle)) {
      show(t('errors.onlyCurrentMonth'), 'error');
      return;
    }
    // Không cho phép chuyển status nếu đã là IN_PROGRESS
    if (cycle.status === 'IN_PROGRESS') {
      show(t('errors.alreadyInProgress') || 'Already in progress', 'error');
      return;
    }

    if (cycle.status === 'COMPLETED' || cycle.status === 'CLOSED') {
      show(t('errors.cannotChangeFromCompletedOrClosed') || 'Cannot change status from Completed or Closed', 'error');
      return;
    }
    setCycleForStatusChange(cycle);
    setIsStatusChangeOpen(true);
  };

  const handleDeleteClick = (cycleId: string) => {
    setCycleToDelete(cycleId);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!cycleToDelete) return;

    try {
      await deleteReadingCycle(cycleToDelete);
      show(t('messages.deleteSuccess'), 'success');
      loadCycles();
    } catch (error: any) {
      show(error?.message || t('messages.deleteError'), 'error');
    } finally {
      setIsDeleteConfirmOpen(false);
      setCycleToDelete(null);
    }
  };

  const handleEdit = (cycle: ReadingCycleDto) => {
    setSelectedCycle(cycle);
    setIsEditOpen(true);
  };

  return (
    <div className="px-[41px] py-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-[#02542D]">{t('title')}</h1>
        {/* <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-[#14AE5C] text-white rounded-md hover:bg-[#0c793f] transition-colors"
        >
          {t('createCycle')}
        </button> */}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl mb-6">
        <div className="grid grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-[#02542D] mb-2">{t('filters.status')}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReadingCycleStatus | 'ALL')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559]"
            >
              <option value="ALL">{t('filters.all')}</option>
              <option value="OPEN">{t('status.open')}</option>
              <option value="IN_PROGRESS">{t('status.inProgress')}</option>
              <option value="COMPLETED">{t('status.completed')}</option>
              <option value="CLOSED">{t('status.closed')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#02542D] mb-2">{t('filters.service')}</label>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559]"
            >
              <option value="ALL">{t('filters.all')}</option>
              {services.map((service) => (
                <option key={service.code} value={service.code}>
                  {service.name} ({service.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#02542D] mb-2">{t('filters.month')}</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559]"
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
                setStatusFilter('ALL');
                setServiceFilter('ALL');
                setMonthFilter('ALL');
              }}
              className="text-sm text-[#02542D] font-semibold hover:underline"
            >
              {t('filters.reset')}
            </button>
          </div>
        </div>
      </div>

      {/* Cycles Table */}
      {filteredCycles.length > 0 && (
        <div className="bg-white p-6 rounded-xl">
          <h2 className="text-xl font-semibold text-[#02542D] mb-4">{t('cyclesTitle', { count: filteredCycles.length })}</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-solid border-[#14AE5C]">
                  <th className="px-4 py-3 text-left text-sm font-bold text-[#024023] uppercase">{t('table.name')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('table.fromDate')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('table.toDate')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('table.status')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('table.createdAt')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCycles.map((cycle) => (
                  <tr key={cycle.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-[#024023] font-semibold">
                      <div>{cycle.name}</div>
                      <div className="text-xs text-gray-500">
                        {cycle.serviceName || cycle.serviceCode || t('fallbacks.unknownService')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-[#024023] font-semibold">
                      {new Date(cycle.fromDate || cycle.periodFrom).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center text-[#024023] font-semibold">
                      {new Date(cycle.toDate || cycle.periodTo).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${(cycle.status as string) === 'OPEN'
                            ? 'bg-blue-100 text-blue-700'
                            : (cycle.status as string) === 'IN_PROGRESS'
                              ? 'bg-yellow-100 text-yellow-700'
                              : (cycle.status as string) === 'COMPLETED'
                                ? 'bg-green-100 text-green-700'
                                : (cycle.status as string) === 'CLOSED'
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-gray-100 text-gray-700'
                          }`}
                      >
                        {(cycle.status as string) === 'IN_PROGRESS' ? t('status.inProgress') : cycle.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[#024023] font-semibold">
                      {new Date(cycle.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        {isCurrentMonth(cycle) && cycle.status !== 'IN_PROGRESS' && cycle.status !== 'COMPLETED' && cycle.status !== 'CLOSED' ? (
                          <button
                            onClick={() => handleOpenStatusChange(cycle)}
                            className="px-3 py-1 bg-gray-100 text-gray-400 rounded-md hover:bg-gray-300 text-sm border border-gray-300"
                            title={t('actions.changeStatus')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" id="Transfer-3-Fill--Streamline-Mingcute-Fill" height="16" width="16">
                              <g fill="none" fillRule="nonzero">
                                <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
                                <path fill="#000000" d="M5.706666666666667 7.933333333333334a1 1 0 0 1 0 1.4133333333333333l-0.6493333333333333 0.6506666666666666H10.666666666666666a1 1 0 0 1 0 2H5.057333333333333l0.6499999999999999 0.6493333333333333a1 1 0 1 1 -1.4146666666666665 1.4146666666666665l-2.3566666666666665 -2.357333333333333a1 1 0 0 1 0 -1.414l2.3566666666666665 -2.357333333333333a1 1 0 0 1 1.4146666666666665 0Zm4.586666666666666 -6a1 1 0 0 1 1.338 -0.06933333333333333l0.076 0.06866666666666665 2.3566666666666665 2.357333333333333a1 1 0 0 1 0.06866666666666665 1.338l-0.06866666666666665 0.076 -2.3566666666666665 2.357333333333333a1 1 0 0 1 -1.4833333333333334 -1.3386666666666667l0.06866666666666665 -0.076 0.6499999999999999 -0.6493333333333333H5.333333333333333a1 1 0 0 1 -0.09599999999999999 -1.996L5.333333333333333 3.9973333333333336h5.609333333333333l-0.6499999999999999 -0.6499999999999999a1 1 0 0 1 0 -1.4146666666666665Z" strokeWidth="0.6667"></path>
                              </g>
                            </svg>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md cursor-not-allowed text-sm border border-gray-200"
                            title={cycle.status === 'IN_PROGRESS' ? t('errors.alreadyInProgress') || 'Already in progress' : t('errors.onlyCurrentMonth')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" id="Transfer-3-Fill--Streamline-Mingcute-Fill" height="16" width="16">
                              <g fill="none" fillRule="nonzero">
                                <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
                                <path fill="#000000" d="M5.706666666666667 7.933333333333334a1 1 0 0 1 0 1.4133333333333333l-0.6493333333333333 0.6506666666666666H10.666666666666666a1 1 0 0 1 0 2H5.057333333333333l0.6499999999999999 0.6493333333333333a1 1 0 1 1 -1.4146666666666665 1.4146666666666665l-2.3566666666666665 -2.357333333333333a1 1 0 0 1 0 -1.414l2.3566666666666665 -2.357333333333333a1 1 0 0 1 1.4146666666666665 0Zm4.586666666666666 -6a1 1 0 0 1 1.338 -0.06933333333333333l0.076 0.06866666666666665 2.3566666666666665 2.357333333333333a1 1 0 0 1 0.06866666666666665 1.338l-0.06866666666666665 0.076 -2.3566666666666665 2.357333333333333a1 1 0 0 1 -1.4833333333333334 -1.3386666666666667l0.06866666666666665 -0.076 0.6499999999999999 -0.6493333333333333H5.333333333333333a1 1 0 0 1 -0.09599999999999999 -1.996L5.333333333333333 3.9973333333333336h5.609333333333333l-0.6499999999999999 -0.6499999999999999a1 1 0 0 1 0 -1.4146666666666665Z" strokeWidth="0.6667"></path>
                              </g>
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(cycle)}
                          className="p-2 rounded-lg bg-[#739559] hover:bg-[#5a7347] transition duration-150"
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
                          onClick={() => handleDeleteClick(cycle.id)}
                          className="p-2 rounded-lg bg-red-500 hover:bg-[#991b1b] transition duration-150"
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredCycles.length === 0 && !loading && (
        <div className="bg-white p-6 rounded-xl text-center text-gray-500">
          {t('empty')}
        </div>
      )}

      {loading && (
        <div className="bg-white p-6 rounded-xl text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#739559] mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      )}

      {/* Create Modal */}
      {/* {isCreateOpen && (
        <CycleModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreate}
          mode="create"
          existingCycles={cycles}
        />
      )} */}

      {/* Edit Modal */}
      {isEditOpen && selectedCycle && (
        <CycleModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedCycle(null);
          }}
          onSubmit={(req) => handleUpdate(selectedCycle.id, req)}
          mode="edit"
          initialData={selectedCycle}
          existingCycles={cycles}
        />
      )}

      {/* Status Change Modal */}
      {isStatusChangeOpen && cycleForStatusChange && (
        <StatusChangeModal
          isOpen={isStatusChangeOpen}
          onClose={() => {
            setIsStatusChangeOpen(false);
            setCycleForStatusChange(null);
          }}
          currentStatus={cycleForStatusChange.status}
          cycleId={cycleForStatusChange.id}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Delete Confirm Popup */}
      {/* <PopupConfirm
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setCycleToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        popupTitle={t('deleteConfirm.title')}
        popupContext={t('deleteConfirm.message')}
        isDanger={true}
      /> */}
    </div>
  );
}
