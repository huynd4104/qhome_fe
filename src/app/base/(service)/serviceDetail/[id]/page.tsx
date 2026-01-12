"use client";

import { Fragment, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import Edit from '@/src/assets/Edit.svg';
import Delete from '@/src/assets/Delete.svg';
import DropdownArrow from '@/src/assets/DropdownArrow.svg';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import DetailField from '@/src/components/base-service/DetailField';
import { useServiceDetailPage } from '@/src/hooks/useServiceDetailPage';
import { useNotifications } from '@/src/hooks/useNotifications';
import {
  deleteServiceCombo,
  deleteServiceOption,
  deleteServiceTicket,
  getServiceCombos,
  getServiceOptions,
  getServiceTickets,
  getServiceAvailabilities,
  updateServiceComboStatus,
  updateServiceOptionStatus,
  updateServiceTicketStatus,
  updateServiceOption,
  updateServiceTicket,
} from '@/src/services/asset-maintenance/serviceService';
import PopupConfirm from '@/src/components/common/PopupComfirm';
import {
  ServicePricingType,
  ServiceCombo,
  ServiceOption,
  ServiceTicket,
  ServiceTicketType,
  ServiceAvailability,
} from '@/src/types/service';

type ServiceComboItemDto = {
  id?: string;
  comboId?: string;
  itemName?: string | null;
  itemDescription?: string | null;
  itemPrice?: number | null;
  itemDurationMinutes?: number | null;
  quantity?: number | null;
  note?: string | null;
  sortOrder?: number | null;
};

type ComboWithItems = ServiceCombo & {
  items?: ServiceComboItemDto[];
};

const formatCurrency = (value?: number | null) => {
  if (value === undefined || value === null) {
    return '-';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

const mapPricingType = (type?: ServicePricingType | string) => {
  switch (type) {
    case ServicePricingType.HOURLY:
      return 'Service.pricing.hourly';
    case ServicePricingType.SESSION:
      return 'Service.pricing.session';
    case ServicePricingType.FREE:
      return 'Service.pricing.free';
    default:
      return 'Service.pricing.unknown';
  }
};

const mapTicketType = (type?: ServiceTicketType | string) => {
  switch (type) {
    case ServiceTicketType.DAY:
      return 'Service.ticketType.day';
    case ServiceTicketType.NIGHT:
      return 'Service.ticketType.night';
    case ServiceTicketType.HOURLY:
      return 'Service.ticketType.hourly';
    case ServiceTicketType.DAILY:
      return 'Service.ticketType.daily';
    case ServiceTicketType.FAMILY:
      return 'Service.ticketType.family';
    default:
      return 'Service.ticketType.unknown';
  }
};

const DEFAULT_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const formatTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }
  if (value.length >= 5) {
    return value.slice(0, 5);
  }
  return value;
};

export default function ServiceDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const serviceId = params?.id;
  const { show } = useNotifications();

  const { serviceData, loading, error } = useServiceDetailPage(serviceId);

  const [combos, setCombos] = useState<ComboWithItems[]>([]);
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [availabilities, setAvailabilities] = useState<ServiceAvailability[]>([]);
  const [comboLoading, setComboLoading] = useState<boolean>(false);
  const [optionLoading, setOptionLoading] = useState<boolean>(false);
  const [ticketLoading, setTicketLoading] = useState<boolean>(false);
  const [availabilityLoading, setAvailabilityLoading] = useState<boolean>(false);
  const [isComboExpanded, setIsComboExpanded] = useState<boolean>(true);
  const [isOptionExpanded, setIsOptionExpanded] = useState<boolean>(true);
  const [isTicketExpanded, setIsTicketExpanded] = useState<boolean>(true);
  
  // Popup states
  const [statusPopupOpen, setStatusPopupOpen] = useState<boolean>(false);
  const [statusTargetId, setStatusTargetId] = useState<string | null>(null);
  const [statusTargetType, setStatusTargetType] = useState<'combo' | 'option' | 'ticket' | null>(null);
  const [statusTargetNew, setStatusTargetNew] = useState<boolean | null>(null);
  const [comboItemsPopupOpen, setComboItemsPopupOpen] = useState<boolean>(false);
  const [selectedComboItems, setSelectedComboItems] = useState<ServiceComboItemDto[]>([]);
  const [selectedComboName, setSelectedComboName] = useState<string>('');
  const [deleteOptionPopupOpen, setDeleteOptionPopupOpen] = useState<boolean>(false);
  const [deleteTicketPopupOpen, setDeleteTicketPopupOpen] = useState<boolean>(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const serviceIdValue = Array.isArray(serviceId) ? serviceId[0] : (serviceId as string) ?? '';

  const getDayLabel = (day?: number | null) => {
    if (day === undefined || day === null) {
      return '-';
    }
    // Database format: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday
    // Map to frontend translation index: 1-6 -> 1-6, 7 -> 0
    const frontendIndexMap: Record<number, number> = {
      1: 1, // Monday -> index 1
      2: 2, // Tuesday -> index 2
      3: 3, // Wednesday -> index 3
      4: 4, // Thursday -> index 4
      5: 5, // Friday -> index 5
      6: 6, // Saturday -> index 6
      7: 0, // Sunday -> index 0
    };
    const frontendIndex = frontendIndexMap[day] ?? day;
    return t(`Service.weekday.${frontendIndex}`, {
      defaultMessage: DEFAULT_DAY_NAMES[frontendIndex] ?? '-',
    });
  };

  const fetchCombos = useCallback(async () => {
    if (!serviceIdValue) return;
    setComboLoading(true);
    try {
      const comboData = await getServiceCombos(serviceIdValue);
      const typedCombos = (comboData ?? []) as ComboWithItems[];
      setCombos(typedCombos);
    } catch (err) {
      console.error('Failed to load service combos', err);
    } finally {
      setComboLoading(false);
    }
  }, [serviceIdValue]);

  const fetchOptions = useCallback(async () => {
    if (!serviceIdValue) return;
    setOptionLoading(true);
    try {
      const optionData = await getServiceOptions(serviceIdValue);
      setOptions(optionData);
    } catch (err) {
      console.error('Failed to load service options', err);
    } finally {
      setOptionLoading(false);
    }
  }, [serviceIdValue]);

  const fetchTickets = useCallback(async () => {
    if (!serviceIdValue) return;
    setTicketLoading(true);
    try {
      const ticketData = await getServiceTickets(serviceIdValue);
      setTickets(ticketData);
    } catch (err) {
      console.error('Failed to load service tickets', err);
    } finally {
      setTicketLoading(false);
    }
  }, [serviceIdValue]);

  const fetchAvailabilities = useCallback(async () => {
    if (!serviceIdValue) return;
    setAvailabilityLoading(true);
    try {
      const availabilityData = await getServiceAvailabilities(serviceIdValue);
      setAvailabilities(availabilityData);
    } catch (err) {
      console.error('Failed to load service availabilities', err);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [serviceIdValue]);

  useEffect(() => {
    if (!serviceIdValue) return;
    fetchCombos();
    fetchOptions();
    fetchTickets();
    fetchAvailabilities();
  }, [serviceIdValue, fetchCombos, fetchOptions, fetchTickets, fetchAvailabilities]);

  const handleOpenChangeStatus = (id: string, type: 'combo' | 'option' | 'ticket', currentStatus: boolean) => {
    setStatusTargetId(id);
    setStatusTargetType(type);
    setStatusTargetNew(!currentStatus);
    setStatusPopupOpen(true);
  };

  const handleCloseStatusPopup = () => {
    setStatusPopupOpen(false);
    setStatusTargetId(null);
    setStatusTargetType(null);
    setStatusTargetNew(null);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTargetId || !statusTargetType || statusTargetNew === null) return;
    
    try {
      if (statusTargetType === 'combo') {
        await updateServiceComboStatus(statusTargetId, statusTargetNew);
        show(t('Service.notifications.comboStatusUpdated'), 'success');
        await fetchCombos();
      } else if (statusTargetType === 'option') {
        await updateServiceOptionStatus(statusTargetId, statusTargetNew);
        show(t('Service.notifications.optionStatusUpdated'), 'success');
        await fetchOptions();
      } else if (statusTargetType === 'ticket') {
        await updateServiceTicketStatus(statusTargetId, statusTargetNew);
        show(t('Service.notifications.ticketStatusUpdated'), 'success');
        await fetchTickets();
      }
    } catch (err) {
      console.error('Failed to update status', err);
      show(t('Service.error'), 'error');
    } finally {
      handleCloseStatusPopup();
    }
  };

  const handleOpenComboItems = (combo: ComboWithItems) => {
    setSelectedComboItems(combo.items ?? []);
    setSelectedComboName(combo.name ?? '');
    setComboItemsPopupOpen(true);
  };

  const handleCloseComboItemsPopup = () => {
    setComboItemsPopupOpen(false);
    setSelectedComboItems([]);
    setSelectedComboName('');
  };

  const handleBack = () => {
    router.push('/base/serviceList');
  };

  const handleEdit = () => {
    if (!serviceId) return;
    router.push(`/base/serviceEdit/${serviceId}`);
  };

  if (loading) {
    return (
      <div className="px-[41px] py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-2 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('Service.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-[41px] py-12 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            {t('Service.error')}
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-primary-2 text-white rounded-md hover:bg-primary-3"
          >
            {t('Service.returnList')}
          </button>
        </div>
      </div>
    );
  }

  if (!serviceData) {
    return (
      <div className="px-[41px] py-12 flex items-center justify-center">
        <div className="text-center text-gray-600">
          {t('Service.noData')}
        </div>
      </div>
    );
  }

  const handleNavigateToCreate = (type: string) => {
    if (!serviceIdValue) return;
    router.push(`/base/serviceType?serviceId=${serviceIdValue}&type=${type}`);
  };

  const handleAddCombo = () => handleNavigateToCreate('combo');
  const handleAddOption = () => handleNavigateToCreate('option');
  const handleAddTicket = () => handleNavigateToCreate('ticket');

  const handleEditCombo = (comboId?: string) => {
    if (!comboId) return;
    show(t('Service.notifications.comboEdit'), 'info');
  };

  const handleDeleteCombo = async (comboId?: string) => {
    if (!comboId) return;
    try {
      await deleteServiceCombo(comboId);
      show(t('Service.notifications.comboDelete'), 'success');
      await fetchCombos();
    } catch (err) {
      console.error('Failed to delete combo', err);
      show(t('Service.error'), 'error');
    }
  };

  const handleEditOption = (optionId?: string) => {
    if (!optionId || !serviceIdValue) return;
    router.push(`/base/serviceType?serviceId=${serviceIdValue}&type=option&editId=${optionId}`);
  };

  const handleOpenDeleteOption = (optionId?: string) => {
    if (!optionId) return;
    setDeleteTargetId(optionId);
    setDeleteOptionPopupOpen(true);
  };

  const handleCloseDeleteOptionPopup = () => {
    setDeleteOptionPopupOpen(false);
    setDeleteTargetId(null);
  };

  const handleConfirmDeleteOption = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteServiceOption(deleteTargetId);
      show(t('Service.notifications.optionDelete'), 'success');
      await fetchOptions();
      handleCloseDeleteOptionPopup();
    } catch (err) {
      console.error('Failed to delete option', err);
      show(t('Service.error'), 'error');
    }
  };

  const handleEditTicket = (ticketId?: string) => {
    if (!ticketId || !serviceIdValue) return;
    router.push(`/base/serviceType?serviceId=${serviceIdValue}&type=ticket&editId=${ticketId}`);
  };

  const handleOpenDeleteTicket = (ticketId?: string) => {
    if (!ticketId) return;
    setDeleteTargetId(ticketId);
    setDeleteTicketPopupOpen(true);
  };

  const handleCloseDeleteTicketPopup = () => {
    setDeleteTicketPopupOpen(false);
    setDeleteTargetId(null);
  };

  const handleConfirmDeleteTicket = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteServiceTicket(deleteTargetId);
      show(t('Service.notifications.ticketDelete'), 'success');
      await fetchTickets();
      handleCloseDeleteTicketPopup();
    } catch (err) {
      console.error('Failed to delete ticket', err);
      show(t('Service.error'), 'error');
    }
  };

  const hasAvailabilities = availabilities.length > 0;

  return (
    <div className="min-h-screen p-4 sm:p-8 font-sans">
      <div
        className="max-w-5xl mx-auto mb-6 flex items-center cursor-pointer"
        onClick={handleBack}
      >
        <Image
          src={Arrow}
          alt="Back"
          width={20}
          height={20}
          className="w-5 h-5 mr-2"
        />
        <span className="text-[#02542D] font-bold text-2xl hover:text-opacity-80 transition duration-150">
          {t('Service.return')}
        </span>
      </div>

      <div className="max-w-5xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b pb-4 mb-6 gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#02542D]">
              {t('Service.detailTitle')}
            </h1>
          </div>
          <div className="flex space-x-2">
            <button
              className="p-2 rounded-lg bg-[#739559] hover:bg-opacity-80 transition duration-150 flex items-center gap-2"
              onClick={handleEdit}
            >
              <Image
                src={Edit}
                alt={t('Service.editService')}
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <span className="text-white">{t('Service.editService')}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <DetailField label={t('Service.code')} value={serviceData.code ?? '-'} readonly={true} />
          <DetailField label={t('Service.name')} value={serviceData.name ?? '-'} readonly={true} />
          <DetailField
            label={t('Service.category')}
            value={serviceData.category?.name ?? '-'}
            readonly={true}
          />
          <DetailField
            label={t('Service.maxCapacity')}
            value={serviceData.maxCapacity !== undefined && serviceData.maxCapacity !== null ? serviceData.maxCapacity.toString() : '-'}
            readonly={true}
          />
          <DetailField
            label={t('Service.minDuration')}
            value={
              serviceData.minDurationHours !== undefined && serviceData.minDurationHours !== null
                ? serviceData.minDurationHours.toString()
                : '-'
            }
            readonly={true}
          />
          <DetailField
            label={t('Service.location')}
            value={serviceData.location ?? '-'}
            readonly={true}
          />
          <DetailField
            label={t('Service.description')}
            value={serviceData.description ?? '-'}
            readonly={true}
            type="textarea"
            isFullWidth
          />
          <DetailField
            label={t('Service.rules')}
            value={serviceData.rules ?? '-'}
            readonly={true}
            type="textarea"
            isFullWidth
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-6 grid grid-cols-1 gap-6">
        <section className="bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#02542D]">
              {t('Service.availability.sectionTitle', { defaultMessage: 'Service availability' })}
            </h2>
          </div>
          {availabilityLoading ? (
            <div className="text-gray-500">{t('Service.loading')}</div>
          ) : hasAvailabilities ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      {t('Service.availability.dayOfWeek', { defaultMessage: 'Day' })}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      {t('Service.availability.startTime', { defaultMessage: 'Start time' })}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      {t('Service.availability.endTime', { defaultMessage: 'End time' })}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      {t('Service.status', { defaultMessage: 'Status' })}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {availabilities.map((availability, index) => (
                    <tr key={availability.id ?? `availability-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">
                        {getDayLabel(availability.dayOfWeek ?? undefined)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatTime(availability.startTime)}</td>
                      <td className="px-4 py-3 text-gray-700">{formatTime(availability.endTime)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            availability.isAvailable
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {availability.isAvailable ? t('Service.active') : t('Service.inactive')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              {t('Service.availability.empty', { defaultMessage: 'No availability slots configured.' })}
            </div>
          )}
        </section>

        <section className="bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"
                onClick={() => setIsOptionExpanded((prev) => !prev)}
              >
                <Image
                  src={DropdownArrow}
                  alt="Toggle"
                  width={16}
                  height={16}
                  className={`transition-transform ${isOptionExpanded ? "rotate-180" : ""}`}
                />
              </button>
              <h2 className="text-xl font-semibold text-[#02542D]">{t('Service.options')}</h2>
            </div>
            {isOptionExpanded && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-[#02542D] px-4 py-2 text-sm font-semibold text-white hover:bg-opacity-80 transition"
                onClick={handleAddOption}
              >
                {t('Service.addOption')}
              </button>
            )}
          </div>
          {isOptionExpanded && (
            <>
              {optionLoading ? (
                <div className="text-gray-500">{t('Service.loading')}</div>
              ) : options.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {options.map((option: ServiceOption) => (
                    <div key={option.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-[#02542D]">{option.name ?? '-'}</h3>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold mt-1 ${
                              option.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {option.isActive ? t('Service.active') : t('Service.inactive')}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenChangeStatus(option.id!, 'option', option.isActive ?? false)}
                            disabled={option.isRequired === true}
                            className={`w-[47px] h-[34px] flex items-center justify-center rounded-md bg-white border border-gray-300 transition ${
                              option.isRequired === true 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:bg-gray-50 cursor-pointer'
                            }`}
                            title={option.isRequired === true ? t('Service.cannotChangeRequiredOptionStatus') || 'Cannot change status of required option' : t('Service.changeStatus')}
                          >
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              viewBox="0 0 16 16" 
                              height="16" 
                              width="16"
                              fill="currentColor"
                              className={option.isRequired === true ? "text-gray-400" : "text-gray-700"}
                            >
                              <g fill="none" fillRule="nonzero">
                                <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
                                <path fill="currentColor" d="M13.333333333333332 9.333333333333332a1 1 0 0 1 0.09599999999999999 1.9953333333333332L13.333333333333332 11.333333333333332H5.080666666666667l0.96 0.96a1 1 0 0 1 -1.3386666666666667 1.4826666666666668l-0.076 -0.06866666666666665 -2.5526666666666666 -2.5533333333333332c-0.6493333333333333 -0.6493333333333333 -0.22666666666666668 -1.7446666666666666 0.6606666666666666 -1.8166666666666667l0.09333333333333334 -0.004H13.333333333333332ZM9.959999999999999 2.293333333333333a1 1 0 0 1 1.338 -0.06933333333333333l0.076 0.06866666666666665 2.5526666666666666 2.5533333333333332c0.6493333333333333 0.6493333333333333 0.22666666666666668 1.7446666666666666 -0.6606666666666666 1.8166666666666667l-0.09333333333333334 0.004H2.6666666666666665a1 1 0 0 1 -0.09599999999999999 -1.9953333333333332L2.6666666666666665 4.666666666666666h8.252666666666666l-0.96 -0.96a1 1 0 0 1 0 -1.4133333333333333Z" strokeWidth="0.6667"></path>
                              </g>
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditOption(option.id)}
                            className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-blue-500 hover:bg-blue-600 transition"
                          >
                            <Image src={Edit} alt={t('Service.editOption')} width={24} height={24} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteOption(option.id)}
                            className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-red-500 hover:bg-red-600 transition"
                          >
                            <Image src={Delete} alt={t('Service.deleteOption')} width={24} height={24} />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{option.description || t('Service.noDescription')}</p>
                      <p className="text-sm text-gray-700">
                        <strong>{t('Service.optionPrice')}:</strong> {formatCurrency(option.price ?? null)}
                      </p>
                      <p className="text-sm text-gray-700">
                        <strong>{t('Service.optionUnit')}:</strong> {option.unit || '-'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">
                  {t('Service.noOptions')}
                </div>
              )}
            </>
          )}
        </section>

        <section className="bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"
                onClick={() => setIsTicketExpanded((prev) => !prev)}
              >
                <Image
                  src={DropdownArrow}
                  alt="Toggle"
                  width={16}
                  height={16}
                  className={`transition-transform ${isTicketExpanded ? "rotate-180" : ""}`}
                />
              </button>
              <h2 className="text-xl font-semibold text-[#02542D]">{t('Service.tickets')}</h2>
            </div>
            {isTicketExpanded && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-[#02542D] px-4 py-2 text-sm font-semibold text-white hover:bg-opacity-80 transition"
                onClick={handleAddTicket}
              >
                {t('Service.addTicket')}
              </button>
            )}
          </div>
          {isTicketExpanded && (
            <>
              {ticketLoading ? (
                <div className="text-gray-500">{t('Service.loading')}</div>
              ) : tickets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">{t('Service.ticketName')}</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">{t('Service.ticketCode')}</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">{t('Service.ticketTypeLabel')}</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">{t('Service.ticketDuration')}</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">{t('Service.ticketPrice')}</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">{t('Service.ticketMaxPeople')}</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">{t('Service.status')}</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-600">{t('Service.action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {tickets.map((ticket: ServiceTicket) => (
                        <tr key={ticket.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{ticket.name ?? '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{ticket.code ?? '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{t(mapTicketType(ticket.ticketType))}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {ticket.durationHours != null ? ticket.durationHours.toString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatCurrency(ticket.price ?? null)}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {ticket.maxPeople != null ? ticket.maxPeople.toString() : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                ticket.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                              }`}
                            >
                              {ticket.isActive ? t('Service.active') : t('Service.inactive')}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="flex space-x-2 justify-center">
                              <button
                                type="button"
                                onClick={() => handleOpenChangeStatus(ticket.id!, 'ticket', ticket.isActive ?? false)}
                                className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-white border border-gray-300 hover:bg-gray-50 transition"
                                title={t('Service.changeStatus')}
                              >
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  viewBox="0 0 16 16" 
                                  height="16" 
                                  width="16"
                                  fill="currentColor"
                                  className="text-gray-700"
                                >
                                  <g fill="none" fillRule="nonzero">
                                    <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
                                    <path fill="currentColor" d="M13.333333333333332 9.333333333333332a1 1 0 0 1 0.09599999999999999 1.9953333333333332L13.333333333333332 11.333333333333332H5.080666666666667l0.96 0.96a1 1 0 0 1 -1.3386666666666667 1.4826666666666668l-0.076 -0.06866666666666665 -2.5526666666666666 -2.5533333333333332c-0.6493333333333333 -0.6493333333333333 -0.22666666666666668 -1.7446666666666666 0.6606666666666666 -1.8166666666666667l0.09333333333333334 -0.004H13.333333333333332ZM9.959999999999999 2.293333333333333a1 1 0 0 1 1.338 -0.06933333333333333l0.076 0.06866666666666665 2.5526666666666666 2.5533333333333332c0.6493333333333333 0.6493333333333333 0.22666666666666668 1.7446666666666666 -0.6606666666666666 1.8166666666666667l-0.09333333333333334 0.004H2.6666666666666665a1 1 0 0 1 -0.09599999999999999 -1.9953333333333332L2.6666666666666665 4.666666666666666h8.252666666666666l-0.96 -0.96a1 1 0 0 1 0 -1.4133333333333333Z" strokeWidth="0.6667"></path>
                                  </g>
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditTicket(ticket.id)}
                                className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-blue-500 hover:bg-blue-600 transition"
                              >
                                <Image src={Edit} alt={t('Service.editTicket')} width={24} height={24} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDeleteTicket(ticket.id)}
                                className="w-[47px] h-[34px] flex items-center justify-center rounded-md bg-red-500 hover:bg-red-600 transition"
                              >
                                <Image src={Delete} alt={t('Service.deleteTicket')} width={24} height={24} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-500">
                  {t('Service.noTickets')}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Status Change Popup */}
      <PopupConfirm
        isOpen={statusPopupOpen}
        onClose={handleCloseStatusPopup}
        onConfirm={handleConfirmStatusChange}
        popupTitle={t('Service.changeStatus')}
        popupContext={
          statusTargetType === 'combo'
            ? t('Service.confirmComboStatusChange', {
                status: statusTargetNew ? t('Service.active') : t('Service.inactive'),
              })
            : statusTargetType === 'option'
            ? t('Service.confirmOptionStatusChange', {
                status: statusTargetNew ? t('Service.active') : t('Service.inactive'),
              })
            : t('Service.confirmTicketStatusChange', {
                status: statusTargetNew ? t('Service.active') : t('Service.inactive'),
              })
        }
      />

      {/* Delete Option Popup */}
      <PopupConfirm
        isOpen={deleteOptionPopupOpen}
        onClose={handleCloseDeleteOptionPopup}
        onConfirm={handleConfirmDeleteOption}
        popupTitle={t('Service.confirmDeleteOptionTitle')}
        popupContext={t('Service.confirmDeleteOptionMessage')}
        isDanger={true}
      />

      {/* Delete Ticket Popup */}
      <PopupConfirm
        isOpen={deleteTicketPopupOpen}
        onClose={handleCloseDeleteTicketPopup}
        onConfirm={handleConfirmDeleteTicket}
        popupTitle={t('Service.confirmDeleteTicketTitle')}
        popupContext={t('Service.confirmDeleteTicketMessage')}
        isDanger={true}
      />

      {/* Combo Items Popup */}
      {comboItemsPopupOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#E7E4E8CC]/80 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 relative border-[#E7E7E7] border-[1px] max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[20px] font-semibold text-[#739559]">
                {t('Service.comboItems')} - {selectedComboName}
              </h2>
              <button
                onClick={handleCloseComboItemsPopup}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                title={t('Popup.close')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-600">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            {selectedComboItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        {t('Service.comboItemName')}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        {t('Service.comboItemPrice')}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        {t('Service.comboItemDuration')}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        {t('Service.comboItemQuantity')}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">
                        {t('Service.comboItemNote')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedComboItems.map((item, itemIndex) => (
                      <tr key={item.id ?? `item-${itemIndex}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{item.itemName ?? '-'}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {item.itemPrice != null ? formatCurrency(item.itemPrice) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {item.itemDurationMinutes != null ? `${item.itemDurationMinutes} ${t('Service.minutes')}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {item.quantity != null ? item.quantity : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{item.note ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-4">
                {t('Service.comboItemNoItems')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

