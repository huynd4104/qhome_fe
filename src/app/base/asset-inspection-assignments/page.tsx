'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { useNotifications } from '@/src/hooks/useNotifications';
import {
  AssetInspection,
  InspectionStatus,
  getAllInspections,
  getInspectionByContractId,
  getInspectionById,
  startInspection,
  updateInspectionItem,
  completeInspection,
  generateInvoice,
  recalculateDamageCost,
  type UpdateAssetInspectionItemRequest,
} from '@/src/services/base/assetInspectionService';
import { updateInvoiceStatus, getAllInvoicesForAdmin, getInvoiceById, type InvoiceDto } from '@/src/services/finance/invoiceAdminService';
import { getActivePricingTiersByService, type PricingTierDto } from '@/src/services/finance/pricingTierService';
import {
  getMetersByUnit,
  createMeterReading,
  getReadingCyclesByStatus,
  getAssignmentsByStaff,
  createMeterReadingAssignment,
  exportReadingsByCycle,
  type MeterDto,
  type MeterReadingCreateReq,
  type ReadingCycleDto,
  type MeterReadingAssignmentDto,
  type MeterReadingAssignmentCreateReq,
} from '@/src/services/base/waterService';
import { fetchContractDetail } from '@/src/services/base/contractService';
import { getUnit } from '@/src/services/base/unitService';
import { getAssetsByUnit, getAssetById } from '@/src/services/base/assetService';
import { type Asset } from '@/src/types/asset';

export default function TechnicianInspectionAssignmentsPage() {
  const { user, hasRole, isLoading } = useAuth();
  const { show } = useNotifications();
  const router = useRouter();
  const t = useTranslations('TechnicianInspections');

  // Check user roles - ADMIN and TECHNICIAN can view
  const isAdmin = hasRole('ADMIN') || hasRole('admin') || hasRole('ROLE_ADMIN') || hasRole('ROLE_admin');
  const isTechnician = hasRole('TECHNICIAN') || hasRole('technician') || hasRole('ROLE_TECHNICIAN') || hasRole('ROLE_technician');
  const canView = isAdmin || isTechnician;

  const [loading, setLoading] = useState(false);
  const [inspections, setInspections] = useState<AssetInspection[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<AssetInspection | null>(null);
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [inspectorNotes, setInspectorNotes] = useState('');

  // Meter reading states
  const [unitMeters, setUnitMeters] = useState<MeterDto[]>([]);
  const [loadingMeters, setLoadingMeters] = useState(false);
  const [meterReadings, setMeterReadings] = useState<Record<string, { index: string; note?: string }>>({});
  const [meterReadingErrors, setMeterReadingErrors] = useState<Record<string, string>>({});
  const [readingDate, setReadingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeCycle, setActiveCycle] = useState<ReadingCycleDto | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<MeterReadingAssignmentDto | null>(null);

  // Unit assets (for preview when items not yet created)
  const [unitAssets, setUnitAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Map of assetId to Asset for quick lookup
  const [assetsMap, setAssetsMap] = useState<Record<string, Asset>>({});

  // Temporary inspection data (before items are created)
  const [tempInspectionData, setTempInspectionData] = useState<Record<string, { conditionStatus: string; notes: string; repairCost?: number }>>({});

  // Water/Electric invoices state
  const [waterElectricInvoices, setWaterElectricInvoices] = useState<InvoiceDto[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Main inspection invoice (includes damage + water/electric)
  const [mainInvoice, setMainInvoice] = useState<InvoiceDto | null>(null);
  const [loadingMainInvoice, setLoadingMainInvoice] = useState(false);

  // Pricing tiers and calculated prices
  const [pricingTiers, setPricingTiers] = useState<Record<string, PricingTierDto[]>>({});
  const [calculatedPrices, setCalculatedPrices] = useState<Record<string, number>>({}); // meterId -> calculated price

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

    if (user?.userId) {
      loadMyInspections();
    }
  }, [isLoading, canView, user?.userId, show, router]);

  // Load main invoice when inspection has invoiceId
  useEffect(() => {
    if (selectedInspection?.invoiceId) {
      loadMainInvoice(selectedInspection.invoiceId);
    } else {
      setMainInvoice(null);
    }
  }, [selectedInspection?.invoiceId]);

  // Load water/electric invoices when inspection is completed
  // Load even if main invoice exists, in case main invoice doesn't have water/electric lines yet
  useEffect(() => {
    if (selectedInspection?.unitId && selectedInspection?.status === InspectionStatus.COMPLETED) {
      // Always try to load separate invoices, even if main invoice exists
      // This ensures we have fallback if main invoice doesn't have water/electric lines
      // IMPORTANT: Only load invoices from THIS inspection (filtered by "Đo cùng với kiểm tra thiết bị" in description)
      loadWaterElectricInvoices(selectedInspection.unitId, activeCycle?.id);
    } else if (selectedInspection?.status !== InspectionStatus.COMPLETED) {
      // Only reset if inspection is not completed
      // This prevents resetting invoices when updating items in a completed inspection
      setWaterElectricInvoices([]);
    }
  }, [selectedInspection?.unitId, selectedInspection?.status, activeCycle?.id]);

  const loadMyInspections = async () => {
    if (!user?.userId) return;

    setLoading(true);
    try {
      // Load only inspections assigned to this technician
      const data = await getAllInspections(user?.userId);
      setInspections(data);
    } catch (error: any) {
      show(error?.response?.data?.message || error?.message || t('errors.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUnitMeters = async (unitId: string): Promise<MeterDto[]> => {
    if (!unitId) return [];
    setLoadingMeters(true);
    try {
      const meters = await getMetersByUnit(unitId);
      const activeMeters = meters.filter(m => m.active);
      setUnitMeters(activeMeters);

      const readings: Record<string, { index: string; note?: string }> = {};
      activeMeters.forEach(meter => {
        readings[meter.id] = { index: '' };
      });
      setMeterReadings(readings);
      return activeMeters;
    } catch (error: any) {
      setUnitMeters([]);
      return [];
    } finally {
      setLoadingMeters(false);
    }
  };

  const loadUnitAssets = async (unitId: string) => {
    if (!unitId) return;
    setLoadingAssets(true);
    try {
      const assets = await getAssetsByUnit(unitId);
      // Filter only active assets
      const activeAssets = assets.filter(a => a.active);
      setUnitAssets(activeAssets);

      // Create a map for quick lookup by assetId
      const map: Record<string, Asset> = {};
      activeAssets.forEach(asset => {
        map[asset.id] = asset;
        if (asset.assetCode) {
          map[asset.assetCode] = asset;
        }
      });
      setAssetsMap(map);
    } catch (error: any) {
      setUnitAssets([]);
      setAssetsMap({});
    } finally {
      setLoadingAssets(false);
    }
  };

  // Load individual asset if not found in unitAssets
  const loadAssetIfNeeded = async (assetId: string) => {
    if (!assetId || assetsMap[assetId]) return assetsMap[assetId];

    try {
      const asset = await getAssetById(assetId);
      if (asset) {
        setAssetsMap(prev => ({ ...prev, [assetId]: asset }));
        // Also add to unitAssets if not already there
        setUnitAssets(prev => {
          if (!prev.find(a => a.id === assetId)) {
            return [...prev, asset];
          }
          return prev;
        });
        return asset;
      }
    } catch (error: any) {
      // Asset not found
    }
    return null;
  };

  const loadActiveCycleAndAssignment = async (technicianId: string, unitId?: string, meters?: MeterDto[]) => {
    if (!technicianId) return;
    try {
      const openCycles = await getReadingCyclesByStatus('OPEN');
      const inProgressCycles = await getReadingCyclesByStatus('IN_PROGRESS');
      const activeCycles = [...openCycles, ...inProgressCycles];

      if (activeCycles.length > 0) {
        const cycle = activeCycles[0];
        setActiveCycle(cycle);

        const assignments = await getAssignmentsByStaff(technicianId);
        // Try to find assignment that matches cycle and building of meters
        let assignment = null;

        if (meters && meters.length > 0) {
          // Get buildingIds from meters
          const meterBuildingIds = [...new Set(meters.map(m => m.buildingId).filter(Boolean))];

          // Try to find assignment matching cycle and building
          assignment = assignments.find(a =>
            a.cycleId === cycle.id &&
            !a.completedAt &&
            (meterBuildingIds.length === 0 || meterBuildingIds.includes(a.buildingId || ''))
          );
        } else {
          // If no meters, just find any assignment for this cycle
          assignment = assignments.find(a => a.cycleId === cycle.id && !a.completedAt);
        }

        // If no assignment exists and we have unitId and meters, try to create one automatically
        if (!assignment && unitId && meters && meters.length > 0) {
          try {
            // Get unique serviceIds from meters
            const serviceIds = [...new Set(meters.map(m => m.serviceId).filter(Boolean))];

            // Get buildingId from meters - check if all meters have the same buildingId
            const buildingIds = [...new Set(meters.map(m => m.buildingId).filter(Boolean))];
            const buildingId = buildingIds.length === 1 ? buildingIds[0] : meters[0]?.buildingId;

            // Use first buildingId if meters have different buildings

            // Create assignment for each service (or first service if multiple)
            if (serviceIds.length > 0 && cycle.id && buildingId) {
              const serviceId = serviceIds[0]; // Use first service, or create multiple if needed

              const createReq: MeterReadingAssignmentCreateReq = {
                cycleId: cycle.id,
                serviceId: serviceId,
                assignedTo: technicianId,
                buildingId: buildingId,
                unitIds: [unitId],
              };

              const newAssignment = await createMeterReadingAssignment(createReq);
              assignment = newAssignment;
              show(t('success.assignmentCreated', { defaultValue: 'Đã tự động tạo assignment cho chu kỳ này' }), 'success');
            }
          } catch (createError: any) {
            // Failed to auto-create assignment, continue without it
          }
        }

        if (assignment) {
          setActiveAssignment(assignment);
        }
      }
    } catch (error: any) {
      // Failed to load active cycle/assignment
    }
  };

  // Calculate price based on usage and pricing tiers
  // Logic matches backend: PricingTierService.calculateInvoiceLines()
  const calculatePriceFromUsage = (usage: number, serviceCode: string): number => {
    const tiers = pricingTiers[serviceCode] || [];
    if (tiers.length === 0) {
      return 0;
    }

    // Sort tiers by tierOrder
    const sortedTiers = [...tiers].sort((a, b) => a.tierOrder - b.tierOrder);

    let totalPrice = 0;
    let previousMax = 0; // Track the upper bound of previous tier

    for (const tier of sortedTiers) {
      if (previousMax >= usage) {
        break; // All usage has been covered
      }

      const maxQty = tier.maxQuantity;
      const unitPrice = tier.unitPrice || 0;

      // Calculate effective max for this tier
      let tierEffectiveMax: number;
      if (maxQty === null || maxQty === undefined) {
        // Last tier (no max) - use all remaining usage
        tierEffectiveMax = usage;
      } else {
        // Tier has max quantity - use min of usage and maxQty
        tierEffectiveMax = Math.min(usage, maxQty);
      }

      // Calculate applicable quantity for this tier
      const applicableQuantity = Math.max(0, tierEffectiveMax - previousMax);

      if (applicableQuantity > 0) {
        totalPrice += applicableQuantity * unitPrice;
        previousMax = tierEffectiveMax; // Update for next tier
      }
    }

    return totalPrice;
  };

  // Load pricing tiers for water and electric services
  const loadPricingTiers = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [waterTiers, electricTiers] = await Promise.all([
        getActivePricingTiersByService('WATER', today).catch(() => []),
        getActivePricingTiersByService('ELECTRIC', today).catch(() => [])
      ]);

      setPricingTiers({
        WATER: waterTiers,
        ELECTRIC: electricTiers
      });
    } catch (error) {
      // Silently fail - pricing tiers are optional
    }
  };

  // Calculate prices when meter readings change
  // But preserve calculatedPrices if inspection is completed (to avoid reset)
  useEffect(() => {
    // Don't calculate if inspection is already completed - use actual invoices instead
    // Also preserve existing calculatedPrices if they exist and inspection is completed
    const isCompleted = selectedInspection?.status === InspectionStatus.COMPLETED;

    if (isCompleted) {
      // If we already have calculatedPrices, keep them (they might be needed until invoices load)
      // Only reset if we don't have any calculated prices
      if (Object.keys(calculatedPrices).length === 0) {
        // No calculated prices to preserve, but don't calculate new ones either
        return;
      }
      // Keep existing calculatedPrices - don't recalculate
      return;
    }

    if (Object.keys(pricingTiers).length === 0) {
      // Don't reset calculatedPrices if inspection is completed
      if (!isCompleted) {
        setCalculatedPrices({});
      }
      return;
    }

    const newCalculatedPrices: Record<string, number> = {};

    unitMeters.forEach(meter => {
      const reading = meterReadings[meter.id];
      if (!reading?.index) return;

      const currentIndex = parseFloat(reading.index);
      if (isNaN(currentIndex)) return;

      const prevIndex = meter.lastReading !== null && meter.lastReading !== undefined ? meter.lastReading : 0;

      // Ensure usage is valid and not negative
      if (currentIndex < prevIndex) return;

      const usage = currentIndex - prevIndex;

      // Validate usage - should be reasonable (less than 1 million for water/electric)
      // This prevents calculation errors from showing huge numbers
      if (usage > 0 && usage < 1000000) {
        // Normalize serviceCode - handle both uppercase and lowercase, and variations
        let serviceCode = (meter.serviceCode || '').toUpperCase();

        // Map variations to standard codes
        if (serviceCode.includes('ELECTRIC') || serviceCode.includes('ĐIỆN') || meter.serviceName?.toLowerCase().includes('điện')) {
          serviceCode = 'ELECTRIC';
        } else if (serviceCode.includes('WATER') || serviceCode.includes('NƯỚC') || meter.serviceName?.toLowerCase().includes('nước')) {
          serviceCode = 'WATER';
        }

        if (serviceCode === 'ELECTRIC' || serviceCode === 'WATER') {
          const price = calculatePriceFromUsage(usage, serviceCode);
          // Validate price - should be reasonable (less than 100 million VND)
          if (price > 0 && price < 100000000) {
            newCalculatedPrices[meter.id] = price;
          }
        }
      }
    });

    setCalculatedPrices(newCalculatedPrices);
  }, [meterReadings, unitMeters, pricingTiers, selectedInspection?.status, selectedInspection?.invoiceId]);

  const loadMainInvoice = async (invoiceId: string) => {
    if (!invoiceId) return;

    setLoadingMainInvoice(true);
    try {
      const invoice = await getInvoiceById(invoiceId);
      setMainInvoice(invoice);

      // Log invoice details for debugging
      if (invoice && invoice.lines) {
        const waterElectricLines = invoice.lines.filter(line =>
          line.serviceCode === 'WATER' || line.serviceCode === 'ELECTRIC'
        );
      }
    } catch (error: any) {
      setMainInvoice(null);
    } finally {
      setLoadingMainInvoice(false);
    }
  };

  const loadWaterElectricInvoices = async (unitId: string, cycleId?: string) => {
    if (!unitId) return;

    setLoadingInvoices(true);
    try {
      // Load invoices for WATER and ELECTRIC services
      const [waterInvoices, electricInvoices] = await Promise.all([
        getAllInvoicesForAdmin({ unitId, serviceCode: 'WATER' }).catch(() => []),
        getAllInvoicesForAdmin({ unitId, serviceCode: 'ELECTRIC' }).catch(() => [])
      ]);

      // Combine all water/electric invoices
      let allInvoices = [...waterInvoices, ...electricInvoices];

      // IMPORTANT: Only include invoices from THIS inspection
      // Filter by description containing "Đo cùng với kiểm tra thiết bị"
      // This ensures we only show water/electric invoices created during this inspection
      const inspectionMarker = 'Đo cùng với kiểm tra thiết bị';
      allInvoices = allInvoices.filter(inv => {
        if (!inv.lines || inv.lines.length === 0) return false;
        // Check if any line has the inspection marker in description
        return inv.lines.some(line =>
          line.description && line.description.includes(inspectionMarker)
        );
      });

      // If cycleId is provided, also filter by cycleId as additional filter
      // (But the description filter above should be the primary filter)
      if (cycleId && allInvoices.length > 0) {
        const filteredByCycle = allInvoices.filter(inv => inv.cycleId === cycleId);
        // Only use filtered results if we found invoices matching the cycle
        // Otherwise, use invoices filtered by description only
        if (filteredByCycle.length > 0) {
          allInvoices = filteredByCycle;
        }
      }

      // Also try to load invoices without serviceCode filter to catch any missed ones
      // But still filter by inspection marker to only get invoices from this inspection
      if (allInvoices.length === 0) {
        try {
          const allUnitInvoices = await getAllInvoicesForAdmin({ unitId });
          const waterElectricOnly = allUnitInvoices.filter(inv => {
            const serviceCodes = inv.lines?.map(line => line.serviceCode) || [];
            const hasWaterOrElectric = serviceCodes.includes('WATER') || serviceCodes.includes('ELECTRIC');
            // Also check if invoice is from this inspection (has "Đo cùng với kiểm tra thiết bị" in description)
            const isFromInspection = inv.lines?.some(line =>
              line.description && line.description.includes(inspectionMarker)
            ) || false;
            return hasWaterOrElectric && isFromInspection;
          });

          // If cycleId provided and we have invoices, try to filter, but fallback to inspection-filtered invoices if no match
          if (cycleId && waterElectricOnly.length > 0) {
            const filteredByCycle = waterElectricOnly.filter(inv => inv.cycleId === cycleId);
            allInvoices = filteredByCycle.length > 0 ? filteredByCycle : waterElectricOnly;
          } else {
            allInvoices = waterElectricOnly;
          }
        } catch (err) {
          // Ignore error, use what we have
        }
      }

      setWaterElectricInvoices(allInvoices);
    } catch (error: any) {
      setWaterElectricInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleOpenInspection = async (inspection: AssetInspection) => {
    setInspectionModalOpen(true);
    setInspectorNotes(inspection.inspectorNotes || '');
    setMeterReadings({});
    setReadingDate(new Date().toISOString().split('T')[0]);
    setActiveCycle(null);
    setActiveAssignment(null);
    // Clear assets map when opening new inspection
    setAssetsMap({});
    setUnitAssets([]);
    setWaterElectricInvoices([]);

    // Load assets FIRST before loading inspection details
    if (inspection.unitId) {
      await loadUnitAssets(inspection.unitId);
      const meters = await loadUnitMeters(inspection.unitId);

      // Load pricing tiers for price calculation
      await loadPricingTiers();

      if (user?.userId) {
        // Pass unitId and meters to auto-create assignment if needed
        await loadActiveCycleAndAssignment(user.userId, inspection.unitId, meters);
      }
    }

    // Reload inspection with full details including items AFTER assets are loaded
    try {
      const fullInspection = await getInspectionByContractId(inspection.contractId);
      if (fullInspection) {
        setSelectedInspection(fullInspection);
        // Update inspector notes if available
        if (fullInspection.inspectorNotes) {
          setInspectorNotes(fullInspection.inspectorNotes);
        }
      } else {
        // Fallback to the inspection from list if API fails
        setSelectedInspection(inspection);
      }
    } catch (error: any) {
      // Fallback to the inspection from list if API fails
      setSelectedInspection(inspection);
    }
  };

  const handleStartInspection = async () => {
    if (!selectedInspection) return;

    // Validate inspection date - cannot start inspection before inspectionDate
    if (selectedInspection.inspectionDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const inspectionDate = new Date(selectedInspection.inspectionDate);
      inspectionDate.setHours(0, 0, 0, 0);

      if (today < inspectionDate) {
        show(t('errors.cannotStartBeforeDate', {
          date: formatDate(selectedInspection.inspectionDate),
          defaultValue: `Chưa thể thực hiện kiểm tra. Ngày kiểm tra dự kiến: ${formatDate(selectedInspection.inspectionDate)}`
        }), 'error');
        return;
      }
    }

    try {
      const updated = await startInspection(selectedInspection.id);
      setSelectedInspection(updated);
      await loadMyInspections();
      show(t('success.startInspection'), 'success');

      // Retry loading inspection with items multiple times
      let retryCount = 0;
      const maxRetries = 5;
      const retryInterval = 2000; // 2 seconds

      const retryLoadItems = async () => {
        try {
          // Try by contract ID first (more reliable)
          let fullInspection = await getInspectionByContractId(selectedInspection.contractId);

          // If that fails, try by ID (but handle errors gracefully)
          if (!fullInspection) {
            try {
              fullInspection = await getInspectionById(updated.id);
            } catch (err) {
              // Ignore errors from getInspectionById, continue with contract-based lookup
            }
          }

          if (fullInspection && fullInspection.items && fullInspection.items.length > 0) {
            setSelectedInspection(fullInspection);
            show(t('success.itemsLoaded', { count: fullInspection.items.length, defaultValue: `Đã tải ${fullInspection.items.length} thiết bị` }), 'success');
            return;
          }

          retryCount++;
          if (retryCount < maxRetries) {
            setTimeout(retryLoadItems, retryInterval);
          } else {
            // Keep the updated inspection but show a message
            show(t('warnings.itemsNotReady', { defaultValue: 'Danh sách thiết bị đang được tạo. Vui lòng nhấn "Làm mới" sau vài giây.' }), 'info');
          }
        } catch (error: any) {
          retryCount++;
          if (retryCount < maxRetries) {
            setTimeout(retryLoadItems, retryInterval);
          }
        }
      };

      // Start retrying after initial delay
      setTimeout(retryLoadItems, 1000);
    } catch (error: any) {
      show(error?.response?.data?.message || error?.message || t('errors.startFailed'), 'error');
    }
  };

  const handleUpdateInspectionItem = async (itemId: string, conditionStatus: string, notes: string, repairCost?: number) => {
    if (!selectedInspection) return;
    try {
      // Build request object - only include fields that have values
      // NOTE: Do NOT set checked: true here - it will auto-complete inspection
      // Only set checked when user explicitly completes inspection
      const request: UpdateAssetInspectionItemRequest = {
        // checked: true, // REMOVED - will be set when completing inspection
      };

      // CRITICAL: Always include conditionStatus if provided (even if empty string)
      // Backend requires conditionStatus to calculate damageCost
      // If conditionStatus is empty string or null, backend will not save it
      if (conditionStatus !== undefined && conditionStatus !== null && conditionStatus.trim() !== '') {
        request.conditionStatus = conditionStatus.trim();
      } else {
        // Don't proceed with update if conditionStatus is missing - it's required!
        show(t('errors.conditionStatusRequired', { defaultValue: 'Vui lòng chọn tình trạng thiết bị trước khi lưu!' }), 'error');
        return;
      }

      // Include notes if provided
      if (notes && notes.trim() !== '') {
        request.notes = notes.trim();
      }

      // Always include damageCost if repairCost is provided (even if 0)
      // Backend will auto-calculate if not provided, but we want to use the technician's value
      if (repairCost !== undefined && repairCost !== null) {
        request.damageCost = repairCost;
      }
      // If repairCost is not provided but conditionStatus is not GOOD, backend will auto-calculate

      // CRITICAL: Verify conditionStatus is in request
      if (!request.conditionStatus) {
        show(t('errors.conditionStatusRequired', { defaultValue: 'Lỗi: Tình trạng thiết bị không được gửi. Vui lòng thử lại!' }), 'error');
        return;
      }

      const updatedItem = await updateInspectionItem(itemId, request);

      // Reload inspection to get updated totalDamageCost
      // Backend might need a moment to recalculate totalDamageCost, so we'll retry a few times
      let updated: AssetInspection | null = null;
      let retryCount = 0;
      const maxRetries = 3;
      const retryDelay = 500; // 500ms delay between retries

      while (retryCount < maxRetries && !updated) {
        try {
          const reloaded = await getInspectionByContractId(selectedInspection.contractId);
          if (reloaded) {
            const updatedItem = reloaded.items?.find(i => i.id === itemId);
            const expectedCost = repairCost !== undefined && repairCost !== null ? repairCost : 0;
            // Use robust cost extraction - prioritize repairCost, fallback to damageCost
            const actualCost = updatedItem
              ? (updatedItem.repairCost !== undefined && updatedItem.repairCost !== null
                ? updatedItem.repairCost
                : (updatedItem.damageCost !== undefined && updatedItem.damageCost !== null ? updatedItem.damageCost : 0))
              : 0;

            // Check if the cost was updated correctly
            // Also check all items to ensure they're properly mapped
            const allItemsHaveCosts = reloaded.items?.every(item => {
              const hasRepairCost = item.repairCost !== undefined && item.repairCost !== null;
              const hasDamageCost = item.damageCost !== undefined && item.damageCost !== null;
              return hasRepairCost || hasDamageCost || item.conditionStatus === 'GOOD';
            });

            if (updatedItem && Math.abs(expectedCost - actualCost) < 0.01 && allItemsHaveCosts) {
              updated = reloaded;
              break;
            } else if (retryCount < maxRetries - 1) {
              // Cost doesn't match yet, wait and retry
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              retryCount++;
            } else {
              // Last retry, use what we have
              updated = reloaded;
            }
          }
        } catch (err) {
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      if (updated) {
        // Preserve modal state - don't close modal on update
        setSelectedInspection(updated);

        // Reload invoices if inspection is completed to ensure they're still displayed
        if (updated.status === InspectionStatus.COMPLETED) {
          if (updated.invoiceId) {
            // Reload main invoice
            loadMainInvoice(updated.invoiceId).catch(() => { });
          }
          if (updated.unitId) {
            // Reload water/electric invoices - only invoices from this inspection (filtered by description marker)
            loadWaterElectricInvoices(updated.unitId, activeCycle?.id).catch(() => { });
          }
        }

        // Calculate total from items to verify - use robust cost extraction
        const calculatedTotal = updated.items?.reduce((sum, item) => {
          const cost = item.repairCost !== undefined && item.repairCost !== null
            ? item.repairCost
            : (item.damageCost !== undefined && item.damageCost !== null ? item.damageCost : 0);
          return sum + cost;
        }, 0) || 0;

        // Reload list in background (don't await to avoid blocking)
        loadMyInspections().catch(() => { });

        // Reload assets to ensure purchasePrice is up to date (don't await to avoid blocking)
        if (updated.unitId) {
          loadUnitAssets(updated.unitId).catch(() => { });
        }
      }
      show(t('success.updateItem', { defaultValue: 'Cập nhật thiết bị thành công' }), 'success');
    } catch (error: any) {
      show(error?.response?.data?.message || error?.message || t('errors.updateFailed'), 'error');
    }
  };

  const handleCompleteInspection = async () => {
    if (!selectedInspection) return;

    // VALIDATION 1: All items must have conditionStatus
    const itemsWithoutStatus = selectedInspection.items?.filter(item =>
      !item.conditionStatus || item.conditionStatus.trim() === ''
    ) || [];

    if (itemsWithoutStatus.length > 0) {
      show(
        t('errors.itemsMissingStatus', {
          count: itemsWithoutStatus.length,
          defaultValue: `Vui lòng cập nhật tình trạng cho ${itemsWithoutStatus.length} thiết bị trước khi hoàn thành kiểm tra!`
        }),
        'error'
      );
      return;
    }

    // VALIDATION 2: Items with non-GOOD status must have damageCost > 0
    const itemsWithInvalidCost = selectedInspection.items?.filter(item => {
      if (item.conditionStatus === 'GOOD') return false; // GOOD items don't need cost
      const cost = item.repairCost || item.damageCost || 0;
      return cost <= 0;
    }) || [];

    if (itemsWithInvalidCost.length > 0) {
      show(
        t('errors.itemsInvalidCost', {
          count: itemsWithInvalidCost.length,
          defaultValue: `Vui lòng nhập chi phí thiệt hại > 0 cho ${itemsWithInvalidCost.length} thiết bị có tình trạng không tốt!`
        }),
        'error'
      );
      return;
    }

    // VALIDATION 3: Meter readings validation - check if there are any errors
    if (Object.keys(meterReadingErrors).length > 0) {
      show(
        t('errors.meterReadingErrors', {
          defaultValue: 'Vui lòng sửa các lỗi trong chỉ số đồng hồ trước khi hoàn thành kiểm tra!'
        }),
        'error'
      );
      return;
    }

    // VALIDATION 4: If meter readings are provided, validate they are greater than previous index
    if (unitMeters.length > 0) {
      const invalidReadings: string[] = [];

      unitMeters.forEach(meter => {
        const reading = meterReadings[meter.id];
        if (reading?.index && reading.index.trim() !== '') {
          const currentIndex = parseFloat(reading.index);
          const prevIndex = meter.lastReading !== null && meter.lastReading !== undefined ? meter.lastReading : 0;

          if (isNaN(currentIndex)) {
            invalidReadings.push(`${meter.meterCode}: ${t('errors.invalidNumber', { defaultValue: 'Số không hợp lệ' })}`);
          } else if (currentIndex < 0) {
            invalidReadings.push(`${meter.meterCode}: ${t('errors.invalidIndex', { defaultValue: 'Chỉ số phải lớn hơn hoặc bằng 0' })}`);
          } else if (currentIndex < prevIndex) {
            invalidReadings.push(`${meter.meterCode}: ${t('errors.indexMustBeGreater', {
              prevIndex: prevIndex,
              defaultValue: `Chỉ số hiện tại (${currentIndex}) phải lớn hơn chỉ số trước (${prevIndex})`
            })}`);
          } else if (currentIndex === prevIndex) {
            invalidReadings.push(`${meter.meterCode}: ${t('errors.indexMustBeGreaterThan', {
              prevIndex: prevIndex,
              defaultValue: `Chỉ số hiện tại (${currentIndex}) phải lớn hơn chỉ số trước (${prevIndex}). Chỉ số không thể bằng chỉ số trước.`
            })}`);
          }
        }
      });

      if (invalidReadings.length > 0) {
        show(
          t('errors.meterReadingValidationFailed', {
            errors: invalidReadings.join('; '),
            defaultValue: `Lỗi chỉ số đồng hồ: ${invalidReadings.join('; ')}`
          }),
          'error'
        );
        return;
      }
    }

    // VALIDATION 5: Validate reading date if provided
    if (readingDate) {
      const invalidReadings: string[] = [];
      unitMeters.forEach(meter => {
        const reading = meterReadings[meter.id];
        if (reading?.index && reading.index.trim() !== '') {
          const currentIndex = parseFloat(reading.index);
          if (!isNaN(currentIndex)) {
            const prevIndex = meter.lastReading !== null && meter.lastReading !== undefined ? meter.lastReading : 0;
            if (currentIndex < 0) {
              invalidReadings.push(`${meter.meterCode}: ${t('errors.invalidIndex', { defaultValue: 'Chỉ số phải >= 0' })}`);
            } else if (currentIndex <= prevIndex) {
              invalidReadings.push(`${meter.meterCode}: ${t('errors.indexMustBeGreater', {
                prevIndex: prevIndex,
                defaultValue: `Chỉ số hiện tại (${currentIndex}) phải lớn hơn chỉ số trước (${prevIndex})`
              })}`);
            }
          }
        }
      });

      if (invalidReadings.length > 0) {
        show(
          t('errors.meterReadingValidationFailed', {
            errors: invalidReadings.join('; '),
            defaultValue: `Lỗi chỉ số đồng hồ: ${invalidReadings.join('; ')}`
          }),
          'error'
        );
        return;
      }
    }

    // VALIDATION 3: All water/electric meters must have index > 0
    if (unitMeters.length > 0) {
      const metersWithoutReading: string[] = [];
      const metersWithInvalidReading: string[] = [];

      for (const meter of unitMeters) {
        const reading = meterReadings[meter.id];
        if (!reading || !reading.index || reading.index.trim() === '') {
          metersWithoutReading.push(meter.meterCode || meter.id);
        } else {
          const indexValue = parseFloat(reading.index);
          if (isNaN(indexValue) || indexValue <= 0) {
            metersWithInvalidReading.push(meter.meterCode || meter.id);
          }
        }
      }

      if (metersWithoutReading.length > 0) {
        show(
          t('errors.metersMissingReading', {
            count: metersWithoutReading.length,
            meters: metersWithoutReading.join(', '),
            defaultValue: `Vui lòng nhập chỉ số đồng hồ cho ${metersWithoutReading.length} đồng hồ: ${metersWithoutReading.join(', ')}!`
          }),
          'error'
        );
        return;
      }

      if (metersWithInvalidReading.length > 0) {
        show(
          t('errors.metersInvalidReading', {
            count: metersWithInvalidReading.length,
            meters: metersWithInvalidReading.join(', '),
            defaultValue: `Chỉ số đồng hồ phải > 0 cho ${metersWithInvalidReading.length} đồng hồ: ${metersWithInvalidReading.join(', ')}!`
          }),
          'error'
        );
        return;
      }
    }

    try {
      // Create meter readings if meters exist and readings are provided
      if (unitMeters.length > 0 && activeAssignment) {
        const readingPromises: Promise<any>[] = [];
        let successCount = 0;
        let errorCount = 0;

        for (const meter of unitMeters) {
          const reading = meterReadings[meter.id];
          if (reading && reading.index && reading.index.trim() !== '') {
            try {
              // Validate required fields
              if (!activeAssignment?.id) {
                errorCount++;
                continue;
              }

              if (!meter?.id) {
                errorCount++;
                continue;
              }

              const indexValue = parseFloat(reading.index);
              if (isNaN(indexValue) || indexValue < 0) {
                errorCount++;
                continue;
              }

              // Format readingDate to YYYY-MM-DD format (LocalDate)
              let formattedDate = readingDate;
              if (!formattedDate) {
                formattedDate = new Date().toISOString().split('T')[0];
              } else if (formattedDate.includes('T')) {
                // If it's ISO format, extract date part
                formattedDate = formattedDate.split('T')[0];
              }

              // Get previous reading index (lastReading from meter or 0)
              const prevIndex = meter.lastReading !== null && meter.lastReading !== undefined
                ? meter.lastReading
                : 0;

              // IMPORTANT: When creating meter readings from asset inspection, 
              // DO NOT include assignmentId because:
              // 1. Inspection may not be related to any assignment
              // 2. Meter's unit may not be in the assignment's scope
              // 3. Backend will validate assignment scope and reject if unit doesn't match
              // Only use cycleId to link readings to the cycle

              const readingReq: MeterReadingCreateReq = {
                // Do NOT include assignmentId - let backend handle assignment linking if needed
                meterId: meter.id,
                readingDate: formattedDate, // YYYY-MM-DD format for LocalDate
                prevIndex: prevIndex, // Can be omitted - backend will auto-calculate
                currIndex: indexValue,
                cycleId: activeCycle?.id, // Add cycleId to link to the cycle
                note: reading.note || `Đo cùng với kiểm tra thiết bị`,
              };

              // Validate request object
              if (!readingReq.meterId || !readingReq.readingDate || readingReq.currIndex === undefined || readingReq.prevIndex === undefined) {
                errorCount++;
                continue;
              }

              readingPromises.push(createMeterReading(readingReq));
              successCount++;
            } catch (err) {
              errorCount++;
            }
          }
        }

        if (readingPromises.length > 0) {
          try {
            await Promise.all(readingPromises);
            if (errorCount > 0) {
              show(t('errors.someReadingsFailed', { count: errorCount }), 'error');
            }

            // Don't generate invoices here - will be generated when completing inspection
          } catch (err) {
            show(t('errors.someReadingsFailed', { count: errorCount }), 'error');
          }
        }
      }

      // Reload inspection to get latest totalDamageCost before completing
      const latestInspection = await getInspectionByContractId(selectedInspection.contractId);
      const inspectionToUseForCheck = latestInspection || selectedInspection;

      if (inspectionToUseForCheck) {
        const itemsWithCost = inspectionToUseForCheck.items?.filter(item => {
          const cost = item.repairCost || item.damageCost || 0;
          return cost > 0;
        }) || [];

        const itemsWithoutStatus = inspectionToUseForCheck.items?.filter(item =>
          !item.conditionStatus || item.conditionStatus.trim() === ''
        ) || [];

        // CRITICAL: Check again before completing (in case items weren't updated)
        if (itemsWithoutStatus.length > 0) {
          show(
            t('errors.itemsMissingStatus', {
              count: itemsWithoutStatus.length,
              defaultValue: `Vui lòng cập nhật tình trạng cho ${itemsWithoutStatus.length} thiết bị trước khi hoàn thành kiểm tra!`
            }),
            'error'
          );
          return;
        }
      }

      // Before completing, mark all items as checked
      // This ensures backend knows all items are done
      // IMPORTANT: Include damageCost to preserve manual cost changes
      // Use latestInspection if available to get the most up-to-date costs
      if (inspectionToUseForCheck.items && inspectionToUseForCheck.items.length > 0) {
        const checkPromises = inspectionToUseForCheck.items.map(item => {
          // Get current cost - prioritize repairCost, fallback to damageCost
          const currentCost = item.repairCost !== undefined && item.repairCost !== null
            ? item.repairCost
            : (item.damageCost !== undefined && item.damageCost !== null ? item.damageCost : undefined);

          return updateInspectionItem(item.id, {
            checked: true,
            conditionStatus: item.conditionStatus, // Keep existing status
            notes: item.notes,
            // Include damageCost to preserve manual cost changes
            damageCost: currentCost !== undefined && currentCost !== null ? currentCost : undefined
          }).catch(() => { });
        });
        await Promise.all(checkPromises);
      }

      const updated = await completeInspection(selectedInspection.id, inspectorNotes);

      // Reload again to get updated totalDamageCost after complete
      const reloadedInspection = await getInspectionByContractId(selectedInspection.contractId);
      let inspectionToUse = reloadedInspection || updated;

      // IMPORTANT: Generate water/electric invoices FIRST before generating main invoice
      // This ensures water/electric invoices are available when main invoice is created
      let waterElectricInvoicesCreated = 0;
      if (activeCycle?.id && unitMeters.length > 0 && inspectionToUse.unitId) {
        // Check if we have meter readings
        const hasReadings = Object.values(meterReadings).some(r => r.index && r.index.trim() !== '');

        if (hasReadings) {
          try {
            // IMPORTANT: Only export readings for the inspection's unit, not all units in the cycle
            const importResponse = await exportReadingsByCycle(activeCycle.id, inspectionToUse.unitId);
            waterElectricInvoicesCreated = importResponse.invoicesCreated || 0;

            if (waterElectricInvoicesCreated > 0) {
              show(
                t('success.invoicesGenerated', {
                  count: waterElectricInvoicesCreated,
                  defaultValue: `Đã tự động tạo ${waterElectricInvoicesCreated} hóa đơn điện nước`
                }),
                'success'
              );

              // Wait a bit for invoices to be fully created in the database
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else if (importResponse.errors && importResponse.errors.length > 0) {
              // Show errors if invoices were not created
              const errorMessage = importResponse.errors.join('; ');
              show(
                `Không thể tạo hóa đơn điện nước: ${errorMessage}`,
                'error'
              );
            } else if (importResponse.invoicesSkipped && importResponse.invoicesSkipped > 0) {
              // Show info if some invoices were skipped
              show(
                `Đã xuất ${importResponse.totalReadings} chỉ số nhưng không tạo được ${importResponse.invoicesSkipped} hóa đơn. ${importResponse.message || ''}`,
                'info'
              );
            }
          } catch (invoiceError: any) {
            // Don't fail - inspection was completed successfully
            show(
              `Lỗi khi xuất hóa đơn điện nước: ${invoiceError?.response?.data?.message || invoiceError?.message || 'Lỗi không xác định'}`,
              'error'
            );
          }
        }
      }

      // Auto-generate invoice if there's damage cost
      // Now water/electric invoices should be available if they were created
      let finalInspection = inspectionToUse;

      // Check if we should generate invoice:
      // 1. Check totalDamageCost from backend
      // 2. Also check items directly in case totalDamageCost wasn't calculated yet
      const hasDamageCost = inspectionToUse.totalDamageCost && inspectionToUse.totalDamageCost > 0;
      const hasDamagedItems = inspectionToUse.items?.some(item => {
        const damageCost = item.damageCost !== undefined && item.damageCost !== null ? item.damageCost :
          (item.repairCost !== undefined && item.repairCost !== null ? item.repairCost : 0);
        return damageCost > 0;
      }) || false;

      // Try to recalculate damage cost if totalDamageCost is missing but we have damaged items
      if (!hasDamageCost && hasDamagedItems) {
        try {
          console.log('Recalculating damage cost for inspection:', inspectionToUse.id);
          const recalculated = await recalculateDamageCost(inspectionToUse.id);
          if (recalculated) {
            inspectionToUse = recalculated;
            finalInspection = recalculated;
          }
        } catch (recalcError: any) {
          console.error('Failed to recalculate damage cost:', recalcError);
          // Try to reload inspection one more time as fallback
          try {
            await new Promise(resolve => setTimeout(resolve, 500));
            const retryReload = await getInspectionByContractId(selectedInspection.contractId);
            if (retryReload) {
              inspectionToUse = retryReload;
              finalInspection = retryReload;
            }
          } catch (e) {
            // Ignore errors, continue with existing inspectionToUse
          }
        }
      }

      // Generate invoice if there's damage cost
      // Backend requires totalDamageCost > 0, so we must check it after recalculation
      const shouldGenerateInvoice = (
        inspectionToUse.totalDamageCost && inspectionToUse.totalDamageCost > 0
      ) && !inspectionToUse.invoiceId;

      console.log('Checking if should generate invoice:', {
        totalDamageCost: inspectionToUse.totalDamageCost,
        invoiceId: inspectionToUse.invoiceId,
        shouldGenerateInvoice,
      });

      if (shouldGenerateInvoice) {
        try {
          console.log('Generating invoice for inspection:', inspectionToUse.id);
          finalInspection = await generateInvoice(inspectionToUse.id);
          console.log('Invoice generated successfully:', finalInspection.invoiceId);

          // Reload one more time to get the invoiceId
          const finalReload = await getInspectionByContractId(selectedInspection.contractId);
          if (finalReload && finalReload.invoiceId) {
            finalInspection = finalReload;

            // Load main invoice details (includes damage + water/electric)
            try {
              await loadMainInvoice(finalReload.invoiceId);
            } catch (invoiceError: any) {
              console.warn('Failed to load main invoice details:', invoiceError);
              // Silently fail - invoice was created successfully
            }

            // Update invoice status to PAID for invoices generated from asset inspection
            try {
              await updateInvoiceStatus(finalReload.invoiceId, 'PAID');
            } catch (statusError: any) {
              console.warn('Failed to update invoice status to PAID:', statusError);
              // Silently fail - invoice was created successfully
            }
          } else {
            console.warn('Invoice was generated but invoiceId not found in reloaded inspection');
          }

          show(t('success.invoiceGenerated', { defaultValue: 'Đã tự động tạo hóa đơn cho thiệt hại thiết bị' }), 'success');
        } catch (invoiceError: any) {
          // Don't fail the whole operation if invoice generation fails
          console.error('Failed to generate invoice:', invoiceError);
          console.error('Error details:', {
            message: invoiceError?.message,
            response: invoiceError?.response?.data,
            status: invoiceError?.response?.status,
          });
          const errorMessage = invoiceError?.response?.data?.message ||
            invoiceError?.message ||
            t('warnings.invoiceGenerationFailed', { defaultValue: 'Đã hoàn thành kiểm tra nhưng không thể tạo hóa đơn tự động' });
          show(errorMessage, 'error');
        }
      } else {
        console.log('Skipping invoice generation:', {
          reason: !inspectionToUse.totalDamageCost || inspectionToUse.totalDamageCost <= 0
            ? 'No damage cost'
            : inspectionToUse.invoiceId
              ? 'Invoice already exists'
              : 'Unknown reason',
          totalDamageCost: inspectionToUse.totalDamageCost,
          invoiceId: inspectionToUse.invoiceId,
        });
      }

      // Preserve calculatedPrices before setting selectedInspection to avoid reset
      const preservedCalculatedPrices = { ...calculatedPrices };

      setSelectedInspection(finalInspection);
      await loadMyInspections();

      // Restore calculatedPrices if inspection is completed and we have preserved prices
      // This ensures prices are displayed until invoices are loaded
      // Use setTimeout to ensure state updates are processed first
      if (finalInspection.status === InspectionStatus.COMPLETED &&
        Object.keys(preservedCalculatedPrices).length > 0) {
        setTimeout(() => {
          // Check if we still need calculatedPrices (no main invoice and no separate invoices)
          setCalculatedPrices(prev => {
            // Only restore if we don't have invoices yet
            // If mainInvoice or waterElectricInvoices exist, they will be loaded by useEffect
            // So we only restore if calculatedPrices is empty
            if (Object.keys(prev).length === 0) {
              return preservedCalculatedPrices;
            }
            return prev;
          });
        }, 100);
      }

      // Reload water/electric invoices after completing inspection with retry logic
      if (finalInspection.unitId) {
        let retryCount = 0;
        const maxRetries = 5;

        const reloadInvoicesWithRetry = async () => {
          // Load water/electric invoices
          await loadWaterElectricInvoices(finalInspection.unitId!, activeCycle?.id);

          // Also reload main invoice if it exists
          if (finalInspection.invoiceId) {
            await loadMainInvoice(finalInspection.invoiceId);
          }

          // Check if we need to retry
          // We'll retry if no main invoice and no separate invoices after a delay
          // Note: We can't check state here directly, so we'll just retry a few times
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(reloadInvoicesWithRetry, 1000); // Retry after 1 second
          }
        };

        // Start loading after a short delay to allow backend to process
        setTimeout(reloadInvoicesWithRetry, 1000);
      }

      // Preserve meterReadings and calculatedPrices after completing inspection
      // They are needed for display until main invoice is loaded
      // Don't reset them - they will be used if main invoice is not available yet

      if (unitMeters.length > 0 && activeAssignment) {
        const readingsCount = Object.values(meterReadings).filter(r => r.index && r.index.trim() !== '').length;
        if (readingsCount > 0) {
          show(t('success.completeWithReadings', { readingCount: readingsCount }), 'success');
        } else {
          show(t('success.completeInspection'), 'success');
        }
      } else {
        show(t('success.completeInspection'), 'success');
      }
    } catch (error: any) {
      show(error?.response?.data?.message || error?.message || t('errors.completeFailed'), 'error');
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('vi-VN');
  };

  const getStatusLabel = (status: InspectionStatus) => {
    switch (status) {
      case InspectionStatus.PENDING:
        return t('status.pending');
      case InspectionStatus.IN_PROGRESS:
        return t('status.inProgress');
      case InspectionStatus.COMPLETED:
        return t('status.completed');
      case InspectionStatus.CANCELLED:
        return t('status.cancelled');
      default:
        return status;
    }
  };

  const getStatusColor = (status: InspectionStatus) => {
    switch (status) {
      case InspectionStatus.PENDING:
        return 'bg-yellow-100 text-yellow-700';
      case InspectionStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-700';
      case InspectionStatus.COMPLETED:
        return 'bg-green-100 text-green-700';
      case InspectionStatus.CANCELLED:
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const pendingInspections = inspections.filter(i => i.status === InspectionStatus.PENDING);
  const inProgressInspections = inspections.filter(i => i.status === InspectionStatus.IN_PROGRESS);
  const completedInspections = inspections.filter(i => i.status === InspectionStatus.COMPLETED);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title', { defaultValue: 'Nhiệm vụ kiểm tra thiết bị' })}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {t('subtitle', { defaultValue: 'Danh sách các nhiệm vụ kiểm tra thiết bị được gán cho bạn' })}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">{t('loading', { defaultValue: 'Đang tải...' })}</div>
      ) : (
        <div className="space-y-6">
          {/* Pending Inspections */}
          {pendingInspections.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('sections.pending', { defaultValue: 'Chờ thực hiện' })} ({pendingInspections.length})
              </h2>
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.unitCode', { defaultValue: 'Mã căn hộ' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.inspectionDate', { defaultValue: 'Ngày kiểm tra' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.status', { defaultValue: 'Trạng thái' })}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('table.actions', { defaultValue: 'Thao tác' })}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingInspections.map((inspection) => (
                      <tr key={inspection.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {inspection.unitCode || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(inspection.inspectionDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(inspection.status)}`}>
                            {getStatusLabel(inspection.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleOpenInspection(inspection)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {t('table.view', { defaultValue: 'Xem' })}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* In Progress Inspections */}
          {inProgressInspections.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('sections.inProgress', { defaultValue: 'Đang thực hiện' })} ({inProgressInspections.length})
              </h2>
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.unitCode', { defaultValue: 'Mã căn hộ' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.inspectionDate', { defaultValue: 'Ngày kiểm tra' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.status', { defaultValue: 'Trạng thái' })}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('table.actions', { defaultValue: 'Thao tác' })}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inProgressInspections.map((inspection) => (
                      <tr key={inspection.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {inspection.unitCode || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(inspection.inspectionDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(inspection.status)}`}>
                            {getStatusLabel(inspection.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleOpenInspection(inspection)}
                            className="text-green-600 hover:text-green-900"
                          >
                            {t('table.continue', { defaultValue: 'Tiếp tục' })}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Completed Inspections */}
          {completedInspections.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t('sections.completed', { defaultValue: 'Đã hoàn thành' })} ({completedInspections.length})
              </h2>
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.unitCode', { defaultValue: 'Mã căn hộ' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.inspectionDate', { defaultValue: 'Ngày kiểm tra' })}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('table.completedAt', { defaultValue: 'Ngày hoàn thành' })}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('table.actions', { defaultValue: 'Thao tác' })}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {completedInspections.map((inspection) => (
                      <tr key={inspection.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {inspection.unitCode || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(inspection.inspectionDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(inspection.completedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleOpenInspection(inspection)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            {t('table.view', { defaultValue: 'Xem' })}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {inspections.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">{t('empty.noInspections', { defaultValue: 'Bạn chưa có nhiệm vụ kiểm tra thiết bị nào.' })}</p>
            </div>
          )}
        </div>
      )}

      {/* Inspection Detail Modal */}
      {inspectionModalOpen && selectedInspection && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setInspectionModalOpen(false);
              setSelectedInspection(null);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col relative z-50">
            <div className="p-6 flex-shrink-0 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {t('modal.title', { defaultValue: 'Chi tiết kiểm tra thiết bị' })}
              </h2>
              <button
                onClick={() => {
                  setInspectionModalOpen(false);
                  setSelectedInspection(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-6 flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('modal.unitCode', { defaultValue: 'Mã căn hộ' })}</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedInspection.unitCode || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('modal.inspectionDate', { defaultValue: 'Ngày kiểm tra' })}</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedInspection.inspectionDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('modal.status', { defaultValue: 'Trạng thái' })}</label>
                    <span className={`mt-1 inline-block px-2 py-1 text-xs font-medium rounded ${getStatusColor(selectedInspection.status)}`}>
                      {getStatusLabel(selectedInspection.status)}
                    </span>
                  </div>
                  {(() => {
                    // Calculate total from items (same logic as bottom section)
                    let calculatedTotal = selectedInspection.items?.reduce((sum, item) => {
                      const cost = item.repairCost !== undefined && item.repairCost !== null
                        ? item.repairCost
                        : (item.damageCost !== undefined && item.damageCost !== null ? item.damageCost : 0);
                      return sum + cost;
                    }, 0) || 0;

                    // Also include costs from tempInspectionData (for items not yet created or being edited)
                    const tempTotal = Object.values(tempInspectionData).reduce((sum, temp) => {
                      const cost = temp.repairCost !== undefined && temp.repairCost !== null ? temp.repairCost : 0;
                      return sum + cost;
                    }, 0);

                    // Add temp total to calculated total
                    calculatedTotal = calculatedTotal + tempTotal;

                    // Use calculated total if backend total doesn't match (backend might be delayed)
                    const displayTotal = calculatedTotal > 0 && Math.abs(calculatedTotal - (selectedInspection.totalDamageCost || 0)) > 0.01
                      ? calculatedTotal
                      : (selectedInspection.totalDamageCost || 0);

                    return (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          {t('modal.totalDamageCost', { defaultValue: 'Tổng chi phí thiệt hại' })}
                        </label>
                        <p className={`mt-1 text-lg font-semibold ${displayTotal > 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                          {displayTotal > 0
                            ? `${displayTotal.toLocaleString('vi-VN')} VNĐ`
                            : '0 VNĐ'}
                        </p>
                        {selectedInspection.invoiceId && (
                          <p className="mt-1 text-xs text-gray-500">
                            {t('modal.invoiceId', { defaultValue: 'Mã hóa đơn' })}: {selectedInspection.invoiceId}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {selectedInspection.status === InspectionStatus.PENDING && (() => {
                  // Check if inspection date has arrived
                  const canStartInspection = (() => {
                    if (!selectedInspection.inspectionDate) return true;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const inspectionDate = new Date(selectedInspection.inspectionDate);
                    inspectionDate.setHours(0, 0, 0, 0);
                    return today >= inspectionDate;
                  })();

                  return (
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className={`p-4 border rounded-lg mb-4 ${canStartInspection ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
                        <p className={`text-sm mb-3 ${canStartInspection ? 'text-blue-800' : 'text-yellow-800'}`}>
                          {canStartInspection
                            ? t('modal.startInspectionDesc', { defaultValue: 'Nhấn nút bên dưới để bắt đầu kiểm tra thiết bị. Sau khi bắt đầu, bạn sẽ có thể nhập tình trạng và ghi chú cho từng thiết bị.' })
                            : t('modal.cannotStartBeforeDate', {
                              date: formatDate(selectedInspection.inspectionDate),
                              defaultValue: `Chưa thể thực hiện kiểm tra. Ngày kiểm tra dự kiến: ${formatDate(selectedInspection.inspectionDate)}`
                            })
                          }
                        </p>
                      </div>
                      <button
                        onClick={handleStartInspection}
                        disabled={!canStartInspection}
                        className={`w-full px-6 py-3 font-medium text-lg shadow-md hover:shadow-lg transition-all ${canStartInspection
                          ? 'bg-blue-600 text-white rounded-md hover:bg-blue-700'
                          : 'bg-gray-400 text-gray-200 rounded-md cursor-not-allowed'
                          }`}
                      >
                        ▶️ {t('modal.startInspection', { defaultValue: 'Bắt đầu kiểm tra' })}
                      </button>
                    </div>
                  );
                })()}

                {(selectedInspection.status === InspectionStatus.IN_PROGRESS || selectedInspection.status === InspectionStatus.COMPLETED) && (
                  <>
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedInspection.status === InspectionStatus.COMPLETED
                            ? t('modal.inspectionResult', { defaultValue: 'Kết quả kiểm tra' })
                            : t('modal.equipmentList', { defaultValue: 'Danh sách thiết bị' })}
                        </h3>
                        {selectedInspection.status === InspectionStatus.IN_PROGRESS && (
                          <button
                            onClick={async () => {
                              if (selectedInspection) {
                                try {
                                  // Try by contract ID first (more reliable)
                                  let fullInspection = await getInspectionByContractId(selectedInspection.contractId);

                                  // If that fails, try by ID (but handle errors gracefully)
                                  if (!fullInspection || !fullInspection.items || fullInspection.items.length === 0) {
                                    try {
                                      const inspectionById = await getInspectionById(selectedInspection.id);
                                      if (inspectionById && inspectionById.items && inspectionById.items.length > 0) {
                                        fullInspection = inspectionById;
                                      }
                                    } catch (err) {
                                      // Ignore errors from getInspectionById, continue with contract-based result
                                    }
                                  }

                                  if (fullInspection) {
                                    // If items are now available, try to sync temp data
                                    if (fullInspection.items && fullInspection.items.length > 0) {
                                      // Try to match temp data with items and update them
                                      const itemsToUpdate: Promise<any>[] = [];
                                      fullInspection.items.forEach(item => {
                                        const asset = unitAssets.find(a => a.id === item.assetId || a.assetCode === item.assetCode) ||
                                          assetsMap[item.assetId] ||
                                          assetsMap[item.assetCode || ''];
                                        if (asset && tempInspectionData[asset.id]) {
                                          const tempData = tempInspectionData[asset.id];
                                          if (tempData.conditionStatus && !item.checked) {
                                            itemsToUpdate.push(
                                              updateInspectionItem(item.id, {
                                                conditionStatus: tempData.conditionStatus,
                                                notes: tempData.notes || undefined,
                                                damageCost: tempData.repairCost !== undefined ? tempData.repairCost : undefined, // Backend expects 'damageCost'
                                                checked: true
                                              }).catch(() => { })
                                            );
                                          }
                                        }
                                      });

                                      if (itemsToUpdate.length > 0) {
                                        Promise.all(itemsToUpdate).then(() => {
                                          // Reload inspection after syncing
                                          getInspectionByContractId(selectedInspection.contractId).then(updated => {
                                            if (updated) setSelectedInspection(updated);
                                          });
                                        });
                                      }

                                      setSelectedInspection(fullInspection);
                                      // Clear temp data after syncing
                                      setTempInspectionData({});
                                      show(t('success.refreshItems', { defaultValue: `Đã làm mới danh sách thiết bị (${fullInspection.items.length} thiết bị)` }), 'success');
                                    } else {
                                      setSelectedInspection(fullInspection);
                                      show(t('warnings.itemsNotReady', { defaultValue: 'Danh sách thiết bị chưa được tạo. Vui lòng thử lại sau.' }), 'info');
                                    }
                                  } else {
                                    show(t('warnings.itemsNotReady', { defaultValue: 'Danh sách thiết bị chưa được tạo. Vui lòng thử lại sau.' }), 'info');
                                  }
                                } catch (error: any) {
                                  show(t('errors.refreshFailed', { defaultValue: 'Không thể làm mới danh sách thiết bị' }), 'error');
                                }
                              }
                            }}
                            className="px-3 py-1 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md border border-blue-200 font-medium"
                          >
                            🔄 {t('modal.refresh', { defaultValue: 'Làm mới' })}
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {selectedInspection.items && selectedInspection.items.length > 0 ? (
                          selectedInspection.items.map((item) => {
                            // Find corresponding asset to get purchasePrice
                            // Try multiple ways to find the asset
                            const asset = assetsMap[item.assetId] ||
                              assetsMap[item.assetCode || ''] ||
                              unitAssets.find(a => a.id === item.assetId || a.assetCode === item.assetCode);

                            // Try to load asset if not found
                            if (!asset && item.assetId) {
                              loadAssetIfNeeded(item.assetId).then(loadedAsset => {
                                if (loadedAsset) {
                                  // Force re-render by updating selectedInspection
                                  setSelectedInspection(prev => prev ? { ...prev } : null);
                                }
                              });
                            }

                            return (
                              <InspectionItemRow
                                key={`${item.id}-${asset?.id || 'no-asset'}`}
                                item={item}
                                asset={asset}
                                onUpdate={(conditionStatus, notes, repairCost) => handleUpdateInspectionItem(item.id, conditionStatus, notes, repairCost)}
                                disabled={selectedInspection.status === InspectionStatus.COMPLETED}
                              />
                            );
                          })
                        ) : unitAssets.length > 0 ? (
                          <div className="space-y-2">
                            {unitAssets.map((asset) => (
                              <div key={asset.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h4 className="font-medium text-gray-900">{asset.name || asset.assetCode}</h4>
                                    <p className="text-sm text-gray-500">{asset.assetType}</p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  {/* Original Price */}
                                  {/* purchasePrice removed from Asset type - show info if available from inspection item */}

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      {t('modal.item.condition', { defaultValue: 'Tình trạng' })}
                                    </label>
                                    <select
                                      value={tempInspectionData[asset.id]?.conditionStatus || ''}
                                      onChange={(e) => {
                                        const newStatus = e.target.value;
                                        // Calculate default cost based on condition status
                                        let newRepairCost: number | undefined = undefined;

                                        if (newStatus) {
                                          switch (newStatus) {
                                            case 'GOOD':
                                              newRepairCost = 0;
                                              break;
                                          }
                                        }

                                        setTempInspectionData(prev => ({
                                          ...prev,
                                          [asset.id]: {
                                            ...prev[asset.id],
                                            conditionStatus: newStatus,
                                            notes: prev[asset.id]?.notes || '',
                                            repairCost: newRepairCost
                                          }
                                        }));
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">{t('modal.item.selectCondition', { defaultValue: 'Chọn tình trạng' })}</option>
                                      <option value="GOOD">{t('modal.condition.good', { defaultValue: 'Tốt' })}</option>
                                      <option value="DAMAGED">{t('modal.condition.damaged', { defaultValue: 'Hư hỏng' })}</option>
                                      <option value="MISSING">{t('modal.condition.missing', { defaultValue: 'Thiếu' })}</option>
                                      <option value="REPAIRED">{t('modal.condition.repaired', { defaultValue: 'Đã sửa' })}</option>
                                      <option value="REPLACED">{t('modal.condition.replaced', { defaultValue: 'Đã thay thế' })}</option>
                                    </select>
                                  </div>

                                  {/* Repair Cost */}
                                  {tempInspectionData[asset.id]?.conditionStatus && tempInspectionData[asset.id]?.conditionStatus !== 'GOOD' && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('modal.item.repairCost', { defaultValue: 'Chi phí sửa chữa/thay thế (VNĐ)' })}
                                      </label>
                                      {(() => {
                                        const conditionStatus = tempInspectionData[asset.id]?.conditionStatus;
                                        const repairCost = tempInspectionData[asset.id]?.repairCost;
                                        let explanation = '';

                                        if (conditionStatus && repairCost !== undefined) {
                                          explanation = t('modal.item.costExplanation.custom', {
                                            defaultValue: `Chi phí đã nhập thủ công`
                                          });
                                        }

                                        return explanation ? (
                                          <p className="text-xs text-blue-600 mb-2 bg-blue-50 p-2 rounded border border-blue-200">
                                            💡 {explanation}
                                          </p>
                                        ) : null;
                                      })()}
                                      <input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={tempInspectionData[asset.id]?.repairCost !== undefined ? tempInspectionData[asset.id]?.repairCost : ''}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          let repairCost: number | undefined = undefined;
                                          if (value !== '' && value !== null && value !== undefined) {
                                            const numValue = parseFloat(value);
                                            if (!isNaN(numValue) && numValue >= 0) {
                                              repairCost = numValue;
                                            }
                                          }
                                          setTempInspectionData(prev => ({
                                            ...prev,
                                            [asset.id]: {
                                              ...prev[asset.id],
                                              conditionStatus: prev[asset.id]?.conditionStatus || '',
                                              notes: prev[asset.id]?.notes || '',
                                              repairCost: repairCost
                                            }
                                          }));
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder={t('modal.item.repairCostPlaceholder', { defaultValue: 'Nhập chi phí hoặc để tự động tính' })}
                                      />
                                      {tempInspectionData[asset.id]?.repairCost !== undefined && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          {tempInspectionData[asset.id]?.repairCost?.toLocaleString('vi-VN')} VNĐ
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      {t('modal.item.notes', { defaultValue: 'Ghi chú' })}
                                    </label>
                                    <textarea
                                      value={tempInspectionData[asset.id]?.notes || ''}
                                      onChange={(e) => {
                                        setTempInspectionData(prev => ({
                                          ...prev,
                                          [asset.id]: {
                                            ...prev[asset.id],
                                            conditionStatus: prev[asset.id]?.conditionStatus || '',
                                            notes: e.target.value,
                                            repairCost: prev[asset.id]?.repairCost
                                          }
                                        }));
                                      }}
                                      rows={2}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder={t('modal.item.notesPlaceholder', { defaultValue: 'Ghi chú về tình trạng thiết bị...' })}
                                    />
                                  </div>
                                  <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                                    {t('modal.tempFormNote', { defaultValue: '💡 Dữ liệu sẽ được lưu tự động khi danh sách thiết bị được tạo. Vui lòng nhấn "Làm mới" để kiểm tra.' })}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-yellow-800 mb-2">
                              {t('modal.noEquipment', { defaultValue: 'Chưa có thiết bị nào' })}
                            </p>
                            <p className="text-sm text-yellow-700">
                              {t('modal.noEquipmentDesc', { defaultValue: 'Danh sách thiết bị sẽ được tạo tự động khi bắt đầu kiểm tra. Vui lòng nhấn "Bắt đầu kiểm tra" hoặc làm mới trang.' })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Meter Reading Section */}
                    {selectedInspection.unitId && (
                      <div className="border-t border-gray-200 pt-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          {t('modal.meterReadings', { defaultValue: 'Đo chỉ số đồng hồ điện nước' })}
                        </h3>
                        {loadingMeters ? (
                          <div className="text-sm text-gray-500 py-2">{t('modal.loadingMeters', { defaultValue: 'Đang tải danh sách đồng hồ đo...' })}</div>
                        ) : unitMeters.length > 0 ? (
                          <>
                            <div className="mb-4 relative z-10">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('modal.readingDate', { defaultValue: 'Ngày đo' })}
                              </label>
                              <input
                                type="date"
                                value={readingDate}
                                onChange={(e) => setReadingDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 relative z-10"
                              />
                            </div>
                            {activeCycle && (
                              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-sm text-blue-800">
                                  <strong>{t('modal.activeCycle', { defaultValue: 'Chu kỳ đọc' })}:</strong> {activeCycle.name}
                                  {activeCycle.periodFrom && activeCycle.periodTo && (
                                    <span className="ml-2">
                                      ({new Date(activeCycle.periodFrom).toLocaleDateString('vi-VN')} - {new Date(activeCycle.periodTo).toLocaleDateString('vi-VN')})
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}
                            <div className="space-y-3">
                              {unitMeters.map((meter) => {
                                // Calculate usage and estimated cost if readings are provided
                                const reading = meterReadings[meter.id];
                                const currentIndex = reading?.index ? parseFloat(reading.index) : null;
                                const prevIndex = meter.lastReading !== null && meter.lastReading !== undefined ? meter.lastReading : 0;
                                // Ensure usage is valid and not negative
                                const usage = currentIndex !== null && !isNaN(currentIndex) && currentIndex >= prevIndex
                                  ? currentIndex - prevIndex
                                  : null;
                                const unit = meter.serviceCode === 'ELECTRIC' || meter.serviceName?.toLowerCase().includes('điện') ? 'kWh' : 'm³';

                                return (
                                  <div key={meter.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-3">
                                      <div>
                                        <h4 className="font-medium text-gray-900">{meter.meterCode}</h4>
                                        <p className="text-sm text-gray-500">
                                          {meter.serviceName || meter.serviceCode || 'Unknown Service'}
                                        </p>
                                        {usage !== null && usage > 0 && (
                                          <>
                                            <p className="text-xs text-blue-600 mt-1 font-medium">
                                              {t('modal.meterUsage', {
                                                usage: usage.toLocaleString('vi-VN'),
                                                unit: unit,
                                                defaultValue: `Sử dụng: ${usage.toLocaleString('vi-VN')} ${unit}`
                                              })}
                                            </p>
                                            {calculatedPrices[meter.id] !== undefined && calculatedPrices[meter.id] > 0 ? (
                                              <p className="text-xs text-green-600 mt-1 font-semibold">
                                                {t('modal.estimatedCost', {
                                                  cost: calculatedPrices[meter.id].toLocaleString('vi-VN'),
                                                  defaultValue: `Dự tính: ${calculatedPrices[meter.id].toLocaleString('vi-VN')} VNĐ`
                                                })}
                                              </p>
                                            ) : (
                                              <p className="text-xs text-gray-400 mt-1 italic">
                                                {t('modal.noPricingTiers', { defaultValue: 'Chưa có bảng giá để tính toán' })}
                                              </p>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      {/* Previous Index Display */}
                                      {meter.lastReading !== null && meter.lastReading !== undefined && (
                                        <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                                          <p className="text-sm text-gray-700">
                                            <span className="font-medium">{t('modal.lastReading', { defaultValue: 'Chỉ số trước' })}:</span>{' '}
                                            <span className="text-lg font-semibold text-gray-900">{meter.lastReading}</span>
                                          </p>
                                        </div>
                                      )}
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          {t('modal.currentIndex', { defaultValue: 'Chỉ số hiện tại' })} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={meterReadings[meter.id]?.index || ''}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            setMeterReadings(prev => ({
                                              ...prev,
                                              [meter.id]: {
                                                ...prev[meter.id],
                                                index: value
                                              }
                                            }));

                                            // Validate: current index must be greater than previous index
                                            if (value && value.trim() !== '') {
                                              const numValue = parseFloat(value);
                                              if (!isNaN(numValue)) {
                                                const prevIdx = meter.lastReading !== null && meter.lastReading !== undefined ? meter.lastReading : 0;
                                                if (numValue < 0) {
                                                  setMeterReadingErrors(prev => ({
                                                    ...prev,
                                                    [meter.id]: t('modal.errors.invalidIndex', { defaultValue: 'Chỉ số đồng hồ phải lớn hơn hoặc bằng 0' })
                                                  }));
                                                } else if (numValue < prevIdx) {
                                                  setMeterReadingErrors(prev => ({
                                                    ...prev,
                                                    [meter.id]: t('modal.errors.indexMustBeGreater', {
                                                      prevIndex: prevIdx,
                                                      defaultValue: `Chỉ số hiện tại phải lớn hơn chỉ số trước (${prevIdx})`
                                                    })
                                                  }));
                                                } else if (numValue === prevIdx) {
                                                  setMeterReadingErrors(prev => ({
                                                    ...prev,
                                                    [meter.id]: t('modal.errors.indexMustBeGreaterThan', {
                                                      prevIndex: prevIdx,
                                                      defaultValue: `Chỉ số hiện tại phải lớn hơn chỉ số trước (${prevIdx}). Chỉ số không thể bằng chỉ số trước.`
                                                    })
                                                  }));
                                                } else {
                                                  setMeterReadingErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors[meter.id];
                                                    return newErrors;
                                                  });
                                                }
                                              } else {
                                                setMeterReadingErrors(prev => ({
                                                  ...prev,
                                                  [meter.id]: t('modal.errors.invalidNumber', { defaultValue: 'Vui lòng nhập số hợp lệ' })
                                                }));
                                              }
                                            } else {
                                              setMeterReadingErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors[meter.id];
                                                return newErrors;
                                              });
                                            }
                                          }}
                                          onBlur={(e) => {
                                            // Re-validate on blur
                                            const value = e.target.value;
                                            if (value && value.trim() !== '') {
                                              const numValue = parseFloat(value);
                                              if (!isNaN(numValue)) {
                                                const prevIdx = meter.lastReading !== null && meter.lastReading !== undefined ? meter.lastReading : 0;
                                                if (numValue < 0) {
                                                  setMeterReadingErrors(prev => ({
                                                    ...prev,
                                                    [meter.id]: t('modal.errors.invalidIndex', { defaultValue: 'Chỉ số đồng hồ phải lớn hơn hoặc bằng 0' })
                                                  }));
                                                } else if (numValue < prevIdx) {
                                                  setMeterReadingErrors(prev => ({
                                                    ...prev,
                                                    [meter.id]: t('modal.errors.indexMustBeGreater', {
                                                      prevIndex: prevIdx,
                                                      defaultValue: `Chỉ số hiện tại phải lớn hơn chỉ số trước (${prevIdx})`
                                                    })
                                                  }));
                                                } else if (numValue === prevIdx) {
                                                  setMeterReadingErrors(prev => ({
                                                    ...prev,
                                                    [meter.id]: t('modal.errors.indexMustBeGreaterThan', {
                                                      prevIndex: prevIdx,
                                                      defaultValue: `Chỉ số hiện tại phải lớn hơn chỉ số trước (${prevIdx}). Chỉ số không thể bằng chỉ số trước.`
                                                    })
                                                  }));
                                                } else {
                                                  setMeterReadingErrors(prev => {
                                                    const newErrors = { ...prev };
                                                    delete newErrors[meter.id];
                                                    return newErrors;
                                                  });
                                                }
                                              } else {
                                                setMeterReadingErrors(prev => ({
                                                  ...prev,
                                                  [meter.id]: t('modal.errors.invalidNumber', { defaultValue: 'Vui lòng nhập số hợp lệ' })
                                                }));
                                              }
                                            }
                                          }}
                                          placeholder={t('modal.indexPlaceholder', { defaultValue: 'Nhập chỉ số đồng hồ' })}
                                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${meterReadingErrors[meter.id]
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-gray-300 focus:ring-blue-500'
                                            }`}
                                        />
                                        {meterReadingErrors[meter.id] && (
                                          <p className="mt-1 text-sm text-red-600">
                                            {meterReadingErrors[meter.id]}
                                          </p>
                                        )}
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          {t('modal.note', { defaultValue: 'Ghi chú' })}
                                        </label>
                                        <input
                                          type="text"
                                          value={meterReadings[meter.id]?.note || ''}
                                          onChange={(e) => {
                                            setMeterReadings(prev => ({
                                              ...prev,
                                              [meter.id]: {
                                                ...prev[meter.id],
                                                note: e.target.value
                                              }
                                            }));
                                          }}
                                          placeholder={t('modal.notePlaceholder', { defaultValue: 'Ghi chú (tùy chọn)' })}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                            <p className="text-sm text-gray-600">
                              {t('modal.noMeters', { defaultValue: 'Căn hộ này chưa có đồng hồ đo điện nước.' })}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Total Price Summary - Display at end before inspection notes */}
                    {/* Key forces re-render when items change */}
                    {(selectedInspection.totalDamageCost !== undefined && selectedInspection.totalDamageCost !== null) && (() => {
                      // Create a key based on items to force re-render when they change
                      const itemsKey = selectedInspection.items?.map(item =>
                        `${item.id}-${item.repairCost || item.damageCost || 0}`
                      ).join(',') || 'no-items';
                      // Filter items with damage cost > 0
                      // Use a more robust cost extraction that handles both repairCost and damageCost
                      const damagedItems = selectedInspection.items?.filter(item => {
                        const cost = item.repairCost !== undefined && item.repairCost !== null
                          ? item.repairCost
                          : (item.damageCost !== undefined && item.damageCost !== null ? item.damageCost : 0);
                        return cost > 0 && item.conditionStatus !== 'GOOD';
                      }) || [];

                      // Calculate total from items as fallback/verification
                      let calculatedTotal = damagedItems.reduce((sum, item) => {
                        const cost = item.repairCost !== undefined && item.repairCost !== null
                          ? item.repairCost
                          : (item.damageCost !== undefined && item.damageCost !== null ? item.damageCost : 0);
                        return sum + cost;
                      }, 0);

                      // Also include costs from tempInspectionData (for items not yet created or being edited)
                      const tempTotal = Object.values(tempInspectionData).reduce((sum, temp) => {
                        const cost = temp.repairCost !== undefined && temp.repairCost !== null ? temp.repairCost : 0;
                        return sum + cost;
                      }, 0);

                      // Add temp total to calculated total
                      calculatedTotal = calculatedTotal + tempTotal;

                      // If main invoice exists, use it to calculate totals
                      let displayTotal = 0;
                      let waterElectricTotal = 0;
                      let grandTotal = 0;

                      if (mainInvoice && mainInvoice.lines) {
                        // Calculate from main invoice lines
                        const damageLines = mainInvoice.lines.filter(line =>
                          line.serviceCode === 'ASSET_DAMAGE'
                        );
                        // IMPORTANT: Only include water/electric lines from THIS inspection
                        // Filter by description containing "Đo cùng với kiểm tra thiết bị"
                        const inspectionMarker = 'Đo cùng với kiểm tra thiết bị';
                        const waterElectricLines = mainInvoice.lines.filter(line =>
                          (line.serviceCode === 'WATER' || line.serviceCode === 'ELECTRIC') &&
                          line.description && line.description.includes(inspectionMarker)
                        );

                        displayTotal = damageLines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
                        const mainInvoiceWaterElectricTotal = waterElectricLines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);

                        // Debug: Log filtering results
                        const allWaterElectricLinesInInvoice = mainInvoice.lines.filter(line =>
                          line.serviceCode === 'WATER' || line.serviceCode === 'ELECTRIC'
                        );
                        if (allWaterElectricLinesInInvoice.length > 0) {
                          console.log('Main invoice water/electric filtering:', {
                            totalLines: allWaterElectricLinesInInvoice.length,
                            filteredLines: waterElectricLines.length,
                            filteredTotal: mainInvoiceWaterElectricTotal,
                            allLinesDescriptions: allWaterElectricLinesInInvoice.map(l => l.description),
                            marker: inspectionMarker
                          });
                        }

                        // Priority: 1) Main invoice lines (filtered by marker), 2) Separate invoices, 3) Calculated prices
                        // IMPORTANT: Only use mainInvoiceWaterElectricTotal if we have filtered lines (with marker)
                        // If no filtered lines, don't use mainInvoice total even if it exists (invoice created before fix)
                        if (waterElectricLines.length > 0 && mainInvoiceWaterElectricTotal > 0) {
                          // Use filtered main invoice lines (only from this inspection)
                          waterElectricTotal = mainInvoiceWaterElectricTotal;
                        } else if (waterElectricInvoices.length > 0) {
                          // Use separate water/electric invoices if available
                          waterElectricTotal = waterElectricInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
                        } else {
                          // Fallback to calculated prices if available (always show if we have them)
                          const calculatedWaterElectricTotal = Object.values(calculatedPrices)
                            .filter(price => price > 0 && price < 100000000) // Validate prices are reasonable
                            .reduce((sum, price) => sum + price, 0);
                          waterElectricTotal = calculatedWaterElectricTotal;
                        }

                        // Recalculate grandTotal to include water/electric from fallback sources
                        grandTotal = displayTotal + waterElectricTotal;
                      } else {
                        // Fallback to calculated values if no main invoice
                        displayTotal = calculatedTotal > 0
                          ? calculatedTotal
                          : (selectedInspection.totalDamageCost || 0);

                        // Calculate total water/electric invoice amount
                        // Priority: 1) Separate invoices, 2) Calculated prices (always show if available)
                        if (waterElectricInvoices.length > 0) {
                          // Use separate water/electric invoices if available
                          waterElectricTotal = waterElectricInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
                        } else {
                          // Always fallback to calculated prices if available (even if inspection completed)
                          // This ensures prices are shown until invoices are loaded
                          const calculatedWaterElectricTotal = Object.values(calculatedPrices)
                            .filter(price => price > 0 && price < 100000000) // Validate prices are reasonable
                            .reduce((sum, price) => sum + price, 0);
                          waterElectricTotal = calculatedWaterElectricTotal;
                        }
                        grandTotal = displayTotal + waterElectricTotal;
                      }

                      return (
                        <div className="border-t border-gray-200 pt-4">
                          <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-lg shadow-md">
                            <div className="mb-3">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-lg font-semibold text-gray-900">
                                  {t('modal.totalDamageCost', { defaultValue: 'Tổng chi phí thiệt hại' })}:
                                </span>
                                <span className={`text-3xl font-bold ${displayTotal > 0 ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                  {displayTotal > 0
                                    ? `${displayTotal.toLocaleString('vi-VN')} VNĐ`
                                    : '0 VNĐ'}
                                </span>
                              </div>
                              {selectedInspection.invoiceId && (
                                <p className="text-sm text-gray-600">
                                  {t('modal.invoiceId', { defaultValue: 'Mã hóa đơn' })}: <span className="font-mono font-medium">{selectedInspection.invoiceId}</span>
                                </p>
                              )}

                              {/* Water/Electric Invoice Total - Show if there are meters or main invoice has water/electric lines */}
                              {(unitMeters.length > 0 || waterElectricInvoices.length > 0 || waterElectricTotal > 0 || (mainInvoice && mainInvoice.lines?.some(l => l.serviceCode === 'WATER' || l.serviceCode === 'ELECTRIC'))) && (
                                <div className="mt-3 pt-3 border-t border-red-200">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700">
                                      {t('modal.waterElectricTotal', { defaultValue: 'Tổng tiền điện nước' })}:
                                    </span>
                                    {loadingMainInvoice || loadingInvoices ? (
                                      <span className="text-sm text-gray-500">Đang tải...</span>
                                    ) : (
                                      <span className={`text-xl font-semibold ${waterElectricTotal > 0 ? 'text-blue-600' : 'text-gray-400'
                                        }`}>
                                        {waterElectricTotal > 0
                                          ? `${waterElectricTotal.toLocaleString('vi-VN')} VNĐ`
                                          : 'Chưa có hóa đơn'}
                                      </span>
                                    )}
                                  </div>
                                  {/* Show lines from main invoice if available - only from THIS inspection */}
                                  {mainInvoice && mainInvoice.lines && (() => {
                                    const inspectionMarker = 'Đo cùng với kiểm tra thiết bị';
                                    // Filter water/electric lines - only include those with inspection marker in description
                                    const allWaterElectricLines = mainInvoice.lines.filter(line =>
                                      line.serviceCode === 'WATER' || line.serviceCode === 'ELECTRIC'
                                    );
                                    const filteredLines = allWaterElectricLines.filter(line =>
                                      line.description && line.description.includes(inspectionMarker)
                                    );

                                    // Debug logging
                                    if (allWaterElectricLines.length > 0) {
                                      console.log('Water/Electric lines in invoice:', {
                                        total: allWaterElectricLines.length,
                                        filtered: filteredLines.length,
                                        allLines: allWaterElectricLines.map(l => ({
                                          serviceCode: l.serviceCode,
                                          description: l.description,
                                          hasMarker: l.description?.includes(inspectionMarker),
                                          lineTotal: l.lineTotal
                                        }))
                                      });
                                    }

                                    if (filteredLines.length > 0) {
                                      // Group lines by service code and sum up totals for each service
                                      const groupedByService = filteredLines.reduce((acc, line) => {
                                        const serviceCode = line.serviceCode || 'UNKNOWN';
                                        if (!acc[serviceCode]) {
                                          acc[serviceCode] = { total: 0, count: 0 };
                                        }
                                        acc[serviceCode].total += (line.lineTotal || 0);
                                        acc[serviceCode].count += 1;
                                        return acc;
                                      }, {} as Record<string, { total: number; count: number }>);

                                      return (
                                        <div className="text-xs text-gray-500 space-y-1">
                                          {Object.entries(groupedByService).map(([serviceCode, { total }]) => (
                                            <div key={serviceCode} className="flex justify-between">
                                              <span>{serviceCode === 'WATER' ? 'Nước' : serviceCode === 'ELECTRIC' ? 'Điện' : serviceCode}</span>
                                              <span>{total.toLocaleString('vi-VN')} VNĐ</span>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    }

                                    // If no filtered lines but we have water/electric lines, it means invoice was created before fix
                                    // In this case, don't show breakdown to avoid confusion
                                    return null;
                                  })()}
                                  {/* Show separate invoices if main invoice doesn't have water/electric lines */}
                                  {mainInvoice && waterElectricTotal > 0 && mainInvoice.lines?.filter(l => l.serviceCode === 'WATER' || l.serviceCode === 'ELECTRIC').length === 0 && waterElectricInvoices.length > 0 && (
                                    <div className="text-xs text-gray-500 space-y-1">
                                      {waterElectricInvoices.map(inv => (
                                        <div key={inv.id} className="flex justify-between">
                                          <span>{inv.lines?.[0]?.serviceCode === 'WATER' ? 'Nước' : 'Điện'}</span>
                                          <span>{inv.totalAmount.toLocaleString('vi-VN')} VNĐ</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {/* Fallback to separate invoices if no main invoice */}
                                  {!mainInvoice && waterElectricInvoices.length > 0 && (
                                    <div className="text-xs text-gray-500 space-y-1">
                                      {waterElectricInvoices.map(inv => (
                                        <div key={inv.id} className="flex justify-between">
                                          <span>{inv.lines?.[0]?.serviceCode === 'WATER' ? 'Nước' : 'Điện'}</span>
                                          <span>{inv.totalAmount.toLocaleString('vi-VN')} VNĐ</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {/* Show calculated prices if no invoices but we have calculated prices */}
                                  {waterElectricTotal > 0 && waterElectricInvoices.length === 0 && (!mainInvoice || mainInvoice.lines?.filter(l => l.serviceCode === 'WATER' || l.serviceCode === 'ELECTRIC').length === 0) && Object.keys(calculatedPrices).length > 0 && (
                                    <div className="text-xs text-gray-500 space-y-1">
                                      {Object.entries(calculatedPrices).map(([meterId, price]) => {
                                        const meter = unitMeters.find(m => m.id === meterId);
                                        const serviceCode = meter?.serviceCode?.toUpperCase() || '';
                                        return (
                                          <div key={meterId} className="flex justify-between">
                                            <span>{serviceCode.includes('WATER') ? 'Nước' : 'Điện'}</span>
                                            <span>{price.toLocaleString('vi-VN')} VNĐ (dự tính)</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {waterElectricTotal === 0 && waterElectricInvoices.length === 0 && !loadingInvoices && unitMeters.length > 0 && (
                                    <p className="text-xs text-gray-400 italic">
                                      Hóa đơn sẽ được tạo sau khi hoàn thành kiểm tra và đo chỉ số đồng hồ
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Grand Total - Show if either damage cost or water/electric cost exists */}
                              {(displayTotal > 0 || waterElectricTotal > 0) && (
                                <div className="mt-3 pt-3 border-t-2 border-red-400">
                                  <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold text-gray-900">
                                      {t('modal.grandTotal', { defaultValue: 'Tổng cộng' })}:
                                    </span>
                                    <span className="text-3xl font-bold text-red-700">
                                      {grandTotal.toLocaleString('vi-VN')} VNĐ
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Breakdown of damaged assets */}
                            {damagedItems.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-red-200">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                  {t('modal.damagedAssetsBreakdown', { defaultValue: 'Chi tiết thiết bị bị hư hỏng' })}:
                                </h4>
                                <div className="space-y-2">
                                  {damagedItems.map((item) => {
                                    // Get cost - prioritize repairCost, fallback to damageCost
                                    const cost = item.repairCost !== undefined && item.repairCost !== null
                                      ? item.repairCost
                                      : (item.damageCost !== undefined && item.damageCost !== null ? item.damageCost : 0);

                                    return (
                                      <div key={item.id} className="flex justify-between items-center py-2 px-3 bg-white rounded-md border border-red-100">
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-gray-900">
                                            {item.assetName || item.assetCode}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {item.assetType}
                                            {item.conditionStatus && (
                                              <span className="ml-2">
                                                ({item.conditionStatus === 'DAMAGED' ? t('modal.condition.damaged', { defaultValue: 'Hư hỏng' }) :
                                                  item.conditionStatus === 'MISSING' ? t('modal.condition.missing', { defaultValue: 'Thiếu' }) :
                                                    item.conditionStatus === 'REPLACED' ? t('modal.condition.replaced', { defaultValue: 'Đã thay thế' }) :
                                                      item.conditionStatus === 'REPAIRED' ? t('modal.condition.repaired', { defaultValue: 'Đã sửa' }) :
                                                        item.conditionStatus})
                                              </span>
                                            )}
                                          </p>
                                        </div>
                                        <span className="text-sm font-semibold text-red-600 ml-4">
                                          {cost.toLocaleString('vi-VN')} VNĐ
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {selectedInspection.status === InspectionStatus.IN_PROGRESS && (
                      <>
                        <div className="border-t border-gray-200 pt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('modal.inspectionNotes', { defaultValue: 'Ghi chú kiểm tra' })}
                          </label>
                          <textarea
                            value={inspectorNotes}
                            onChange={(e) => setInspectorNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={t('modal.notesPlaceholder', { defaultValue: 'Nhập ghi chú về tình trạng thiết bị...' })}
                          />
                        </div>

                        <button
                          onClick={handleCompleteInspection}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                        >
                          {t('modal.completeInspection', { defaultValue: 'Hoàn thành kiểm tra' })}
                        </button>
                      </>
                    )}
                  </>
                )}

                {selectedInspection.status === InspectionStatus.COMPLETED && (
                  <>
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('modal.results', { defaultValue: 'Kết quả kiểm tra' })}
                      </h3>
                      <div className="space-y-3">
                        {selectedInspection.items && selectedInspection.items.map((item) => (
                          <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900">{item.assetName || item.assetCode}</h4>
                                <p className="text-sm text-gray-500">{item.assetType}</p>
                              </div>
                              <span className={`px-2 py-1 text-xs font-medium rounded ${item.conditionStatus === 'GOOD' ? 'bg-green-100 text-green-700' :
                                item.conditionStatus === 'DAMAGED' ? 'bg-red-100 text-red-700' :
                                  item.conditionStatus === 'MISSING' ? 'bg-gray-100 text-gray-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                {item.conditionStatus === 'GOOD' ? t('modal.condition.good', { defaultValue: 'Tốt' }) :
                                  item.conditionStatus === 'DAMAGED' ? t('modal.condition.damaged', { defaultValue: 'Hư hỏng' }) :
                                    item.conditionStatus === 'MISSING' ? t('modal.condition.missing', { defaultValue: 'Thiếu' }) :
                                      item.conditionStatus || t('modal.condition.notInspected', { defaultValue: 'Chưa kiểm tra' })}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="text-sm text-gray-700 mt-2">{item.notes}</p>
                            )}
                            {(item.repairCost || item.damageCost) && (item.repairCost !== 0 || item.damageCost !== 0) && (
                              <p className="text-sm text-red-600 font-medium mt-2">
                                {t('modal.item.damageCost', { defaultValue: 'Chi phí thiệt hại' })}: {(item.repairCost || item.damageCost || 0).toLocaleString('vi-VN')} VNĐ
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      {(selectedInspection.totalDamageCost !== undefined && selectedInspection.totalDamageCost !== null && selectedInspection.totalDamageCost > 0) && (
                        <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-gray-900">
                              {t('modal.totalDamageCost', { defaultValue: 'Tổng chi phí thiệt hại' })}:
                            </span>
                            <span className="text-2xl font-bold text-red-600">
                              {selectedInspection.totalDamageCost.toLocaleString('vi-VN')} VNĐ
                            </span>
                          </div>
                          {selectedInspection.invoiceId && (
                            <p className="mt-2 text-sm text-gray-600">
                              {t('modal.invoiceId', { defaultValue: 'Mã hóa đơn' })}: <span className="font-mono">{selectedInspection.invoiceId}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedInspection.inspectorNotes && (
                      <div className="border-t border-gray-200 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('modal.inspectionNotes', { defaultValue: 'Ghi chú kiểm tra' })}</label>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedInspection.inspectorNotes}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="px-6 pb-6 flex-shrink-0 border-t border-gray-200 pt-4">
              <button
                onClick={() => {
                  setInspectionModalOpen(false);
                  setSelectedInspection(null);
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                {t('modal.close', { defaultValue: 'Đóng' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for inspection item row
function InspectionItemRow({
  item,
  asset,
  onUpdate,
  disabled
}: {
  item: any;
  asset?: Asset | null;
  onUpdate: (conditionStatus: string, notes: string, repairCost?: number) => void;
  disabled: boolean;
}) {
  const t = useTranslations('TechnicianInspections.modal');
  const [conditionStatus, setConditionStatus] = useState(item.conditionStatus || '');
  const [notes, setNotes] = useState(item.notes || '');
  // Backend returns damageCost, but we use repairCost in UI
  const [repairCost, setRepairCost] = useState<number | undefined>(item.repairCost || item.damageCost);
  // Track if user has manually changed the cost
  const [isManualCost, setIsManualCost] = useState(false);

  // Calculate default cost based on condition status
  const calculateDefaultCost = (status: string, purchasePrice?: number): number | undefined => {
    if (!purchasePrice) return undefined;

    switch (status) {
      case 'GOOD':
        return 0; // No cost if good
      case 'DAMAGED':
        return Math.round(purchasePrice * 0.3); // 30% of purchase price
      case 'MISSING':
        return purchasePrice; // Full replacement cost
      case 'REPAIRED':
        return Math.round(purchasePrice * 0.2); // 20% repair cost
      case 'REPLACED':
        return purchasePrice; // Full replacement cost
      default:
        return undefined;
    }
  };

  const handleConditionChange = (newStatus: string) => {
    setConditionStatus(newStatus);

    const price = item.purchasePrice;
    let costToSave: number | undefined = undefined;

    // When status changes, always auto-calculate (reset manual cost flag)
    // User can then manually adjust if needed
    if (newStatus && price) {
      const calculatedCost = calculateDefaultCost(newStatus, price);
      if (calculatedCost !== undefined) {
        setRepairCost(calculatedCost);
        costToSave = calculatedCost;
        // Reset manual cost flag when status changes - allows auto-calculation
        setIsManualCost(false);
      }
    } else if (newStatus === 'GOOD') {
      setRepairCost(0);
      costToSave = 0;
      setIsManualCost(false);
    } else {
      // Clear cost if no status or no price
      setRepairCost(undefined);
      costToSave = undefined;
      setIsManualCost(false);
    }

    // Auto-save when conditionStatus changes (if not empty)
    if (newStatus && newStatus.trim() !== '') {
      // Use calculated cost
      onUpdate(newStatus, notes, costToSave);
    }
  };

  const handleSave = () => {
    // Always call onUpdate if conditionStatus is selected (even if empty string)
    // Empty string means no status selected, which should still be sent to backend
    if (conditionStatus !== undefined && conditionStatus !== null) {
      onUpdate(conditionStatus, notes, repairCost);
    } else {
      // If no conditionStatus is selected, still update notes and repairCost
      onUpdate('', notes, repairCost);
    }
  };

  const purchasePrice = item.purchasePrice;

  // Sync local state with item prop when item is updated from backend
  // Use a ref to track if we're currently saving to avoid overwriting during save
  const isSavingRef = useRef(false);

  useEffect(() => {
    // Skip sync if we're currently saving (to avoid race conditions)
    if (isSavingRef.current) {
      return;
    }

    const itemRepairCost = item.repairCost !== undefined && item.repairCost !== null
      ? item.repairCost
      : (item.damageCost !== undefined && item.damageCost !== null ? item.damageCost : undefined);
    const itemConditionStatus = item.conditionStatus || '';
    const itemNotes = item.notes || '';

    // Only update if the item values have actually changed (to avoid overwriting user input)
    if (itemConditionStatus && itemConditionStatus !== conditionStatus) {
      setConditionStatus(itemConditionStatus);
    }

    if (itemNotes !== notes) {
      setNotes(itemNotes);
    }

    // Sync repairCost - only if it's different and user hasn't manually changed it
    if (itemRepairCost !== undefined && itemRepairCost !== null) {
      const currentRepairCost = repairCost !== undefined ? repairCost : null;
      // Only sync if values are actually different (with small tolerance for floating point)
      // AND user hasn't manually changed the cost
      if (Math.abs((itemRepairCost || 0) - (currentRepairCost || 0)) > 0.01 && !isManualCost) {
        setRepairCost(itemRepairCost);
        setIsManualCost(false);
      }
    } else if (repairCost !== undefined && repairCost !== null && repairCost > 0) {
      // If item has no cost but local state does, and status is GOOD, clear it
      if (itemConditionStatus === 'GOOD' && !isManualCost) {
        setRepairCost(0);
        setIsManualCost(false);
      }
    }
  }, [item.id, item.repairCost, item.damageCost, item.conditionStatus, item.notes]);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium text-gray-900">{item.assetName || item.assetCode}</h4>
          <p className="text-sm text-gray-500">{item.assetType}</p>
        </div>
        {item.checked && (
          <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700">
            {t('item.inspected', { defaultValue: 'Đã kiểm tra' })}
          </span>
        )}
      </div>

      {!disabled && (
        <div className="space-y-3 mt-3">
          {/* Always show price section */}
          <div className={`p-3 border rounded-md ${purchasePrice !== undefined && purchasePrice !== null && purchasePrice > 0
            ? 'bg-blue-50 border-blue-200'
            : 'bg-yellow-50 border-yellow-200'
            }`}>
            <p className={`text-sm ${purchasePrice !== undefined && purchasePrice !== null && purchasePrice > 0
              ? 'font-medium text-blue-900'
              : 'text-yellow-700'
              }`}>
              <span className="font-medium">{t('item.originalPrice', { defaultValue: 'Giá gốc' })}:</span>{' '}
              {purchasePrice !== undefined && purchasePrice !== null && purchasePrice > 0 ? (
                <span className="text-lg">{purchasePrice.toLocaleString('vi-VN')} VNĐ</span>
              ) : (
                <span className="text-xs">
                  {t('item.noPrice', { defaultValue: '⚠️ Chưa có thông tin giá gốc' })}
                  {asset ? ` (Asset ID: ${asset.id})` : item.assetId ? ` (Asset ID: ${item.assetId})` : ''}
                </span>
              )}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('item.condition', { defaultValue: 'Tình trạng' })}</label>
            <select
              value={conditionStatus}
              onChange={(e) => {
                handleConditionChange(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('item.selectCondition', { defaultValue: 'Chọn tình trạng' })}</option>
              <option value="GOOD">{t('condition.good', { defaultValue: 'Tốt' })}</option>
              <option value="DAMAGED">{t('condition.damaged', { defaultValue: 'Hư hỏng' })}</option>
              <option value="MISSING">{t('condition.missing', { defaultValue: 'Thiếu' })}</option>
              <option value="REPAIRED">{t('condition.repaired', { defaultValue: 'Đã sửa' })}</option>
              <option value="REPLACED">{t('condition.replaced', { defaultValue: 'Đã thay thế' })}</option>
            </select>
          </div>

          {conditionStatus && conditionStatus !== 'GOOD' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('item.repairCost', { defaultValue: 'Chi phí sửa chữa/thay thế (VNĐ)' })}
              </label>
              {(() => {
                let explanation = '';

                if (conditionStatus && purchasePrice && repairCost !== undefined) {
                  const percentage = Math.round((repairCost / purchasePrice) * 100);
                  if (conditionStatus === 'DAMAGED' && percentage === 30) {
                    explanation = t('item.costExplanation.damaged', {
                      purchasePrice: purchasePrice.toLocaleString('vi-VN'),
                      repairCost: repairCost.toLocaleString('vi-VN'),
                      defaultValue: `Tự động tính: 30% giá gốc (${purchasePrice.toLocaleString('vi-VN')} VNĐ × 30% = ${repairCost.toLocaleString('vi-VN')} VNĐ)`
                    });
                  } else if ((conditionStatus === 'MISSING' || conditionStatus === 'REPLACED') && repairCost === purchasePrice) {
                    explanation = t('item.costExplanation.replacement', {
                      defaultValue: `Tự động tính: 100% giá gốc (Thay thế hoàn toàn)`
                    });
                  } else if (conditionStatus === 'REPAIRED' && percentage === 20) {
                    explanation = t('item.costExplanation.repaired', {
                      purchasePrice: purchasePrice.toLocaleString('vi-VN'),
                      repairCost: repairCost.toLocaleString('vi-VN'),
                      defaultValue: `Tự động tính: 20% giá gốc (${purchasePrice.toLocaleString('vi-VN')} VNĐ × 20% = ${repairCost.toLocaleString('vi-VN')} VNĐ)`
                    });
                  } else {
                    explanation = t('item.costExplanation.custom', {
                      defaultValue: `Giá đã được chỉnh sửa thủ công`
                    });
                  }
                }

                return explanation ? (
                  <p className="text-xs text-blue-600 mb-2 bg-blue-50 p-2 rounded border border-blue-200">
                    💡 {explanation}
                  </p>
                ) : null;
              })()}
              <input
                type="number"
                min="0"
                step="1000"
                value={repairCost !== undefined ? repairCost : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || value === null || value === undefined) {
                    setRepairCost(undefined);
                    setIsManualCost(false);
                  } else {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue >= 0) {
                      setRepairCost(numValue);
                      // Mark as manual cost when user types
                      setIsManualCost(true);
                    }
                  }
                }}
                onBlur={() => {
                  // Auto-save when user finishes editing repairCost
                  // Allow saving even if only repairCost is changed (conditionStatus may already be set)
                  if (repairCost !== undefined && repairCost !== null) {
                    // If conditionStatus is set, save with it; otherwise try to save with existing conditionStatus
                    const statusToSave = conditionStatus && conditionStatus.trim() !== ''
                      ? conditionStatus
                      : (item.conditionStatus || '');
                    if (statusToSave) {
                      onUpdate(statusToSave, notes, repairCost);
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('item.repairCostPlaceholder', { defaultValue: 'Nhập chi phí hoặc để tự động tính' })}
              />
              {repairCost !== undefined && (
                <p className="text-xs text-gray-500 mt-1">
                  {repairCost.toLocaleString('vi-VN')} VNĐ
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('item.notes', { defaultValue: 'Ghi chú' })}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('item.notesPlaceholder', { defaultValue: 'Ghi chú về tình trạng thiết bị...' })}
            />
          </div>

          <button
            onClick={() => {
              if (!conditionStatus) {
                return;
              }
              handleSave();
            }}
            disabled={!conditionStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {t('item.save', { defaultValue: 'Lưu' })}
          </button>
        </div>
      )}
    </div>
  );
}


