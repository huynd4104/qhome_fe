'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useNotifications } from '@/src/hooks/useNotifications';
import {
  Asset,
  AssetType,
  CreateAssetRequest,
  UpdateAssetRequest,
} from '@/src/types/asset';
import {
  getAllAssets,
  getAssetsByBuilding,
  getAssetsByUnit,
  getAssetsByType,
  createAsset,
  updateAsset,
  deleteAsset,
  deactivateAsset,
  exportAssetsToExcel,
} from '@/src/services/base/assetService';
import { getBuildings } from '@/src/services/base/buildingService';
import { getUnitsByBuilding, type Unit } from '@/src/services/base/unitService';
import PopupComfirm from '@/src/components/common/PopupComfirm';
import Pagination from '@/src/components/customer-interaction/Pagination';

interface AssetFormState {
  id?: string;
  unitId: string;
  assetType: AssetType;
  assetCode: string;
  name: string;
  active: boolean;
  installedAt: string;
  purchasePrice: number | null;
}

const EMPTY_FORM: AssetFormState = {
  unitId: '',
  assetType: AssetType.AIR_CONDITIONER,
  assetCode: '',
  name: '',
  active: true,
  installedAt: '',
  purchasePrice: null,
};

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  [AssetType.AIR_CONDITIONER]: 'Điều hòa',
  [AssetType.KITCHEN]: 'Bếp',
  [AssetType.WATER_HEATER]: 'Nóng lạnh',
  [AssetType.FURNITURE]: 'Nội thất',
  [AssetType.OTHER]: 'Khác',
};

// Map AssetType to prefix for asset code generation
const ASSET_TYPE_PREFIX: Record<AssetType, string> = {
  [AssetType.AIR_CONDITIONER]: 'AC',
  [AssetType.KITCHEN]: 'KT',
  [AssetType.WATER_HEATER]: 'WH',
  [AssetType.FURNITURE]: 'FT',
  [AssetType.OTHER]: 'OT',
};

// Map AssetType to default purchase price (VND)
const ASSET_TYPE_DEFAULT_PRICE: Record<AssetType, number> = {
  [AssetType.AIR_CONDITIONER]: 8000000,    // 8 triệu VND
  [AssetType.KITCHEN]: 5000000,            // 5 triệu VND
  [AssetType.WATER_HEATER]: 3000000,       // 3 triệu VND
  [AssetType.FURNITURE]: 2000000,          // 2 triệu VND
  [AssetType.OTHER]: 1000000,              // 1 triệu VND
};

export default function AssetManagementPage() {
  const t = useTranslations('AssetManagement');
  const { show } = useNotifications();
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetFormState | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteAsset, setPendingDeleteAsset] = useState<Asset | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [checkingActiveAsset, setCheckingActiveAsset] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Filters
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType | ''>('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  
  // Buildings and Units for dropdowns
  const [buildings, setBuildings] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'list' | 'missing'>('list');

  // Missing assets state
  const [missingAssetsBuildingId, setMissingAssetsBuildingId] = useState<string>('');
  const [missingAssetsType, setMissingAssetsType] = useState<AssetType>(AssetType.AIR_CONDITIONER);
  const [unitsWithoutAsset, setUnitsWithoutAsset] = useState<Array<Unit & { buildingCode?: string }>>([]);
  const [loadingMissingAssets, setLoadingMissingAssets] = useState(false);
  const [selectedUnitsForBulkCreate, setSelectedUnitsForBulkCreate] = useState<Set<string>>(new Set());
  const [showBulkCreateForm, setShowBulkCreateForm] = useState(false);
  const [bulkCreateForm, setBulkCreateForm] = useState({
    assetCodePrefix: '',
    name: '',
    installedAt: '',
    active: true,
    purchasePrice: 0,
  });
  const [bulkCreating, setBulkCreating] = useState(false);
  
  // State for create all units in building
  const [showCreateAllConfirm, setShowCreateAllConfirm] = useState(false);
  const [creatingAll, setCreatingAll] = useState(false);
  
  // Pagination
  const initialPageSize = 10;
  const [pageNo, setPageNo] = useState<number>(0);
  const [pageSize] = useState<number>(initialPageSize);

  useEffect(() => {
    loadAssets();
    loadBuildings();
  }, []);

  useEffect(() => {
    if (selectedBuildingId) {
      loadUnits(selectedBuildingId);
    } else {
      setUnits([]);
      setSelectedUnitId('');
    }
  }, [selectedBuildingId]);

  useEffect(() => {
    loadAssets();
    setPageNo(0);
  }, [selectedBuildingId, selectedUnitId, selectedAssetType, showActiveOnly]);

  // Validate active asset when form is opened or editingAsset changes
  useEffect(() => {
    if (showForm && editingAsset && editingAsset.active && editingAsset.unitId && editingAsset.assetType) {
      validateActiveAsset(editingAsset.unitId, editingAsset.assetType, editingAsset.active, editingAsset.id);
    }
  }, [showForm, editingAsset?.unitId, editingAsset?.assetType, editingAsset?.active]);

  // Apply pagination to assets
  const assetsToDisplay = useMemo(() => {
    const startIndex = pageNo * pageSize;
    const endIndex = startIndex + pageSize;
    return assets.slice(startIndex, endIndex);
  }, [assets, pageNo, pageSize]);

  const totalPages = useMemo(() => {
    return pageSize > 0 ? Math.ceil(assets.length / pageSize) : 0;
  }, [assets.length, pageSize]);

  const handlePageChange = useCallback((newPage: number) => {
    setPageNo(newPage);
  }, []);

  // Auto-generate asset code, name and price when unit or asset type changes in create mode
  useEffect(() => {
    if (isCreateMode && editingAsset && editingAsset.unitId && editingAsset.assetType && units.length > 0) {
      const generatedCode = generateAssetCode(editingAsset.assetType, editingAsset.unitId);
      const autoName = ASSET_TYPE_LABELS[editingAsset.assetType];
      const defaultPrice = ASSET_TYPE_DEFAULT_PRICE[editingAsset.assetType];
      // Only auto-generate if current code is empty or matches the old pattern
      const currentCode = editingAsset.assetCode || '';
      if (generatedCode && (!currentCode || currentCode.trim() === '')) {
        setEditingAsset((prev) => {
          if (prev && prev.assetCode === currentCode) {
            return { 
              ...prev, 
              assetCode: generatedCode,
              name: autoName, // Auto-update name when asset type changes
              purchasePrice: defaultPrice, // Auto-update price when asset type changes
            };
          }
          return prev;
        });
      }
    }
  }, [editingAsset?.unitId, editingAsset?.assetType, isCreateMode]);

  const loadBuildings = async () => {
    setLoadingBuildings(true);
    try {
      const data = await getBuildings();
      // Handle both array response and paginated response
      const buildingsList = Array.isArray(data) ? data : ((data as any)?.content || (data as any)?.data || []);
      setBuildings(buildingsList.map((b: any) => ({ id: b.id, code: b.code, name: b.name })));
    } catch (error: any) {
      console.error('Failed to load buildings:', error);
      show(error?.response?.data?.message || error?.message || 'Không thể tải danh sách tòa nhà', 'error');
    } finally {
      setLoadingBuildings(false);
    }
  };

  const loadUnits = async (buildingId: string) => {
    setLoadingUnits(true);
    try {
      const data = await getUnitsByBuilding(buildingId);
      setUnits(data);
    } catch (error: any) {
      console.error('Failed to load units:', error);
      show(error?.response?.data?.message || error?.message || 'Không thể tải danh sách căn hộ', 'error');
    } finally {
      setLoadingUnits(false);
    }
  };

  const loadAssets = async () => {
    setLoading(true);
    try {
      let data: Asset[] = [];
      
      if (selectedUnitId) {
        data = await getAssetsByUnit(selectedUnitId);
      } else if (selectedBuildingId) {
        data = await getAssetsByBuilding(selectedBuildingId);
      } else if (selectedAssetType) {
        data = await getAssetsByType(selectedAssetType as AssetType);
      } else {
        data = await getAllAssets();
      }

      if (showActiveOnly) {
        data = data.filter(asset => asset.active);
      }

      setAssets(data);
      setPageNo(0);
    } catch (error: any) {
      console.error('Failed to load assets:', error);
      show(error?.response?.data?.message || error?.message || 'Không thể tải danh sách thiết bị', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      
      const blob = await exportAssetsToExcel(
        selectedBuildingId || undefined,
        selectedUnitId || undefined,
        selectedAssetType || undefined
      );
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = `danh_sach_thiet_bi_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.setAttribute('download', filename);
      
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      show('Xuất Excel thành công', 'success');
    } catch (error: any) {
      console.error('Failed to export Excel:', error);
      show(error?.response?.data?.message || error?.message || 'Không thể xuất file Excel', 'error');
    } finally {
      setExporting(false);
    }
  };

  const startCreate = (unitId?: string, assetType?: AssetType, buildingId?: string) => {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    const finalAssetType = assetType || AssetType.AIR_CONDITIONER;
    const autoGeneratedName = ASSET_TYPE_LABELS[finalAssetType]; // Auto-generate name from asset type
    const defaultPrice = ASSET_TYPE_DEFAULT_PRICE[finalAssetType]; // Auto-generate default price
    
    setEditingAsset({
      ...EMPTY_FORM,
      assetType: finalAssetType,
      name: autoGeneratedName,
      installedAt: today,
      purchasePrice: defaultPrice,
    });
    setIsCreateMode(true);
    
    if (unitId && buildingId) {
      // Pre-fill form with unit and building info
      setSelectedBuildingId(buildingId);
      loadUnits(buildingId).then(() => {
        // Wait for units to load, then set unit and auto-generate asset code
        setTimeout(() => {
          setEditingAsset((prev) => {
            if (!prev) return EMPTY_FORM;
            const generatedCode = generateAssetCode(finalAssetType, unitId);
            return {
              ...prev,
              unitId,
              assetType: finalAssetType,
              assetCode: generatedCode || prev.assetCode,
              name: autoGeneratedName,
              installedAt: today,
              purchasePrice: defaultPrice,
            };
          });
        }, 100);
      });
    }
    // Don't reset filters if called without parameters - preserve existing filter state
    
    setShowForm(true);
    setFormErrors({});
    setTouchedFields({});
  };

  const startEdit = (asset: Asset) => {
    setEditingAsset({
      id: asset.id,
      unitId: asset.unitId,
      assetType: asset.assetType,
      assetCode: asset.assetCode,
      name: asset.name || '',
      active: asset.active,
      installedAt: asset.installedAt ? asset.installedAt.split('T')[0] : '',
      purchasePrice: asset.purchasePrice ?? null,
    });
    setIsCreateMode(false);
    setShowForm(true);
    setFormErrors({});
    setTouchedFields({});
    
    // Load units for selected building if available, but don't override existing filter
    // Only set building if it's different from current filter to preserve user's filter choice
    if (asset.buildingId && asset.buildingId !== selectedBuildingId) {
      setSelectedBuildingId(asset.buildingId);
      loadUnits(asset.buildingId);
    }
  };

  const handleDeleteClick = (asset: Asset) => {
    setPendingDeleteAsset(asset);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!pendingDeleteAsset) return;
    setShowDeleteConfirm(false);
    try {
      await deleteAsset(pendingDeleteAsset.id);
      show('Xóa thiết bị thành công', 'success');
      await loadAssets();
    } catch (error: any) {
      console.error('Failed to delete asset:', error);
      show(error?.response?.data?.message || error?.message || 'Không thể xóa thiết bị', 'error');
    }
  };

  const handleDeactivate = async (asset: Asset) => {
    try {
      await deactivateAsset(asset.id);
      show('Vô hiệu hóa thiết bị thành công', 'success');
      await loadAssets();
    } catch (error: any) {
      console.error('Failed to deactivate asset:', error);
      show(error?.response?.data?.message || error?.message || 'Không thể vô hiệu hóa thiết bị', 'error');
    }
  };

  // Generate asset code automatically based on asset type and unit
  const generateAssetCode = (assetType: AssetType, unitId: string): string => {
    if (!unitId || !assetType) return '';
    
    const unit = units.find(u => u.id === unitId);
    if (!unit) return '';
    
    const prefix = ASSET_TYPE_PREFIX[assetType];
    const unitCode = unit.code;
    
    // Find existing assets of the same type in the same unit
    const existingAssets = assets.filter(
      a => a.unitId === unitId && 
           a.assetType === assetType &&
           a.assetCode.startsWith(`${prefix}-${unitCode}-`)
    );
    
    // Extract numbers from existing asset codes and find the next number
    let nextNumber = 1;
    if (existingAssets.length > 0) {
      const numbers = existingAssets
        .map(a => {
          const match = a.assetCode.match(/-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);
      
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1;
      }
    }
    
    // Format number with leading zeros (001, 002, ...)
    const numberStr = nextNumber.toString().padStart(3, '0');
    return `${prefix}-${unitCode}-${numberStr}`;
  };

  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    
    if (!editingAsset) {
      return { isValid: false, errors };
    }
    
    if (isCreateMode && !selectedBuildingId) {
      errors.buildingId = 'Vui lòng chọn tòa nhà';
    }
    
    if (!editingAsset.unitId) {
      errors.unitId = 'Vui lòng chọn căn hộ';
    }
    
    if (!editingAsset.assetCode.trim()) {
      errors.assetCode = 'Mã thiết bị không được để trống';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  const validateField = (fieldName: string, value: any) => {
    const errors = { ...formErrors };
    
    if (!editingAsset) {
      setFormErrors(errors);
      return;
    }

    switch (fieldName) {
      case 'buildingId':
        if (isCreateMode && !value) {
          errors.buildingId = 'Vui lòng chọn tòa nhà';
        } else {
          delete errors.buildingId;
        }
        break;
      case 'unitId':
        if (!value) {
          errors.unitId = 'Vui lòng chọn căn hộ';
        } else {
          delete errors.unitId;
        }
        break;
      case 'assetCode':
        if (!value || !value.trim()) {
          errors.assetCode = 'Mã thiết bị không được để trống';
        } else {
          delete errors.assetCode;
        }
        break;
    }
    
    setFormErrors(errors);
  };

  // Async validation for duplicate active asset
  const validateActiveAsset = async (unitId: string, assetType: AssetType, active: boolean, currentAssetId?: string) => {
    if (!active || !unitId || !assetType) {
      // Clear error if active is false or unitId/assetType is missing
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.activeAsset;
        return newErrors;
      });
      return;
    }

    setCheckingActiveAsset(true);
    try {
      const allUnitAssets = await getAssetsByUnit(unitId);
      const existingActiveAsset = allUnitAssets.find(
        asset => asset.assetType === assetType && asset.active && asset.id !== currentAssetId
      );
      
      setFormErrors(prev => {
        const newErrors = { ...prev };
        if (existingActiveAsset) {
          newErrors.activeAsset = `Đã có thiết bị loại "${ASSET_TYPE_LABELS[assetType]}" đang hoạt động trong căn hộ này. Vui lòng vô hiệu hóa thiết bị đó trước.`;
        } else {
          delete newErrors.activeAsset;
        }
        return newErrors;
      });
    } catch (error) {
      console.warn('Failed to check active asset:', error);
      // Don't show error if API call fails, let user try to save
    } finally {
      setCheckingActiveAsset(false);
    }
  };

  const handleSave = async () => {
    // Mark all fields as touched
    setTouchedFields({
      buildingId: true,
      unitId: true,
      assetCode: true,
    });

    const validation = validateForm();
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    
    if (!editingAsset) {
      return;
    }

    setSaving(true);
    try {
      if (isCreateMode) {
        // Load all assets in the unit for validation and checking inactive assets
        let allUnitAssets: Asset[] = [];
        try {
          allUnitAssets = await getAssetsByUnit(editingAsset.unitId);
        } catch (error) {
          console.warn('Failed to check existing assets:', error);
        }

        // Validate: Cannot have 2 assets of same type active in the same unit
        // This validation is also done in validateActiveAsset, but double-check here
        if (editingAsset.active) {
          const existingActiveAsset = allUnitAssets.find(
            asset => asset.assetType === editingAsset.assetType && asset.active
          );
          if (existingActiveAsset) {
            setFormErrors(prev => ({
              ...prev,
              activeAsset: `Đã có thiết bị loại "${ASSET_TYPE_LABELS[editingAsset.assetType]}" đang hoạt động trong căn hộ này. Vui lòng vô hiệu hóa thiết bị đó trước.`
            }));
            setSaving(false);
            return;
          }
        }

        // Check if there's an inactive asset with the same unitId and assetType
        // If exists, reactivate it instead of creating a new one (keep existing info)
        const existingInactiveAsset = allUnitAssets.find(
          asset => asset.assetType === editingAsset.assetType && !asset.active
        ) || null;

        if (existingInactiveAsset) {
          // Reactivate the existing inactive asset
          // If user provided new information, update it; otherwise just reactivate
          const hasNewInfo = editingAsset.assetCode.trim() !== existingInactiveAsset.assetCode ||
                           (editingAsset.name.trim() && editingAsset.name.trim() !== existingInactiveAsset.name) ||
                           editingAsset.installedAt !== existingInactiveAsset.installedAt ||
                           (editingAsset.purchasePrice !== null && editingAsset.purchasePrice !== existingInactiveAsset.purchasePrice);
          
          const payload: UpdateAssetRequest = {
            active: true, // Always reactivate
            // Update fields only if user provided new information
            ...(editingAsset.assetCode.trim() && editingAsset.assetCode.trim() !== existingInactiveAsset.assetCode && {
              assetCode: editingAsset.assetCode.trim()
            }),
            ...(editingAsset.name.trim() && editingAsset.name.trim() !== existingInactiveAsset.name && {
              name: editingAsset.name.trim()
            }),
            ...(editingAsset.installedAt && editingAsset.installedAt !== existingInactiveAsset.installedAt && {
              installedAt: editingAsset.installedAt
            }),
            ...(editingAsset.purchasePrice !== null && editingAsset.purchasePrice !== existingInactiveAsset.purchasePrice && {
              purchasePrice: editingAsset.purchasePrice
            }),
          };
          
          await updateAsset(existingInactiveAsset.id, payload);
          const message = hasNewInfo 
            ? `Đã kích hoạt lại và cập nhật thông tin thiết bị "${existingInactiveAsset.assetCode}"`
            : `Đã kích hoạt lại thiết bị "${existingInactiveAsset.name || existingInactiveAsset.assetCode}"`;
          show(message, 'success');
        } else {
          // No inactive asset found, create new one
          const payload: CreateAssetRequest = {
            unitId: editingAsset.unitId,
            assetType: editingAsset.assetType,
            assetCode: editingAsset.assetCode.trim(),
            name: editingAsset.name.trim() || undefined,
            active: editingAsset.active,
            installedAt: editingAsset.installedAt || undefined,
            purchasePrice: editingAsset.purchasePrice ?? undefined,
          };
          await createAsset(payload);
          show('Tạo thiết bị thành công', 'success');
        }
      } else {
        // Validate: Cannot have 2 assets of same type active in the same unit
        // This validation is also done in validateActiveAsset, but double-check here
        if (editingAsset.active) {
          try {
            const allUnitAssets = await getAssetsByUnit(editingAsset.unitId);
            const existingActiveAsset = allUnitAssets.find(
              asset => asset.assetType === editingAsset.assetType && asset.active && asset.id !== editingAsset.id
            );
            if (existingActiveAsset) {
              setFormErrors(prev => ({
                ...prev,
                activeAsset: `Đã có thiết bị loại "${ASSET_TYPE_LABELS[editingAsset.assetType]}" đang hoạt động trong căn hộ này. Vui lòng vô hiệu hóa thiết bị đó trước.`
              }));
              setSaving(false);
              return;
            }
          } catch (error) {
            console.warn('Failed to check existing assets:', error);
          }
        }

        const payload: UpdateAssetRequest = {
          assetCode: editingAsset.assetCode.trim(),
          name: editingAsset.name.trim() || undefined,
          active: editingAsset.active,
          installedAt: editingAsset.installedAt || undefined,
          purchasePrice: editingAsset.purchasePrice ?? undefined,
        };
        await updateAsset(editingAsset.id!, payload);
        show('Cập nhật thiết bị thành công', 'success');
      }
      setShowForm(false);
      setEditingAsset(null);
      setFormErrors({});
      setTouchedFields({});
      await loadAssets();
    } catch (error: any) {
      console.error('Failed to save asset:', error);
      let errorMessage = error?.response?.data?.message || error?.message || 'Không thể lưu thiết bị';
      
      // Improve error message for constraint violations
      if (errorMessage.includes('uq_asset_code')) {
        errorMessage = 'Mã thiết bị đã tồn tại. Vui lòng chọn mã khác.';
      }
      
      show(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format number with dots as thousand separators (8.000.000)
  const formatNumberWithDots = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Parse formatted number string to number (removes dots)
  const parseFormattedNumber = (value: string): number | null => {
    if (!value || value.trim() === '') return null;
    const cleaned = value.replace(/\./g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  // Load units without asset
  const loadUnitsWithoutAsset = async () => {
    if (!missingAssetsBuildingId || !missingAssetsType) {
      setUnitsWithoutAsset([]);
      return;
    }

    setLoadingMissingAssets(true);
    try {
      // Get all units in building
      const allUnits = await getUnitsByBuilding(missingAssetsBuildingId);
      
      // Get all assets of this type in this building
      const existingAssets = await getAssetsByBuilding(missingAssetsBuildingId);
      const assetsOfType = existingAssets.filter(a => a.assetType === missingAssetsType && a.active);
      
      // Find units that don't have this asset type
      const unitsWithAsset = new Set(assetsOfType.map(a => a.unitId));
      const unitsWithout = allUnits
        .filter(unit => !unitsWithAsset.has(unit.id))
        .map(unit => ({
          ...unit,
          buildingCode: buildings.find(b => b.id === missingAssetsBuildingId)?.code || '',
        }));
      
      setUnitsWithoutAsset(unitsWithout);
      setSelectedUnitsForBulkCreate(new Set());
    } catch (error: any) {
      console.error('Failed to load units without asset:', error);
      show(error?.response?.data?.message || error?.message || 'Không thể tải danh sách căn hộ', 'error');
    } finally {
      setLoadingMissingAssets(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'missing' && missingAssetsBuildingId && missingAssetsType) {
      loadUnitsWithoutAsset();
    }
  }, [activeTab, missingAssetsBuildingId, missingAssetsType]);

  const handleBulkCreateAssets = async () => {
    if (selectedUnitsForBulkCreate.size === 0) {
      show('Vui lòng chọn ít nhất một căn hộ', 'error');
      return;
    }

    // No validation needed, will use auto-generated values if not provided
    setBulkCreating(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      const unitArray = Array.from(selectedUnitsForBulkCreate);
      const prefix = bulkCreateForm.assetCodePrefix.trim() || (missingAssetsType ? ASSET_TYPE_PREFIX[missingAssetsType] : '');
      
      // Use form values, fallback to auto-generated if empty
      const name = bulkCreateForm.name.trim() || ASSET_TYPE_LABELS[missingAssetsType];
      const price = bulkCreateForm.purchasePrice || ASSET_TYPE_DEFAULT_PRICE[missingAssetsType];
      const installedAt = bulkCreateForm.installedAt || new Date().toISOString().split('T')[0]; // Use form value or today
      
      for (let i = 0; i < unitArray.length; i++) {
        const unitId = unitArray[i];
        const unit = unitsWithoutAsset.find(u => u.id === unitId);
        if (!unit) continue;

        // Generate asset code with number (same logic as handleCreateAllUnitsInBuilding)
        const existingAssets = assets.filter(
          a => a.unitId === unit.id && 
               a.assetType === missingAssetsType &&
               a.assetCode.startsWith(`${prefix}-${unit.code}-`)
        );
        
        let nextNumber = 1;
        if (existingAssets.length > 0) {
          const numbers = existingAssets
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
            unitId,
            assetType: missingAssetsType,
            assetCode,
            name,
            active: bulkCreateForm.active,
            installedAt: installedAt || undefined,
            purchasePrice: price,
          };
          
          await createAsset(payload);
          successCount++;
        } catch (error: any) {
          let errorMsg = error?.response?.data?.message || error?.message || 'Lỗi không xác định';
          
          // Improve error message for constraint violations
          if (errorMsg.includes('uq_asset_code')) {
            errorMsg = 'Mã thiết bị đã tồn tại';
          }
          
          errors.push(`${unit.code}: ${errorMsg}`);
        }
      }

      if (successCount > 0) {
        show(`Đã tạo thành công ${successCount} thiết bị${errors.length > 0 ? `. ${errors.length} lỗi.` : ''}`, 'success');
      }

      if (errors.length > 0 && successCount === 0) {
        show(`Không thể tạo thiết bị. Lỗi: ${errors.join('; ')}`, 'error');
      }

      // Reset form and reload
      setShowBulkCreateForm(false);
      setSelectedUnitsForBulkCreate(new Set());
      setBulkCreateForm({
        assetCodePrefix: missingAssetsType ? ASSET_TYPE_PREFIX[missingAssetsType] : '',
        name: missingAssetsType ? ASSET_TYPE_LABELS[missingAssetsType] : '',
        installedAt: '',
        active: true,
        purchasePrice: missingAssetsType ? ASSET_TYPE_DEFAULT_PRICE[missingAssetsType] : 0,
      });
      
      await loadUnitsWithoutAsset();
      if (activeTab === 'list') {
        await loadAssets();
      }
    } catch (error: any) {
      console.error('Failed to bulk create assets:', error);
      show(error?.response?.data?.message || error?.message || 'Không thể tạo thiết bị', 'error');
    } finally {
      setBulkCreating(false);
    }
  };

  const toggleUnitSelection = (unitId: string) => {
    setSelectedUnitsForBulkCreate(prev => {
      const newSet = new Set(prev);
      if (newSet.has(unitId)) {
        newSet.delete(unitId);
      } else {
        newSet.add(unitId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUnitsForBulkCreate.size === unitsWithoutAsset.length) {
      setSelectedUnitsForBulkCreate(new Set());
    } else {
      setSelectedUnitsForBulkCreate(new Set(unitsWithoutAsset.map(u => u.id)));
    }
  };

  // Handle create assets for all units in building
  const handleCreateAllUnitsInBuilding = async () => {
    if (!missingAssetsBuildingId || !missingAssetsType || unitsWithoutAsset.length === 0) {
      return;
    }

    setCreatingAll(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      const defaultPrice = ASSET_TYPE_DEFAULT_PRICE[missingAssetsType];
      const today = new Date().toISOString().split('T')[0];
      const autoName = ASSET_TYPE_LABELS[missingAssetsType];
      const prefix = ASSET_TYPE_PREFIX[missingAssetsType];

      for (const unit of unitsWithoutAsset) {
        // Generate asset code
        const existingAssets = assets.filter(
          a => a.unitId === unit.id && 
               a.assetType === missingAssetsType &&
               a.assetCode.startsWith(`${prefix}-${unit.code}-`)
        );
        
        let nextNumber = 1;
        if (existingAssets.length > 0) {
          const numbers = existingAssets
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
            unitId: unit.id,
            assetType: missingAssetsType,
            assetCode,
            name: autoName,
            active: true,
            installedAt: today,
            purchasePrice: defaultPrice,
          };
          
          await createAsset(payload);
          successCount++;
        } catch (error: any) {
          let errorMsg = error?.response?.data?.message || error?.message || 'Lỗi không xác định';
          if (errorMsg.includes('uq_asset_code')) {
            errorMsg = 'Mã thiết bị đã tồn tại';
          }
          errors.push(`${unit.code}: ${errorMsg}`);
        }
      }

      if (successCount > 0) {
        show(`Đã tạo thành công ${successCount} thiết bị cho tất cả căn hộ trong tòa nhà${errors.length > 0 ? `. ${errors.length} lỗi.` : ''}`, 'success');
      }

      if (errors.length > 0 && successCount === 0) {
        show(`Không thể tạo thiết bị. Lỗi: ${errors.join('; ')}`, 'error');
      }

      // Reload data
      setShowCreateAllConfirm(false);
      await loadUnitsWithoutAsset();
      if (activeTab === 'list') {
        await loadAssets();
      }
    } catch (error: any) {
      console.error('Failed to create assets for all units:', error);
      show(error?.response?.data?.message || error?.message || 'Không thể tạo thiết bị', 'error');
    } finally {
      setCreatingAll(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <style jsx global>{`
        /* Đảm bảo datepicker popup hiển thị đúng cách và icon không quá to */
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: 1;
          width: 16px;
          height: 16px;
          margin-left: 4px;
          padding: 0;
          position: absolute;
          right: 8px;
        }
        input[type="date"] {
          position: relative;
          padding-right: 35px !important;
        }
        /* Modal wrapper không clip datepicker */
        .asset-modal-wrapper {
          overflow: visible !important;
        }
        /* Scrollable content */
        .asset-modal-content {
          overflow-y: auto;
        }
        /* Date inputs container */
        .date-input-wrapper {
          position: relative;
          z-index: auto;
        }
        input[type="date"]:focus {
          position: relative;
          z-index: 10002;
        }
      `}</style>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý thiết bị</h1>
        <p className="text-gray-600 mt-2">Quản lý các thiết bị trong căn hộ (điều hòa, bếp, tủ lạnh, ...)</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Danh sách thiết bị
          </button>
          <button
            onClick={() => setActiveTab('missing')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'missing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Căn hộ chưa có thiết bị
          </button>
        </nav>
      </div>

      {activeTab === 'list' ? (
        <>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tòa nhà
            </label>
            <select
              value={selectedBuildingId}
              onChange={(e) => {
                setSelectedBuildingId(e.target.value);
                setSelectedUnitId('');
                setPageNo(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingBuildings}
            >
              <option value="">Tất cả tòa nhà</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.code} - {building.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Căn hộ
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => {
                setSelectedUnitId(e.target.value);
                setPageNo(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedBuildingId || loadingUnits}
            >
              <option value="">Tất cả căn hộ</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.code} - {unit.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại thiết bị
            </label>
            <select
              value={selectedAssetType}
              onChange={(e) => {
                setSelectedAssetType(e.target.value as AssetType | '');
                setPageNo(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả loại</option>
              {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => {
                  setShowActiveOnly(e.target.checked);
                  setPageNo(0);
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Chỉ hiển thị thiết bị đang hoạt động</span>
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Tổng số: {assets.length} thiết bị
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportExcel}
            disabled={exporting || assets.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {exporting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang xuất...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Xuất Excel
              </>
            )}
          </button>
          <button
            onClick={() => startCreate()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Thêm thiết bị
          </button>
        </div>
      </div>

      {/* Assets List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-gray-500">Đang tải...</div>
        </div>
      ) : assets.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-4">Chưa có thiết bị nào</p>
          <button
            onClick={() => startCreate()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Thêm thiết bị đầu tiên
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã thiết bị
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên/Model
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Căn hộ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày lắp đặt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assetsToDisplay.map((asset) => (
                  <tr key={asset.id} className={`hover:bg-gray-50 ${!asset.active ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${asset.active ? 'text-gray-900' : 'text-gray-500'}`}>
                        {asset.assetCode}
                      </div>
                      {asset.serialNumber && (
                        <div className="text-xs text-gray-500">
                          SN: {asset.serialNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm ${asset.active ? 'text-gray-900' : 'text-gray-500'}`}>
                        {asset.name || '-'}
                      </div>
                      {asset.model && (
                        <div className="text-xs text-gray-500">
                          {asset.model}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${asset.active ? 'text-gray-900' : 'text-gray-500'}`}>
                        {ASSET_TYPE_LABELS[asset.assetType]}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${asset.active ? 'text-gray-900' : 'text-gray-500'}`}>
                        {asset.unitCode || '-'}
                      </div>
                      {asset.buildingCode && (
                        <div className="text-xs text-gray-500">
                          {asset.buildingCode}
                          {asset.floor !== undefined && ` - Tầng ${asset.floor}`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${asset.active ? 'text-gray-900' : 'text-gray-500'}`}>
                        {formatDate(asset.installedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          asset.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {asset.active ? 'Đang hoạt động' : 'Đã ngừng'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => startEdit(asset)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Sửa
                      </button>
                      {asset.active && (
                        <button
                          onClick={() => handleDeactivate(asset)}
                          className="text-yellow-600 hover:text-yellow-900 mr-4"
                        >
                          Vô hiệu hóa
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteClick(asset)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <Pagination
                currentPage={pageNo + 1}
                totalPages={totalPages}
                onPageChange={(page) => handlePageChange(page - 1)}
              />
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && editingAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowForm(false);
            setEditingAsset(null);
            setFormErrors({});
            setTouchedFields({});
          }
        }}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col relative z-[10000]" style={{ overflow: 'visible' }}>
            <div className="p-6 flex-shrink-0 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {isCreateMode ? 'Thêm thiết bị mới' : 'Chỉnh sửa thiết bị'}
              </h2>
            </div>
            
            <div className="px-6 py-6 flex-1 min-h-0" style={{ maxHeight: 'calc(90vh - 180px)', overflowY: 'auto', overflowX: 'visible' }}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tòa nhà <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={isCreateMode ? selectedBuildingId : (editingAsset.unitId ? assets.find(a => a.unitId === editingAsset.unitId)?.buildingId || '' : '')}
                      onChange={(e) => {
                        const buildingId = e.target.value;
                        setSelectedBuildingId(buildingId);
                        setTouchedFields({ ...touchedFields, buildingId: true });
                        validateField('buildingId', buildingId);
                        if (isCreateMode) {
                          // Reset unitId and assetCode when building changes
                          setEditingAsset({ ...editingAsset, unitId: '', assetCode: '' });
                          if (buildingId) {
                            loadUnits(buildingId);
                          } else {
                            setUnits([]);
                          }
                        }
                      }}
                      onBlur={() => {
                        setTouchedFields({ ...touchedFields, buildingId: true });
                        validateField('buildingId', isCreateMode ? selectedBuildingId : (editingAsset.unitId ? assets.find(a => a.unitId === editingAsset.unitId)?.buildingId || '' : ''));
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                        touchedFields.buildingId && formErrors.buildingId
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      disabled={!isCreateMode}
                      required
                    >
                      <option value="">Chọn tòa nhà</option>
                      {buildings.map((building) => (
                        <option key={building.id} value={building.id}>
                          {building.code} - {building.name}
                        </option>
                      ))}
                    </select>
                    {touchedFields.buildingId && formErrors.buildingId && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.buildingId}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Căn hộ <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editingAsset.unitId}
                      onChange={(e) => {
                        const newUnitId = e.target.value;
                        let newAssetCode = editingAsset.assetCode;
                        
                        // Auto-generate asset code in create mode
                        if (isCreateMode && newUnitId && editingAsset.assetType) {
                          newAssetCode = generateAssetCode(editingAsset.assetType, newUnitId);
                        }
                        
                        setEditingAsset({ ...editingAsset, unitId: newUnitId, assetCode: newAssetCode });
                        setTouchedFields({ ...touchedFields, unitId: true });
                        validateField('unitId', newUnitId);
                        if (newAssetCode) {
                          validateField('assetCode', newAssetCode);
                        }
                        // Validate duplicate active asset when unit changes
                        if (editingAsset.active && editingAsset.assetType && newUnitId) {
                          validateActiveAsset(newUnitId, editingAsset.assetType, editingAsset.active, editingAsset.id);
                        }
                      }}
                      onBlur={() => {
                        setTouchedFields({ ...touchedFields, unitId: true });
                        validateField('unitId', editingAsset.unitId);
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        touchedFields.unitId && formErrors.unitId
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      disabled={!selectedBuildingId && isCreateMode}
                      required
                    >
                      <option value="">
                        {isCreateMode && !selectedBuildingId ? 'Vui lòng chọn tòa nhà trước' : 'Chọn căn hộ'}
                      </option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.code} - {unit.name}
                        </option>
                      ))}
                    </select>
                    {touchedFields.unitId && formErrors.unitId ? (
                      <p className="mt-1 text-sm text-red-600">{formErrors.unitId}</p>
                    ) : isCreateMode && !selectedBuildingId ? (
                      <p className="mt-1 text-sm text-gray-500">
                        Vui lòng chọn tòa nhà trước để hiển thị danh sách căn hộ
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loại thiết bị <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editingAsset.assetType}
                      onChange={(e) => {
                        const newAssetType = e.target.value as AssetType;
                        let newAssetCode = editingAsset.assetCode;
                        // Only auto-update name if it's empty or matches the current asset type label (preserve user edits)
                        const currentNameLabel = editingAsset.assetType ? ASSET_TYPE_LABELS[editingAsset.assetType] : '';
                        const newName = (isCreateMode && (!editingAsset.name || editingAsset.name === currentNameLabel)) 
                          ? ASSET_TYPE_LABELS[newAssetType] 
                          : editingAsset.name;
                        const currentPriceDefault = editingAsset.assetType ? ASSET_TYPE_DEFAULT_PRICE[editingAsset.assetType] : 0;
                        const newPrice = (isCreateMode && (!editingAsset.purchasePrice || editingAsset.purchasePrice === currentPriceDefault)) 
                          ? ASSET_TYPE_DEFAULT_PRICE[newAssetType] 
                          : editingAsset.purchasePrice;
                        
                        // Auto-generate asset code in create mode
                        if (isCreateMode && editingAsset.unitId && newAssetType) {
                          newAssetCode = generateAssetCode(newAssetType, editingAsset.unitId);
                        }
                        
                        const updatedAsset = { 
                          ...editingAsset, 
                          assetType: newAssetType, 
                          assetCode: newAssetCode,
                          name: newName,
                          purchasePrice: newPrice,
                        };
                        setEditingAsset(updatedAsset);
                        // Validate duplicate active asset when asset type changes
                        if (updatedAsset.active && updatedAsset.unitId && newAssetType) {
                          validateActiveAsset(updatedAsset.unitId, newAssetType, updatedAsset.active, updatedAsset.id);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mã thiết bị <span className="text-red-500">*</span>
                      {isCreateMode && (
                        <span className="ml-2 text-xs text-gray-500 font-normal">
                          (Tự động tạo)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={editingAsset.assetCode}
                      onChange={(e) => {
                        setEditingAsset({ ...editingAsset, assetCode: e.target.value });
                        setTouchedFields({ ...touchedFields, assetCode: true });
                        validateField('assetCode', e.target.value);
                      }}
                      onBlur={() => {
                        setTouchedFields({ ...touchedFields, assetCode: true });
                        validateField('assetCode', editingAsset.assetCode);
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 bg-gray-50 ${
                        touchedFields.assetCode && formErrors.assetCode
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder={isCreateMode ? "Mã sẽ được tạo tự động" : "VD: AC-A101-001"}
                      readOnly={isCreateMode}
                    />
                    {touchedFields.assetCode && formErrors.assetCode ? (
                      <p className="mt-1 text-sm text-red-600">{formErrors.assetCode}</p>
                    ) : isCreateMode && editingAsset.assetCode ? (
                      <p className="mt-1 text-xs text-gray-500">
                        Mã được tạo tự động dựa trên loại thiết bị và căn hộ
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tên thiết bị
                      {isCreateMode && (
                        <span className="ml-2 text-xs text-gray-500 font-normal">
                          (Tạo sẵn, có thể sửa)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={editingAsset.name || (isCreateMode && editingAsset.assetType ? ASSET_TYPE_LABELS[editingAsset.assetType] : '')}
                      onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="VD: Điều hòa phòng khách"
                    />
                    {isCreateMode && editingAsset.name && (
                      <p className="mt-1 text-xs text-gray-500">
                        Tên được tạo sẵn theo loại thiết bị, bạn có thể chỉnh sửa
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày lắp đặt
                      {isCreateMode && (
                        <span className="ml-2 text-xs text-gray-500 font-normal">
                          (Mặc định: hôm nay)
                        </span>
                      )}
                    </label>
                    <input
                      type="date"
                      value={editingAsset.installedAt}
                      onChange={(e) => setEditingAsset({ ...editingAsset, installedAt: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      max={new Date().toISOString().split('T')[0]} // Prevent future dates
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Giá mua (VND)
                      {isCreateMode && (
                        <span className="ml-2 text-xs text-gray-500 font-normal">
                          (Tự động tạo)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formatNumberWithDots(editingAsset.purchasePrice)}
                      onChange={(e) => {
                        const parsedValue = parseFormattedNumber(e.target.value);
                        setEditingAsset({ ...editingAsset, purchasePrice: parsedValue });
                      }}
                      onBlur={(e) => {
                        // Re-format on blur to ensure proper formatting
                        const parsedValue = parseFormattedNumber(e.target.value);
                        if (parsedValue !== null) {
                          setEditingAsset({ ...editingAsset, purchasePrice: parsedValue });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="VD: 5.000.000"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {isCreateMode 
                        ? 'Giá mặc định theo loại thiết bị. Có thể chỉnh sửa nếu cần.'
                        : 'Dùng để tính tiền bồi thường khi kiểm tra tài sản'
                      }
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center h-10">
                      <input
                        type="checkbox"
                        id="active"
                        checked={editingAsset.active}
                        onChange={(e) => {
                          const newActive = e.target.checked;
                          setEditingAsset({ ...editingAsset, active: newActive });
                          // Validate duplicate active asset when checkbox changes
                          if (editingAsset.unitId && editingAsset.assetType) {
                            validateActiveAsset(editingAsset.unitId, editingAsset.assetType, newActive, editingAsset.id);
                          }
                        }}
                        className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                          formErrors.activeAsset ? 'border-red-500' : ''
                        }`}
                      />
                      <label htmlFor="active" className="ml-2 text-sm text-gray-700">
                        Đang hoạt động
                      </label>
                    </div>
                    {formErrors.activeAsset && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.activeAsset}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 pb-6 flex-shrink-0 border-t border-gray-200 pt-4 bg-white relative z-[10001]">
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || Object.keys(formErrors).length > 0 || checkingActiveAsset}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed relative z-[10001]"
                >
                  {saving ? 'Đang lưu...' : checkingActiveAsset ? 'Đang kiểm tra...' : 'Lưu'}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingAsset(null);
                    setFormErrors({});
                    setTouchedFields({});
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 relative z-[10001]"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Popup */}
      <PopupComfirm
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPendingDeleteAsset(null);
        }}
        onConfirm={handleDelete}
        popupTitle={pendingDeleteAsset ? `Bạn có chắc muốn xóa thiết bị "${pendingDeleteAsset.assetCode}"?` : ''}
        popupContext=""
        isDanger={true}
      />
        </>
      ) : (
        <>
          {/* Missing Assets Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tòa nhà <span className="text-red-500">*</span>
                </label>
                <select
                  value={missingAssetsBuildingId}
                  onChange={(e) => {
                    setMissingAssetsBuildingId(e.target.value);
                    setUnitsWithoutAsset([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chọn tòa nhà</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.code} - {building.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại thiết bị cần kiểm tra <span className="text-red-500">*</span>
                </label>
                <select
                  value={missingAssetsType}
                  onChange={(e) => {
                    setMissingAssetsType(e.target.value as AssetType);
                    setUnitsWithoutAsset([]);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loadingMissingAssets ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-gray-500">Đang tải...</div>
            </div>
          ) : !missingAssetsBuildingId || !missingAssetsType ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">Vui lòng chọn tòa nhà và loại thiết bị để xem danh sách căn hộ chưa có thiết bị</p>
            </div>
          ) : unitsWithoutAsset.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500 mb-4">Tất cả căn hộ trong tòa nhà này đã có thiết bị "{ASSET_TYPE_LABELS[missingAssetsType]}"</p>
            </div>
          ) : (
            <>
              {/* Alert for missing assets */}
              <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Phát hiện {unitsWithoutAsset.length} căn hộ thiếu thiết bị "{ASSET_TYPE_LABELS[missingAssetsType]}"
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Các căn hộ trong tòa nhà {buildings.find(b => b.id === missingAssetsBuildingId)?.code} chưa có thiết bị {ASSET_TYPE_LABELS[missingAssetsType]}. 
                        Bạn có thể tạo thiết bị cho từng căn hộ bằng nút "Tạo thiết bị" hoặc chọn nhiều căn hộ để tạo hàng loạt.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Tìm thấy {unitsWithoutAsset.length} căn hộ chưa có {ASSET_TYPE_LABELS[missingAssetsType]}
                  {selectedUnitsForBulkCreate.size > 0 && (
                    <span className="ml-2 font-medium text-blue-600">
                      ({selectedUnitsForBulkCreate.size} đã chọn)
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCreateAllConfirm(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                  >
                    ⚡ Tạo tự động cho tất cả ({unitsWithoutAsset.length} căn hộ)
                  </button>
                  <button
                    onClick={toggleSelectAll}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    {selectedUnitsForBulkCreate.size === unitsWithoutAsset.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                  {selectedUnitsForBulkCreate.size > 0 && (
                    <button
                      onClick={() => {
                        // Auto-fill default values when opening form
                        setBulkCreateForm({
                          assetCodePrefix: missingAssetsType ? ASSET_TYPE_PREFIX[missingAssetsType] : '',
                          name: missingAssetsType ? ASSET_TYPE_LABELS[missingAssetsType] : '',
                          installedAt: '',
                          active: true,
                          purchasePrice: missingAssetsType ? ASSET_TYPE_DEFAULT_PRICE[missingAssetsType] : 0,
                        });
                        setShowBulkCreateForm(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Tạo thiết bị cho {selectedUnitsForBulkCreate.size} căn hộ đã chọn
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedUnitsForBulkCreate.size === unitsWithoutAsset.length && unitsWithoutAsset.length > 0}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mã căn hộ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tên căn hộ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tầng
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tòa nhà
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {unitsWithoutAsset.map((unit) => (
                        <tr key={unit.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedUnitsForBulkCreate.has(unit.id)}
                              onChange={() => toggleUnitSelection(unit.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {unit.code}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {unit.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              Tầng {unit.floor}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {unit.buildingCode || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => {
                                startCreate(unit.id, missingAssetsType, missingAssetsBuildingId);
                                setActiveTab('list'); // Switch to list tab to see the form
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              Tạo thiết bị
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Bulk Create Form Modal */}
          {showBulkCreateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-visible relative z-[10000]">
                <div className="p-6 relative overflow-y-auto max-h-[85vh]">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Tạo thiết bị cho {selectedUnitsForBulkCreate.size} căn hộ
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Loại thiết bị: <span className="font-medium">{ASSET_TYPE_LABELS[missingAssetsType]}</span>
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tiền tố mã thiết bị
                        <span className="ml-2 text-xs text-gray-500 font-normal">(Tạo sẵn, có thể sửa)</span>
                      </label>
                      <input
                        type="text"
                        value={bulkCreateForm.assetCodePrefix || (missingAssetsType ? ASSET_TYPE_PREFIX[missingAssetsType] : '')}
                        onChange={(e) => setBulkCreateForm({ ...bulkCreateForm, assetCodePrefix: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="VD: AC (sẽ tạo AC-A101, AC-A102, ...)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Mã thiết bị sẽ được tạo: <span className="font-medium">{bulkCreateForm.assetCodePrefix || (missingAssetsType ? ASSET_TYPE_PREFIX[missingAssetsType] : '')}</span>-[Mã căn hộ]
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tên thiết bị
                          <span className="ml-2 text-xs text-gray-500 font-normal">(Tạo sẵn, có thể sửa)</span>
                        </label>
                        <input
                          type="text"
                          value={bulkCreateForm.name || ASSET_TYPE_LABELS[missingAssetsType]}
                          onChange={(e) => setBulkCreateForm({ ...bulkCreateForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="VD: Điều hòa phòng khách"
                        />
                      </div>

                      <div className="relative z-[10001]">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ngày lắp đặt
                        </label>
                        <input
                          type="date"
                          value={bulkCreateForm.installedAt}
                          onChange={(e) => setBulkCreateForm({ ...bulkCreateForm, installedAt: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 relative z-[10001]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Giá mua mỗi thiết bị (VND)
                        <span className="ml-2 text-xs text-gray-500 font-normal">(Tạo sẵn, có thể sửa)</span>
                      </label>
                      <input
                        type="text"
                        value={formatNumberWithDots(bulkCreateForm.purchasePrice || ASSET_TYPE_DEFAULT_PRICE[missingAssetsType])}
                        onChange={(e) => {
                          const parsed = parseFormattedNumber(e.target.value);
                          setBulkCreateForm({ ...bulkCreateForm, purchasePrice: parsed || ASSET_TYPE_DEFAULT_PRICE[missingAssetsType] });
                        }}
                        onBlur={(e) => {
                          const parsed = parseFormattedNumber(e.target.value);
                          setBulkCreateForm({ ...bulkCreateForm, purchasePrice: parsed || ASSET_TYPE_DEFAULT_PRICE[missingAssetsType] });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="VD: 5.000.000"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Giá mua cho mỗi thiết bị sẽ được áp dụng cho tất cả {selectedUnitsForBulkCreate.size} căn hộ
                      </p>
                    </div>

                    {(bulkCreateForm.purchasePrice || ASSET_TYPE_DEFAULT_PRICE[missingAssetsType]) > 0 && selectedUnitsForBulkCreate.size > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-blue-900">
                            Tổng giá tiền:
                          </span>
                          <span className="text-lg font-bold text-blue-600">
                            {formatNumberWithDots((bulkCreateForm.purchasePrice || ASSET_TYPE_DEFAULT_PRICE[missingAssetsType]) * selectedUnitsForBulkCreate.size)} VND
                          </span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1">
                          ({formatNumberWithDots(bulkCreateForm.purchasePrice || ASSET_TYPE_DEFAULT_PRICE[missingAssetsType])} VND × {selectedUnitsForBulkCreate.size} căn hộ)
                        </p>
                      </div>
                    )}

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="bulkActive"
                        checked={bulkCreateForm.active}
                        onChange={(e) => setBulkCreateForm({ ...bulkCreateForm, active: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="bulkActive" className="ml-2 text-sm text-gray-700">
                        Đang hoạt động
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleBulkCreateAssets}
                      disabled={bulkCreating}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {bulkCreating ? `Đang tạo ${selectedUnitsForBulkCreate.size} thiết bị...` : 'Tạo thiết bị'}
                    </button>
                    <button
                      onClick={() => {
                        setShowBulkCreateForm(false);
                        setBulkCreateForm({
                          assetCodePrefix: missingAssetsType ? ASSET_TYPE_PREFIX[missingAssetsType] : '',
                          name: missingAssetsType ? ASSET_TYPE_LABELS[missingAssetsType] : '',
                          installedAt: '',
                          active: true,
                          purchasePrice: missingAssetsType ? ASSET_TYPE_DEFAULT_PRICE[missingAssetsType] : 0,
                        });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create All Units Confirmation Modal */}
      {showCreateAllConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 relative z-[10000]">
            <div className="p-6">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    Xác nhận tạo thiết bị tự động
                  </h3>
                </div>
              </div>

              <div className="mb-6 space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm font-medium text-yellow-800 mb-2">
                    ⚠️ Cảnh báo: Bạn sắp tạo thiết bị cho tất cả căn hộ trong tòa nhà
                  </p>
                  <div className="text-sm text-yellow-700 space-y-1">
                    <p><strong>Tòa nhà:</strong> {buildings.find(b => b.id === missingAssetsBuildingId)?.code}</p>
                    <p><strong>Số căn hộ:</strong> {unitsWithoutAsset.length} căn hộ</p>
                    <p><strong>Loại thiết bị:</strong> {ASSET_TYPE_LABELS[missingAssetsType]}</p>
                    <p><strong>Ngày lắp đặt:</strong> {new Date().toLocaleDateString('vi-VN')} (hôm nay)</p>
                    <p><strong>Giá mua mỗi thiết bị:</strong> {formatNumberWithDots(ASSET_TYPE_DEFAULT_PRICE[missingAssetsType])} VND</p>
                    <p className="mt-2 pt-2 border-t border-yellow-300">
                      <strong>Tổng số tiền:</strong> <span className="text-red-600 font-bold text-base">
                        {formatNumberWithDots(ASSET_TYPE_DEFAULT_PRICE[missingAssetsType] * unitsWithoutAsset.length)} VND
                      </span>
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Hệ thống sẽ tự động tạo thiết bị với mã, tên, giá mua và ngày lắp đặt theo mặc định cho tất cả căn hộ chưa có thiết bị này.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCreateAllConfirm(false)}
                  disabled={creatingAll}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateAllUnitsInBuilding}
                  disabled={creatingAll}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {creatingAll ? 'Đang tạo...' : `Xác nhận tạo ${unitsWithoutAsset.length} thiết bị`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
