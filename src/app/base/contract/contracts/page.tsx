'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { getBuildings, type Building } from '@/src/services/base/buildingService';
import { getUnitsByBuilding, type Unit } from '@/src/services/base/unitService';
import {
  ContractDetail,
  ContractSummary,
  CreateContractPayload,
  createContract,
  fetchContractDetail,
  fetchContractsByUnit,
  uploadContractFiles,
  getAllContracts,
} from '@/src/services/base/contractService';
import { getAssetsByUnit, createAsset } from '@/src/services/base/assetService';
import { AssetType, RoomType, type Asset, type CreateAssetRequest } from '@/src/types/asset';
import { createMeter, getAllServices, getMeters, type ServiceDto, type MeterCreateReq, type MeterDto, ALLOWED_SERVICE_CODES } from '@/src/services/base/waterService';
import DateBox from '@/src/components/customer-interaction/DateBox';
import { uploadNewsImageFile, uploadNewsImageFiles } from '@/src/services/customer-interaction/newService';

type AsyncState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

const DEFAULT_BUILDINGS_STATE: AsyncState<Building[]> = {
  data: [],
  loading: false,
  error: null,
};

const DEFAULT_UNITS_STATE: AsyncState<Unit[]> = {
  data: [],
  loading: false,
  error: null,
};

const DEFAULT_CONTRACTS_STATE: AsyncState<ContractSummary[]> = {
  data: [],
  loading: false,
  error: null,
};


// Labels tiếng Việt cho RoomType
const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  [RoomType.BATHROOM]: 'Nhà tắm & Vệ sinh',
  [RoomType.LIVING_ROOM]: 'Phòng khách',
  [RoomType.BEDROOM]: 'Phòng ngủ',
  [RoomType.KITCHEN]: 'Nhà bếp',
  [RoomType.HALLWAY]: 'Hành lang',
};

// Labels tiếng Việt cho AssetType (25 loại)
const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  // Nhà tắm & Vệ sinh
  [AssetType.TOILET]: 'Bồn cầu',
  [AssetType.BATHROOM_SINK]: 'Chậu rửa nhà tắm',
  [AssetType.WATER_HEATER]: 'Bình nóng lạnh',
  [AssetType.SHOWER_SYSTEM]: 'Hệ sen vòi nhà tắm',
  [AssetType.BATHROOM_FAUCET]: 'Vòi chậu rửa',
  [AssetType.BATHROOM_LIGHT]: 'Đèn nhà tắm',
  [AssetType.BATHROOM_DOOR]: 'Cửa nhà tắm',
  [AssetType.BATHROOM_ELECTRICAL]: 'Hệ thống điện nhà vệ sinh',
  // Phòng khách
  [AssetType.LIVING_ROOM_DOOR]: 'Cửa phòng khách',
  [AssetType.LIVING_ROOM_LIGHT]: 'Đèn phòng khách',
  [AssetType.AIR_CONDITIONER]: 'Điều hòa',
  [AssetType.INTERNET_SYSTEM]: 'Hệ thống mạng Internet',
  [AssetType.FAN]: 'Quạt',
  [AssetType.LIVING_ROOM_ELECTRICAL]: 'Hệ thống điện phòng khách',
  // Phòng ngủ
  [AssetType.BEDROOM_ELECTRICAL]: 'Hệ thống điện phòng ngủ',
  [AssetType.BEDROOM_AIR_CONDITIONER]: 'Điều hòa phòng ngủ',
  [AssetType.BEDROOM_DOOR]: 'Cửa phòng ngủ',
  [AssetType.BEDROOM_WINDOW]: 'Cửa sổ phòng ngủ',
  // Nhà bếp
  [AssetType.KITCHEN_LIGHT]: 'Hệ thống đèn nhà bếp',
  [AssetType.KITCHEN_ELECTRICAL]: 'Hệ thống điện nhà bếp',
  [AssetType.ELECTRIC_STOVE]: 'Bếp điện',
  [AssetType.KITCHEN_DOOR]: 'Cửa bếp và logia',
  // Hành lang
  [AssetType.HALLWAY_LIGHT]: 'Hệ thống đèn hành lang',
  [AssetType.HALLWAY_ELECTRICAL]: 'Hệ thống điện hành lang',
  // Khác
  [AssetType.OTHER]: 'Khác',
};

// Map AssetType to RoomType
const ASSET_TYPE_TO_ROOM: Record<AssetType, RoomType> = {
  // Nhà tắm & Vệ sinh
  [AssetType.TOILET]: RoomType.BATHROOM,
  [AssetType.BATHROOM_SINK]: RoomType.BATHROOM,
  [AssetType.WATER_HEATER]: RoomType.BATHROOM,
  [AssetType.SHOWER_SYSTEM]: RoomType.BATHROOM,
  [AssetType.BATHROOM_FAUCET]: RoomType.BATHROOM,
  [AssetType.BATHROOM_LIGHT]: RoomType.BATHROOM,
  [AssetType.BATHROOM_DOOR]: RoomType.BATHROOM,
  [AssetType.BATHROOM_ELECTRICAL]: RoomType.BATHROOM,
  // Phòng khách
  [AssetType.LIVING_ROOM_DOOR]: RoomType.LIVING_ROOM,
  [AssetType.LIVING_ROOM_LIGHT]: RoomType.LIVING_ROOM,
  [AssetType.AIR_CONDITIONER]: RoomType.LIVING_ROOM,
  [AssetType.INTERNET_SYSTEM]: RoomType.LIVING_ROOM,
  [AssetType.FAN]: RoomType.LIVING_ROOM,
  [AssetType.LIVING_ROOM_ELECTRICAL]: RoomType.LIVING_ROOM,
  // Phòng ngủ
  [AssetType.BEDROOM_ELECTRICAL]: RoomType.BEDROOM,
  [AssetType.BEDROOM_AIR_CONDITIONER]: RoomType.BEDROOM,
  [AssetType.BEDROOM_DOOR]: RoomType.BEDROOM,
  [AssetType.BEDROOM_WINDOW]: RoomType.BEDROOM,
  // Nhà bếp
  [AssetType.KITCHEN_LIGHT]: RoomType.KITCHEN,
  [AssetType.KITCHEN_ELECTRICAL]: RoomType.KITCHEN,
  [AssetType.ELECTRIC_STOVE]: RoomType.KITCHEN,
  [AssetType.KITCHEN_DOOR]: RoomType.KITCHEN,
  // Hành lang
  [AssetType.HALLWAY_LIGHT]: RoomType.HALLWAY,
  [AssetType.HALLWAY_ELECTRICAL]: RoomType.HALLWAY,
  // Khác
  [AssetType.OTHER]: RoomType.LIVING_ROOM,
};

// Map AssetType to prefix for asset code generation
const ASSET_TYPE_PREFIX: Record<AssetType, string> = {
  // Nhà tắm & Vệ sinh
  [AssetType.TOILET]: 'TLT',
  [AssetType.BATHROOM_SINK]: 'BSK',
  [AssetType.WATER_HEATER]: 'WH',
  [AssetType.SHOWER_SYSTEM]: 'SHW',
  [AssetType.BATHROOM_FAUCET]: 'BFC',
  [AssetType.BATHROOM_LIGHT]: 'BLT',
  [AssetType.BATHROOM_DOOR]: 'BDR',
  [AssetType.BATHROOM_ELECTRICAL]: 'BEL',
  // Phòng khách
  [AssetType.LIVING_ROOM_DOOR]: 'LRD',
  [AssetType.LIVING_ROOM_LIGHT]: 'LRL',
  [AssetType.AIR_CONDITIONER]: 'AC',
  [AssetType.INTERNET_SYSTEM]: 'INT',
  [AssetType.FAN]: 'FAN',
  [AssetType.LIVING_ROOM_ELECTRICAL]: 'LRE',
  // Phòng ngủ
  [AssetType.BEDROOM_ELECTRICAL]: 'BRE',
  [AssetType.BEDROOM_AIR_CONDITIONER]: 'BAC',
  [AssetType.BEDROOM_DOOR]: 'BRD',
  [AssetType.BEDROOM_WINDOW]: 'BRW',
  // Nhà bếp
  [AssetType.KITCHEN_LIGHT]: 'KLT',
  [AssetType.KITCHEN_ELECTRICAL]: 'KEL',
  [AssetType.ELECTRIC_STOVE]: 'EST',
  [AssetType.KITCHEN_DOOR]: 'KDR',
  // Hành lang
  [AssetType.HALLWAY_LIGHT]: 'HLT',
  [AssetType.HALLWAY_ELECTRICAL]: 'HEL',
  // Khác
  [AssetType.OTHER]: 'OTH',
};

// Map AssetType to default purchase price (VND)
const ASSET_TYPE_DEFAULT_PRICE: Record<AssetType, number> = {
  // Nhà tắm & Vệ sinh
  [AssetType.TOILET]: 3000000,
  [AssetType.BATHROOM_SINK]: 1500000,
  [AssetType.WATER_HEATER]: 3000000,
  [AssetType.SHOWER_SYSTEM]: 2000000,
  [AssetType.BATHROOM_FAUCET]: 500000,
  [AssetType.BATHROOM_LIGHT]: 300000,
  [AssetType.BATHROOM_DOOR]: 2000000,
  [AssetType.BATHROOM_ELECTRICAL]: 1000000,
  // Phòng khách
  [AssetType.LIVING_ROOM_DOOR]: 3000000,
  [AssetType.LIVING_ROOM_LIGHT]: 500000,
  [AssetType.AIR_CONDITIONER]: 8000000,
  [AssetType.INTERNET_SYSTEM]: 1000000,
  [AssetType.FAN]: 500000,
  [AssetType.LIVING_ROOM_ELECTRICAL]: 1500000,
  // Phòng ngủ
  [AssetType.BEDROOM_ELECTRICAL]: 1500000,
  [AssetType.BEDROOM_AIR_CONDITIONER]: 8000000,
  [AssetType.BEDROOM_DOOR]: 2000000,
  [AssetType.BEDROOM_WINDOW]: 1500000,
  // Nhà bếp
  [AssetType.KITCHEN_LIGHT]: 300000,
  [AssetType.KITCHEN_ELECTRICAL]: 1000000,
  [AssetType.ELECTRIC_STOVE]: 3000000,
  [AssetType.KITCHEN_DOOR]: 2000000,
  // Hành lang
  [AssetType.HALLWAY_LIGHT]: 300000,
  [AssetType.HALLWAY_ELECTRICAL]: 1000000,
  // Khác
  [AssetType.OTHER]: 1000000,
};

// All asset types grouped by room (excluding OTHER)
const ROOM_ASSET_TYPES: Record<RoomType, AssetType[]> = {
  [RoomType.BATHROOM]: [
    AssetType.TOILET, AssetType.BATHROOM_SINK, AssetType.WATER_HEATER,
    AssetType.SHOWER_SYSTEM, AssetType.BATHROOM_FAUCET, AssetType.BATHROOM_LIGHT,
    AssetType.BATHROOM_DOOR, AssetType.BATHROOM_ELECTRICAL,
  ],
  [RoomType.LIVING_ROOM]: [
    AssetType.LIVING_ROOM_DOOR, AssetType.LIVING_ROOM_LIGHT, AssetType.AIR_CONDITIONER,
    AssetType.INTERNET_SYSTEM, AssetType.FAN, AssetType.LIVING_ROOM_ELECTRICAL,
  ],
  [RoomType.BEDROOM]: [
    AssetType.BEDROOM_ELECTRICAL, AssetType.BEDROOM_AIR_CONDITIONER,
    AssetType.BEDROOM_DOOR, AssetType.BEDROOM_WINDOW,
  ],
  [RoomType.KITCHEN]: [
    AssetType.KITCHEN_LIGHT, AssetType.KITCHEN_ELECTRICAL,
    AssetType.ELECTRIC_STOVE, AssetType.KITCHEN_DOOR,
  ],
  [RoomType.HALLWAY]: [
    AssetType.HALLWAY_LIGHT, AssetType.HALLWAY_ELECTRICAL,
  ],
};

// Room display order
const ROOM_ORDER: RoomType[] = [
  RoomType.BATHROOM, RoomType.LIVING_ROOM, RoomType.BEDROOM, RoomType.KITCHEN, RoomType.HALLWAY,
];

const BASE_API_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081').replace(/\/$/, '');
const DATA_DOCS_API_URL = (process.env.NEXT_PUBLIC_DATA_DOCS_URL || 'http://localhost:8082').replace(/\/$/, '');

function resolveFileUrl(url?: string | null, contractId?: string, fileId?: string) {
  // If we have contractId and fileId, use Next.js API route to proxy the request
  // This ensures credentials are forwarded properly
  if (contractId && fileId) {
    return `/api/contract-files/${contractId}/${fileId}`;
  }

  // Fallback to using fileUrl/proxyUrl if provided
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  // Try data-docs-service first, then fallback to base-service
  if (normalizedPath.includes('/api/contracts') || normalizedPath.includes('/api/files')) {
    return `${DATA_DOCS_API_URL}${normalizedPath}`;
  }
  return `${BASE_API_URL}${normalizedPath}`;
}

export default function ContractManagementPage() {
  const t = useTranslations('Contracts');
  const [buildingsState, setBuildingsState] =
    useState<AsyncState<Building[]>>(DEFAULT_BUILDINGS_STATE);
  const [unitsState, setUnitsState] = useState<AsyncState<Unit[]>>(DEFAULT_UNITS_STATE);
  const [contractsState, setContractsState] =
    useState<AsyncState<ContractSummary[]>>(DEFAULT_CONTRACTS_STATE);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createFiles, setCreateFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const detailFileInputRef = useRef<HTMLInputElement | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [detailUploadError, setDetailUploadError] = useState<string | null>(null);
  const [detailUploading, setDetailUploading] = useState(false);
  const [generatingContractNumber, setGeneratingContractNumber] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'unavailable'>('active');
  const [minStartDate, setMinStartDate] = useState<string>('');

  // Asset checking state
  const [unitAssets, setUnitAssets] = useState<Asset[]>([]);
  const [checkingAssets, setCheckingAssets] = useState(false);
  const [missingAssetTypes, setMissingAssetTypes] = useState<AssetType[]>([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<Set<AssetType>>(new Set());
  const [creatingMissingAssets, setCreatingMissingAssets] = useState(false);
  const [showCreateAssetsConfirm, setShowCreateAssetsConfirm] = useState(false);

  // Meter checking state
  const [unitMeters, setUnitMeters] = useState<MeterDto[]>([]);
  const [checkingMeters, setCheckingMeters] = useState(false);
  const [missingMeterServices, setMissingMeterServices] = useState<ServiceDto[]>([]);
  const [creatingMissingMeters, setCreatingMissingMeters] = useState(false);
  const [showCreateMetersConfirm, setShowCreateMetersConfirm] = useState(false);

  const formatDate = (value?: string | null) => {
    if (!value) return t('common.notSet');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('vi-VN');
  };

  const formatNumberWithDots = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    return value.toLocaleString('vi-VN', { useGrouping: true, minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const parseNumberFromFormattedString = (value: string): number | null => {
    if (!value || value.trim() === '') return null;
    // Remove all dots (thousands separators)
    const cleaned = value.replace(/\./g, '').trim();
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  };

  // Calculate rent breakdown (simplified: just number of months)
  const calculateRentBreakdown = (startDate: string | null, endDate: string | null) => {
    if (!startDate || !endDate) {
      return null;
    }

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        return null;
      }

      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      const startYear = start.getFullYear();
      const startMonth = start.getMonth();
      const endYear = end.getFullYear();
      const endMonth = end.getMonth();

      // Calculate number of months (since endDate has same day as startDate, this is straightforward)
      const months = (endYear - startYear) * 12 + (endMonth - startMonth);

      return {
        months,
      };
    } catch (error) {
      return null;
    }
  };

  const calculateTotalRent = (startDate: string | null, endDate: string | null, monthlyRent: number | null): number | null => {
    if (!startDate || !endDate || monthlyRent === null || monthlyRent <= 0) {
      return null;
    }

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        return null;
      }

      // Normalize dates to start of day to avoid timezone issues
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      // Since endDate always has the same day as startDate, we can simply calculate months
      // Calculate the difference in months
      const startYear = start.getFullYear();
      const startMonth = start.getMonth();
      const endYear = end.getFullYear();
      const endMonth = end.getMonth();

      // Calculate number of months
      const months = (endYear - startYear) * 12 + (endMonth - startMonth);

      // Total rent = number of months * monthly rent
      const totalRent = months * monthlyRent;

      return totalRent;
    } catch (error) {
      return null;
    }
  };

  const CONTRACT_TYPE_OPTIONS = useMemo(() => [
    { value: 'RENTAL', label: t('contractTypes.rental') },
    { value: 'PURCHASE', label: t('contractTypes.purchase') },
  ], [t]);

  const PAYMENT_METHOD_OPTIONS = useMemo(() => [
    { value: '', label: t('paymentMethods.selectPlaceholder') },
    { value: t('paymentMethods.transfer'), label: t('paymentMethods.transfer') },
    { value: t('paymentMethods.cash'), label: t('paymentMethods.cash') },
    { value: t('paymentMethods.eWallet'), label: t('paymentMethods.eWallet') },
    { value: t('paymentMethods.other'), label: t('paymentMethods.other') },
  ], [t]);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailState, setDetailState] = useState<{
    data: ContractDetail | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const [formState, setFormState] = useState<CreateContractPayload>({
    unitId: '',
    contractNumber: '',
    contractType: 'RENTAL',
    startDate: '',
    endDate: '',
    monthlyRent: null,
    purchasePrice: null,
    paymentMethod: '',
    paymentTerms: '',
    purchaseDate: '',
    notes: '',
    status: 'ACTIVE',
  });

  // State for end month selection (month-year format: YYYY-MM)
  const [endMonth, setEndMonth] = useState<string>('');

  // Calculate min date for month input (format: YYYY-MM)
  const minMonthValue = useMemo(() => {
    if (!formState.startDate) return '';
    try {
      const start = new Date(formState.startDate);
      if (isNaN(start.getTime())) return '';
      const year = start.getFullYear();
      const month = (start.getMonth() + 1).toString().padStart(2, '0');
      return `${year}-${month}`;
    } catch {
      return '';
    }
  }, [formState.startDate]);

  const calculatedTotalRent = useMemo(() => {
    if (formState.contractType === 'RENTAL') {
      return calculateTotalRent(formState.startDate || null, formState.endDate || null, formState.monthlyRent ?? null);
    }
    return null;
  }, [formState.contractType, formState.startDate, formState.endDate, formState.monthlyRent]);

  const rentBreakdown = useMemo(() => {
    if (formState.contractType === 'RENTAL' && formState.startDate && formState.endDate) {
      return calculateRentBreakdown(formState.startDate, formState.endDate);
    }
    return null;
  }, [formState.contractType, formState.startDate, formState.endDate]);

  // Get start date day (to enforce same day for end date)
  const startDateDay = useMemo(() => {
    if (!formState.startDate) return null;
    try {
      const start = new Date(formState.startDate);
      if (isNaN(start.getTime())) return null;
      return start.getDate(); // Get day of month (1-31)
    } catch {
      return null;
    }
  }, [formState.startDate]);

  // Auto-update endDate when endMonth or startDateDay changes
  useEffect(() => {
    if (endMonth && startDateDay !== null && formState.contractType === 'RENTAL') {
      // endMonth is in format YYYY-MM
      const [year, month] = endMonth.split('-');
      if (!year || !month) return; // Safety check

      const monthIndex = parseInt(month) - 1; // JavaScript months are 0-indexed

      // Create date with the same day as startDate
      // If the day doesn't exist in the target month, use the last day of that month
      const tempDate = new Date(parseInt(year), monthIndex + 1, 0); // Last day of target month
      const maxDayInMonth = tempDate.getDate();
      const targetDay = Math.min(startDateDay, maxDayInMonth);

      // Format as YYYY-MM-DD
      const formattedEndDate = `${year}-${month}-${targetDay.toString().padStart(2, '0')}`;

      // Update endDate (setFormState will prevent unnecessary updates if value is the same)
      setFormState(prev => {
        // Only update if different to avoid unnecessary re-renders
        if (prev.endDate !== formattedEndDate) {
          return { ...prev, endDate: formattedEndDate };
        }
        return prev;
      });
    } else if (!endMonth && formState.endDate && formState.contractType === 'RENTAL') {
      // Clear endDate if endMonth is cleared
      setFormState(prev => ({ ...prev, endDate: '' }));
    }
  }, [endMonth, startDateDay, formState.contractType]); // Don't include formState.endDate to avoid loop

  const clearFieldErrors = (...fields: (keyof CreateContractPayload)[]) => {
    setFormErrors((prev) => {
      if (!prev || Object.keys(prev).length === 0) {
        return prev;
      }
      let hasChanges = false;
      const next = { ...prev };
      fields.forEach((field) => {
        const key = field as string;
        if (key in next) {
          delete next[key];
          hasChanges = true;
        }
      });
      return hasChanges ? next : prev;
    });
  };

  // Validate individual field
  const validateField = <K extends keyof CreateContractPayload>(
    field: K,
    value: CreateContractPayload[K],
    currentFormState?: typeof formState,
  ) => {
    const state = currentFormState || formState;
    const newErrors = { ...formErrors };

    switch (field) {
      case 'unitId':
        if (!value || (typeof value === 'string' && !value.trim())) {
          newErrors.unitId = t('validation.unitRequired');
        } else {
          delete newErrors.unitId;
        }
        break;
      case 'contractNumber':
        if (!value || (typeof value === 'string' && !value.trim())) {
          newErrors.contractNumber = t('validation.contractNumberRequired');
        } else {
          delete newErrors.contractNumber;
        }
        break;
      case 'contractType':
        // Clear related errors when contract type changes
        if (value === 'PURCHASE') {
          delete newErrors.endDate;
          delete newErrors.monthlyRent;
        } else {
          delete newErrors.purchasePrice;
          delete newErrors.purchaseDate;
        }
        break;
      case 'startDate':
        if (!value || (typeof value === 'string' && !value.trim())) {
          newErrors.startDate = t('validation.startDateRequired');
        } else if (typeof value === 'string' && !isValidDate(value)) {
          newErrors.startDate = t('validation.startDateInvalid');
        } else if (typeof value === 'string' && value.trim()) {
          const startDate = new Date(value);
          startDate.setHours(0, 0, 0, 0);

          // Check if startDate > endDate of latest expired RENTAL contract or CANCELLED contract that's still active
          let referenceContract = latestExpiredRentalContract;
          if (!referenceContract && latestActiveCancelledRentalContract) {
            referenceContract = latestActiveCancelledRentalContract;
          }

          if (referenceContract && referenceContract.endDate) {
            const referenceEndDate = new Date(referenceContract.endDate);
            referenceEndDate.setHours(0, 0, 0, 0);
            if (startDate <= referenceEndDate) {
              const referenceEndDateStr = referenceEndDate.toLocaleDateString('vi-VN');
              newErrors.startDate = t('validation.startDateAfterExpired') || `Ngày bắt đầu phải sau ngày kết thúc của hợp đồng cũ (${referenceEndDateStr})`;
            } else {
              delete newErrors.startDate;
              // Reset endMonth and endDate when startDate changes (will be recalculated)
              if (state.contractType === 'RENTAL') {
                setEndMonth('');
                setFormState(prev => ({ ...prev, endDate: '' }));
              }
            }
          } else {
            // Check if startDate > today (must be greater than today, not equal)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (startDate <= today) {
              newErrors.startDate = t('validation.startDateInFuture');
            } else {
              delete newErrors.startDate;
              // Reset endMonth and endDate when startDate changes (will be recalculated)
              if (state.contractType === 'RENTAL') {
                setEndMonth('');
                setFormState(prev => ({ ...prev, endDate: '' }));
              }
            }
          }
        } else {
          delete newErrors.startDate;
        }
        break;
      case 'endDate':
        if (state.contractType === 'RENTAL') {
          if (!value || (typeof value === 'string' && !value.trim())) {
            newErrors.endDate = t('validation.endDateRequired');
          } else if (typeof value === 'string' && !isValidDate(value)) {
            newErrors.endDate = t('validation.endDateInvalid');
          } else if (typeof value === 'string' && value.trim() && state.startDate) {
            const startDate = new Date(state.startDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(value);
            endDate.setHours(0, 0, 0, 0);

            // Check: endDate must be after startDate
            if (endDate <= startDate) {
              newErrors.endDate = t('validation.endDateAfterStartDate') || 'Ngày kết thúc phải sau ngày bắt đầu';
            } else {
              // Check: endDate must have the same day as startDate
              const startDay = startDate.getDate();
              const endDay = endDate.getDate();
              if (startDay !== endDay) {
                newErrors.endDate = `Ngày kết thúc phải là ngày ${startDay} (cùng ngày với ngày bắt đầu)`;
              } else {
                // Check: minimum 3 months requirement
                const startYear = startDate.getFullYear();
                const startMonth = startDate.getMonth();
                const endYear = endDate.getFullYear();
                const endMonth = endDate.getMonth();
                const months = (endYear - startYear) * 12 + (endMonth - startMonth);
                if (months < 3) {
                  newErrors.endDate = 'Hợp đồng thuê phải tối thiểu 3 tháng';
                } else {
                  delete newErrors.endDate;
                }
              }
            }
          } else {
            delete newErrors.endDate;
          }
        } else {
          delete newErrors.endDate;
        }
        break;
      case 'purchaseDate':
        if (state.contractType === 'PURCHASE') {
          if (!value || (typeof value === 'string' && !value.trim())) {
            newErrors.purchaseDate = t('validation.purchaseDateRequired');
          } else if (typeof value === 'string' && !isValidDate(value)) {
            newErrors.purchaseDate = t('validation.purchaseDateInvalid');
          } else {
            // Allow purchaseDate to be before, equal, or after startDate
            // No validation needed for date comparison
            delete newErrors.purchaseDate;
          }
        } else {
          delete newErrors.purchaseDate;
        }
        break;
      case 'monthlyRent':
        if (state.contractType === 'RENTAL') {
          if (value === null || value === undefined) {
            newErrors.monthlyRent = t('validation.monthlyRentRequired');
          } else if (typeof value === 'number' && value <= 0) {
            newErrors.monthlyRent = t('validation.monthlyRentGreaterThanZero');
          } else {
            delete newErrors.monthlyRent;
          }
        } else {
          delete newErrors.monthlyRent;
        }
        break;
      case 'purchasePrice':
        if (state.contractType === 'PURCHASE') {
          if (value === null || value === undefined) {
            newErrors.purchasePrice = t('validation.purchasePriceRequired');
          } else if (typeof value === 'number' && value <= 0) {
            newErrors.purchasePrice = t('validation.purchasePriceGreaterThanZero');
          } else {
            delete newErrors.purchasePrice;
          }
        } else {
          delete newErrors.purchasePrice;
        }
        break;
      case 'paymentMethod':
        // Payment method is required only for RENTAL contracts
        // PURCHASE contracts are fully paid, so paymentMethod is not applicable
        if (state.contractType === 'RENTAL') {
          if (!value || (typeof value === 'string' && !value.trim())) {
            newErrors.paymentMethod = t('validation.paymentMethodRequired');
          } else {
            delete newErrors.paymentMethod;
          }
        } else {
          // For PURCHASE contracts, clear any paymentMethod errors
          delete newErrors.paymentMethod;
        }
        break;
    }

    setFormErrors(newErrors);
  };

  const setFieldValue = <K extends keyof CreateContractPayload>(
    field: K,
    value: CreateContractPayload[K],
  ) => {
    setFormState((prev) => {
      const newState = {
        ...prev,
        [field]: value,
      };

      // Auto-update paymentTerms for RENTAL contracts when startDate or endDate changes
      if (prev.contractType === 'RENTAL' && (field === 'startDate' || field === 'endDate')) {
        const startDate = field === 'startDate' ? (value as string) : prev.startDate;
        const endDate = field === 'endDate' ? (value as string) : prev.endDate;

        // Only auto-update if paymentTerms is empty or was previously auto-generated
        const currentTerms = prev.paymentTerms?.trim() || '';
        const isAutoGenerated = currentTerms.includes('Thanh toán') &&
          (currentTerms.includes('từ') || currentTerms.includes('đến'));

        if (startDate && endDate && (!currentTerms || isAutoGenerated)) {
          try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
              const startStr = start.toLocaleDateString('vi-VN');
              const endStr = end.toLocaleDateString('vi-VN');
              const months = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));

              let suggestedTerms = '';
              if (months <= 1) {
                suggestedTerms = t('paymentTerms.oneTimePayment', { start: startStr, end: endStr });
              } else {
                suggestedTerms = t('paymentTerms.monthlyPayment', { start: startStr, end: endStr, months });
              }

              newState.paymentTerms = suggestedTerms;
            }
          } catch (e) {
            // Ignore date parsing errors
          }
        }
      }

      // Validate field after state update
      setTimeout(() => {
        validateField(field, value, newState);
      }, 0);
      return newState;
    });
    clearFieldErrors(field);
  };

  useEffect(() => {
    const loadBuildings = async () => {
      setBuildingsState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const data = await getBuildings();
        setBuildingsState({ data, loading: false, error: null });
      } catch (err: any) {
        const message =
          err?.response?.data?.message || err?.message || t('errors.loadBuildings');
        setBuildingsState({ data: [], loading: false, error: message });
      }
    };

    void loadBuildings();
  }, []);

  const buildingOptions = useMemo(
    () =>
      [...buildingsState.data]
        .sort((a, b) => {
          const codeA = (a.code || '').toUpperCase();
          const codeB = (b.code || '').toUpperCase();
          return codeA.localeCompare(codeB);
        })
        .map((building) => ({
          value: building.id,
          label: `${building.code ? `${building.code} - ` : ''}${building.name ?? ''}`,
        })),
    [buildingsState.data],
  );

  const unitOptions = useMemo(
    () =>
      unitsState.data.map((unit) => ({
        value: unit.id,
        label: `${unit.code ?? ''}${unit.floor !== undefined ? ` (${t('unitLabel.floor')} ${unit.floor})` : ''}`,
      })),
    [unitsState.data, t],
  );

  const handleSelectBuilding = async (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    setSelectedUnitId('');
    setFieldValue('unitId', '');
    setUnitsState(DEFAULT_UNITS_STATE);
    setContractsState(DEFAULT_CONTRACTS_STATE);

    if (!buildingId) {
      return;
    }

    setUnitsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getUnitsByBuilding(buildingId);
      setUnitsState({ data, loading: false, error: null });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('errors.loadUnits');
      setUnitsState({ data: [], loading: false, error: message });
    }
  };

  const loadContracts = async (unitId: string) => {
    setContractsState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchContractsByUnit(unitId);
      setContractsState({ data, loading: false, error: null });
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setContractsState({ data: [], loading: false, error: null });
        return;
      }
      setContractsState({
        data: [],
        loading: false,
        error: t('errors.loadContracts'),
      });
    }
  };

  // Check unit assets
  const checkUnitAssets = async (unitId: string, autoSelect: boolean = true) => {
    if (!unitId) return;

    setCheckingAssets(true);
    try {
      const assets = await getAssetsByUnit(unitId);
      setUnitAssets(assets);

      // Check all asset types (except OTHER)
      const allTypes = Object.values(AssetType).filter(t => t !== AssetType.OTHER) as AssetType[];
      const existingActiveTypes = new Set(assets.filter(a => a.active).map(a => a.assetType));
      const missing = allTypes.filter(type => !existingActiveTypes.has(type));
      setMissingAssetTypes(missing);
      if (autoSelect) {
        // Auto-select all missing types on first load
        setSelectedAssetTypes(new Set(missing));
      } else {
        // After creating assets, clear selections (don't force remaining)
        setSelectedAssetTypes(new Set());
      }
    } catch (error: any) {
      console.error('Failed to check unit assets:', error);
      setUnitAssets([]);
      setMissingAssetTypes([]);
      setSelectedAssetTypes(new Set());
    } finally {
      setCheckingAssets(false);
    }
  };

  const checkUnitMeters = async (unitId: string) => {
    if (!unitId) return;

    setCheckingMeters(true);
    try {
      // Get all meters for this unit
      const meters = await getMeters({ unitId, active: true });
      setUnitMeters(meters);

      // Get all services that require meters (water and electric only)
      const allServices = await getAllServices();
      const servicesRequiringMeter = allServices.filter(s =>
        s.requiresMeter && ALLOWED_SERVICE_CODES.includes(s.code)
      );

      // Find which services are missing meters
      const existingServiceIds = new Set(meters.map(m => m.serviceId));
      const missing = servicesRequiringMeter.filter(service => !existingServiceIds.has(service.id));

      setMissingMeterServices(missing);
    } catch (error: any) {
      console.error('Failed to check unit meters:', error);
      // Don't block contract creation if meter check fails
      setUnitMeters([]);
      setMissingMeterServices([]);
    } finally {
      setCheckingMeters(false);
    }
  };

  // Create missing meters
  const handleCreateMissingMeters = async () => {
    if (!formState.unitId || missingMeterServices.length === 0) return;

    setCreatingMissingMeters(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      for (const service of missingMeterServices) {
        try {
          const meterReq: MeterCreateReq = {
            unitId: formState.unitId,
            serviceId: service.id,
            installedAt: new Date().toISOString().split('T')[0], // Today's date
          };

          await createMeter(meterReq);
          successCount++;
        } catch (err: any) {
          const errorMsg = err?.response?.data?.message || err?.message || 'Unknown error';
          errors.push(`${service.name || service.code}: ${errorMsg}`);
        }
      }

      if (successCount > 0) {
        // Reload meters to update the UI
        await checkUnitMeters(formState.unitId);
        setShowCreateMetersConfirm(false);
        setCreateSuccess(`Đã tạo thành công ${successCount} đồng hồ đo${errors.length > 0 ? `. ${errors.length} lỗi.` : ''}`);
      }

      if (errors.length > 0 && successCount === 0) {
        setCreateError(`Không thể tạo đồng hồ đo: ${errors.join('; ')}`);
      } else if (errors.length > 0) {
        setCreateError(`Đã tạo ${successCount} đồng hồ đo thành công. Lỗi: ${errors.join('; ')}`);
      }
    } catch (error: any) {
      console.error('Failed to create missing meters:', error);
      setCreateError('Không thể tạo đồng hồ đo. Vui lòng thử lại.');
    } finally {
      setCreatingMissingMeters(false);
    }
  };

  // Create missing assets (only selected ones)
  const handleCreateMissingAssets = async () => {
    if (!formState.unitId || selectedAssetTypes.size === 0) return;

    setCreatingMissingAssets(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      const unit = unitsState.data.find(u => u.id === formState.unitId);
      if (!unit) {
        setCreateError('Không tìm thấy thông tin căn hộ');
        return;
      }

      for (const assetType of Array.from(selectedAssetTypes)) {
        // Generate asset code
        const prefix = ASSET_TYPE_PREFIX[assetType];
        const existingAssetsOfType = unitAssets.filter(
          a => a.assetType === assetType && a.assetCode.startsWith(`${prefix}-${unit.code}-`)
        );

        let nextNumber = 1;
        if (existingAssetsOfType.length > 0) {
          const numbers = existingAssetsOfType
            .map(a => {
              const match = a.assetCode.match(/-(\d+)$/);
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter(n => n > 0);

          if (numbers.length > 0) {
            nextNumber = Math.max(...numbers) + 1;
          }
        }

        const numberStr = nextNumber.toString().padStart(3, '0');
        const assetCode = `${prefix}-${unit.code}-${numberStr}`;

        try {
          const payload: CreateAssetRequest = {
            unitId: formState.unitId,
            assetType,
            roomType: ASSET_TYPE_TO_ROOM[assetType],
            assetCode,
            name: ASSET_TYPE_LABELS[assetType],
            active: true,
            installedAt: new Date().toISOString().split('T')[0],
          };

          await createAsset(payload);
          successCount++;
        } catch (error: any) {
          const errorMsg = error?.response?.data?.message || error?.message || 'Lỗi không xác định';
          errors.push(`${ASSET_TYPE_LABELS[assetType]}: ${errorMsg}`);
        }
      }

      if (successCount > 0) {
        setCreateSuccess(`Đã tạo thành công ${successCount} thiết bị${errors.length > 0 ? `. ${errors.length} lỗi.` : ''}`);
        // Refresh asset list
        await checkUnitAssets(formState.unitId, false);
        // Refresh meter list
        await checkUnitMeters(formState.unitId);
        setShowCreateAssetsConfirm(false);
      }

      if (errors.length > 0 && successCount === 0) {
        setCreateError(`Không thể tạo thiết bị. Lỗi: ${errors.join('; ')}`);
      }
    } catch (error: any) {
      console.error('Failed to create missing assets:', error);
      setCreateError(error?.response?.data?.message || error?.message || 'Không thể tạo thiết bị');
    } finally {
      setCreatingMissingAssets(false);
    }
  };

  const handleSelectUnit = async (unitId: string) => {
    setSelectedUnitId(unitId);
    setFieldValue('unitId', unitId);
    setActiveTab('active'); // Reset to active tab when selecting new unit

    if (!unitId) {
      setContractsState(DEFAULT_CONTRACTS_STATE);
      setUnitAssets([]);
      setMissingAssetTypes([]);
      setSelectedAssetTypes(new Set());
      return;
    }

    await loadContracts(unitId);
    await checkUnitAssets(unitId);
    await checkUnitMeters(unitId);
  };

  const handleOpenCreateModal = async () => {
    setCreateError(null);
    setCreateSuccess(null);
    setCreateModalOpen(true);
    if (selectedUnitId) {
      setFieldValue('unitId', selectedUnitId);
      await checkUnitAssets(selectedUnitId);
      await checkUnitMeters(selectedUnitId);
    }
    setCreateFiles(null);
    setFormErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Calculate min start date from latest expired RENTAL contract or CANCELLED contract that's still active
    let referenceContract = latestExpiredRentalContract;
    if (!referenceContract && latestActiveCancelledRentalContract) {
      referenceContract = latestActiveCancelledRentalContract;
    }

    if (referenceContract && referenceContract.endDate) {
      const referenceEndDate = new Date(referenceContract.endDate);
      referenceEndDate.setHours(0, 0, 0, 0);
      // Min start date should be the day after reference end date
      const minDate = new Date(referenceEndDate);
      minDate.setDate(minDate.getDate() + 1);
      const minDateStr = minDate.toISOString().split('T')[0];
      setMinStartDate(minDateStr);
    } else {
      // If no reference contract, use tomorrow as min date (existing logic)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      setMinStartDate(tomorrowStr);
    }

    // Generate contract number
    setGeneratingContractNumber(true);
    try {
      const contractNumber = await generateAutoContractNumber(selectedUnitId);
      setFieldValue('contractNumber', contractNumber);
    } catch (err) {
      console.error('Failed to generate contract number:', err);
      // Still allow form to open, user can manually enter
    } finally {
      setGeneratingContractNumber(false);
    }
  };

  const resetCreateForm = () => {
    setFormState({
      unitId: selectedUnitId || '',
      contractNumber: '',
      contractType: 'RENTAL',
      startDate: '',
      endDate: '',
      monthlyRent: null,
      purchasePrice: null,
      paymentMethod: '',
      paymentTerms: '',
      purchaseDate: '',
      notes: '',
      status: 'ACTIVE',
    });
    setEndMonth('');
    setCreateError(null);
    setCreateFiles(null);
    setFormErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isValidDate = (value?: string | null) => {
    if (!value) return true;
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  };

  // Generate auto contract number: HD<unitCode>-<ddmmyy>
  const generateAutoContractNumber = async (unitId?: string): Promise<string> => {
    const targetUnitId = unitId || formState.unitId || selectedUnitId;

    if (!targetUnitId) {
      throw new Error('Unit ID is required to generate contract number');
    }

    // Find unit code from unitsState
    const unit = unitsState.data.find(u => u.id === targetUnitId);
    if (!unit || !unit.code) {
      throw new Error('Unit code not found');
    }

    const unitCode = unit.code.trim();
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const datePart = `${day}${month}${year}`;

    // Try to get all contracts to check existing numbers
    let existingContracts: ContractSummary[] = [];
    try {
      existingContracts = await getAllContracts();
    } catch (err) {
      console.warn('Could not fetch all contracts for uniqueness check:', err);
    }

    // Extract existing numbers with same prefix (HD<unitCode>-<datePart>)
    const prefix = `HD${unitCode}-${datePart}`;
    const existingNumbers = existingContracts
      .map(c => c.contractNumber)
      .filter((num): num is string => num !== null && num.startsWith(prefix));

    // If no existing numbers with this prefix, return base format
    if (existingNumbers.length === 0) {
      return prefix;
    }

    // If there are existing numbers, check if base format exists
    const baseExists = existingNumbers.some(num => num === prefix);
    if (!baseExists) {
      return prefix;
    }

    // If base exists, add numeric suffix (1, 2, 3, ...)
    const existingSuffixes = existingNumbers
      .map(num => {
        if (num === prefix) return 0; // Base format counts as suffix 0
        const suffix = num.replace(prefix, '');
        // Check if suffix is a number (could be like "-1", "-2", etc.)
        if (suffix.startsWith('-')) {
          const numValue = parseInt(suffix.slice(1), 10);
          return isNaN(numValue) ? -1 : numValue;
        }
        return -1;
      })
      .filter(n => n >= 0);

    // Find next available suffix
    let nextSuffix = 1;
    if (existingSuffixes.length > 0) {
      const maxSuffix = Math.max(...existingSuffixes);
      nextSuffix = maxSuffix + 1;
    }

    return `${prefix}-${nextSuffix}`;
  };

  const handleUploadFilesForDetail = async (files: FileList | null) => {
    if (!files || files.length === 0 || !detailState.data) {
      return;
    }

    // Validate that all files are images
    const fileArray = Array.from(files);
    const invalidFiles = fileArray.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setDetailUploadError(t('validation.onlyImagesAllowed') || 'Chỉ được phép tải lên file ảnh');
      return;
    }

    setDetailUploadError(null);
    setDetailUploading(true);
    try {
      // Upload to ImageKit first - upload sequentially to avoid timeout
      for (const file of fileArray) {
        await uploadNewsImageFile(file, detailState.data!.id);
      }

      // Then upload to backend (for compatibility)
      await uploadContractFiles(detailState.data.id, files);
      const refreshed = await fetchContractDetail(detailState.data.id);
      if (refreshed) {
        setDetailState({ data: refreshed, loading: false, error: null });
      }
      if (detailFileInputRef.current) {
        detailFileInputRef.current.value = '';
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t('errors.uploadFilesFailed');
      setDetailUploadError(message);
    } finally {
      setDetailUploading(false);
    }
  };

  const handleCreateContract = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    const errors: Record<string, string> = {};

    if (!formState.unitId) {
      errors.unitId = t('validation.unitRequired');
    }

    if (!formState.contractNumber.trim()) {
      errors.contractNumber = t('validation.contractNumberRequired');
    }

    if (!formState.startDate) {
      errors.startDate = t('validation.startDateRequired');
    } else if (!isValidDate(formState.startDate)) {
      errors.startDate = t('validation.startDateInvalid');
    } else {
      const startDate = new Date(formState.startDate);
      startDate.setHours(0, 0, 0, 0);

      // Check if startDate > endDate of latest expired RENTAL contract or CANCELLED contract that's still active
      let referenceContract = latestExpiredRentalContract;
      if (!referenceContract && latestActiveCancelledRentalContract) {
        referenceContract = latestActiveCancelledRentalContract;
      }

      if (referenceContract && referenceContract.endDate) {
        const referenceEndDate = new Date(referenceContract.endDate);
        referenceEndDate.setHours(0, 0, 0, 0);
        if (startDate <= referenceEndDate) {
          const referenceEndDateStr = referenceEndDate.toLocaleDateString('vi-VN');
          errors.startDate = t('validation.startDateAfterExpired') || `Ngày bắt đầu phải sau ngày kết thúc của hợp đồng cũ (${referenceEndDateStr})`;
        }
      } else {
        // Check if startDate > today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (startDate <= today) {
          errors.startDate = t('validation.startDateInFuture');
        }
      }
    }

    if (formState.contractType === 'RENTAL') {
      if (formState.monthlyRent === null || formState.monthlyRent === undefined) {
        errors.monthlyRent = t('validation.monthlyRentRequired');
      } else if (formState.monthlyRent <= 0) {
        errors.monthlyRent = t('validation.monthlyRentGreaterThanZero');
      }
      if (!formState.endDate) {
        errors.endDate = t('validation.endDateRequired');
      } else if (!isValidDate(formState.endDate)) {
        errors.endDate = t('validation.endDateInvalid');
      } else if (formState.startDate) {
        const startDate = new Date(formState.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(formState.endDate);
        endDate.setHours(0, 0, 0, 0);

        // First check: endDate must be after startDate
        if (endDate <= startDate) {
          errors.endDate = t('validation.endDateAfterStartDate') || 'Ngày kết thúc phải sau ngày bắt đầu';
        } else {
          // Check: endDate must have the same day as startDate
          const startDay = startDate.getDate();
          const endDay = endDate.getDate();
          if (startDay !== endDay) {
            errors.endDate = `Ngày kết thúc phải là ngày ${startDay} (cùng ngày với ngày bắt đầu)`;
          } else {
            // Check: minimum 3 months requirement
            const startYear = startDate.getFullYear();
            const startMonth = startDate.getMonth();
            const endYear = endDate.getFullYear();
            const endMonth = endDate.getMonth();
            const months = (endYear - startYear) * 12 + (endMonth - startMonth);
            if (months < 3) {
              errors.endDate = 'Hợp đồng thuê phải tối thiểu 3 tháng';
            }
          }
        }
      }
      if (!formState.paymentMethod || !formState.paymentMethod.trim()) {
        errors.paymentMethod = t('validation.paymentMethodRequired');
      }
      // Validate paymentTerms should mention rental period for RENTAL contracts
      if (formState.paymentTerms && formState.paymentTerms.trim()) {
        const paymentTerms = formState.paymentTerms.trim().toLowerCase();
        const hasStartDate = formState.startDate && paymentTerms.includes(
          new Date(formState.startDate).toLocaleDateString('vi-VN').toLowerCase()
        );
        const hasEndDate = formState.endDate && paymentTerms.includes(
          new Date(formState.endDate).toLocaleDateString('vi-VN').toLowerCase()
        );
        const hasDateRange = paymentTerms.includes('từ') || paymentTerms.includes('đến') ||
          paymentTerms.includes('from') || paymentTerms.includes('to');

        // Warning (not error) if paymentTerms doesn't mention rental period
        // This is just a suggestion, not a hard requirement
        if (!hasStartDate && !hasEndDate && !hasDateRange) {
          // Just a warning, not blocking
          console.warn('Payment terms may not mention rental period');
        }
      }
    }

    if (formState.contractType === 'PURCHASE') {
      if (formState.endDate) {
        errors.endDate = t('validation.purchaseHasNoEndDate');
      }
      if (formState.purchasePrice === null || formState.purchasePrice === undefined) {
        errors.purchasePrice = t('validation.purchasePriceRequired');
      } else if (formState.purchasePrice <= 0) {
        errors.purchasePrice = t('validation.purchasePriceGreaterThanZero');
      }
      if (!formState.purchaseDate) {
        errors.purchaseDate = t('validation.purchaseDateRequired');
      } else if (!isValidDate(formState.purchaseDate)) {
        errors.purchaseDate = t('validation.purchaseDateInvalid');
      }
      // Allow purchaseDate to be before, equal, or after startDate
      // No validation needed for date comparison
      // PURCHASE contracts are fully paid, so paymentMethod and paymentTerms are not applicable
    }

    // Validate file upload: not null and only images
    if (!createFiles || createFiles.length === 0) {
      errors.files = t('validation.filesRequired');
    } else {
      // Validate that all files are images
      const fileArray = Array.from(createFiles);
      const invalidFiles = fileArray.filter(file => !file.type.startsWith('image/'));
      if (invalidFiles.length > 0) {
        errors.files = t('validation.onlyImagesAllowed') || 'Chỉ được phép tải lên file ảnh';
      }
    }

    // For RENTAL contracts, require meters for electricity and water
    if (formState.contractType === 'RENTAL') {
      // Wait for meter check to complete if still checking
      if (checkingMeters) {
        setCreateError(t('meterWarning.checking', { defaultValue: 'Đang kiểm tra đồng hồ đo...' }));
        return;
      }

      if (missingMeterServices.length > 0) {
        const missingServicesList = missingMeterServices.map(s => s.name || s.code || 'Unknown').join(', ');
        errors.meters = t('validation.metersRequiredForRental', {
          services: missingServicesList,
          defaultValue: `Hợp đồng cho thuê yêu cầu phải có đồng hồ đo cho: ${missingServicesList}. Vui lòng tạo đồng hồ đo trước khi tạo hợp đồng.`
        });
      }

      // Assets are optional - do not block contract creation for missing assets
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    try {
      setCreateSubmitting(true);
      const trimmedPaymentMethod =
        formState.paymentMethod && formState.paymentMethod.trim().length > 0
          ? formState.paymentMethod.trim()
          : null;
      const trimmedPaymentTerms =
        formState.paymentTerms && formState.paymentTerms.trim().length > 0
          ? formState.paymentTerms.trim()
          : null;
      const payload: CreateContractPayload = {
        ...formState,
        monthlyRent:
          formState.contractType === 'RENTAL' ? formState.monthlyRent ?? 0 : null,
        purchasePrice:
          formState.contractType === 'PURCHASE' ? formState.purchasePrice ?? 0 : null,
        endDate:
          formState.contractType === 'RENTAL' ? formState.endDate || null : null,
        purchaseDate:
          formState.contractType === 'PURCHASE' ? formState.purchaseDate || null : null,
        paymentMethod:
          formState.contractType === 'PURCHASE' ? null : trimmedPaymentMethod,
        paymentTerms:
          formState.contractType === 'PURCHASE' ? null : trimmedPaymentTerms,
        notes: formState.notes && formState.notes.trim().length > 0 ? formState.notes.trim() : null,
        // If there's a CANCELLED contract that's still active, new contract should be INACTIVE
        // Otherwise, set to ACTIVE
        status: latestActiveCancelledRentalContract ? 'INACTIVE' : 'ACTIVE',
      };

      // Retry logic for unique contract number
      let attempts = 0;
      let success = false;
      let contract: ContractDetail | null = null;

      while (attempts < 5 && !success) {
        try {
          contract = await createContract(payload);
          success = true;
        } catch (err: any) {
          if (err?.response?.status === 409 ||
            err?.response?.data?.message?.includes('already exists') ||
            err?.response?.data?.message?.includes('duplicate') ||
            err?.message?.includes('already exists') ||
            err?.message?.includes('duplicate')) {
            // Contract number conflict, regenerate and retry
            attempts++;
            if (attempts < 5) {
              try {
                const newContractNumber = await generateAutoContractNumber(formState.unitId);
                payload.contractNumber = newContractNumber;
                setFieldValue('contractNumber', newContractNumber);
              } catch (genErr) {
                console.error('Failed to regenerate contract number:', genErr);
                throw err; // Re-throw original error
              }
            } else {
              throw err; // Max attempts reached
            }
          } else {
            throw err; // Other error, don't retry
          }
        }
      }

      if (!contract) {
        throw new Error('Failed to create contract after retries');
      }

      if (createFiles && createFiles.length > 0) {
        try {
          // Upload to ImageKit first - upload sequentially to avoid timeout
          const fileArray = Array.from(createFiles);
          for (const file of fileArray) {
            await uploadNewsImageFile(file, contract.id);
          }

          // Then upload to backend (for compatibility)
          await uploadContractFiles(contract.id, createFiles);
        } catch (fileError: any) {
          const message =
            fileError?.response?.data?.message ||
            fileError?.message ||
            t('errors.createSuccessWithFileError');
          setCreateError(message);
        }
      }

      // Automatically create meters for water and electricity after contract creation
      try {
        const services = await getAllServices();
        // Filter to only water and electric services
        const filteredServices = services.filter(s => ALLOWED_SERVICE_CODES.includes(s.code));
        const waterService = services.find(s =>
          s.code?.toUpperCase() === 'WATER' ||
          s.name?.toLowerCase().includes('nước') ||
          s.name?.toLowerCase().includes('water')
        );
        const electricityService = services.find(s =>
          s.code?.toUpperCase() === 'ELECTRICITY' ||
          s.code?.toUpperCase() === 'ELECTRIC' ||
          s.name?.toLowerCase().includes('điện') ||
          s.name?.toLowerCase().includes('electricity')
        );

        const meterCreationPromises: Promise<any>[] = [];

        if (waterService && waterService.requiresMeter) {
          const waterMeterReq: MeterCreateReq = {
            unitId: payload.unitId,
            serviceId: waterService.id,
            installedAt: new Date().toISOString().split('T')[0], // Today's date
          };
          meterCreationPromises.push(
            createMeter(waterMeterReq).catch(err => {
              console.warn('Failed to create water meter:', err);
              return null; // Don't fail the whole operation if meter creation fails
            })
          );
        }

        if (electricityService && electricityService.requiresMeter) {
          const electricityMeterReq: MeterCreateReq = {
            unitId: payload.unitId,
            serviceId: electricityService.id,
            installedAt: new Date().toISOString().split('T')[0], // Today's date
          };
          meterCreationPromises.push(
            createMeter(electricityMeterReq).catch(err => {
              console.warn('Failed to create electricity meter:', err);
              return null; // Don't fail the whole operation if meter creation fails
            })
          );
        }

        // Wait for all meter creations to complete (or fail gracefully)
        const results = await Promise.allSettled(meterCreationPromises);
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;

        if (successCount > 0) {
          console.log(`✅ Created ${successCount} meter(s) for unit ${payload.unitId}`);
        }
      } catch (meterError: any) {
        // Log error but don't fail the contract creation
        console.warn('Failed to create meters automatically:', meterError);
      }

      setCreateSuccess(t('messages.createSuccess'));
      await loadContracts(payload.unitId);
      resetCreateForm();
      setCreateModalOpen(false);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('errors.createFailed');
      setCreateError(message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenContractDetail = async (contractId: string) => {
    setDetailModalOpen(true);
    setDetailUploadError(null);
    setDetailState({ data: null, loading: true, error: null });
    try {
      const detail = await fetchContractDetail(contractId);
      if (!detail) {
        setDetailState({
          data: null,
          loading: false,
          error: 'contractNotFound',
        });
        return;
      }
      setDetailState({ data: detail, loading: false, error: null });
    } catch (err: any) {
      const status = err?.response?.status;
      const errorMessage = err?.response?.data?.message || err?.message || '';
      const isNotFoundError = status === 404 ||
        status === 400 ||
        errorMessage.toLowerCase().includes('not found') ||
        errorMessage.toLowerCase().includes('không tìm thấy');

      if (isNotFoundError) {
        setDetailState({
          data: null,
          loading: false,
          error: 'contractNotFound',
        });
        return;
      }
      setDetailState({
        data: null,
        loading: false,
        error: t('errors.loadContractDetailFailed'),
      });
    }
  };

  const handleCloseContractDetail = () => {
    setDetailModalOpen(false);
    setDetailUploadError(null);
    if (detailFileInputRef.current) {
      detailFileInputRef.current.value = '';
    }
  };

  // Check if unit has active contract (not expired)
  // ACTIVE contracts are always active if endDate > today or no endDate
  // CANCELLED contracts are active if endDate >= today
  const hasActiveContract = useMemo(() => {
    if (!contractsState.data || contractsState.data.length === 0) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return contractsState.data.some((contract) => {
      if (contract.status === 'ACTIVE') {
        // If no endDate, contract is still active
        if (!contract.endDate) {
          return true;
        }
        // Check if endDate is in the future
        const endDate = new Date(contract.endDate);
        endDate.setHours(0, 0, 0, 0);
        return endDate > today;
      }
      // CANCELLED contracts are active if endDate >= today
      if (contract.status === 'CANCELLED' || contract.status === 'CANCELED') {
        if (!contract.endDate) {
          return true; // No endDate means still active
        }
        const endDate = new Date(contract.endDate);
        endDate.setHours(0, 0, 0, 0);
        return endDate >= today;
      }
      return false;
    });
  }, [contractsState.data]);

  // Get the most recent expired RENTAL contract (truly expired, not CANCELLED that's still active)
  const latestExpiredRentalContract = useMemo(() => {
    if (!contractsState.data || contractsState.data.length === 0) {
      return null;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredRentals = contractsState.data
      .filter((contract) => {
        // Must be RENTAL type
        if (contract.contractType !== 'RENTAL') {
          return false;
        }
        // Must have endDate
        if (!contract.endDate) {
          return false;
        }
        const endDate = new Date(contract.endDate);
        endDate.setHours(0, 0, 0, 0);
        // Must be expired (endDate < today)
        // CANCELLED contracts with endDate >= today are still considered active
        if (contract.status === 'CANCELLED' || contract.status === 'CANCELED') {
          return endDate < today;
        }
        // ACTIVE contracts are expired if endDate <= today
        return endDate <= today;
      })
      .sort((a, b) => {
        // Sort by endDate descending (most recent first)
        const dateA = new Date(a.endDate!);
        const dateB = new Date(b.endDate!);
        return dateB.getTime() - dateA.getTime();
      });

    return expiredRentals.length > 0 ? expiredRentals[0] : null;
  }, [contractsState.data]);

  // Get the most recent CANCELLED RENTAL contract that's still active (endDate >= today)
  const latestActiveCancelledRentalContract = useMemo(() => {
    if (!contractsState.data || contractsState.data.length === 0) {
      return null;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeCancelledRentals = contractsState.data
      .filter((contract) => {
        // Must be RENTAL type
        if (contract.contractType !== 'RENTAL') {
          return false;
        }
        // Must be CANCELLED
        if (contract.status !== 'CANCELLED' && contract.status !== 'CANCELED') {
          return false;
        }
        // Must have endDate and endDate >= today
        if (!contract.endDate) {
          return true; // No endDate means still active
        }
        const endDate = new Date(contract.endDate);
        endDate.setHours(0, 0, 0, 0);
        return endDate >= today;
      })
      .sort((a, b) => {
        // Sort by endDate descending (most recent first)
        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return -1;
        if (!b.endDate) return 1;
        const dateA = new Date(a.endDate);
        const dateB = new Date(b.endDate);
        return dateB.getTime() - dateA.getTime();
      });

    return activeCancelledRentals.length > 0 ? activeCancelledRentals[0] : null;
  }, [contractsState.data]);

  // Check if can create new contract: 
  // - Must have selectedUnitId
  // - No ACTIVE contract that's still valid (endDate > today or no endDate)
  const canCreateNewContract = useMemo(() => {
    if (!selectedUnitId) {
      return false;
    }

    // If no contracts at all, allow creating
    if (!contractsState.data || contractsState.data.length === 0) {
      return true;
    }

    // Check if there's an ACTIVE contract that's still valid (not expired)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hasActiveValidContract = contractsState.data.some((contract) => {
      // Only check ACTIVE status contracts (ignore CANCELLED)
      if (contract.status !== 'ACTIVE') {
        return false;
      }
      // If no endDate, contract is still valid
      if (!contract.endDate) {
        return true;
      }
      // Check if endDate > today (still valid)
      const endDate = new Date(contract.endDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate > today;
    });

    // Can create if there's no active valid contract
    return !hasActiveValidContract;
  }, [selectedUnitId, contractsState.data]);

  // Helper function to get display status for a contract
  const getContractDisplayStatus = (contract: ContractSummary) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If status is CANCELLED or CANCELED, show as is
    if (contract.status === 'CANCELLED' || contract.status === 'CANCELED') {
      return { label: t('status.cancelled'), className: 'bg-red-100 text-red-700' };
    }

    // If status is EXPIRED, show as expired
    if (contract.status === 'EXPIRED') {
      return { label: t('status.expired'), className: 'bg-orange-100 text-orange-700' };
    }

    // If status is INACTIVE, show as inactive
    if (contract.status === 'INACTIVE') {
      return { label: t('status.inactive'), className: 'bg-gray-100 text-gray-700' };
    }

    // For ACTIVE contracts, check if actually expired based on endDate
    if (contract.status === 'ACTIVE') {
      if (contract.endDate) {
        const endDate = new Date(contract.endDate);
        endDate.setHours(0, 0, 0, 0);
        if (endDate <= today) {
          // Contract is expired even though status is ACTIVE
          return { label: t('status.expired'), className: 'bg-orange-100 text-orange-700' };
        }
      }
      // Contract is truly active
      return { label: t('status.active'), className: 'bg-[#C7E8D2] text-[#02542D]' };
    }

    // Default: show status as is
    return { label: contract.status ?? t('status.unknown'), className: 'bg-gray-200 text-gray-700' };
  };

  // Get unavailable contracts (CANCELLED and EXPIRED), sorted by endDate (most recent first)
  const unavailableContracts = useMemo(() => {
    if (!contractsState.data || contractsState.data.length === 0) {
      return [];
    }

    return contractsState.data
      .filter((contract) => {
        // Show all CANCELLED contracts (regardless of endDate)
        if (contract.status === 'CANCELLED' || contract.status === 'CANCELED') {
          return true;
        }
        // Show all EXPIRED contracts
        if (contract.status === 'EXPIRED') {
          return true;
        }
        // Also show ACTIVE contracts that are actually expired (endDate <= today)
        if (contract.status === 'ACTIVE') {
          if (!contract.endDate) {
            return false; // No endDate means still active
          }
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const endDate = new Date(contract.endDate);
          endDate.setHours(0, 0, 0, 0);
          return endDate <= today;
        }
        return false;
      })
      .sort((a, b) => {
        // Sort by endDate descending (most recent first)
        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return 1; // No endDate goes to bottom
        if (!b.endDate) return -1;
        const dateA = new Date(a.endDate);
        const dateB = new Date(b.endDate);
        return dateB.getTime() - dateA.getTime(); // Descending order
      });
  }, [contractsState.data]);

  // Get active contracts (not CANCELLED, not EXPIRED, and not expired ACTIVE)
  const activeContracts = useMemo(() => {
    if (!contractsState.data || contractsState.data.length === 0) {
      return [];
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return contractsState.data
      .filter((contract) => {
        // Exclude all CANCELLED contracts (they go to unavailable tab)
        if (contract.status === 'CANCELLED' || contract.status === 'CANCELED') {
          return false;
        }
        // Exclude all EXPIRED contracts (they go to unavailable tab)
        if (contract.status === 'EXPIRED') {
          return false;
        }
        // ACTIVE contracts: active if endDate > today or no endDate
        if (contract.status === 'ACTIVE') {
          if (!contract.endDate) {
            return true; // No endDate means still active
          }
          const endDate = new Date(contract.endDate);
          endDate.setHours(0, 0, 0, 0);
          return endDate > today; // Only show if truly active (not expired)
        }
        // INACTIVE contracts are considered active (they will become active when startDate arrives)
        if (contract.status === 'INACTIVE') {
          return true;
        }
        // Other statuses are not active
        return false;
      })
      .sort((a, b) => {
        // Sort by endDate descending (most recent first), then by startDate
        if (a.endDate && b.endDate) {
          const dateA = new Date(a.endDate);
          const dateB = new Date(b.endDate);
          return dateB.getTime() - dateA.getTime();
        }
        if (a.endDate) return -1;
        if (b.endDate) return 1;
        if (a.startDate && b.startDate) {
          const dateA = new Date(a.startDate);
          const dateB = new Date(b.startDate);
          return dateB.getTime() - dateA.getTime();
        }
        return 0;
      });
  }, [contractsState.data]);

  // Auto-switch to active tab if unavailable tab is selected but no unavailable contracts
  useEffect(() => {
    if (activeTab === 'unavailable' && unavailableContracts.length === 0 && activeContracts.length > 0) {
      setActiveTab('active');
    }
  }, [activeTab, unavailableContracts.length, activeContracts.length]);

  const filteredContracts = activeTab === 'active' ? activeContracts : unavailableContracts;

  return (
    <div className="min-h-screen bg-[#F5F9F6] px-[41px] py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#02542D]">{t('title')}</h1>
            <p className="text-sm text-gray-600">
              {t('subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            disabled={!canCreateNewContract || contractsState.loading || Boolean(contractsState.error)}
            className="inline-flex items-center rounded-lg bg-[#14AE5C] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c793f] disabled:cursor-not-allowed disabled:bg-[#A3D9B1]"
          >
            {t('buttons.addContract')}
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#02542D]">{t('fields.building')}</label>
              <select
                value={selectedBuildingId}
                onChange={(event) => handleSelectBuilding(event.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#02542D] shadow-sm focus:border-[#14AE5C] focus:outline-none focus:ring-2 focus:ring-[#C7E8D2]"
              >
                <option value="">{t('placeholders.selectBuilding')}</option>
                {buildingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {buildingsState.loading && (
                <span className="text-xs text-gray-500">{t('loading.buildings')}</span>
              )}
              {buildingsState.error && (
                <span className="text-xs text-red-500">{buildingsState.error}</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#02542D]">{t('fields.unit')}</label>
              <select
                value={selectedUnitId}
                onChange={(event) => handleSelectUnit(event.target.value)}
                disabled={!selectedBuildingId || unitsState.loading}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#02542D] shadow-sm focus:border-[#14AE5C] focus:outline-none focus:ring-2 focus:ring-[#C7E8D2] disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">
                  {selectedBuildingId ? t('placeholders.selectUnit') : t('placeholders.selectBuildingFirst')}
                </option>
                {unitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {unitsState.loading && (
                <span className="text-xs text-gray-500">{t('loading.units')}</span>
              )}
              {unitsState.error && <span className="text-xs text-red-500">{unitsState.error}</span>}
            </div>
          </div>

          <div className="mt-6">
            {selectedUnitId && !contractsState.loading && !contractsState.error && (activeContracts.length > 0 || unavailableContracts.length > 0) && (
              <div className="mb-4 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('active')}
                    className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition ${activeTab === 'active'
                      ? 'border-[#14AE5C] text-[#02542D]'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                  >
                    {t('tabs.active')} ({activeContracts.length})
                  </button>
                  {unavailableContracts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('unavailable')}
                      className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition ${activeTab === 'unavailable'
                        ? 'border-[#14AE5C] text-[#02542D]'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }`}
                    >
                      {t('tabs.unavailable', { defaultValue: 'Unavailable Contracts' })} ({unavailableContracts.length})
                    </button>
                  )}
                </nav>
              </div>
            )}
          </div>

          <div className="mt-6">
            {contractsState.loading ? (
              <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                {t('loading.contracts')}
              </div>
            ) : contractsState.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {contractsState.error}
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
                {selectedUnitId
                  ? (activeTab === 'active'
                    ? t('empty.noActiveContracts')
                    : t('empty.noUnavailableContracts', { defaultValue: 'This apartment currently has no unavailable contracts (cancelled or expired).' }))
                  : t('empty.selectToView')}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-[#E9F4EE]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-[#02542D]">
                        {t('table.contractNumber')}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-[#02542D]">
                        {t('table.type')}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-[#02542D]">
                        {t('table.validity')}
                      </th>
                      <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-[#02542D]">
                        {t('table.status')}
                      </th>
                      <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-[#02542D]">
                        {t('table.detail')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredContracts.map((contract) => (
                      <tr key={contract.id} className="hover:bg-[#E9F4EE]">
                        <td className="px-4 py-3 font-medium text-[#02542D]">
                          {contract.contractNumber ?? t('tableValues.unknown')}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {contract.contractType ?? t('common.unknown')}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div className="flex flex-col">
                            <span>{t('tableValues.start')} {formatDate(contract.startDate)}</span>
                            <span>{t('tableValues.end')} {formatDate(contract.endDate)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {(() => {
                            const statusInfo = getContractDisplayStatus(contract);
                            return (
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium shadow-sm ${statusInfo.className}`}
                              >
                                {statusInfo.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenContractDetail(contract.id)}
                            className="inline-flex items-center rounded-lg border border-[#14AE5C] px-3 py-1 text-sm font-medium text-[#02542D] shadow-sm transition hover:bg-[#14AE5C] hover:text-white"
                          >
                            {t('buttons.view')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {createSuccess && (
          <div className="rounded-xl border border-[#C7E8D2] bg-[#E9F4EE] px-4 py-3 text-sm text-[#02542D]">
            {createSuccess}
          </div>
        )}

        {createModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 px-4 py-8">
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#02542D]">{t('create.title')}</h2>
                  <p className="text-sm text-gray-500">
                    {t('create.subtitle')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreateModalOpen(false);
                    resetCreateForm();
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-100"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleCreateContract} className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#02542D]">{t('fields.unit')}</label>
                    <select
                      value={formState.unitId}
                      onChange={(event) => setFieldValue('unitId', event.target.value)}
                      className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-[#02542D] shadow-sm focus:border-[#14AE5C] focus:outline-none focus:ring-2 focus:ring-[#C7E8D2] disabled:cursor-not-allowed"
                      required
                      disabled
                    >
                      <option value="">{t('placeholders.selectUnit')}</option>
                      {unitOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.unitId && (
                      <span className="mt-1 text-xs text-red-500">{formErrors.unitId}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#02542D]">{t('fields.contractNumber')}</label>
                    {generatingContractNumber ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500">
                        {t('loading.generatingContractNumber')}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={formState.contractNumber}
                        readOnly
                        className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-[#02542D] shadow-sm cursor-not-allowed"
                        required
                      />
                    )}
                    {formErrors.contractNumber && (
                      <span className="mt-1 text-xs text-red-500">{formErrors.contractNumber}</span>
                    )}
                  </div>
                </div>

                {/* Asset check - Hierarchical checkbox by room */}
                {formState.unitId && (
                  <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                    {checkingAssets ? (
                      <div className="p-4 text-sm text-gray-600 flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Đang kiểm tra thiết bị...
                      </div>
                    ) : (
                      <>
                        {/* Header */}
                        <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg className="h-5 w-5 text-[#02542D]" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-semibold text-[#02542D]">
                              Thiết bị bàn giao ({Object.values(AssetType).filter(t => t !== AssetType.OTHER).length - missingAssetTypes.length}/{Object.values(AssetType).filter(t => t !== AssetType.OTHER).length} đã có)
                            </span>
                          </div>
                          {missingAssetTypes.length > 0 && (
                            <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                              Thiếu {missingAssetTypes.length} thiết bị
                            </span>
                          )}
                          {missingAssetTypes.length === 0 && (
                            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Đầy đủ
                            </span>
                          )}
                        </div>

                        {/* Room groups */}
                        <div className="divide-y divide-gray-100">
                          {ROOM_ORDER.map((roomType) => {
                            const roomAssets = ROOM_ASSET_TYPES[roomType];
                            const existingActiveTypes = new Set(unitAssets.filter(a => a.active).map(a => a.assetType));
                            const missingInRoom = roomAssets.filter(t => !existingActiveTypes.has(t));
                            const selectedInRoom = roomAssets.filter(t => selectedAssetTypes.has(t));
                            const allMissingSelected = missingInRoom.length > 0 && missingInRoom.every(t => selectedAssetTypes.has(t));
                            const someMissingSelected = missingInRoom.some(t => selectedAssetTypes.has(t));

                            return (
                              <div key={roomType} className="px-3 py-2">
                                {/* Room header with checkbox */}
                                <div className="flex items-center gap-2 mb-1">
                                  {missingInRoom.length > 0 ? (
                                    <input
                                      type="checkbox"
                                      checked={allMissingSelected}
                                      ref={(el) => {
                                        if (el) el.indeterminate = someMissingSelected && !allMissingSelected;
                                      }}
                                      onChange={(e) => {
                                        const newSelected = new Set(selectedAssetTypes);
                                        if (e.target.checked) {
                                          missingInRoom.forEach(t => newSelected.add(t));
                                        } else {
                                          missingInRoom.forEach(t => newSelected.delete(t));
                                        }
                                        setSelectedAssetTypes(newSelected);
                                      }}
                                      className="h-4 w-4 text-[#02542D] border-gray-300 rounded cursor-pointer accent-[#02542D]"
                                    />
                                  ) : (
                                    <svg className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                  <span className="text-sm font-medium text-gray-800">
                                    {ROOM_TYPE_LABELS[roomType]}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({roomAssets.length - missingInRoom.length}/{roomAssets.length})
                                  </span>
                                </div>

                                {/* Asset items in this room */}
                                <div className="ml-6 grid grid-cols-2 gap-x-4 gap-y-0.5">
                                  {roomAssets.map((assetType) => {
                                    const exists = existingActiveTypes.has(assetType);
                                    const isSelected = selectedAssetTypes.has(assetType);
                                    return (
                                      <label
                                        key={assetType}
                                        className={`flex items-center gap-1.5 py-0.5 text-xs ${exists ? 'text-green-700' : 'text-gray-700 cursor-pointer hover:text-gray-900'}`}
                                      >
                                        {exists ? (
                                          <svg className="h-3.5 w-3.5 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        ) : (
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                              const newSelected = new Set(selectedAssetTypes);
                                              if (e.target.checked) {
                                                newSelected.add(assetType);
                                              } else {
                                                newSelected.delete(assetType);
                                              }
                                              setSelectedAssetTypes(newSelected);
                                            }}
                                            className="h-3.5 w-3.5 text-[#02542D] border-gray-300 rounded cursor-pointer accent-[#02542D] flex-shrink-0"
                                          />
                                        )}
                                        <span className={exists ? 'line-through opacity-60' : ''}>
                                          {ASSET_TYPE_LABELS[assetType]}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Action footer */}
                        {missingAssetTypes.length > 0 && (
                          <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg flex items-center justify-between">
                            <span className="text-xs text-gray-600">
                              Đã chọn {selectedAssetTypes.size} thiết bị cần tạo
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowCreateAssetsConfirm(true)}
                              disabled={creatingMissingAssets || selectedAssetTypes.size === 0}
                              className="px-4 py-1.5 bg-[#02542D] text-white text-sm rounded-md hover:bg-[#013d20] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                              Tạo {selectedAssetTypes.size} thiết bị đã chọn
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Meter check warning/error */}
                {formState.unitId && (
                  <div className={`rounded-lg border p-4 ${formState.contractType === 'RENTAL' && missingMeterServices.length > 0 && !checkingMeters
                    ? 'border-red-300 bg-red-50'
                    : 'border-blue-300 bg-blue-50'
                    }`}>
                    {checkingMeters ? (
                      <div className={`text-sm ${formState.contractType === 'RENTAL' ? 'text-red-800' : 'text-blue-800'}`}>
                        {t('meterWarning.checking', { defaultValue: 'Đang kiểm tra đồng hồ đo...' })}
                      </div>
                    ) : missingMeterServices.length > 0 ? (
                      <div>
                        <div className="flex items-start">
                          <svg className={`h-5 w-5 mt-0.5 mr-2 flex-shrink-0 ${formState.contractType === 'RENTAL' ? 'text-red-600' : 'text-blue-600'
                            }`} viewBox="0 0 20 20" fill="currentColor">
                            {formState.contractType === 'RENTAL' ? (
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            ) : (
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            )}
                          </svg>
                          <div className="flex-1">
                            <h3 className={`text-sm font-medium mb-1 ${formState.contractType === 'RENTAL' ? 'text-red-800' : 'text-blue-800'
                              }`}>
                              {formState.contractType === 'RENTAL'
                                ? t('meterWarning.requiredForRental', {
                                  count: missingMeterServices.length,
                                  defaultValue: `BẮT BUỘC: Thiếu ${missingMeterServices.length} đồng hồ đo cho hợp đồng cho thuê`
                                })
                                : t('meterWarning.missingTypes', {
                                  count: missingMeterServices.length,
                                  defaultValue: `Thiếu ${missingMeterServices.length} đồng hồ đo`
                                })
                              }
                            </h3>
                            <p className={`text-sm mb-3 ${formState.contractType === 'RENTAL' ? 'text-red-700' : 'text-blue-700'
                              }`}>
                              {t('meterWarning.missingList', {
                                list: missingMeterServices.map(s => s.name || s.code || 'Unknown').join(', '),
                                defaultValue: `Cần thêm đồng hồ đo: ${missingMeterServices.map(s => s.name || s.code || 'Unknown').join(', ')}`
                              })}
                            </p>
                            {formState.contractType === 'RENTAL' && (
                              <p className="text-sm font-medium text-red-700 mb-3">
                                {t('meterWarning.rentalRequirement', {
                                  defaultValue: '⚠️ Hợp đồng cho thuê yêu cầu phải có đầy đủ đồng hồ đo điện và nước. Vui lòng tạo đồng hồ đo trước khi tiếp tục.'
                                })}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => setShowCreateMetersConfirm(true)}
                              disabled={creatingMissingMeters}
                              className={`px-4 py-2 text-white text-sm rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed ${formState.contractType === 'RENTAL'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                              {t('meterWarning.createMissing', {
                                count: missingMeterServices.length,
                                defaultValue: `Tạo ${missingMeterServices.length} đồng hồ đo`
                              })}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center text-sm text-green-700">
                        <svg className="h-5 w-5 text-green-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {t('meterWarning.allComplete', { defaultValue: 'Đã có đầy đủ đồng hồ đo' })}
                      </div>
                    )}
                  </div>
                )}

                {/* Show meter validation error if exists */}
                {formErrors.meters && (
                  <div className="rounded-lg border border-red-300 bg-red-50 p-3">
                    <p className="text-sm text-red-800">{formErrors.meters}</p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#02542D]">{t('fields.contractType')}</label>
                    <select
                      value={formState.contractType ?? 'RENTAL'}
                      onChange={(event) => {
                        const nextType = event.target.value as CreateContractPayload['contractType'];
                        setFormState((prev) => ({
                          ...prev,
                          contractType: nextType,
                          endDate: nextType === 'PURCHASE' ? '' : prev.endDate,
                          monthlyRent: nextType === 'PURCHASE' ? null : prev.monthlyRent,
                          purchasePrice: nextType === 'RENTAL' ? null : prev.purchasePrice,
                          purchaseDate: nextType === 'RENTAL' ? '' : prev.purchaseDate,
                          paymentMethod: nextType === 'PURCHASE' ? '' : prev.paymentMethod,
                          paymentTerms: nextType === 'PURCHASE' ? '' : prev.paymentTerms,
                        }));
                        if (nextType === 'PURCHASE') {
                          setEndMonth('');
                          clearFieldErrors('endDate', 'monthlyRent', 'paymentMethod', 'paymentTerms');
                        } else {
                          clearFieldErrors('purchasePrice', 'purchaseDate');
                        }
                      }}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#02542D] shadow-sm focus:border-[#14AE5C] focus:outline-none focus:ring-2 focus:ring-[#C7E8D2]"
                    >
                      {CONTRACT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#02542D]">{t('fields.status')}</label>
                    <div className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 shadow-inner">
                      {t('status.activeDefault')}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#02542D]">{t('fields.startDate')}</label>
                    <DateBox
                      value={formState.startDate ?? ''}
                      onChange={(event) => setFieldValue('startDate', event.target.value)}
                      placeholderText={t('placeholders.ddmmyyyy')}
                      min={undefined}
                    />
                    {formErrors.startDate && (
                      <span className="mt-1 text-xs text-red-500">{formErrors.startDate}</span>
                    )}
                  </div>
                  {formState.contractType !== 'PURCHASE' && (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-[#02542D]">
                        {t('fields.endDate')}
                        {startDateDay !== null && (
                          <span className="text-xs text-gray-500 ml-2">
                            (Ngày {startDateDay} của tháng kết thúc)
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type="month"
                          value={endMonth}
                          onChange={(event) => {
                            setEndMonth(event.target.value);
                          }}
                          min={minMonthValue}
                          disabled={!formState.startDate}
                          required={formState.contractType === 'RENTAL'}
                          className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-base text-[#02542D] shadow-sm focus:border-[#14AE5C] focus:outline-none focus:ring-2 focus:ring-[#C7E8D2] disabled:bg-gray-100 disabled:cursor-not-allowed cursor-pointer hover:border-gray-300 transition-colors"
                          style={{ minHeight: '44px' }}
                        />
                      </div>
                      {formErrors.endDate && (
                        <span className="mt-1 text-xs text-red-500">{formErrors.endDate}</span>
                      )}
                      {formState.endDate && (
                        <span className="text-xs text-gray-500">
                          {t('labels.endDatePreview', { date: formatDate(formState.endDate) }) || `Ngày kết thúc: ${formatDate(formState.endDate)}`}
                        </span>
                      )}
                    </div>
                  )}
                  {formState.contractType === 'PURCHASE' && (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-[#02542D]">{t('fields.purchaseDate')}</label>
                      <DateBox
                        value={formState.purchaseDate ?? ''}
                        onChange={(event) =>
                          setFieldValue(
                            'purchaseDate',
                            event.target.value ? event.target.value : null,
                          )
                        }
                        placeholderText={t('placeholders.ddmmyyyy')}
                      />
                      {formErrors.purchaseDate && (
                        <span className="mt-1 text-xs text-red-500">{formErrors.purchaseDate}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {formState.contractType === 'RENTAL' && (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-[#02542D]">{t('fields.monthlyRent')}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumberWithDots(formState.monthlyRent)}
                        onChange={(event) => {
                          // Allow free input while typing, only parse and format when blur
                          const inputValue = event.target.value.replace(/[^\d]/g, '');
                          const parsedValue = inputValue ? Number(inputValue) : null;
                          setFieldValue('monthlyRent', parsedValue);
                        }}
                        onBlur={(event) => {
                          // Ensure proper format on blur
                          const parsedValue = parseNumberFromFormattedString(event.target.value);
                          setFieldValue('monthlyRent', parsedValue);
                        }}
                        placeholder={t('placeholders.monthlyRent')}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#02542D] shadow-sm focus:border-[#14AE5C] focus:outline-none focus:ring-2 focus:ring-[#C7E8D2]"
                      />
                      {formErrors.monthlyRent && (
                        <span className="mt-1 text-xs text-red-500">{formErrors.monthlyRent}</span>
                      )}
                      {calculatedTotalRent !== null && formState.startDate && (
                        <div className="mt-2 rounded-lg border border-[#C7E8D2] bg-[#E9F4EE] p-3">
                          <p className="mb-1">
                            <span className="font-medium text-[#02542D]">{t('detailLabels.totalRent')}</span>{' '}
                            <span className="text-lg font-semibold text-[#14AE5C]">
                              {calculatedTotalRent ? Math.round(calculatedTotalRent).toLocaleString('vi-VN') : '0'} đ
                            </span>
                          </p>
                          {formState.startDate && formState.endDate && rentBreakdown && (
                            <div className="mt-2 space-y-1 text-xs text-gray-600">
                              <p className="font-medium">
                                {t('rentCalculation.breakdown', {
                                  defaultValue: 'Chi tiết tính toán:'
                                }) || 'Chi tiết tính toán:'}
                              </p>
                              <ul className="list-disc list-inside space-y-0.5 ml-2">
                                <li>
                                  <span className="text-gray-600">
                                    {rentBreakdown.months} {rentBreakdown.months === 1 ? 'tháng' : 'tháng'}
                                  </span>
                                  {' = '}
                                  <span className="text-green-600 font-medium">
                                    {((formState.monthlyRent ?? 0) * rentBreakdown.months).toLocaleString('vi-VN')} đ
                                  </span>
                                </li>
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {formState.contractType === 'PURCHASE' && (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-[#02542D]">{t('fields.purchasePrice')}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumberWithDots(formState.purchasePrice)}
                        onChange={(event) => {
                          // Allow free input while typing, only parse and format when blur
                          const inputValue = event.target.value.replace(/[^\d]/g, '');
                          const parsedValue = inputValue ? Number(inputValue) : null;
                          setFieldValue('purchasePrice', parsedValue);
                        }}
                        onBlur={(event) => {
                          // Ensure proper format on blur
                          const parsedValue = parseNumberFromFormattedString(event.target.value);
                          setFieldValue('purchasePrice', parsedValue);
                        }}
                        placeholder={t('placeholders.purchasePrice')}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#02542D] shadow-sm focus:border-[#14AE5C] focus:outline-none focus:ring-2 focus:ring-[#C7E8D2]"
                      />
                      {formErrors.purchasePrice && (
                        <span className="mt-1 text-xs text-red-500">{formErrors.purchasePrice}</span>
                      )}
                    </div>
                  )}
                  {formState.contractType === 'RENTAL' && (
                    <>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[#02542D]">{t('fields.paymentMethod')}</label>
                        <select
                          value={formState.paymentMethod ?? ''}
                          onChange={(event) => setFieldValue('paymentMethod', event.target.value)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#02542D] shadow-sm focus:border-[#14AE5C] focus:outline-none focus:ring-2 focus:ring-[#C7E8D2]"
                        >
                          {PAYMENT_METHOD_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {formErrors.paymentMethod && (
                          <span className="mt-1 text-xs text-red-500">{formErrors.paymentMethod}</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[#02542D]">{t('fields.paymentTerms')}</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formState.paymentTerms ?? ''}
                            onChange={(event) => setFieldValue('paymentTerms', event.target.value)}
                            placeholder={(() => {
                              if (formState.contractType === 'RENTAL' && formState.startDate && formState.endDate) {
                                const start = new Date(formState.startDate);
                                const end = new Date(formState.endDate);
                                const startStr = start.toLocaleDateString('vi-VN');
                                const endStr = end.toLocaleDateString('vi-VN');
                                return t('paymentTerms.placeholderExample', { start: startStr, end: endStr });
                              }
                              return t('placeholders.paymentTerms');
                            })()}
                            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#02542D] shadow-sm focus:border-[#14AE5C] focus:outline-none focus:ring-2 focus:ring-[#C7E8D2]"
                          />
                          {formState.contractType === 'RENTAL' && formState.startDate && formState.endDate && (
                            <button
                              type="button"
                              onClick={() => {
                                const start = new Date(formState.startDate);
                                const end = new Date(formState.endDate!);
                                const startStr = start.toLocaleDateString('vi-VN');
                                const endStr = end.toLocaleDateString('vi-VN');

                                // Calculate number of months
                                const months = Math.ceil(
                                  (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)
                                );

                                let suggestedTerms = '';
                                if (months <= 1) {
                                  suggestedTerms = t('paymentTerms.oneTimePayment', { start: startStr, end: endStr });
                                } else {
                                  suggestedTerms = t('paymentTerms.monthlyPayment', { start: startStr, end: endStr, months });
                                }

                                setFieldValue('paymentTerms', suggestedTerms);
                              }}
                              className="whitespace-nowrap rounded-lg border border-[#14AE5C] bg-white px-3 py-2 text-sm font-medium text-[#02542D] shadow-sm transition hover:bg-[#E9F4EE]"
                              title={t('paymentTerms.autoGenerateTooltip')}
                            >
                              {t('paymentTerms.auto')}
                            </button>
                          )}
                        </div>
                        {formErrors.paymentTerms && (
                          <span className="mt-1 text-xs text-red-500">{formErrors.paymentTerms}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#02542D]">{t('fields.notes')}</label>
                  <textarea
                    value={formState.notes ?? ''}
                    onChange={(event) => setFieldValue('notes', event.target.value)}
                    rows={3}
                    placeholder={t('placeholders.notes')}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#02542D] shadow-sm focus:border-[#14AE5C] focus:outline-none focus:ring-2 focus:ring-[#C7E8D2]"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#02542D]">
                    {t('fields.attachments')} *
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(event) => {
                      const files = event.target.files;
                      if (files && files.length > 0) {
                        // Validate that all files are images
                        const fileArray = Array.from(files);
                        const invalidFiles = fileArray.filter(file => !file.type.startsWith('image/'));
                        if (invalidFiles.length > 0) {
                          setFormErrors((prev) => ({
                            ...prev,
                            files: t('validation.onlyImagesAllowed') || 'Chỉ được phép tải lên file ảnh'
                          }));
                          // Clear the input
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                          setCreateFiles(null);
                          return;
                        }
                        setCreateFiles(files);
                        // Clear error when valid files are selected
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.files;
                          return next;
                        });
                      } else {
                        setCreateFiles(null);
                      }
                    }}
                    className="text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#02542D] hover:file:bg-gray-200"
                    accept="image/*"
                  />
                  {formErrors.files && (
                    <span className="mt-1 text-xs text-red-500">{formErrors.files}</span>
                  )}
                  <span className="text-xs text-gray-500">
                    {t('hints.attachments')}
                  </span>
                </div>

                {createError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {createError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalOpen(false);
                      resetCreateForm();
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-white"
                  >
                    {t('buttons.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting || missingMeterServices.length > 0}
                    className="inline-flex items-center justify-center rounded-lg bg-[#14AE5C] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0c793f] disabled:cursor-not-allowed disabled:bg-[#A3D9B1]"
                  >
                    {createSubmitting ? t('buttons.creating') : t('buttons.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {detailModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 px-4 py-8">
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#02542D]">{t('detail.title')}</h3>
                  {detailState.data?.contractNumber && (
                    <p className="text-sm text-gray-500">
                      {t('detail.contractNumber')}: {detailState.data.contractNumber}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCloseContractDetail}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-100"
                >
                  ×
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                {detailState.loading && (
                  <p className="text-sm text-gray-500">{t('loading.detail')}</p>
                )}
                {detailState.error && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {detailState.error === 'contractNotFound'
                        ? 'Không tìm thấy hợp đồng. Hợp đồng có thể đã bị xóa hoặc không tồn tại.'
                        : detailState.error}
                    </div>
                    {detailState.error === 'contractNotFound' && (
                      <div className="flex justify-center">
                        <button
                          onClick={() => {
                            handleCloseContractDetail();
                            handleOpenCreateModal();
                          }}
                          className="px-4 py-2 bg-[#02542D] text-white rounded-lg hover:bg-[#023a20] transition-colors"
                        >
                          Tạo hợp đồng mới
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {!detailState.loading && !detailState.error && detailState.data && (
                  <div className="space-y-5 text-sm text-gray-700">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <p>
                        <span className="font-medium text-[#02542D]">{t('detailLabels.contractType')}</span>{' '}
                        {detailState.data.contractType ?? t('common.unknown')}
                      </p>
                      <p>
                        <span className="font-medium text-[#02542D]">{t('detailLabels.status')}</span>{' '}
                        {detailState.data.status ?? t('common.unknown')}
                      </p>
                      <p>
                        <span className="font-medium text-[#02542D]">{t('detailLabels.startDate')}</span>{' '}
                        {formatDate(detailState.data.startDate)}
                      </p>
                      <p>
                        <span className="font-medium text-[#02542D]">{t('detailLabels.endDate')}</span>{' '}
                        {detailState.data.endDate ? formatDate(detailState.data.endDate) : t('detailLabels.unlimited')}
                      </p>
                      {detailState.data.monthlyRent != null && (
                        <p>
                          <span className="font-medium text-[#02542D]">{t('detailLabels.monthlyRent')}</span>{' '}
                          {detailState.data.monthlyRent.toLocaleString('vi-VN')} đ
                        </p>
                      )}
                      {detailState.data.contractType === 'RENTAL' && detailState.data.monthlyRent != null && detailState.data.startDate && detailState.data.endDate && (
                        <div className="col-span-2">
                          {(() => {
                            const totalRent = detailState.data.totalRent ?? calculateTotalRent(
                              detailState.data.startDate!,
                              detailState.data.endDate!,
                              detailState.data.monthlyRent!
                            );
                            return totalRent !== null ? (
                              <>
                                <p className="mb-2">
                                  <span className="font-medium text-[#02542D]">{t('detailLabels.totalRent')}</span>{' '}
                                  <span className="text-lg font-semibold text-[#14AE5C]">
                                    {totalRent.toLocaleString('vi-VN')} đ
                                  </span>
                                </p>
                                {detailState.data.startDate && (
                                  <p className="text-xs text-gray-600 italic">
                                    {(() => {
                                      const startDate = new Date(detailState.data.startDate!);
                                      const startDay = startDate.getDate();
                                      if (startDay <= 15) {
                                        return t('rentCalculation.fullMonth', { day: startDay });
                                      } else {
                                        return t('rentCalculation.halfMonth', { day: startDay });
                                      }
                                    })()}
                                  </p>
                                )}
                              </>
                            ) : null;
                          })()}
                        </div>
                      )}
                      {detailState.data.purchasePrice != null && (
                        <p>
                          <span className="font-medium text-[#02542D]">{t('detailLabels.purchasePrice')}</span>{' '}
                          {detailState.data.purchasePrice.toLocaleString('vi-VN')} đ
                        </p>
                      )}
                      {detailState.data.purchaseDate && (
                        <p>
                          <span className="font-medium text-[#02542D]">{t('detailLabels.purchaseDate')}</span>{' '}
                          {formatDate(detailState.data.purchaseDate)}
                        </p>
                      )}
                      {detailState.data.paymentMethod && (
                        <p>
                          <span className="font-medium text-[#02542D]">{t('detailLabels.paymentMethod')}</span>{' '}
                          {detailState.data.paymentMethod}
                        </p>
                      )}
                    </div>
                    {detailState.data.paymentTerms && (
                      <div>
                        <p className="font-medium text-[#02542D]">{t('detailLabels.paymentTerms')}</p>
                        <p className="mt-1 whitespace-pre-line text-gray-600">
                          {detailState.data.paymentTerms}
                        </p>
                      </div>
                    )}
                    {detailState.data.notes && (
                      <div>
                        <p className="font-medium text-[#02542D]">{t('detailLabels.notes')}</p>
                        <p className="mt-1 whitespace-pre-line text-gray-600">
                          {detailState.data.notes}
                        </p>
                      </div>
                    )}
                    <div className="space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium text-[#02542D]">{t('detail.attachments')}</p>
                        <div className="flex items-center gap-3">
                          <input
                            ref={detailFileInputRef}
                            type="file"
                            multiple
                            onChange={(event) => handleUploadFilesForDetail(event.target.files)}
                            className="hidden"
                            accept="image/*"
                          />
                          <button
                            type="button"
                            onClick={() => detailFileInputRef.current?.click()}
                            disabled={!detailState.data || detailUploading}
                            className="inline-flex items-center rounded-lg border border-[#14AE5C] px-3 py-1.5 text-sm font-medium text-[#02542D] shadow-sm transition hover:bg-[#14AE5C] hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300"
                          >
                            {detailUploading ? t('buttons.uploading') : t('buttons.uploadAttachment')}
                          </button>
                        </div>
                      </div>
                      {detailUploadError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                          {detailUploadError}
                        </div>
                      )}
                      {detailState.data.files && detailState.data.files.length > 0 ? (
                        <div className="space-y-4">
                          {detailState.data.files.map((file) => {
                            const isImage =
                              file.contentType?.startsWith('image/') ||
                              /\.(jpg|jpeg|png|gif|webp)$/i.test(file.fileName ?? '');
                            const isPdf =
                              file.contentType === 'application/pdf' ||
                              /\.pdf$/i.test(file.fileName ?? '');
                            const displayUrl = resolveFileUrl(
                              file.proxyUrl ?? file.fileUrl,
                              detailState.data?.id,
                              file.id
                            );
                            return (
                              <div
                                key={file.id}
                                className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-[#02542D]">
                                      {file.originalFileName ?? file.fileName ?? t('detail.unnamedFile')}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {file.contentType ?? t('detail.unknownType')} •{' '}
                                      {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : t('detail.unknownSize')}
                                    </p>
                                    {file.isPrimary && (
                                      <span className="mt-1 inline-flex rounded-full bg-[#C7E8D2] px-2 py-0.5 text-xs font-medium text-[#02542D]">
                                        {t('detail.primaryFile')}
                                      </span>
                                    )}
                                  </div>
                                  {displayUrl && (
                                    <a
                                      href={displayUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center rounded-md border border-blue-300 px-3 py-1 text-sm text-blue-600 transition hover:bg-blue-50"
                                    >
                                      {t('tableValues.viewDownload')}
                                    </a>
                                  )}
                                </div>
                                {isImage && displayUrl && (
                                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                                    <img
                                      src={displayUrl}
                                      alt={file.originalFileName ?? file.fileName ?? t('detail.contractImageAlt')}
                                      className="max-h-96 w-full object-contain bg-gray-100"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const errorDiv = document.createElement('div');
                                        errorDiv.className = 'p-4 text-sm text-red-500';
                                        errorDiv.textContent = t('errors.imageLoadFailed') || 'Không thể tải ảnh';
                                        target.parentElement?.appendChild(errorDiv);
                                      }}
                                    />
                                  </div>
                                )}
                                {isPdf && displayUrl && (
                                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                                    <object
                                      data={displayUrl}
                                      type="application/pdf"
                                      className="h-96 w-full"
                                    >
                                      <p className="p-4 text-sm text-gray-500">
                                        {t('detail.cannotDisplayPdf')}{' '}
                                        <a
                                          href={displayUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 underline"
                                        >
                                          {t('buttons.downloadHere')}
                                        </a>
                                      </p>
                                    </object>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          {t('empty.noAttachments')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end border-t border-gray-200 bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  onClick={handleCloseContractDetail}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-white"
                >
                  {t('buttons.close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Missing Assets Confirmation Modal */}
      {showCreateAssetsConfirm && formState.unitId && selectedAssetTypes.size > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 relative z-[10000]">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-[#02542D]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    Xác nhận tạo thiết bị
                  </h3>
                </div>
              </div>

              <div className="mb-6 space-y-3">
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <div className="text-sm text-gray-700 space-y-2">
                    <p><strong>Căn hộ:</strong> {unitsState.data.find(u => u.id === formState.unitId)?.code || '-'}</p>
                    <p><strong>Số lượng:</strong> {selectedAssetTypes.size} thiết bị</p>
                    <div className="mt-2">
                      <p className="font-medium mb-2">Các thiết bị sẽ được tạo:</p>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {ROOM_ORDER.map((roomType) => {
                          const roomSelected = ROOM_ASSET_TYPES[roomType].filter(t => selectedAssetTypes.has(t));
                          if (roomSelected.length === 0) return null;
                          return (
                            <div key={roomType}>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                                {ROOM_TYPE_LABELS[roomType]}
                              </p>
                              <ul className="space-y-0.5 ml-2">
                                {roomSelected.map((type) => (
                                  <li key={type} className="flex items-center justify-between text-sm">
                                    <span>• {ASSET_TYPE_LABELS[type]}</span>
                                    <span className="text-gray-500">{formatNumberWithDots(ASSET_TYPE_DEFAULT_PRICE[type])} VND</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p><strong>Ngày lắp đặt:</strong> {new Date().toLocaleDateString('vi-VN')} (hôm nay)</p>
                    <p className="mt-2 pt-2 border-t border-gray-300">
                      <strong>Tổng số tiền:</strong> <span className="text-red-600 font-bold text-base">
                        {formatNumberWithDots(Array.from(selectedAssetTypes).reduce((total, type) => {
                          return total + ASSET_TYPE_DEFAULT_PRICE[type];
                        }, 0))} VND
                      </span>
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Hệ thống sẽ tự động tạo thiết bị với mã, tên, giá mua và ngày lắp đặt theo mặc định cho căn hộ này.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCreateAssetsConfirm(false)}
                  disabled={creatingMissingAssets}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateMissingAssets}
                  disabled={creatingMissingAssets}
                  className="px-4 py-2 bg-[#02542D] text-white rounded-md hover:bg-[#013d20] disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {creatingMissingAssets ? 'Đang tạo...' : `Xác nhận tạo ${selectedAssetTypes.size} thiết bị`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Missing Meters Confirmation Modal */}
      {showCreateMetersConfirm && formState.unitId && missingMeterServices.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 relative z-[10000]">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {t('meterWarning.confirmTitle', { defaultValue: 'Xác nhận tạo đồng hồ đo tự động' })}
                  </h3>
                </div>
              </div>

              <div className="mb-6 space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-sm font-medium text-blue-800 mb-2">
                    {t('meterWarning.confirmWarning', { defaultValue: '⚠️ Cảnh báo: Bạn sắp tạo đồng hồ đo tự động cho căn hộ' })}
                  </p>
                  <div className="text-sm text-blue-700 space-y-2">
                    <p><strong>{t('meterWarning.unit', { defaultValue: 'Căn hộ' })}:</strong> {unitsState.data.find(u => u.id === formState.unitId)?.code || '-'}</p>
                    <p><strong>{t('meterWarning.count', { defaultValue: 'Số lượng đồng hồ' })}:</strong> {missingMeterServices.length} {t('meterWarning.meter', { defaultValue: 'đồng hồ' })}</p>
                    <div className="mt-2">
                      <p className="font-medium mb-1">{t('meterWarning.willCreate', { defaultValue: 'Các đồng hồ sẽ được tạo' })}:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        {missingMeterServices.map((service) => (
                          <li key={service.id}>
                            {service.name || service.code || 'Unknown'}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p><strong>{t('meterWarning.installDate', { defaultValue: 'Ngày lắp đặt' })}:</strong> {new Date().toLocaleDateString('vi-VN')} ({t('meterWarning.today', { defaultValue: 'hôm nay' })})</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  {t('meterWarning.confirmMessage', { defaultValue: 'Hệ thống sẽ tự động tạo đồng hồ đo với mã và ngày lắp đặt theo mặc định cho căn hộ này.' })}
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCreateMetersConfirm(false)}
                  disabled={creatingMissingMeters}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {t('meterWarning.cancel', { defaultValue: 'Hủy' })}
                </button>
                <button
                  onClick={handleCreateMissingMeters}
                  disabled={creatingMissingMeters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {creatingMissingMeters
                    ? t('meterWarning.creating', { defaultValue: 'Đang tạo...' })
                    : t('meterWarning.confirmCreate', {
                      count: missingMeterServices.length,
                      defaultValue: `Xác nhận tạo ${missingMeterServices.length} đồng hồ đo`
                    })
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


