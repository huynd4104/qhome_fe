'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getAllReadingCycles,
  getAssignmentsByCycle,
  MeterReadingAssignmentDto,
  ReadingCycleDto,
  getAssignmentProgress,
  getMetersByAssignment,
  deleteAssignment,
  AssignmentProgressDto,
  MeterDto,
  exportMeterReadingsByCycle,
  MeterReadingImportResponse,
  completeAssignment,
  changeReadingCycleStatus,
  getCycleUnassignedInfo,
  createMeterReadingAssignment,
  createMeter,
  getMetersByUnit,
  type ReadingCycleUnassignedInfoDto,
  type MeterReadingAssignmentCreateReq,
  type MeterCreateReq,
  type UnitWithoutMeterDto,
} from '@/src/services/base/waterService';
import { getEmployees, getEmployeesByRoleNew, type EmployeeRoleDto } from '@/src/services/iam/employeeService';
import { getUnitsByBuilding, type Unit } from '@/src/services/base/unitService';
import { fetchCurrentHouseholdByUnit } from '@/src/services/base/householdService';
import { useNotifications } from '@/src/hooks/useNotifications';
import CycleCard from '@/src/components/base-service/CycleCard';
import AssignmentDetailsModal from '@/src/components/base-service/AssignmentDetailsModal';
import CycleDetailsModal from '@/src/components/base-service/CycleDetailsModal';
import DateBox from '@/src/components/customer-interaction/DateBox';

const getCycleReferenceDate = (cycle: ReadingCycleDto): Date | null => {
  const source = cycle.periodFrom || cycle.fromDate || cycle.periodTo || cycle.toDate;
  if (!source) {
    return null;
  }
  const parsed = new Date(source);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatMonthLabel = (date: Date | null, t?: (key: string) => string, locale?: string): string => {
  if (!date) {
    return t ? t('monthUnknown') : 'unknown month';
  }
  return date.toLocaleString(locale || 'en', { month: 'long', year: 'numeric' });
};

type UnassignedFloorDto = ReadingCycleUnassignedInfoDto['floors'][number];

interface CycleWithAssignments {
  cycle: ReadingCycleDto;
  assignments: MeterReadingAssignmentDto[];
  allAssignmentsCompleted: boolean;
  unassignedInfo?: ReadingCycleUnassignedInfoDto | null;
  canCompleteCycle: boolean;
}

interface ServiceCycleGroup {
  serviceId: string;
  serviceName: string | null;
  serviceCode: string | null;
  cycles: CycleWithAssignments[];
}

interface ReadingAssignDashboardProps {
  serviceCode?: string;
  serviceLabel?: string;
}

export default function ReadingAssignDashboard({
  serviceCode,
  serviceLabel,
}: ReadingAssignDashboardProps) {
  const router = useRouter();
  const { show } = useNotifications();
  const t = useTranslations('ReadingAssign');
  const locale = useLocale();
  const [cyclesWithAssignments, setCyclesWithAssignments] = useState<CycleWithAssignments[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<MeterReadingAssignmentDto | null>(null);
  const [assignmentProgress, setAssignmentProgress] = useState<AssignmentProgressDto | null>(null);
  const [assignmentMeters, setAssignmentMeters] = useState<MeterDto[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<CycleWithAssignments | null>(null);
  const [isCycleDetailsOpen, setIsCycleDetailsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [completingAssignmentId, setCompletingAssignmentId] = useState<string | null>(null);
  const [completingCycleId, setCompletingCycleId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeUnassignedModal, setActiveUnassignedModal] = useState<{
    cycle: ReadingCycleDto;
    info: ReadingCycleUnassignedInfoDto;
    assignmentAllowed: boolean;
  } | null>(null);
  const [selectedBuildings, setSelectedBuildings] = useState<Set<string>>(new Set());
  const [creatingAssignments, setCreatingAssignments] = useState(false);
  const [showStaffSelectionModal, setShowStaffSelectionModal] = useState(false);
  const [staffList, setStaffList] = useState<EmployeeRoleDto[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [startDateError, setStartDateError] = useState<string>('');
  const [endDateError, setEndDateError] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [showCreateMeterModal, setShowCreateMeterModal] = useState(false);
  const [selectedUnitsForMeter, setSelectedUnitsForMeter] = useState<Set<string>>(new Set());
  const [creatingMeters, setCreatingMeters] = useState(false);
  const [unitsWithPrimaryResident, setUnitsWithPrimaryResident] = useState<UnitWithoutMeterDto[]>([]);
  const [loadingUnitsWithResident, setLoadingUnitsWithResident] = useState(false);
  const [unitsWithResidentMap, setUnitsWithResidentMap] = useState<Map<string, boolean>>(new Map());
  const [checkingResidents, setCheckingResidents] = useState(false);

  const normalizedServiceCode = serviceCode?.toUpperCase();
  const currentDate = useMemo(() => new Date(), []);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentMonthLabel = currentDate.toLocaleString(locale, { month: 'long', year: 'numeric' });

  const isCycleCurrentMonth = useCallback(
    (cycle: ReadingCycleDto) => {
      const referenceDate = getCycleReferenceDate(cycle);
      if (!referenceDate) {
        return false;
      }
      return (
        referenceDate.getFullYear() === currentYear && referenceDate.getMonth() === currentMonth
      );
    },
    [currentYear, currentMonth]
  );

  const hasRestrictedCycles = useMemo(
    () => cyclesWithAssignments.some(({ cycle }) => !isCycleCurrentMonth(cycle)),
    [cyclesWithAssignments, isCycleCurrentMonth]
  );

  const handleOpenUnassignedModal = useCallback(
    async (cycle: ReadingCycleDto, info: ReadingCycleUnassignedInfoDto) => {
      const assignmentAllowed = isCycleCurrentMonth(cycle);
      setActiveUnassignedModal({ cycle, info, assignmentAllowed });
      
      // Debug log
      console.log('[ReadingAssignDashboard] Unassigned info:', {
        totalUnassigned: info.totalUnassigned,
        floorsCount: info.floors?.length ?? 0,
        floors: info.floors,
        missingMeterUnitsCount: info.missingMeterUnits?.length ?? 0,
      });
      
      // Backend now filters by onlyWithOwner=true, so all units in missingMeterUnits have primary resident
      // Mark all as having resident
      const map = new Map<string, boolean>();
      if (info.missingMeterUnits && info.missingMeterUnits.length > 0) {
        for (const unit of info.missingMeterUnits) {
          map.set(unit.unitId, true);
          if (unit.unitCode) {
            map.set(unit.unitCode, true);
          }
        }
      }
      setUnitsWithResidentMap(map);
      setCheckingResidents(false);
    },
    [isCycleCurrentMonth]
  );

  const handleCloseUnassignedModal = useCallback(() => {
    setActiveUnassignedModal(null);
    setSelectedBuildings(new Set());
  }, []);

  const buildingGroups = useMemo(() => {
    const info = activeUnassignedModal?.info;
    // Don't calculate if data is missing
    if (!info?.floors) {
      return [];
    }

    // Backend already filters by onlyWithOwner=true, so all units in floors have primary resident
    // We should display ALL units in floors (both units with meters and without meters)
    const map = new Map<
      string,
      {
        key: string;
        buildingId?: string;
        buildingCode?: string;
        buildingName?: string;
        floors: UnassignedFloorDto[];
      }
    >();

    for (const floor of info.floors) {
      // Display all unitCodes in this floor (backend already filtered by primary resident)
      if (floor.unitCodes.length === 0) {
        continue;
      }

      const key = floor.buildingId ?? floor.buildingCode ?? floor.buildingName ?? 'unknown';
      const existing = map.get(key);
      if (existing) {
        existing.floors.push(floor);
        continue;
      }
      map.set(key, {
        key,
        buildingId: floor.buildingId ?? undefined,
        buildingCode: floor.buildingCode ?? undefined,
        buildingName: floor.buildingName ?? undefined,
        floors: [floor],
      });
    }

    return Array.from(map.values());
  }, [activeUnassignedModal?.info]);

  const handleAssignBuilding = useCallback(
    (buildingId?: string) => {
      if (!activeUnassignedModal || !buildingId) return;
      if (!activeUnassignedModal.assignmentAllowed) {
        show(t('onlyCurrentMonthAllowed'), 'error');
        return;
      }
      const params = new URLSearchParams();
      params.set('cycleId', activeUnassignedModal.cycle.id);
      params.set('serviceId', activeUnassignedModal.info.serviceId);
      params.set('buildingId', buildingId);
      router.push(`/base/addAssignment?${params.toString()}`);
      setActiveUnassignedModal(null);
      setSelectedBuildings(new Set());
    },
    [activeUnassignedModal, router, show, t]
  );

  const handleToggleBuildingSelection = useCallback((buildingId?: string) => {
    if (!buildingId) return;
    setSelectedBuildings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(buildingId)) {
        newSet.delete(buildingId);
      } else {
        newSet.add(buildingId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllBuildings = useCallback(() => {
    if (!activeUnassignedModal) return;
    const allBuildingIds = buildingGroups
      .map(group => group.buildingId)
      .filter((id): id is string => Boolean(id));
    
    if (selectedBuildings.size === allBuildingIds.length) {
      // Deselect all
      setSelectedBuildings(new Set());
    } else {
      // Select all
      setSelectedBuildings(new Set(allBuildingIds));
    }
  }, [activeUnassignedModal, buildingGroups, selectedBuildings.size]);

  const handleOpenStaffSelectionModal = useCallback(async () => {
    if (!activeUnassignedModal || selectedBuildings.size === 0) {
      show('Vui lòng chọn ít nhất một tòa nhà', 'error');
      return;
    }
    if (!activeUnassignedModal.assignmentAllowed) {
      show(t('onlyCurrentMonthAllowed'), 'error');
      return;
    }

    // Auto-fill dates from cycle
    if (activeUnassignedModal.cycle) {
      const cycle = activeUnassignedModal.cycle;
      if (cycle.periodFrom) {
        const startDateStr = cycle.periodFrom.split('T')[0];
        setStartDate(startDateStr);
        
        // Fix endDate to always be the 15th of the month from cycle.periodFrom
        const [year, month] = startDateStr.split('-').map(Number);
        const fixedEndDate = `${year}-${String(month).padStart(2, '0')}-15`;
        setEndDate(fixedEndDate);
      }
    }

    setLoadingStaff(true);
    try {
      const staffData = await getEmployeesByRoleNew('technician');
      setStaffList(staffData);
      if (staffData.length === 0) {
        show('Không tìm thấy kỹ thuật viên nào', 'error');
        return;
      }
      setShowStaffSelectionModal(true);
    } catch (error: any) {
      show(error?.message || 'Không thể tải danh sách kỹ thuật viên', 'error');
    } finally {
      setLoadingStaff(false);
    }
  }, [activeUnassignedModal, selectedBuildings, show, t]);

  // Auto-update endDate to the 15th of the month whenever startDate changes
  useEffect(() => {
    if (startDate && showStaffSelectionModal) {
      const [year, month] = startDate.split('-').map(Number);
      if (year && month) {
        const fixedEndDate = `${year}-${String(month).padStart(2, '0')}-15`;
        setEndDate(fixedEndDate);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, showStaffSelectionModal]);

  const handleCreateAssignmentsForSelected = useCallback(async () => {
    if (!activeUnassignedModal || selectedBuildings.size === 0 || !selectedStaffId) {
      show('Vui lòng chọn kỹ thuật viên', 'error');
      return;
    }

    // Validate dates against cycle period
    setStartDateError('');
    setEndDateError('');

    const parseDateOnly = (value: string) => {
      const [datePart] = value.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const cycle = activeUnassignedModal.cycle;
    if (cycle) {
      const cycleStartDate = parseDateOnly(cycle.periodFrom);
      const cycleEndDate = parseDateOnly(cycle.periodTo);

      if (startDate) {
        const startDateValue = parseDateOnly(startDate);
        if (startDateValue < cycleStartDate) {
          setStartDateError('Ngày bắt đầu không được trước chu kỳ');
          return;
        }
      }

      // EndDate is fixed to 15th, so ensure it's always the 15th of the month from startDate
      if (startDate) {
        const [year, month] = startDate.split('-').map(Number);
        if (year && month) {
          const fixedEndDate = `${year}-${String(month).padStart(2, '0')}-15`;
          if (endDate !== fixedEndDate) {
            setEndDate(fixedEndDate);
          }
          // Validate that endDate (fixed to 15th) is not after cycle end date
          const endDateValue = parseDateOnly(fixedEndDate);
          if (endDateValue > cycleEndDate) {
            setEndDateError('Ngày kết thúc không được sau chu kỳ');
            return;
          }
        }
      }
    }

    setCreatingAssignments(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // Get all units for each building and create assignment (only for units with primary resident)
      for (const buildingId of selectedBuildings) {
        try {
          // Get all units in this building
          const units = await getUnitsByBuilding(buildingId);
          
          // Filter units that have primary resident
          const unitsWithResident: string[] = [];
          for (const unit of units) {
            // fetchCurrentHouseholdByUnit returns null for 404 (no household), which is valid
            const household = await fetchCurrentHouseholdByUnit(unit.id);
            if (household && household.primaryResidentId) {
              unitsWithResident.push(unit.id);
            }
          }

          if (unitsWithResident.length === 0) {
            const buildingName = buildingGroups.find(g => g.buildingId === buildingId)?.buildingCode || buildingId;
            errors.push(`${buildingName}: Không có căn hộ nào có chủ nhà`);
            errorCount++;
            continue;
          }

          // Create assignment request (only for units with primary resident)
          const assignmentReq: MeterReadingAssignmentCreateReq = {
            cycleId: activeUnassignedModal.cycle.id,
            serviceId: activeUnassignedModal.info.serviceId,
            buildingId: buildingId,
            assignedTo: selectedStaffId,
            unitIds: unitsWithResident,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            note: note || undefined,
          };

          await createMeterReadingAssignment(assignmentReq);
          successCount++;
        } catch (error: any) {
          errorCount++;
          const buildingName = buildingGroups.find(g => g.buildingId === buildingId)?.buildingCode || buildingId;
          const errorMsg = error?.response?.data?.message || error?.message || 'Lỗi không xác định';
          errors.push(`${buildingName}: ${errorMsg}`);
        }
      }

      if (successCount > 0) {
        show(
          `Đã tạo thành công ${successCount} assignment${successCount > 1 ? 's' : ''} cho ${selectedBuildings.size} tòa nhà${errorCount > 0 ? `. ${errorCount} lỗi.` : ''}`,
          'success'
        );
        setShowStaffSelectionModal(false);
        setSelectedStaffId('');
        setStartDate('');
        setEndDate('');
        setStartDateError('');
        setEndDateError('');
        setNote('');
        setSelectedBuildings(new Set());
        setActiveUnassignedModal(null);
        // Trigger reload by updating reloadTrigger
        setReloadTrigger(prev => prev + 1);
      }

      if (errorCount > 0 && successCount === 0) {
        show(`Không thể tạo assignment. Lỗi: ${errors.join('; ')}`, 'error');
      }
    } catch (error: any) {
      show(error?.message || 'Không thể tạo assignment', 'error');
    } finally {
      setCreatingAssignments(false);
    }
  }, [activeUnassignedModal, selectedBuildings, selectedStaffId, buildingGroups, show]);

  const handleAddAssignment = (cycle: ReadingCycleDto) => {
    const params = new URLSearchParams();
    params.set('cycleId', cycle.id);
    if (serviceCode) {
      params.set('serviceCode', serviceCode);
    }
    router.push(`/base/addAssignment?${params.toString()}`);
  };

  const handleOpenCreateMeterModal = useCallback(async () => {
    if (!activeUnassignedModal || selectedBuildings.size === 0) {
      show('Vui lòng chọn ít nhất một tòa nhà', 'error');
      return;
    }
    if (!activeUnassignedModal.assignmentAllowed) {
      show(t('onlyCurrentMonthAllowed'), 'error');
      return;
    }

    setLoadingUnitsWithResident(true);
    setSelectedUnitsForMeter(new Set());
    try {
      const serviceId = activeUnassignedModal.info.serviceId;
      const allUnitsFromBuildings: Unit[] = [];
      
      // Get ALL units from selected buildings (not just missingMeterUnits)
      for (const buildingId of selectedBuildings) {
        try {
          const units = await getUnitsByBuilding(buildingId);
          allUnitsFromBuildings.push(...units);
        } catch (error: any) {
          console.warn(`Failed to load units for building ${buildingId}:`, error);
        }
      }

      // Check which units have primary resident AND don't have meter yet
      const unitsWithResidentAndNoMeter: UnitWithoutMeterDto[] = [];
      let unitsWithResidentButHasMeter = 0;
      let unitsWithoutResident = 0;
      
      for (const unit of allUnitsFromBuildings) {
        // fetchCurrentHouseholdByUnit returns null for 404 (no household), which is valid
        const household = await fetchCurrentHouseholdByUnit(unit.id);
        if (!household || !household.primaryResidentId) {
          unitsWithoutResident++;
          continue; // Skip units without primary resident
        }
        
        // Check if unit already has meter for this service
        try {
          const meters = await getMetersByUnit(unit.id);
          const hasMeterForService = meters.some(meter => 
            meter.serviceId === serviceId && meter.active === true
          );
          if (hasMeterForService) {
            unitsWithResidentButHasMeter++;
            continue; // Skip units that already have meter
          }
        } catch (error) {
          // If error checking meters, skip this unit to be safe
          console.warn(`Failed to check meters for unit ${unit.id}:`, error);
          continue;
        }
        
        // Unit has primary resident and no meter - add to list
        const buildingCode = buildingGroups.find(g => g.buildingId === unit.buildingId)?.buildingCode;
        unitsWithResidentAndNoMeter.push({
          unitId: unit.id,
          unitCode: unit.code,
          floor: unit.floor,
          buildingId: unit.buildingId,
          buildingCode: buildingCode,
          serviceId: serviceId,
        });
      }

      setUnitsWithPrimaryResident(unitsWithResidentAndNoMeter);
      if (unitsWithResidentAndNoMeter.length === 0) {
        // Provide more specific message based on the situation
        if (unitsWithResidentButHasMeter > 0) {
          show('Các căn hộ trong tòa nhà đã chọn đã có công tơ', 'info');
        } else if (unitsWithoutResident > 0) {
          show('Không có căn hộ nào có chủ nhà trong các tòa nhà đã chọn', 'error');
        } else {
          show('Không có căn hộ nào có chủ nhà và chưa có công tơ trong các tòa nhà đã chọn', 'error');
        }
        return;
      }
      setShowCreateMeterModal(true);
    } catch (error: any) {
      show(error?.message || 'Không thể tải danh sách căn hộ', 'error');
    } finally {
      setLoadingUnitsWithResident(false);
    }
  }, [activeUnassignedModal, selectedBuildings, buildingGroups, show, t]);

  const handleToggleUnitSelection = useCallback((unitId: string) => {
    setSelectedUnitsForMeter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(unitId)) {
        newSet.delete(unitId);
      } else {
        newSet.add(unitId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllUnits = useCallback(() => {
    if (selectedUnitsForMeter.size === unitsWithPrimaryResident.length) {
      setSelectedUnitsForMeter(new Set());
    } else {
      setSelectedUnitsForMeter(new Set(unitsWithPrimaryResident.map(u => u.unitId)));
    }
  }, [selectedUnitsForMeter.size, unitsWithPrimaryResident]);

  const handleCreateMetersForSelected = useCallback(async () => {
    if (!activeUnassignedModal || selectedUnitsForMeter.size === 0) {
      show('Vui lòng chọn ít nhất một căn hộ', 'error');
      return;
    }

    setCreatingMeters(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      const serviceId = activeUnassignedModal.info.serviceId;
      
      for (const unitId of selectedUnitsForMeter) {
        try {
          const unit = unitsWithPrimaryResident.find(u => u.unitId === unitId);
          if (!unit) continue;

          // Double-check: verify unit doesn't already have meter for this service
          try {
            const meters = await getMetersByUnit(unitId);
            const hasMeterForService = meters.some(meter => 
              meter.serviceId === serviceId && meter.active === true
            );
            if (hasMeterForService) {
              // Unit already has meter, skip silently or log
              console.log(`Unit ${unit.unitCode || unitId} already has meter for service ${serviceId}, skipping`);
              continue;
            }
          } catch (checkError) {
            // If check fails, proceed with creation (might be network issue)
            console.warn(`Failed to check existing meters for unit ${unitId}:`, checkError);
          }

          const meterReq: MeterCreateReq = {
            unitId: unitId,
            serviceId: serviceId,
            installedAt: new Date().toISOString().split('T')[0],
          };

          await createMeter(meterReq);
          successCount++;
        } catch (error: any) {
          const unit = unitsWithPrimaryResident.find(u => u.unitId === unitId);
          const unitCode = unit?.unitCode || unitId;
          
          // Check if error is due to duplicate meter
          const errorMsg = error?.response?.data?.message || error?.message || 'Lỗi không xác định';
          const isDuplicateError = errorMsg.toLowerCase().includes('duplicate') || 
                                   errorMsg.toLowerCase().includes('đã tồn tại') ||
                                   errorMsg.toLowerCase().includes('already exists') ||
                                   error?.response?.status === 409; // Conflict
          
          if (isDuplicateError) {
            // Skip duplicate errors silently (meter already exists)
            console.log(`Unit ${unitCode} already has meter, skipping`);
            continue; // Don't increment errorCount for duplicate errors
          }
          
          // Only count non-duplicate errors
          errorCount++;
          errors.push(`${unitCode}: ${errorMsg}`);
        }
      }

      if (successCount > 0) {
        show(
          `Đã tạo thành công ${successCount} công tơ${successCount > 1 ? '' : ''}${errorCount > 0 ? `. ${errorCount} lỗi.` : ''}`,
          'success'
        );
        setShowCreateMeterModal(false);
        setSelectedUnitsForMeter(new Set());
        setSelectedBuildings(new Set());
        // Close unassigned modal and reload data
        setActiveUnassignedModal(null);
        setUnitsWithResidentMap(new Map());
        setReloadTrigger(prev => prev + 1);
      }

      if (errorCount > 0 && successCount === 0) {
        show(`Không thể tạo công tơ. Lỗi: ${errors.join('; ')}`, 'error');
      }
    } catch (error: any) {
      show(error?.message || 'Không thể tạo công tơ', 'error');
    } finally {
      setCreatingMeters(false);
    }
  }, [activeUnassignedModal, selectedUnitsForMeter, unitsWithPrimaryResident, show]);

  // Load cycles and assignments
  useEffect(() => {
    loadCyclesWithAssignments();
  }, [normalizedServiceCode, reloadTrigger]);

  const filteredCycles = useMemo(() => {
    if (statusFilter === 'ALL') {
      return cyclesWithAssignments;
    }
    return cyclesWithAssignments.filter(({ cycle }) => cycle.status === statusFilter);
  }, [cyclesWithAssignments, statusFilter]);

  const serviceCycleGroups = useMemo<ServiceCycleGroup[]>(() => {
    const groups = new Map<string, ServiceCycleGroup>();
    for (const cycleInfo of filteredCycles) {
      const serviceKey = cycleInfo.cycle.serviceId ?? 'unknown-service';
      const existing = groups.get(serviceKey);
      if (existing) {
        existing.cycles.push(cycleInfo);
        continue;
      }
      groups.set(serviceKey, {
        serviceId: serviceKey,
        serviceName: cycleInfo.cycle.serviceName ?? null,
        serviceCode: cycleInfo.cycle.serviceCode ?? null,
        cycles: [cycleInfo],
      });
    }
    return Array.from(groups.values());
  }, [filteredCycles]);

  const loadCyclesWithAssignments = async () => {
    try {
      setLoading(true);

      const cycles = await getAllReadingCycles();

      const parseDate = (...values: (string | null | undefined)[]) => {
        for (const value of values) {
          if (!value) continue;
          const time = new Date(value).getTime();
          if (!Number.isNaN(time)) {
            return time;
          }
        }
        return 0;
      };

      const sortedCycles = [...cycles].sort(
        (a, b) =>
          parseDate(b.periodFrom, b.fromDate, b.createdAt, b.updatedAt) -
          parseDate(a.periodFrom, a.fromDate, a.createdAt, a.updatedAt)
      );

      const relevantCycles = normalizedServiceCode
        ? sortedCycles.filter((cycle) => cycle.serviceCode?.toUpperCase() === normalizedServiceCode)
        : sortedCycles;

      let userMap: Map<string, string> = new Map();
      try {
        const employees = await getEmployees();
        userMap = new Map(
          employees
            .filter((emp) => emp.userId)
            .map((emp) => [emp.userId!, emp.username || emp.userId!])
        );
      } catch (error) {
        console.error('Failed to load employees:', error);
      }

      const cyclesData: CycleWithAssignments[] = await Promise.all(
        relevantCycles.map(async (cycle) => {
          try {
            const assignments = await getAssignmentsByCycle(cycle.id);
            const enrichedAssignments = await Promise.all(
              assignments.map(async (assignment) => {
                const enriched = { ...assignment, cycleId: assignment.cycleId || cycle.id };

                enriched.assignedToName = userMap.get(assignment.assignedTo) || assignment.assignedTo;

                try {
                  const progress = await getAssignmentProgress(assignment.id);
                  const totalUnits = assignment.unitIds?.length || 0;
                  const filledCount = progress.readingsDone || 0;
                  enriched.progressPercentage =
                    totalUnits > 0 ? Math.round((filledCount / totalUnits) * 100) : 0;
                } catch (error) {
                  console.error(`Failed to load progress for assignment ${assignment.id}:`, error);
                  enriched.progressPercentage = 0;
                }

                return enriched;
              })
            );

            const allAssignmentsCompleted =
              enrichedAssignments.length > 0
                ? enrichedAssignments.every((a) => Boolean(a.completedAt))
                : false;

            let unassignedInfo: ReadingCycleUnassignedInfoDto | null = null;
            try {
              unassignedInfo = await getCycleUnassignedInfo(cycle.id, true); // onlyWithOwner = true
            } catch (error) {
              console.warn(
                `[ReadingAssignDashboard] Failed to load unassigned info for cycle ${cycle.id}:`,
                error
              );
            }

            const canCompleteCycle = allAssignmentsCompleted && !(unassignedInfo?.totalUnassigned ?? 0);

            return {
              cycle,
              assignments: enrichedAssignments,
              allAssignmentsCompleted,
              unassignedInfo,
              canCompleteCycle,
            };
          } catch (error) {
            console.error(`Failed to load assignments for cycle ${cycle.id}:`, error);
            return {
              cycle,
              assignments: [],
              allAssignmentsCompleted: false,
              unassignedInfo: null,
              canCompleteCycle: false,
            };
          }
        })
      );

      setCyclesWithAssignments(cyclesData);
    } catch (error) {
      console.error('Failed to load cycles:', error);
      show(t('failedToLoadCycles'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAssignment = async (assignment: MeterReadingAssignmentDto) => {
    try {
      setLoading(true);
      const [progress, meters] = await Promise.all([
        getAssignmentProgress(assignment.id),
        getMetersByAssignment(assignment.id),
      ]);

      setSelectedAssignment(assignment);
      setAssignmentProgress(progress);
      setAssignmentMeters(meters);
      setIsDetailsOpen(true);
    } catch (error: any) {
      show(error?.message || t('failedToLoadDetails'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm(t('confirmDeleteAssignment'))) return;

    try {
      await deleteAssignment(assignmentId);
      show(t('assignmentDeleted'), 'success');
      loadCyclesWithAssignments();

      if (selectedAssignment?.id === assignmentId) {
        setIsDetailsOpen(false);
        setSelectedAssignment(null);
      }
    } catch (error: any) {
      show(error?.message || t('failedToDelete'), 'error');
    }
  };

  const toggleCycle = (cycleId: string) => {
    setExpandedCycleId(expandedCycleId === cycleId ? null : cycleId);
  };

  const handleCloseModal = () => {
    setIsDetailsOpen(false);
    setSelectedAssignment(null);
    setAssignmentProgress(null);
    setAssignmentMeters([]);
  };

  const handleViewCycle = (cycle: ReadingCycleDto) => {
    const cycleInfo = cyclesWithAssignments.find((item) => item.cycle.id === cycle.id);
    if (cycleInfo) {
      setSelectedCycle(cycleInfo);
      setIsCycleDetailsOpen(true);
    }
  };

  const handleCloseCycleModal = () => {
    setIsCycleDetailsOpen(false);
    setSelectedCycle(null);
  };

  const handleExportInvoices = async (cycle: ReadingCycleDto) => {
    const cycleInfo = cyclesWithAssignments.find((item) => item.cycle.id === cycle.id);
    if (!cycleInfo) {
      show(t('unableToLocateCycle'), 'error');
      return;
    }

    try {
      setIsExporting(true);
      if (cycleInfo.cycle.status !== 'COMPLETED') {
        if (!cycleInfo.allAssignmentsCompleted) {
          show(t('allAssignmentsMustComplete'), 'error');
          return;
        }
        if ((cycleInfo.unassignedInfo?.totalUnassigned ?? 0) > 0) {
          const missingMessage =
            cycleInfo.unassignedInfo?.message ||
            'Còn một số căn hộ chưa được assign. Vui lòng kiểm tra lại.';
          show(missingMessage, 'error');
          return;
        }
        try {
          setCompletingCycleId(cycleInfo.cycle.id);
          await changeReadingCycleStatus(cycleInfo.cycle.id, 'COMPLETED');
          show(t('cycleMarkedCompleted'), 'success');
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || t('failedToUpdateStatus');
          show(msg, 'error');
          return;
        } finally {
          setCompletingCycleId(null);
        }
      }
      const result: MeterReadingImportResponse = await exportMeterReadingsByCycle(cycle.id);
      const successMessage =
        result.message ||
        t('exportedInvoices', { invoicesCreated: result.invoicesCreated, totalReadings: result.totalReadings });
      show(successMessage, 'success');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t('failedToExport');
      show(message, 'error');
    } finally {
      setIsExporting(false);
      await loadCyclesWithAssignments();
    }
  };

  const handleCompleteAssignment = async (assignment: MeterReadingAssignmentDto) => {
    if (!assignment.id) return;
    if (!confirm(t('confirmCompleteAssignment'))) return;
    try {
      setCompletingAssignmentId(assignment.id);
      await completeAssignment(assignment.id);
      show(t('assignmentCompleted'), 'success');
      await handleViewAssignment(assignment);
      await loadCyclesWithAssignments();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t('failedToComplete');
      show(message, 'error');
    } finally {
      setCompletingAssignmentId(null);
    }
  };

  const handleCompleteCycle = async (cycle: ReadingCycleDto) => {
    if (!cycle.id) return;
    if (!confirm(t('confirmCompleteCycle'))) return;
    try {
      setCompletingCycleId(cycle.id);
      await changeReadingCycleStatus(cycle.id, 'COMPLETED');
      show(t('cycleCompleted'), 'success');
      await loadCyclesWithAssignments();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t('failedToComplete');
      show(message, 'error');
    } finally {
      setCompletingCycleId(null);
    }
  };

  return (
    <div className="px-[41px] py-12">
      <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">{t('assignmentManagement')}</p>
          <h1 className="text-2xl font-semibold text-[#02542D]">
            {serviceLabel ? `${serviceLabel} - ${t('assignmentManagement')}` : t('assignmentManagement')}
          </h1>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              {t('filterByStatus')}
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#02542D] focus:border-transparent"
            >
              <option value="ALL">{t('all')}</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
          {serviceLabel && (
            <Link
              href="/base/readingAssign"
              className="text-sm text-[#02542D] font-semibold hover:underline whitespace-nowrap"
            >
              {t('selectOtherService')}
            </Link>
          )}
        </div>
      </div>
      {hasRestrictedCycles && (
        <div className="text-sm text-gray-500 mb-4">
          {t('restrictedCyclesMessage', { month: currentMonthLabel })}
        </div>
      )}

      {loading && cyclesWithAssignments.length === 0 ? (
        <div className="bg-white p-6 rounded-xl text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#739559] mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {serviceCycleGroups.length === 0 ? (
            <div className="bg-white p-6 rounded-xl text-center text-gray-500">
              {t('noCyclesFound')}
            </div>
          ) : (
            serviceCycleGroups.map((group) => (
              <section key={group.serviceId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t('service')}
                    </p>
                    <h2 className="text-lg font-semibold text-[#02542D]">
                      {group.serviceName || group.serviceCode || t('serviceUnknown')}
                    </h2>
                    {group.serviceCode && (
                      <p className="text-sm text-gray-500">
                        {t('serviceCode')} {group.serviceCode}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-500">
                    {group.cycles.length} {t('cycles')}
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  {group.cycles.map(({ cycle, assignments, unassignedInfo, canCompleteCycle }) => {
                    const cycleMonthLabel = formatMonthLabel(getCycleReferenceDate(cycle), t, locale);
                    let assignmentBlockedReason: string | undefined;
                    if (!isCycleCurrentMonth(cycle)) {
                      assignmentBlockedReason = t('cycleRestrictedMessage', { month: cycleMonthLabel });
                    } else if (cycle.status === 'OPEN') {
                      // Only show message for OPEN status, not for COMPLETED or CLOSED
                      assignmentBlockedReason = t('cycleNotInProgress');
                    }
                    return (
                      <CycleCard
                        key={cycle.id}
                        cycle={cycle}
                        assignments={assignments}
                        isExpanded={expandedCycleId === cycle.id}
                        onToggle={() => toggleCycle(cycle.id)}
                        onViewAssignment={handleViewAssignment}
                        onDeleteAssignment={handleDeleteAssignment}
                        canCompleteCycle={canCompleteCycle}
                        unassignedInfo={unassignedInfo ?? undefined}
                        onCompleteCycle={handleCompleteCycle}
                        isCompleting={completingCycleId === cycle.id}
                        onAddAssignment={handleAddAssignment}
                        onViewUnassigned={handleOpenUnassignedModal}
                        onViewCycle={handleViewCycle}
                        assignmentBlockedReason={assignmentBlockedReason}
                        onMetersCreated={loadCyclesWithAssignments}
                      />
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      <AssignmentDetailsModal
        isOpen={isDetailsOpen}
        assignment={selectedAssignment}
        progress={assignmentProgress}
        meters={assignmentMeters}
        onClose={handleCloseModal}
        onComplete={handleCompleteAssignment}
        isCompleting={Boolean(completingAssignmentId && selectedAssignment?.id === completingAssignmentId)}
      />
      {selectedCycle && (
        <CycleDetailsModal
          isOpen={isCycleDetailsOpen}
          cycle={selectedCycle.cycle}
          assignments={selectedCycle.assignments}
          unassignedInfo={selectedCycle.unassignedInfo}
          allAssignmentsCompleted={selectedCycle.allAssignmentsCompleted}
          canCompleteCycle={selectedCycle.canCompleteCycle}
          onClose={handleCloseCycleModal}
          onExport={handleExportInvoices}
          isExporting={isExporting}
        />
      )}
      {activeUnassignedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-w-4xl w-full rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-500">{t('unassigned')}</p>
                <h3 className="text-lg font-semibold text-[#02542D]">
                  Chu kỳ {activeUnassignedModal.cycle.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {t('unitsUnassigned', { count: activeUnassignedModal.info.totalUnassigned })}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseUnassignedModal}
                className="text-gray-500 hover:text-gray-900 text-sm"
              >
                {t('close')}
              </button>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {checkingResidents ? (
                <div className="flex items-center gap-2 py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#02542D]"></div>
                  <span className="text-sm text-gray-600">Đang kiểm tra căn hộ có chủ nhà...</span>
                </div>
              ) : (
                <>
                  {buildingGroups.length > 0 ? (
                    <div className="text-sm text-gray-600 mb-4">
                      <p className="font-semibold mb-2">
                        Còn {buildingGroups.reduce((sum, group) => 
                          sum + group.floors.reduce((floorSum, floor) => floorSum + floor.unitCodes.length, 0), 0
                        )} căn hộ/phòng chưa được assign (chỉ hiển thị căn có chủ nhà):
                      </p>
                      <div className="space-y-1 text-xs">
                        {buildingGroups.map((group) => {
                          const totalUnits = group.floors.reduce((sum, floor) => sum + floor.unitCodes.length, 0);
                          const missingMeterCount = group.floors.reduce((sum, floor) => 
                            sum + floor.unitCodes.filter((code: string) => code.includes('(chưa có công tơ)')).length, 0
                          );
                          return (
                            <div key={group.key}>
                              <span className="font-semibold">
                                {group.buildingCode || group.buildingName || 'Tòa nhà chưa rõ'}:
                              </span>{' '}
                              {totalUnits} căn hộ{missingMeterCount > 0 ? ` (${missingMeterCount} chưa có công tơ)` : ''}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : unitsWithResidentMap.size > 0 ? (
                    <p className="text-sm text-gray-500">
                      Không có căn hộ nào có chủ nhà trong danh sách chưa được assign.
                    </p>
                  ) : null}
                </>
              )}
              {!checkingResidents && (
                <>
                  {buildingGroups.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      {activeUnassignedModal?.info?.totalUnassigned && activeUnassignedModal.info.totalUnassigned > 0
                        ? `Có ${activeUnassignedModal.info.totalUnassigned} căn hộ chưa được assign nhưng không có dữ liệu chi tiết.`
                        : t('noData')}
                    </p>
                  ) : (
                    <>
                      {/* Select All / Deselect All */}
                      <div className="flex items-center justify-between pb-2 border-b">
                        <span className="text-sm text-gray-600">
                          {selectedBuildings.size > 0 && `${selectedBuildings.size} tòa nhà đã chọn`}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSelectAllBuildings}
                            className="text-xs font-semibold text-[#02542D] hover:underline"
                          >
                            {selectedBuildings.size === buildingGroups.filter(g => g.buildingId).length
                              ? 'Bỏ chọn tất cả'
                              : 'Chọn tất cả'}
                          </button>
                          {selectedBuildings.size > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={handleOpenCreateMeterModal}
                                disabled={!activeUnassignedModal.assignmentAllowed || creatingMeters}
                                className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {creatingMeters ? 'Đang tải...' : 'Tạo công tơ cho nhiều căn hộ'}
                              </button>
                              <button
                                type="button"
                                onClick={handleOpenStaffSelectionModal}
                                disabled={!activeUnassignedModal.assignmentAllowed || creatingAssignments}
                                className="text-xs font-semibold bg-[#02542D] text-white px-3 py-1 rounded hover:bg-[#024428] disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {creatingAssignments ? 'Đang tạo...' : `Tạo assignment cho ${selectedBuildings.size} tòa`}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        {buildingGroups.map((group) => {
                          const isSelected = group.buildingId ? selectedBuildings.has(group.buildingId) : false;
                          return (
                            <div key={group.key} className={`rounded-xl border p-4 ${
                              isSelected ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  {group.buildingId && (
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleBuildingSelection(group.buildingId)}
                                      disabled={!activeUnassignedModal.assignmentAllowed}
                                      className="mt-1 h-4 w-4 text-[#02542D] focus:ring-[#02542D] border-gray-300 rounded"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-800">
                                      {group.buildingCode || group.buildingName || t('buildingUnknown')}
                                    </p>
                                    {group.buildingName && group.buildingName !== group.buildingCode && (
                                      <p className="text-xs text-gray-500">{group.buildingName}</p>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <button
                                    type="button"
                                    disabled={!group.buildingId || !activeUnassignedModal.assignmentAllowed}
                                    onClick={() => handleAssignBuilding(group.buildingId)}
                                    className="text-xs font-semibold text-[#02542D] hover:underline disabled:text-gray-400"
                                  >
                                    {group.buildingId
                                      ? activeUnassignedModal.assignmentAllowed
                                        ? t('createAssignmentForBuilding')
                                        : t('cycleNotOpen')
                                      : t('noBuildingId')}
                                  </button>
                                </div>
                              </div>
                              <div className="mt-3 text-sm text-gray-700">
                                <div>
                                  <span className="font-semibold">
                                    Tổng cộng:
                                  </span>{' '}
                                  {(() => {
                                    const total = group.floors.reduce((sum, floor) => sum + floor.unitCodes.length, 0);
                                    const missingMeter = group.floors.reduce((sum, floor) => 
                                      sum + floor.unitCodes.filter((code: string) => code.includes('(chưa có công tơ)')).length, 0
                                    );
                                    return `${total} căn hộ${missingMeter > 0 ? ` (${missingMeter} chưa có công tơ)` : ''}`;
                                  })()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Staff Selection Modal for Multiple Buildings */}
      {showStaffSelectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-w-md w-full rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-500">Chọn kỹ thuật viên</p>
                <h3 className="text-lg font-semibold text-[#02542D]">
                  Tạo assignment cho {selectedBuildings.size} tòa nhà
                </h3>
                <p className="text-sm text-gray-600">
                  Vui lòng chọn kỹ thuật viên để gán cho tất cả các tòa nhà đã chọn
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowStaffSelectionModal(false);
                  setSelectedStaffId('');
                  setStartDate('');
                  setEndDate('');
                  setStartDateError('');
                  setEndDateError('');
                  setNote('');
                }}
                className="text-gray-500 hover:text-gray-900 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {loadingStaff ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#02542D] mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Đang tải danh sách kỹ thuật viên...</p>
                </div>
              ) : staffList.length === 0 ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">Không tìm thấy kỹ thuật viên nào</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kỹ thuật viên <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#02542D]"
                    >
                      <option value="">Chọn kỹ thuật viên</option>
                      {staffList.map((staff) => (
                        <option key={staff.userId} value={staff.userId}>
                          {staff.username || staff.email || staff.userId}
                          {staff.email && ` (${staff.email})`}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ngày bắt đầu <span className="text-gray-500 text-xs">(Tùy chọn)</span>
                      </label>
                      <DateBox
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          if (startDateError) {
                            setStartDateError('');
                          }
                        }}
                        placeholderText="Chọn ngày bắt đầu"
                      />
                      {startDateError && (
                        <span className="text-red-500 text-xs mt-1 block">{startDateError}</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ngày kết thúc <span className="text-gray-500 text-xs">(Cố định: ngày 15)</span>
                      </label>
                      <DateBox
                        value={endDate}
                        onChange={(e) => {
                          // Prevent manual changes - endDate is fixed to 15th
                          // Auto-update to 15th if user tries to change it
                          if (startDate) {
                            const [year, month] = startDate.split('-').map(Number);
                            if (year && month) {
                              const fixedEndDate = `${year}-${String(month).padStart(2, '0')}-15`;
                              setEndDate(fixedEndDate);
                            }
                          }
                          if (endDateError) {
                            setEndDateError('');
                          }
                        }}
                        placeholderText="Chọn ngày kết thúc"
                        disabled={true}
                      />
                      {endDateError && (
                        <span className="text-red-500 text-xs mt-1 block">{endDateError}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Note */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ghi chú <span className="text-gray-500 text-xs">(Tùy chọn)</span>
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Ghi chú bổ sung (tùy chọn)"
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#02542D]"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCreateAssignmentsForSelected}
                      disabled={!selectedStaffId || creatingAssignments}
                      className="flex-1 px-4 py-2 bg-[#02542D] text-white rounded-md hover:bg-[#024428] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {creatingAssignments ? 'Đang tạo...' : `Tạo assignment cho ${selectedBuildings.size} tòa`}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowStaffSelectionModal(false);
                        setSelectedStaffId('');
                        setStartDate('');
                        setEndDate('');
                        setStartDateError('');
                        setEndDateError('');
                        setNote('');
                      }}
                      disabled={creatingAssignments}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                    >
                      Hủy
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Meter Modal for Multiple Units */}
      {showCreateMeterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-w-4xl w-full rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-500">Tạo công tơ</p>
                <h3 className="text-lg font-semibold text-[#02542D]">
                  Tạo công tơ cho nhiều căn hộ
                </h3>
                <p className="text-sm text-gray-600">
                  Chỉ hiển thị các căn hộ có chủ nhà và chưa có công tơ
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateMeterModal(false);
                  setSelectedUnitsForMeter(new Set());
                }}
                className="text-gray-500 hover:text-gray-900 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {loadingUnitsWithResident ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#02542D] mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Đang tải danh sách căn hộ...</p>
                </div>
              ) : unitsWithPrimaryResident.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-700">Không có căn hộ nào có chủ nhà trong các tòa nhà đã chọn</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="text-sm text-gray-600">
                      {selectedUnitsForMeter.size > 0 && `${selectedUnitsForMeter.size} căn hộ đã chọn`}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllUnits}
                        className="text-xs font-semibold text-[#02542D] hover:underline"
                      >
                        {selectedUnitsForMeter.size === unitsWithPrimaryResident.length
                          ? 'Bỏ chọn tất cả'
                          : 'Chọn tất cả'}
                      </button>
                      {selectedUnitsForMeter.size > 0 && (
                        <button
                          type="button"
                          onClick={handleCreateMetersForSelected}
                          disabled={creatingMeters}
                          className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingMeters ? 'Đang tạo...' : `Tạo công tơ cho ${selectedUnitsForMeter.size} căn hộ`}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {unitsWithPrimaryResident.map((unit) => {
                      const isSelected = selectedUnitsForMeter.has(unit.unitId);
                      return (
                        <div
                          key={unit.unitId}
                          className={`rounded-lg border p-3 ${
                            isSelected ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleUnitSelection(unit.unitId)}
                              className="h-4 w-4 text-[#02542D] focus:ring-[#02542D] border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-800">
                                {unit.unitCode}
                              </p>
                              {unit.buildingCode && (
                                <p className="text-xs text-gray-500">Tòa {unit.buildingCode}</p>
                              )}
                              {unit.floor !== null && unit.floor !== undefined && (
                                <p className="text-xs text-gray-500">Tầng {unit.floor}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



