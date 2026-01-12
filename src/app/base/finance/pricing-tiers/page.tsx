'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useNotifications } from '@/src/hooks/useNotifications';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  PricingTierDto,
  getPricingTiersByService,
  createPricingTier,
  updatePricingTier,
  deletePricingTier,
  CreatePricingTierRequest,
  UpdatePricingTierRequest,
} from '@/src/services/finance/pricingTierService';
import PopupComfirm from '@/src/components/common/PopupComfirm';

// SERVICE_OPTIONS will be created inside component with translations

interface TierFormState {
  id?: string;
  tierOrder: number;
  minQuantity: number | null;
  maxQuantity: number | null;
  unitPrice: number | null;
  effectiveFrom: string;
  effectiveUntil: string | null;
  active: boolean;
  description: string;
}

type FormErrors = {
  minQuantity?: string;
  maxQuantity?: string;
  unitPrice?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  tierOrder?: string;
  overlap?: string;
  general?: string;
};

const EMPTY_FORM: TierFormState = {
  tierOrder: 1,
  minQuantity: null,
  maxQuantity: null,
  unitPrice: null,
  effectiveFrom: new Date().toISOString().split('T')[0],
  effectiveUntil: null,
  active: true,
  description: '',
};

export default function PricingTiersManagementPage() {
  const t = useTranslations('PricingTiers');
  const { show } = useNotifications();
  const { hasRole, user, isLoading } = useAuth();
  const router = useRouter();
  
  // Check user roles - ADMIN and ACCOUNTANT can view
  const isAdmin = hasRole('ADMIN') || hasRole('admin') || hasRole('ROLE_ADMIN') || hasRole('ROLE_admin');
  const isAccountant = hasRole('ACCOUNTANT') || hasRole('accountant') || hasRole('ROLE_ACCOUNTANT') || hasRole('ROLE_accountant');
  const canView = isAdmin || isAccountant;
  const canEdit = isAdmin || isAccountant; // ADMIN and ACCOUNTANT can edit/create/delete
  
  const SERVICE_OPTIONS = [
    { value: 'ELECTRIC', label: t('services.electric'), icon: '⚡' },
    { value: 'WATER', label: t('services.water'), icon: '💧' },
  ];
  const [selectedService, setSelectedService] = useState<'ELECTRIC' | 'WATER'>('ELECTRIC');
  const [tiers, setTiers] = useState<PricingTierDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTier, setEditingTier] = useState<TierFormState | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNoLastTierConfirm, setShowNoLastTierConfirm] = useState(false);
  const [pendingDeleteTier, setPendingDeleteTier] = useState<PricingTierDto | null>(null);
  const [lastTierUnitPrice, setLastTierUnitPrice] = useState<number | null>(null); // Store last tier's unitPrice for validation

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
    loadTiers();
  }, [selectedService, canView, show, router]);

  const loadTiers = async () => {
    setLoading(true);
    try {
      const data = await getPricingTiersByService(selectedService);
      setTiers(data || []);
    } catch (error: any) {
      console.error('Failed to load pricing tiers:', error);
      setTiers([]); // Reset to empty array on error
      show(
        error?.response?.data?.message || error?.message || t('errors.loadFailed'),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const sortedTiers = tiers.length > 0 ? [...tiers].sort((a, b) => {
    const orderDiff = (a.tierOrder ?? 0) - (b.tierOrder ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return (Number(a.minQuantity ?? 0) || 0) - (Number(b.minQuantity ?? 0) || 0);
  }) : [];

  const isTierCurrentlyActive = (tier: PricingTierDto) => {
    if (!tier.effectiveFrom) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = new Date(tier.effectiveFrom);
    if (Number.isNaN(from.getTime())) return false;
    from.setHours(0, 0, 0, 0);
    if (from > today) return false;
    const until = tier.effectiveUntil ? new Date(tier.effectiveUntil) : null;
    if (until) {
      if (Number.isNaN(until.getTime())) return false;
      until.setHours(0, 0, 0, 0);
      if (until < today) return false;
    }
    return tier.active !== false;
  };

  // Kiểm tra xem có bậc cuối cùng (maxQuantity = null) không
  const checkHasFinalTier = (): boolean => {
    const activeTiers = sortedTiers.filter(tier => isTierCurrentlyActive(tier));
    return activeTiers.some(tier => tier.maxQuantity === null || tier.maxQuantity === undefined);
  };

  // Kiểm tra gaps trong các bậc giá (chỉ kiểm tra các tiers đang active)
  const checkGaps = (): Array<{ from: number; to: number }> => {
    const gaps: Array<{ from: number; to: number }> = [];
    
    // Lọc các tiers đang active
    const activeTiers = sortedTiers.filter(tier => isTierCurrentlyActive(tier));
    if (activeTiers.length < 2) return gaps;

    // Sắp xếp theo minQuantity
    const sortedByMin = [...activeTiers].sort((a, b) => {
      const minA = Number(a.minQuantity ?? 0);
      const minB = Number(b.minQuantity ?? 0);
      return minA - minB;
    });

    for (let i = 0; i < sortedByMin.length - 1; i++) {
      const currentTier = sortedByMin[i];
      const nextTier = sortedByMin[i + 1];

      const currentMax = currentTier.maxQuantity !== null && currentTier.maxQuantity !== undefined
        ? Number(currentTier.maxQuantity)
        : null;
      const nextMin = Number(nextTier.minQuantity ?? 0);

      // Nếu current tier có max và max + 1 < nextMin thì có gap thực sự
      // (cho phép liền kề: 50-51 là OK, nhưng 50-60 là gap)
      if (currentMax !== null && currentMax + 1 < nextMin) {
        gaps.push({ from: currentMax, to: nextMin });
      }
    }

    // Kiểm tra xem tier đầu tiên có bắt đầu từ 0 không
    if (sortedByMin.length > 0) {
      const firstTier = sortedByMin[0];
      const firstMin = Number(firstTier.minQuantity ?? 0);
      if (firstMin > 0) {
        gaps.push({ from: 0, to: firstMin });
      }
    }

    // Kiểm tra xem có bậc cuối cùng không (maxQuantity = null)
    const hasFinalTier = sortedByMin.some(tier => tier.maxQuantity === null || tier.maxQuantity === undefined);
    if (!hasFinalTier && sortedByMin.length > 0) {
      // Tìm maxQuantity lớn nhất
      const maxQuantities = sortedByMin
        .map(tier => tier.maxQuantity)
        .filter(max => max !== null && max !== undefined)
        .map(max => Number(max));
      
      if (maxQuantities.length > 0) {
        const maxMax = Math.max(...maxQuantities);
        gaps.push({ from: maxMax, to: Infinity }); // Đánh dấu cần bậc cuối cùng
      }
    }

    return gaps;
  };

  // Kiểm tra trùng khoảng giá (overlap)
  const checkOverlaps = (): Array<{ tier1: string; tier2: string; overlap: { from: number; to: number | null } }> => {
    const overlaps: Array<{ tier1: string; tier2: string; overlap: { from: number; to: number | null } }> = [];
    
    // Lọc các tiers đang active
    const activeTiers = sortedTiers.filter(tier => isTierCurrentlyActive(tier));
    if (activeTiers.length < 2) return overlaps;

    // So sánh từng cặp tiers
    for (let i = 0; i < activeTiers.length; i++) {
      for (let j = i + 1; j < activeTiers.length; j++) {
        const tier1 = activeTiers[i];
        const tier2 = activeTiers[j];

        const min1 = Number(tier1.minQuantity ?? 0);
        const max1 = tier1.maxQuantity !== null && tier1.maxQuantity !== undefined
          ? Number(tier1.maxQuantity)
          : null;
        const min2 = Number(tier2.minQuantity ?? 0);
        const max2 = tier2.maxQuantity !== null && tier2.maxQuantity !== undefined
          ? Number(tier2.maxQuantity)
          : null;

        // Kiểm tra overlap: 2 khoảng overlap nếu min của cái này <= max của cái kia và ngược lại
        let overlapFrom: number | null = null;
        let overlapTo: number | null = null;

        if (max1 === null && max2 === null) {
          // Cả 2 đều không giới hạn - overlap từ max(min1, min2) trở đi
          overlapFrom = Math.max(min1, min2);
          overlapTo = null;
        } else if (max1 === null) {
          // Tier1 không giới hạn, tier2 có giới hạn
          if (min1 <= max2!) {
            overlapFrom = Math.max(min1, min2);
            overlapTo = max2;
          }
        } else if (max2 === null) {
          // Tier2 không giới hạn, tier1 có giới hạn
          if (min2 <= max1) {
            overlapFrom = Math.max(min1, min2);
            overlapTo = max1;
          }
        } else {
          // Cả 2 đều có giới hạn
          if (min1 <= max2 && min2 <= max1) {
            overlapFrom = Math.max(min1, min2);
            overlapTo = Math.min(max1, max2);
          }
        }

        // Chỉ báo overlap nếu có khoảng trùng thực sự
        if (overlapFrom !== null) {
          // Kiểm tra xem có overlap thực sự không (không chỉ là ranh giới)
          const hasRealOverlap = overlapTo === null || (overlapTo !== null && overlapFrom < overlapTo);
          if (hasRealOverlap) {
            overlaps.push({
              tier1: t('table.tierOrder', { order: tier1.tierOrder }),
              tier2: t('table.tierOrder', { order: tier2.tierOrder }),
              overlap: { from: overlapFrom, to: overlapTo },
            });
          }
        }
      }
    }

    return overlaps;
  };

  const gaps = checkGaps();
  const overlaps = checkOverlaps();
  const hasFinalTier = checkHasFinalTier();

  const startCreate = () => {
    if (!canEdit) {
      show('Bạn không có quyền thêm bậc giá', 'error');
      return;
    }
    
    if (hasFinalTier) {
      show('Không thể thêm bậc giá mới khi đã có bậc cuối cùng', 'error');
      return;
    }
    
    const maxOrder = sortedTiers.length > 0 ? Math.max(...sortedTiers.map((t) => t.tierOrder ?? 0)) : 0;
    
    // Find the last tier's maxQuantity to calculate minQuantity for new tier
    // Get active tiers and find the one with highest maxQuantity or unlimited tier
    const activeTiers = sortedTiers.filter(tier => isTierCurrentlyActive(tier));
    let calculatedMinQuantity: number | null = null;
    let lastTierUnitPrice: number | null = null;
    
    if (activeTiers.length > 0) {
      // First, check if there's a tier with unlimited maxQuantity (maxQuantity = null)
      // This is the final tier and should be considered the "last" tier
      const unlimitedTiers = activeTiers.filter(t => t.maxQuantity === null || t.maxQuantity === undefined);
      
      if (unlimitedTiers.length > 0) {
        // If there's an unlimited tier, that's the last tier
        // Sort by tierOrder to get the highest one (in case there are multiple)
        const sortedUnlimited = [...unlimitedTiers].sort((a, b) => (b.tierOrder ?? 0) - (a.tierOrder ?? 0));
        const lastTier = sortedUnlimited[0];
        lastTierUnitPrice = lastTier.unitPrice ?? null;
        // Cannot add tier after unlimited tier
        calculatedMinQuantity = null;
      } else {
        // No unlimited tier, find tier with highest maxQuantity
        const tiersWithMax = activeTiers.filter(t => t.maxQuantity !== null && t.maxQuantity !== undefined);
        
        if (tiersWithMax.length > 0) {
          // Find the tier with highest maxQuantity
          const lastTier = tiersWithMax.reduce((prev, current) => {
            const prevMax = prev.maxQuantity ?? 0;
            const currentMax = current.maxQuantity ?? 0;
            return currentMax > prevMax ? current : prev;
          });
          
          // New tier should start from maxQuantity + 1
          calculatedMinQuantity = (lastTier.maxQuantity ?? 0) + 1;
          // Get unitPrice of last tier for validation
          lastTierUnitPrice = lastTier.unitPrice ?? null;
        } else {
          // No tiers with maxQuantity (shouldn't happen, but handle it)
          calculatedMinQuantity = null;
          lastTierUnitPrice = null;
        }
      }
    } else {
      // No active tiers, start from 0
      calculatedMinQuantity = 0;
      lastTierUnitPrice = null;
    }
    
    // Store last tier's unitPrice for validation
    setLastTierUnitPrice(lastTierUnitPrice);
    
    setEditingTier({
      ...EMPTY_FORM,
      tierOrder: maxOrder + 1,
      minQuantity: calculatedMinQuantity,
      // Pre-fill unitPrice with min value (lastTierUnitPrice + 1) if available
      unitPrice: lastTierUnitPrice !== null ? lastTierUnitPrice + 1 : null,
    });
    setIsCreateMode(true);
    setShowForm(true);
    setFormErrors({});
  };

  const startEdit = (tier: PricingTierDto) => {
    if (!canEdit) {
      show('Bạn không có quyền chỉnh sửa bậc giá', 'error');
      return;
    }
    setEditingTier({
      id: tier.id,
      tierOrder: tier.tierOrder ?? 1,
      minQuantity: tier.minQuantity ?? null,
      maxQuantity: tier.maxQuantity ?? null,
      unitPrice: tier.unitPrice ?? null,
      effectiveFrom: tier.effectiveFrom
        ? new Date(tier.effectiveFrom).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      effectiveUntil: null, // Removed from UI
      active: tier.active !== false,
      description: tier.description || '',
    });
    setIsCreateMode(false);
    setShowForm(true);
    setFormErrors({});
  };
  
  // Helper to check if a tier is the last tier
  const isLastTier = (tier: PricingTierDto): boolean => {
    // Last tier is either:
    // 1. Tier with maxQuantity = null (unlimited) - this is definitely the last tier
    if (tier.maxQuantity === null || tier.maxQuantity === undefined) {
      return true;
    }
    
    // 2. Check if there's any other active tier with maxQuantity = null (unlimited)
    // If yes, that tier is the last one, not this one
    const activeTiers = sortedTiers.filter(t => isTierCurrentlyActive(t) && t.id !== tier.id);
    const hasOtherUnlimitedTier = activeTiers.some(t => t.maxQuantity === null || t.maxQuantity === undefined);
    if (hasOtherUnlimitedTier) {
      return false; // Another tier is unlimited, so this is not the last
    }
    
    // 3. Check if this tier has the highest maxQuantity among all active tiers
    const allActiveTiers = sortedTiers.filter(t => isTierCurrentlyActive(t));
    if (allActiveTiers.length === 1) {
      return true; // Only one tier, so it's the last
    }
    
    const tiersWithMax = allActiveTiers.filter(t => t.maxQuantity !== null && t.maxQuantity !== undefined);
    if (tiersWithMax.length === 0) {
      return true; // No tiers with max, so this is last
    }
    
    const maxMaxQuantity = Math.max(...tiersWithMax.map(t => Number(t.maxQuantity)));
    const thisMax = Number(tier.maxQuantity);
    
    return thisMax >= maxMaxQuantity; // This tier has the highest maxQuantity
  };
  
  // Helper to check if editing tier is the last tier (can edit minQuantity/maxQuantity)
  const isEditingLastTier = (): boolean => {
    if (!editingTier || !editingTier.id) return false;
    const editingTierData = tiers.find(t => t.id === editingTier.id);
    if (!editingTierData) return false;
    return isLastTier(editingTierData);
  };

  const handleDeleteClick = (tier: PricingTierDto) => {
    if (!canEdit) {
      show('Bạn không có quyền xóa bậc giá', 'error');
      return;
    }
    setPendingDeleteTier(tier);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!pendingDeleteTier) return;
    setShowDeleteConfirm(false);
    try {
      await deletePricingTier(pendingDeleteTier.id);
      show(t('messages.deleteSuccess'), 'success');
      await loadTiers();
    } catch (error: any) {
      console.error('Failed to delete pricing tier:', error);
      show(
        error?.response?.data?.message || error?.message || t('errors.deleteFailed'),
        'error'
      );
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    if (!editingTier) return false;

    if (editingTier.tierOrder < 1) {
      errors.tierOrder = t('validation.tierOrderMin');
    }

    if (editingTier.minQuantity !== null && editingTier.minQuantity < 0) {
      errors.minQuantity = t('validation.minQuantityNonNegative');
    }

    if (
      editingTier.maxQuantity !== null &&
      editingTier.minQuantity !== null &&
      editingTier.maxQuantity <= editingTier.minQuantity
    ) {
      errors.maxQuantity = t('validation.maxQuantityGreater');
    }

    if (editingTier.unitPrice === null || editingTier.unitPrice <= 0) {
      errors.unitPrice = t('validation.unitPricePositive');
    }
    
    // Validate that new tier's unitPrice must be greater than last tier's unitPrice
    if (isCreateMode && lastTierUnitPrice !== null && editingTier.unitPrice !== null) {
      if (editingTier.unitPrice <= lastTierUnitPrice) {
        errors.unitPrice = t('validation.unitPriceMustBeGreater', { 
          minPrice: lastTierUnitPrice.toLocaleString('vi-VN'),
          defaultValue: `Đơn giá phải lớn hơn ${lastTierUnitPrice.toLocaleString('vi-VN')} VNĐ (đơn giá của bậc giá cuối cùng)`
        });
      }
    }

    // Effective dates removed from UI - always use today's date

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (skipWarning = false) => {
    if (!editingTier || !validateForm()) {
      return;
    }

    // Kiểm tra xem sau khi save có bậc cuối cùng không
    const willHaveFinalTier = editingTier.maxQuantity === null || editingTier.maxQuantity === undefined;
    const otherActiveTiers = sortedTiers.filter(tier => 
      isTierCurrentlyActive(tier) && 
      (isCreateMode || tier.id !== editingTier.id)
    );
    const otherHasFinalTier = otherActiveTiers.some(tier => tier.maxQuantity === null || tier.maxQuantity === undefined);
    
    // Nếu đang edit một tier có maxQuantity và không có tier nào khác có maxQuantity = null
    if (!willHaveFinalTier && !otherHasFinalTier && editingTier.active && !skipWarning) {
      setShowNoLastTierConfirm(true);
      return;
    }

    setSaving(true);
    try {
      if (isCreateMode) {
        const payload: CreatePricingTierRequest = {
          serviceCode: selectedService,
          tierOrder: editingTier.tierOrder,
          minQuantity: editingTier.minQuantity,
          maxQuantity: editingTier.maxQuantity ?? null,
          unitPrice: editingTier.unitPrice,
          effectiveFrom: new Date().toISOString().split('T')[0], // Always use today's date
          effectiveUntil: null,
          active: editingTier.active,
          description: editingTier.description || undefined,
        };
        await createPricingTier(payload);
        show(t('messages.createSuccess'), 'success');
      } else {
        const payload: UpdatePricingTierRequest = {
          tierOrder: editingTier.tierOrder,
          minQuantity: editingTier.minQuantity,
          maxQuantity: editingTier.maxQuantity ?? null,
          unitPrice: editingTier.unitPrice,
          effectiveFrom: editingTier.effectiveFrom || new Date().toISOString().split('T')[0], // Keep existing or use today
          effectiveUntil: null,
          active: editingTier.active,
          description: editingTier.description || undefined,
        };
        await updatePricingTier(editingTier.id!, payload);
        show(t('messages.updateSuccess'), 'success');
      }
      setShowForm(false);
      setEditingTier(null);
      await loadTiers();
    } catch (error: any) {
      console.error('Failed to save pricing tier:', error);
      console.error('Error response:', error?.response);
      console.error('Error response data:', error?.response?.data);
      
      let errorMessage = t('errors.saveFailed');
      
      // Thử nhiều cách để lấy error message
      if (error?.response?.data) {
        const data = error.response.data;
        // Spring Boot có thể trả về message trong các field khác nhau
        if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.details) {
          errorMessage = data.details;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Decode URL encoding nếu có
      try {
        errorMessage = decodeURIComponent(errorMessage);
      } catch (e) {
        // Nếu không decode được thì giữ nguyên
      }
      
      if (errorMessage.includes('trùng') || errorMessage.includes('overlap') || 
          errorMessage.includes('Khoảng giá') || errorMessage.includes('tr?ng')) {
        setFormErrors({
          ...formErrors,
          overlap: errorMessage,
        });
        show(errorMessage, 'error');
      } else {
        show(errorMessage, 'error');
        setFormErrors({
          ...formErrors,
          general: errorMessage,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return t('common.notAvailable');
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600 mt-2">{t('description')}</p>
      </div>

      {/* Service Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-4">
          {SERVICE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedService(option.value as 'ELECTRIC' | 'WATER')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                selectedService === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-2">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {t('summary.totalTiers', { count: tiers.length })}
        </div>
        <button
          onClick={startCreate}
          disabled={!canEdit || hasFinalTier}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          title={!canEdit ? 'Bạn không có quyền thêm bậc giá' : hasFinalTier ? 'Không thể thêm bậc giá mới khi đã có bậc cuối cùng' : ''}
        >
          {t('buttons.addNewTier')}
        </button>
      </div>

      {/* Overlap Warning */}
      {sortedTiers.length > 0 && overlaps.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                {t('warnings.overlappingTiers')}
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p className="mb-2">
                  {t('warnings.overlappingDescription')}
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {overlaps.map((overlap, index) => {
                    const unit = selectedService === 'ELECTRIC' ? 'kWh' : 'm³';
                    let overlapText = '';
                    if (overlap.overlap.to === null) {
                      overlapText = t('warnings.overlappingRangeFrom', {
                        tier1: overlap.tier1,
                        tier2: overlap.tier2,
                        from: overlap.overlap.from.toLocaleString('vi-VN'),
                        unit
                      });
                    } else if (overlap.overlap.from === overlap.overlap.to) {
                      overlapText = t('warnings.overlappingRangeAt', {
                        tier1: overlap.tier1,
                        tier2: overlap.tier2,
                        from: overlap.overlap.from.toLocaleString('vi-VN'),
                        unit
                      });
                    } else {
                      overlapText = t('warnings.overlappingRange', {
                        tier1: overlap.tier1,
                        tier2: overlap.tier2,
                        from: overlap.overlap.from.toLocaleString('vi-VN'),
                        to: overlap.overlap.to.toLocaleString('vi-VN'),
                        unit
                      });
                    }
                    return (
                      <li key={index}>
                        {overlapText}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-xs">
                  {t('warnings.overlappingAdjust')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Missing Final Tier Warning */}
      {sortedTiers.length > 0 && !hasFinalTier && sortedTiers.filter(tier => isTierCurrentlyActive(tier)).length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                {t('warnings.missingFinalTier')}
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p className="mb-2">
                  {t('warnings.missingFinalTierDescription')}
                </p>
                <p className="text-xs mt-2">
                  {t('warnings.missingFinalTierExample')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gap Warning */}
      {sortedTiers.length > 0 && gaps.length > 0 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                {t('warnings.missingTiers')}
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p className="mb-2">
                  {t('warnings.gapsDescription')}
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {gaps.map((gap, index) => {
                    const unit = selectedService === 'ELECTRIC' ? 'kWh' : 'm³';
                    return (
                      <li key={index}>
                        {gap.to === Infinity ? (
                          <>
                            {t('warnings.gapFromUp', {
                              from: gap.from.toLocaleString('vi-VN'),
                              unit
                            })}
                          </>
                        ) : (
                          <>
                            {t('warnings.gapFromTo', {
                              from: gap.from.toLocaleString('vi-VN'),
                              to: gap.to.toLocaleString('vi-VN'),
                              unit
                            })}
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-xs">
                  {t('warnings.gapsAdjust')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && editingTier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {isCreateMode ? t('form.addTitle') : t('form.editTitle')}
              </h2>

              {/* Error Messages */}
              {formErrors.overlap && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-red-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-red-800">{formErrors.overlap}</p>
                    </div>
                  </div>
                </div>
              )}

              {formErrors.general && !formErrors.overlap && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-red-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-red-800">{formErrors.general}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.tierOrder')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingTier.tierOrder}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {isCreateMode 
                      ? t('form.tierOrderAutoGenerated')
                      : t('form.tierOrderReadOnly')}
                  </p>
                  {formErrors.tierOrder && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.tierOrder}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('form.minQuantity')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingTier.minQuantity ?? ''}
                      onChange={(e) => {
                        if (!isCreateMode && isEditingLastTier()) {
                          // Only allow editing minQuantity for last tier in edit mode
                          // Other tiers have fixed minQuantity due to backend validation
                          setEditingTier({
                            ...editingTier,
                            minQuantity: e.target.value ? parseFloat(e.target.value) : null,
                          });
                          if (formErrors.overlap || formErrors.general) {
                            setFormErrors({ ...formErrors, overlap: undefined, general: undefined });
                          }
                        }
                      }}
                      readOnly={isCreateMode || (!isCreateMode && !isEditingLastTier())}
                      disabled={isCreateMode || (!isCreateMode && !isEditingLastTier())}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        (isCreateMode || (!isCreateMode && !isEditingLastTier())) ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                      }`}
                      placeholder="0"
                    />
                    {isCreateMode && (
                      <p className="text-xs text-gray-500 mt-1">
                        {t('form.minQuantityAutoGenerated', { defaultValue: 'Tự động tính từ bậc giá cuối cùng' })}
                      </p>
                    )}
                    {!isCreateMode && !isEditingLastTier() && (
                      <p className="text-xs text-gray-500 mt-1">
                        Chỉ có thể sửa số lượng tối thiểu của bậc giá cuối cùng
                      </p>
                    )}
                    {formErrors.minQuantity && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.minQuantity}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('form.maxQuantity')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingTier.maxQuantity ?? ''}
                    onChange={(e) => {
                      setEditingTier({
                        ...editingTier,
                        maxQuantity: e.target.value ? parseFloat(e.target.value) : null,
                      });
                      if (formErrors.overlap || formErrors.general) {
                        setFormErrors({ ...formErrors, overlap: undefined, general: undefined });
                      }
                    }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t('form.maxQuantityPlaceholder')}
                    />
                    {formErrors.maxQuantity && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.maxQuantity}</p>
                    )}
                    {!isEditingLastTier() ? (
                      <p className="text-xs text-gray-500 mt-1">
                        Chỉ có thể sửa số lượng tối đa của bậc giá cuối cùng
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        {t('form.maxQuantityHint')}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.unitPrice')}
                  </label>
                  <input
                    type="number"
                    min={isCreateMode && lastTierUnitPrice !== null ? lastTierUnitPrice + 1 : 0}
                    step="100"
                    value={editingTier.unitPrice ?? ''}
                    onChange={(e) => {
                      setEditingTier({
                        ...editingTier,
                        unitPrice: e.target.value ? parseFloat(e.target.value) : null,
                      });
                      if (formErrors.unitPrice) {
                        setFormErrors({ ...formErrors, unitPrice: undefined });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {isCreateMode && lastTierUnitPrice !== null && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t('form.unitPriceMinHint', { 
                        minPrice: (lastTierUnitPrice + 1).toLocaleString('vi-VN'),
                        lastPrice: lastTierUnitPrice.toLocaleString('vi-VN'),
                        defaultValue: `Đơn giá tối thiểu: ${(lastTierUnitPrice + 1).toLocaleString('vi-VN')} VNĐ (phải lớn hơn đơn giá của bậc giá cuối cùng: ${lastTierUnitPrice.toLocaleString('vi-VN')} VNĐ)`
                      })}
                    </p>
                  )}
                  {formErrors.unitPrice && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.unitPrice}</p>
                  )}
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.description')}
                  </label>
                  <textarea
                    value={editingTier.description}
                    onChange={(e) =>
                      setEditingTier({ ...editingTier, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t('form.descriptionPlaceholder')}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={editingTier.active}
                    onChange={(e) =>
                      setEditingTier({ ...editingTier, active: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="active" className="ml-2 text-sm text-gray-700">
                    {t('form.active')}
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6 relative z-0">
                <button
                  onClick={() => handleSave()}
                  disabled={saving || !canEdit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed relative z-10"
                  title={!canEdit ? 'Bạn không có quyền lưu' : ''}
                >
                  {saving ? t('buttons.saving') : t('buttons.save')}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingTier(null);
                    setFormErrors({});
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 relative z-10"
                >
                  {t('buttons.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tiers List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-gray-500">{t('loading.data')}</div>
        </div>
      ) : sortedTiers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-4">{t('empty.noTiers')}</p>
          <button
            onClick={startCreate}
            disabled={!canEdit || hasFinalTier}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            title={!canEdit ? 'Bạn không có quyền thêm bậc giá' : hasFinalTier ? 'Không thể thêm bậc giá mới khi đã có bậc cuối cùng' : ''}
          >
            {t('buttons.addFirstTier')}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.tier')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.quantityRange')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.unitPrice')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTiers.map((tier) => {
                  const isActive = isTierCurrentlyActive(tier);
                  const minQty = tier.minQuantity ?? 0;
                  const maxQty = tier.maxQuantity;
                  const rangeText = maxQty
                    ? `${minQty.toLocaleString('vi-VN')} - ${maxQty.toLocaleString('vi-VN')}`
                    : `≥ ${minQty.toLocaleString('vi-VN')}`;

                  return (
                    <tr key={tier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {t('table.tierOrder', { order: tier.tierOrder })}
                        </div>
                        {tier.description && (
                          <div className="text-xs text-gray-500">{tier.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{rangeText}</div>
                        <div className="text-xs text-gray-500">
                          {selectedService === 'ELECTRIC' ? 'kWh' : 'm³'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(tier.unitPrice ?? 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          /{selectedService === 'ELECTRIC' ? 'kWh' : 'm³'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {isActive ? t('table.active') : t('table.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {(() => {
                          const tierIsLast = isLastTier(tier);
                          const canEditDelete = canEdit && tierIsLast;
                          return (
                            <>
                              <button
                                onClick={() => startEdit(tier)}
                                disabled={!canEditDelete}
                                className="text-blue-600 hover:text-blue-900 mr-4 disabled:text-gray-400 disabled:cursor-not-allowed"
                                title={!canEdit ? 'Bạn không có quyền chỉnh sửa' : !tierIsLast ? 'Chỉ có thể sửa bậc giá cuối cùng' : ''}
                              >
                                {t('buttons.edit')}
                              </button>
                              <button
                                onClick={() => handleDeleteClick(tier)}
                                disabled={!canEditDelete}
                                className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                                title={!canEdit ? 'Bạn không có quyền xóa' : !tierIsLast ? 'Chỉ có thể xóa bậc giá cuối cùng' : ''}
                              >
                                {t('buttons.delete')}
                              </button>
                            </>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">{t('notes.title')}</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>{t('notes.orderApplied')}</li>
          <li>{t('notes.rangeCalculation')}</li>
          <li>{t('notes.unlimitedMax')}</li>
          <li>{t('notes.effectiveDate')}</li>
        </ul>
      </div>

      {/* Delete Confirm Popup */}
      <PopupComfirm
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPendingDeleteTier(null);
        }}
        onConfirm={handleDelete}
        popupTitle={pendingDeleteTier ? t('confirm.deleteMessage', { tierOrder: pendingDeleteTier.tierOrder }) : ''}
        popupContext=""
        isDanger={true}
      />

      {/* No Last Tier Warning Popup */}
      <PopupComfirm
        isOpen={showNoLastTierConfirm}
        onClose={() => setShowNoLastTierConfirm(false)}
        onConfirm={() => {
          setShowNoLastTierConfirm(false);
          // Retry save after confirmation with skipWarning flag
          if (editingTier) {
            handleSave(true);
          }
        }}
        popupTitle={t('confirm.noLastTierWarning')}
        popupContext=""
        isDanger={false}
      />
    </div>
  );
}

