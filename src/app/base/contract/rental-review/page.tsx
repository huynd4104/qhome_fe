'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useNotifications } from '@/src/hooks/useNotifications';
import { useNotificationAdd } from '@/src/hooks/useNotificationAdd';
import { useAuth } from '@/src/contexts/AuthContext';
import { getBuildings, type Building } from '@/src/services/base/buildingService';
import { getUnitsByBuilding, type Unit } from '@/src/services/base/unitService';
import {
  ContractDetail,
  ContractSummary,
  fetchContractDetail,
  getAllRentalContracts,
} from '@/src/services/base/contractService';
import {
  AssetInspection,
  AssetInspectionItem,
  InspectionStatus,
  getInspectionByContractId,
  getAllInspections,
  createInspection,
  updateInspectionItem,
  startInspection,
  completeInspection,
  assignInspector,
  type CreateAssetInspectionRequest,
  type UpdateAssetInspectionItemRequest,
} from '@/src/services/base/assetInspectionService';
import { fetchStaffAccounts, type UserAccountInfo } from '@/src/services/iam/userService';
import Pagination from '@/src/components/customer-interaction/Pagination';
import { 
  getMetersByUnit, 
  createMeterReading, 
  getReadingCyclesByStatus,
  getAssignmentsByStaff,
  type MeterDto,
  type MeterReadingCreateReq,
  type ReadingCycleDto,
  type MeterReadingAssignmentDto,
} from '@/src/services/base/waterService';

interface RentalContractWithUnit extends ContractSummary {
  unitCode?: string;
  unitName?: string;
  buildingCode?: string;
  buildingName?: string;
  monthlyRent?: number | null;
}

export default function RentalContractReviewPage() {
  const { show } = useNotifications();
  const { addNotification } = useNotificationAdd();
  const { hasRole, isLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('RentalReview');
  const searchParams = useSearchParams();
  
  // Check user roles - ADMIN and SUPPORTER can view
  const isAdmin = hasRole('ADMIN') || hasRole('admin') || hasRole('ROLE_ADMIN') || hasRole('ROLE_admin');
  const isSupporter = hasRole('SUPPORTER') || hasRole('supporter') || hasRole('ROLE_SUPPORTER') || hasRole('ROLE_supporter');
  const canView = isAdmin || isSupporter;

  const [contracts, setContracts] = useState<RentalContractWithUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsMap, setUnitsMap] = useState<Map<string, Unit>>(new Map());
  const [buildingsMap, setBuildingsMap] = useState<Map<string, Building>>(new Map());
  
  // Filters
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'expiring' | 'cancelled' | 'notInspected'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Map to track which contracts have inspections
  const [contractsWithInspection, setContractsWithInspection] = useState<Set<string>>(new Set());
  // Map to store inspection data by contractId (for displaying inspectionDate)
  const [inspectionsByContractId, setInspectionsByContractId] = useState<Map<string, AssetInspection>>(new Map());

  // Detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailContract, setDetailContract] = useState<ContractDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Inspection modal
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [currentInspection, setCurrentInspection] = useState<AssetInspection | null>(null);
  const [currentContract, setCurrentContract] = useState<RentalContractWithUnit | null>(null);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [creatingInspection, setCreatingInspection] = useState(false);
  const [inspectorName, setInspectorName] = useState('');
  const [inspectorNotes, setInspectorNotes] = useState('');
  
  // Technician assignment
  const [technicians, setTechnicians] = useState<UserAccountInfo[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);
  
  // Pagination
  const initialPageSize = 10;
  const [pageNo, setPageNo] = useState<number>(0);
  const [pageSize] = useState<number>(initialPageSize);
  // Meter reading
  const [unitMeters, setUnitMeters] = useState<MeterDto[]>([]);
  const [loadingMeters, setLoadingMeters] = useState(false);
  const [meterReadings, setMeterReadings] = useState<Record<string, { index: string; note?: string }>>({});
  const [readingDate, setReadingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeCycle, setActiveCycle] = useState<ReadingCycleDto | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<MeterReadingAssignmentDto | null>(null);
  


  // Load buildings first, then contracts on mount
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
    
    const initializeData = async () => {
      setLoading(true);
      try {
        // Step 1: Load buildings
        const buildingsData: any = await getBuildings();
        const buildingsList = Array.isArray(buildingsData) ? buildingsData : (buildingsData?.content || buildingsData?.data || []);
        setBuildings(buildingsList);
        
        // Create buildings map
        const buildingsMapData = new Map<string, Building>();
        buildingsList.forEach((building: Building) => {
          buildingsMapData.set(building.id, building);
        });
        setBuildingsMap(buildingsMapData);
        
        // Step 2: Load units for all buildings
        const unitsMapData = new Map<string, Unit>();
        for (const building of buildingsList) {
          try {
            const buildingUnits = await getUnitsByBuilding(building.id);
            buildingUnits.forEach(unit => {
              unitsMapData.set(unit.id, unit);
            });
          } catch (err) {
            console.warn(`Failed to load units for building ${building.id}:`, err);
          }
        }
        setUnitsMap(unitsMapData);
        
        // Step 3: Load contracts and enrich with unit/building info
        const contractsData = await getAllRentalContracts();
        const enrichedContracts: RentalContractWithUnit[] = contractsData.map(contract => {
          const unit = unitsMapData.get(contract.unitId);
          const building = unit ? buildingsMapData.get(unit.buildingId) : null;
          
          return {
            ...contract,
            unitCode: unit?.code,
            unitName: unit?.name,
            buildingCode: building?.code,
            buildingName: building?.name,
          };
        });
        
        setContracts(enrichedContracts);
        setPageNo(0);
        
        // Step 4: Load all inspections to track which contracts have been inspected
        try {
          const allInspections = await getAllInspections();
          const contractsWithInspectionSet = new Set<string>();
          const inspectionsMap = new Map<string, AssetInspection>();
          allInspections.forEach(inspection => {
            contractsWithInspectionSet.add(inspection.contractId);
            inspectionsMap.set(inspection.contractId, inspection);
          });
          setContractsWithInspection(contractsWithInspectionSet);
          setInspectionsByContractId(inspectionsMap);
        } catch (error: any) {
          console.warn('Failed to load inspections:', error);
          // Continue without inspection data
        }
      } catch (error: any) {
        console.error('Failed to initialize data:', error);
        show(error?.response?.data?.message || error?.message || t('errors.loadData'), 'error');
      } finally {
        setLoading(false);
      }
    };
    initializeData();
  }, [isLoading, canView, show, router]);

  // Load units when building changes
  useEffect(() => {
    if (selectedBuildingId) {
      loadUnits(selectedBuildingId);
    } else {
      setUnits([]);
      setSelectedUnitId('');
    }
  }, [selectedBuildingId]);

  // Handle filter from URL query parameter (e.g., from notification link)
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'notInspected') {
      setStatusFilter('notInspected');
    }
  }, [searchParams]);

  const loadBuildings = async () => {
    try {
      const data: any = await getBuildings();
      const buildingsList = Array.isArray(data) ? data : (data?.content || data?.data || []);
      setBuildings(buildingsList);
      
      // Create map for quick lookup
      const map = new Map<string, Building>();
      buildingsList.forEach((building: Building) => {
        map.set(building.id, building);
      });
      setBuildingsMap(map);
    } catch (error: any) {
      console.error('Failed to load buildings:', error);
      show(error?.response?.data?.message || error?.message || t('errors.loadBuildings'), 'error');
    }
  };

  const loadUnits = async (buildingId: string) => {
    try {
      const unitsData = await getUnitsByBuilding(buildingId);
      setUnits(unitsData);
      
      // Create map for quick lookup
      const map = new Map<string, Unit>();
      unitsData.forEach(unit => {
        map.set(unit.id, unit);
      });
      setUnitsMap(prev => {
        const newMap = new Map(prev);
        unitsData.forEach(unit => {
          newMap.set(unit.id, unit);
        });
        return newMap;
      });
    } catch (error: any) {
      console.error('Failed to load units:', error);
      show(error?.response?.data?.message || error?.message || t('errors.loadUnits'), 'error');
    }
  };

  const loadContracts = async () => {
    setLoading(true);
    try {
      const allContracts = await getAllRentalContracts();
      
      // Enrich contracts with unit and building info from existing maps
      const enrichedContracts: RentalContractWithUnit[] = allContracts.map(contract => {
        const unit = unitsMap.get(contract.unitId);
        const building = unit ? buildingsMap.get(unit.buildingId) : null;
        
        return {
          ...contract,
          unitCode: unit?.code,
          unitName: unit?.name,
          buildingCode: building?.code,
          buildingName: building?.name,
        };
      });
      
      setContracts(enrichedContracts);
      setPageNo(0);
      
      // Reload inspections to update the map
      try {
        const allInspections = await getAllInspections();
        const contractsWithInspectionSet = new Set<string>();
        const inspectionsMap = new Map<string, AssetInspection>();
        allInspections.forEach(inspection => {
          contractsWithInspectionSet.add(inspection.contractId);
          inspectionsMap.set(inspection.contractId, inspection);
        });
        setContractsWithInspection(contractsWithInspectionSet);
        setInspectionsByContractId(inspectionsMap);
      } catch (error: any) {
        console.warn('Failed to load inspections:', error);
      }
    } catch (error: any) {
      console.error('Failed to load rental contracts:', error);
      show(error?.response?.data?.message || error?.message || t('errors.loadContracts'), 'error');
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };


  const handleViewDetail = async (contractId: string) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    try {
      const detail = await fetchContractDetail(contractId);
      if (!detail) {
        setDetailContract(null);
        setDetailLoading(false);
        return;
      }
      setDetailContract(detail);
    } catch (error: any) {
      console.error('Failed to load contract detail:', error);
      const status = error?.response?.status;
      const errorMessage = error?.response?.data?.message || error?.message || '';
      const isNotFoundError = status === 404 || 
                              status === 400 ||
                              errorMessage.toLowerCase().includes('not found') ||
                              errorMessage.toLowerCase().includes('không tìm thấy');
      
      if (isNotFoundError) {
        setDetailContract(null);
      } else {
        show(errorMessage || t('errors.loadDetail'), 'error');
        setDetailContract(null);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  // Helper function để check xem user có role TECHNICIAN không
  // Backend trả về role name dưới dạng lowercase ("technician")
  const hasTechnicianRole = (roles: string[] | undefined): boolean => {
    if (!roles || roles.length === 0) return false;
    return roles.some(role => 
      role?.toUpperCase() === 'TECHNICIAN' || role?.toLowerCase() === 'technician'
    );
  };

  const loadTechnicians = async () => {
    setLoadingTechnicians(true);
    try {
      const staffList = await fetchStaffAccounts();
      console.log('All staff accounts:', staffList);
      
      // Chỉ lấy những staff có role TECHNICIAN và đang active
      const techniciansList = staffList.filter(staff => {
        const isActive = staff.active !== false;
        const hasTechRole = hasTechnicianRole(staff.roles);
        
        console.log(`Staff ${staff.username}: active=${isActive}, roles=${JSON.stringify(staff.roles)}, hasTechnician=${hasTechRole}`);
        
        return isActive && hasTechRole;
      });
      
      console.log('Filtered technicians:', techniciansList);
      setTechnicians(techniciansList);
      
      if (techniciansList.length === 0) {
        console.warn('No technicians found. Total staff:', staffList.length);
        show(t('errors.noTechnicians'), 'info');
      }
    } catch (error: any) {
      console.error('Failed to load technicians:', error);
      show(error?.response?.data?.message || error?.message || t('errors.loadTechnicians'), 'error');
      setTechnicians([]);
    } finally {
      setLoadingTechnicians(false);
    }
  };

  const loadUnitMeters = async (unitId: string) => {
    if (!unitId) return;
    setLoadingMeters(true);
    try {
      const meters = await getMetersByUnit(unitId);
      setUnitMeters(meters.filter(m => m.active)); // Only active meters
      
      // Initialize meter readings with empty values
      const readings: Record<string, { index: string; note?: string }> = {};
      meters.forEach(meter => {
        if (meter.active) {
          readings[meter.id] = { index: '' };
        }
      });
      setMeterReadings(readings);
    } catch (error: any) {
      console.error('Failed to load unit meters:', error);
      setUnitMeters([]);
    } finally {
      setLoadingMeters(false);
    }
  };

  const loadActiveCycleAndAssignment = async (technicianId: string) => {
    if (!technicianId) return;
    try {
      // Get active cycles (OPEN or IN_PROGRESS)
      const openCycles = await getReadingCyclesByStatus('OPEN');
      const inProgressCycles = await getReadingCyclesByStatus('IN_PROGRESS');
      const activeCycles = [...openCycles, ...inProgressCycles];
      
      if (activeCycles.length > 0) {
        // Use the first active cycle
        const cycle = activeCycles[0];
        setActiveCycle(cycle);
        
        // Get assignments for this technician
        const assignments = await getAssignmentsByStaff(technicianId);
        // Find assignment for this cycle
        const assignment = assignments.find(a => a.cycleId === cycle.id && !a.completedAt);
        if (assignment) {
          setActiveAssignment(assignment);
        }
      }
    } catch (error: any) {
      console.error('Failed to load active cycle/assignment:', error);
    }
  };

  const handleOpenInspection = async (contract: RentalContractWithUnit) => {
    setCurrentContract(contract);
    setInspectionLoading(true);
    setInspectionModalOpen(true);
    // Reset meter reading states (not needed for admin, but keep for cleanup)
    setMeterReadings({});
    setReadingDate(new Date().toISOString().split('T')[0]);
    setActiveCycle(null);
    setActiveAssignment(null);
    
    try {
      // Admin chỉ gán technician, không cần load meters
      // Technician sẽ load meters khi thực hiện kiểm tra
      
      // Try to get existing inspection
      const existingInspection = await getInspectionByContractId(contract.id);
      if (existingInspection) {
        // If inspection status is PENDING, allow reassigning technician
        if (existingInspection.status === InspectionStatus.PENDING) {
          setCurrentInspection(null); // Set to null to show assignment form
          await loadTechnicians();
          // Optionally pre-select the current inspector if exists
          if (existingInspection.completedBy) {
            setSelectedTechnicianId(existingInspection.completedBy);
          }
        } else {
          setCurrentInspection(existingInspection);
          
          // If inspection is IN_PROGRESS, load meters and cycle/assignment for technician
          if (existingInspection.status === InspectionStatus.IN_PROGRESS && existingInspection.unitId) {
            await loadUnitMeters(existingInspection.unitId);
            
            // Load active cycle and assignment if inspectorId exists
            if (existingInspection.completedBy) {
              await loadActiveCycleAndAssignment(existingInspection.completedBy);
            }
          }
        }
      } else {
        // No inspection exists yet, will need to create one
        setCurrentInspection(null);
        // Load technicians for assignment
        await loadTechnicians();
      }
    } catch (error: any) {
      console.error('Failed to load inspection:', error);
      // If inspection doesn't exist, that's okay - we'll create one
      setCurrentInspection(null);
      // Load technicians for assignment
      await loadTechnicians();
    } finally {
      setInspectionLoading(false);
    }
  };

  const handleCreateInspection = async (contract: RentalContractWithUnit) => {
    if (!selectedTechnicianId || selectedTechnicianId.trim() === '') {
      show(t('errors.selectTechnician'), 'error');
      return;
    }

    const selectedTechnician = technicians.find(tech => tech.userId === selectedTechnicianId);
    if (!selectedTechnician) {
      show(t('errors.technicianNotFound'), 'error');
      return;
    }

    // Kiểm tra lại role TECHNICIAN
    if (!hasTechnicianRole(selectedTechnician.roles)) {
      show(t('errors.notTechnician'), 'error');
      return;
    }

    setCreatingInspection(true);
    try {
      // Kiểm tra xem đã có inspection cho contract này chưa (có thể được tạo từ Flutter app khi cancel)
      const existingInspection = await getInspectionByContractId(contract.id);
      
      let inspection: AssetInspection;
      
      if (existingInspection && existingInspection.status === InspectionStatus.PENDING) {
        // Đã có inspection với status PENDING, gán lại technician thay vì tạo mới
        inspection = await assignInspector(existingInspection.id, {
          inspectorId: selectedTechnician.userId,
          inspectorName: selectedTechnician.username || selectedTechnician.email || 'N/A',
        });
        show(t('success.reassignInspection', { name: selectedTechnician.username }), 'success');
      } else {
        // Chưa có inspection hoặc inspection không phải PENDING, tạo mới
        const request: CreateAssetInspectionRequest = {
          contractId: contract.id,
          unitId: contract.unitId,
          inspectionDate: new Date().toISOString().split('T')[0],
          inspectorName: selectedTechnician.username || selectedTechnician.email || 'N/A',
          inspectorId: selectedTechnician.userId, // Gửi inspectorId để backend có thể validate và lưu
        };
        inspection = await createInspection(request);
        show(t('success.assignInspection', { name: selectedTechnician.username }), 'success');
      }
      
      setCurrentInspection(inspection);
      setSelectedTechnicianId('');
      // Update contractsWithInspection map
      setContractsWithInspection(prev => new Set(prev).add(contract.id));
      // Update inspectionsByContractId map to show inspectionDate immediately
      setInspectionsByContractId(prev => {
        const newMap = new Map(prev);
        newMap.set(contract.id, inspection);
        return newMap;
      });
    } catch (error: any) {
      console.error('Failed to create/assign inspection:', error);
      show(error?.response?.data?.message || error?.message || t('errors.createInspection'), 'error');
    } finally {
      setCreatingInspection(false);
    }
  };

  const handleStartInspection = async () => {
    if (!currentInspection) return;
    try {
      const updated = await startInspection(currentInspection.id);
      setCurrentInspection(updated);
      
      // Load meters and cycle/assignment when technician starts inspection
      if (updated.unitId) {
        await loadUnitMeters(updated.unitId);
        
        // Load active cycle and assignment if inspectorId exists
        if (updated.completedBy) {
          await loadActiveCycleAndAssignment(updated.completedBy);
        }
      }
      
      show(t('success.startInspection'), 'success');
    } catch (error: any) {
      console.error('Failed to start inspection:', error);
      show(error?.response?.data?.message || error?.message || t('errors.startInspection'), 'error');
    }
  };

  const handleUpdateInspectionItem = async (item: AssetInspectionItem, conditionStatus: string, notes: string) => {
    if (!currentInspection) return;
    try {
      const request: UpdateAssetInspectionItemRequest = {
        conditionStatus,
        notes: notes || undefined,
        checked: true,
      };
      await updateInspectionItem(item.id, request);
      // Reload inspection
      const updated = await getInspectionByContractId(currentInspection.contractId);
      if (updated) {
        setCurrentInspection(updated);
      }
    } catch (error: any) {
      console.error('Failed to update inspection item:', error);
      show(error?.response?.data?.message || error?.message || t('errors.updateItem'), 'error');
    }
  };

  const handleCompleteInspection = async () => {
    if (!currentInspection) return;
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
              const readingReq: MeterReadingCreateReq = {
                assignmentId: activeAssignment.id,
                meterId: meter.id,
                readingDate: readingDate,
                currIndex: parseFloat(reading.index),
                note: reading.note || `Đo cùng với kiểm tra thiết bị - Hợp đồng ${currentContract?.contractNumber || 'N/A'}`,
              };
              readingPromises.push(createMeterReading(readingReq));
              successCount++;
            } catch (err) {
              console.error(`Failed to create reading for meter ${meter.meterCode}:`, err);
              errorCount++;
            }
          }
        }
        
        if (readingPromises.length > 0) {
          try {
            await Promise.all(readingPromises);
            if (errorCount > 0) {
              show(t('errors.someReadingsFailed', { 
                count: errorCount,
                defaultValue: `Đã hoàn thành kiểm tra nhưng ${errorCount} chỉ số đồng hồ đo thất bại`
              }), 'error');
            }
          } catch (err) {
            console.error('Some meter readings failed:', err);
            show(t('errors.someReadingsFailed', { 
              count: errorCount,
              defaultValue: `Đã hoàn thành kiểm tra nhưng một số chỉ số đồng hồ đo thất bại`
            }), 'error');
          }
        }
      }
      
      const updated = await completeInspection(currentInspection.id, inspectorNotes);
      setCurrentInspection(updated);
      
      if (unitMeters.length > 0 && activeAssignment) {
        const readingsCount = Object.values(meterReadings).filter(r => r.index && r.index.trim() !== '').length;
        if (readingsCount > 0) {
          show(t('success.completeInspectionWithReadings', { 
            readingCount: readingsCount,
            defaultValue: `Đã hoàn thành kiểm tra thiết bị và ${readingsCount} chỉ số đồng hồ đo`
          }), 'success');
        } else {
          show(t('success.completeInspection'), 'success');
        }
      } else {
        show(t('success.completeInspection'), 'success');
      }
    } catch (error: any) {
      console.error('Failed to complete inspection:', error);
      show(error?.response?.data?.message || error?.message || t('errors.completeInspection'), 'error');
    }
  };

  const isContractExpired = (contract: RentalContractWithUnit): boolean => {
    // Chỉ hiển thị nút "Kiểm tra thiết bị" với hợp đồng EXPIRED hoặc CANCELLED
    return contract.status === 'EXPIRED' || contract.status === 'CANCELLED' || contract.status === 'CANCELED';
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('vi-VN');
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Filter contracts
  const filteredContracts = useMemo(() => {
    let filtered = [...contracts];

    // Filter by building
    if (selectedBuildingId) {
      const selectedBuilding = buildingsMap.get(selectedBuildingId);
      if (selectedBuilding) {
        filtered = filtered.filter(c => {
          // Try using buildingCode first (if contract was enriched with it)
          if (c.buildingCode && selectedBuilding.code) {
            return c.buildingCode === selectedBuilding.code;
          }
          // Fallback to using unitsMap
          const unit = unitsMap.get(c.unitId);
          return unit?.buildingId === selectedBuildingId;
        });
      } else {
        // If building not found in map, use unitsMap
        filtered = filtered.filter(c => {
          const unit = unitsMap.get(c.unitId);
          return unit?.buildingId === selectedBuildingId;
        });
      }
    }

    // Filter by unit
    if (selectedUnitId) {
      filtered = filtered.filter(c => c.unitId === selectedUnitId);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(c => {
        if (statusFilter === 'active') {
          if (c.status !== 'ACTIVE') return false;
          if (!c.endDate) return true;
          const endDate = new Date(c.endDate);
          endDate.setHours(0, 0, 0, 0);
          return endDate > today;
        } else if (statusFilter === 'expired') {
          // Chỉ hiển thị contracts có status = EXPIRED hoặc ACTIVE đã hết hạn
          if (c.status === 'EXPIRED') return true;
          if (c.status !== 'ACTIVE') return false;
          if (!c.endDate) return false;
          
          const parseDateOnly = (dateStr: string): Date => {
            const [year, month, day] = dateStr.split('-').map(Number);
            const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
            return new Date(utcDate.getFullYear(), utcDate.getMonth(), utcDate.getDate());
          };
          
          let endDate: Date;
          try {
            if (c.endDate.includes('T')) {
              const isoDate = new Date(c.endDate);
              endDate = new Date(isoDate.getFullYear(), isoDate.getMonth(), isoDate.getDate());
            } else {
              endDate = parseDateOnly(c.endDate);
            }
            endDate.setHours(0, 0, 0, 0);
          } catch (e) {
            const fallbackEnd = new Date(c.endDate);
            endDate = new Date(fallbackEnd.getFullYear(), fallbackEnd.getMonth(), fallbackEnd.getDate());
            endDate.setHours(0, 0, 0, 0);
          }
          
          return endDate < today;
        } else if (statusFilter === 'expiring') {
          // Hợp đồng còn <= 30 ngày nữa sẽ hết hạn (tính từ today đến endDate)
          if (c.status !== 'ACTIVE') return false;
          if (!c.endDate) return false;
          
          const parseDateOnly = (dateStr: string): Date => {
            const [year, month, day] = dateStr.split('-').map(Number);
            const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
            return new Date(utcDate.getFullYear(), utcDate.getMonth(), utcDate.getDate());
          };
          
          let endDate: Date;
          
          try {
            if (c.endDate.includes('T')) {
              const isoDate = new Date(c.endDate);
              endDate = new Date(isoDate.getFullYear(), isoDate.getMonth(), isoDate.getDate());
            } else {
              endDate = parseDateOnly(c.endDate);
            }
            endDate.setHours(0, 0, 0, 0);
          } catch (e) {
            const fallbackEnd = new Date(c.endDate);
            endDate = new Date(fallbackEnd.getFullYear(), fallbackEnd.getMonth(), fallbackEnd.getDate());
            endDate.setHours(0, 0, 0, 0);
          }
          
          if (endDate < today) return false; // Đã hết hạn
          
          // Calculate remaining days: from today to end date
          const remainingDays = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return remainingDays <= 30 && remainingDays >= 0; // Còn <= 30 ngày nữa
        } else if (statusFilter === 'cancelled') {
          return c.status === 'CANCELLED' || c.status === 'CANCELED';
        } else if (statusFilter === 'notInspected') {
          // Chỉ hiển thị các hợp đồng chưa có inspection (hoặc chỉ có inspection với status PENDING)
          // Và hợp đồng phải là EXPIRED hoặc CANCELLED (theo điều kiện isContractExpired)
          const isExpiredOrCancelled = c.status === 'EXPIRED' || c.status === 'CANCELLED' || c.status === 'CANCELED';
          // Chỉ coi là đã có inspection khi có inspection với status là COMPLETED hoặc IN_PROGRESS
          // PENDING vẫn được coi là "chưa kiểm tra" vì chưa thực sự kiểm tra
          const inspection = inspectionsByContractId.get(c.id);
          const hasRealInspection = inspection && 
            (inspection.status === InspectionStatus.COMPLETED || inspection.status === InspectionStatus.IN_PROGRESS);
          return isExpiredOrCancelled && !hasRealInspection;
        }
        return true;
      });
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(c => {
        return (
          c.contractNumber?.toLowerCase().includes(term) ||
          c.unitCode?.toLowerCase().includes(term) ||
          c.unitName?.toLowerCase().includes(term) ||
          c.buildingCode?.toLowerCase().includes(term) ||
          c.buildingName?.toLowerCase().includes(term)
        );
      });
    }

    // Sort by start date (newest first)
    filtered.sort((a, b) => {
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    return filtered;
  }, [contracts, selectedBuildingId, selectedUnitId, statusFilter, searchTerm, unitsMap, buildingsMap, contractsWithInspection]);

  // Apply pagination to filtered contracts
  const contractsToDisplay = useMemo(() => {
    const startIndex = pageNo * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredContracts.slice(startIndex, endIndex);
  }, [filteredContracts, pageNo, pageSize]);

  const totalPages = useMemo(() => {
    return pageSize > 0 ? Math.ceil(filteredContracts.length / pageSize) : 0;
  }, [filteredContracts.length, pageSize]);

  const handlePageChange = useCallback((newPage: number) => {
    setPageNo(newPage);
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setPageNo(0);
  }, [selectedBuildingId, selectedUnitId, statusFilter, searchTerm]);

  const getContractStatusLabel = (contract: RentalContractWithUnit) => {
    if (contract.status === 'CANCELLED' || contract.status === 'CANCELED') {
      return { label: t('status.cancelled'), className: 'bg-red-100 text-red-700' };
    }
    if (contract.status === 'INACTIVE') {
      return { label: t('status.inactive'), className: 'bg-gray-100 text-gray-700' };
    }
    if (contract.status === 'EXPIRED') {
      return { label: t('status.expired'), className: 'bg-red-100 text-red-700' };
    }
    if (contract.status !== 'ACTIVE') {
      return { label: t('status.invalid'), className: 'bg-gray-100 text-gray-700' };
    }
    
    if (!contract.endDate || !contract.startDate) {
      return { label: t('status.active'), className: 'bg-green-100 text-green-700' };
    }
    
    // Parse date string properly (YYYY-MM-DD format from API) - avoid timezone issues
    const parseDateOnly = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      return new Date(utcDate.getFullYear(), utcDate.getMonth(), utcDate.getDate());
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate: Date;
    let endDate: Date;
    
    try {
      // Parse start date
      if (contract.startDate.includes('T')) {
        const isoDate = new Date(contract.startDate);
        startDate = new Date(isoDate.getFullYear(), isoDate.getMonth(), isoDate.getDate());
      } else {
        startDate = parseDateOnly(contract.startDate);
      }
      startDate.setHours(0, 0, 0, 0);
      
      // Parse end date
      if (contract.endDate.includes('T')) {
        const isoDate = new Date(contract.endDate);
        endDate = new Date(isoDate.getFullYear(), isoDate.getMonth(), isoDate.getDate());
      } else {
        endDate = parseDateOnly(contract.endDate);
      }
      endDate.setHours(0, 0, 0, 0);
    } catch (e) {
      const fallbackStart = new Date(contract.startDate);
      startDate = new Date(fallbackStart.getFullYear(), fallbackStart.getMonth(), fallbackStart.getDate());
      startDate.setHours(0, 0, 0, 0);
      
      const fallbackEnd = new Date(contract.endDate);
      endDate = new Date(fallbackEnd.getFullYear(), fallbackEnd.getMonth(), fallbackEnd.getDate());
      endDate.setHours(0, 0, 0, 0);
    }
    
    if (endDate < today) {
      return { label: t('status.expired'), className: 'bg-red-100 text-red-700' };
    }
    
    // Calculate remaining days: from today to end date (days until expiration)
    const daysUntilExpiry = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
      return { label: t('status.expiring', { days: daysUntilExpiry }), className: 'bg-yellow-100 text-yellow-700' };
    }
    
    return { label: t('status.active'), className: 'bg-green-100 text-green-700' };
  };

  // Calculate statistics
  const expiringContractsCount = useMemo(() => {
    const parseDateOnly = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      return new Date(utcDate.getFullYear(), utcDate.getMonth(), utcDate.getDate());
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return contracts.filter(c => {
      if (c.status !== 'ACTIVE') return false;
      if (!c.endDate) return false;
      
      let endDate: Date;
      
      try {
        if (c.endDate.includes('T')) {
          const isoDate = new Date(c.endDate);
          endDate = new Date(isoDate.getFullYear(), isoDate.getMonth(), isoDate.getDate());
        } else {
          endDate = parseDateOnly(c.endDate);
        }
        endDate.setHours(0, 0, 0, 0);
      } catch (e) {
        const fallbackEnd = new Date(c.endDate);
        endDate = new Date(fallbackEnd.getFullYear(), fallbackEnd.getMonth(), fallbackEnd.getDate());
        endDate.setHours(0, 0, 0, 0);
      }
      
      if (endDate < today) return false;
      
      // Calculate remaining days: from today to end date
      const remainingDays = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return remainingDays <= 30 && remainingDays >= 0;
    }).length;
  }, [contracts]);

  // Calculate contracts that need inspection (EXPIRED or CANCELLED without inspection)
  const contractsNeedingInspection = useMemo(() => {
    const needingInspection = contracts.filter(c => {
      const isExpiredOrCancelled = c.status === 'EXPIRED' || c.status === 'CANCELLED' || c.status === 'CANCELED';
      const hasInspection = contractsWithInspection.has(c.id);
      return isExpiredOrCancelled && !hasInspection;
    });
    
    // Debug logging
    console.log('📊 Contracts needing inspection:', {
      totalContracts: contracts.length,
      expiredOrCancelled: contracts.filter(c => c.status === 'EXPIRED' || c.status === 'CANCELLED').length,
      withInspection: contractsWithInspection.size,
      needingInspection: needingInspection.length,
      contracts: needingInspection.map(c => ({
        id: c.id,
        contractNumber: c.contractNumber,
        status: c.status,
        hasInspection: contractsWithInspection.has(c.id)
      }))
    });
    
    return needingInspection.length;
  }, [contracts, contractsWithInspection]);

  // Track if we've already created a notification for this count
  const lastNotifiedCountRef = useRef<number>(0);

  // Create notification when there are contracts needing inspection
  // NOTE: Currently disabled - Backend notification API may need additional implementation
  // The warning card in the UI already provides visibility for contracts needing inspection.
  // TODO: Uncomment and enable when backend notification API is fully implemented
  useEffect(() => {
    const createInspectionNotification = async () => {
      // Only create notification if:
      // 1. Initial load is complete (contracts are loaded)
      // 2. There are contracts needing inspection
      // 3. The count has changed (to avoid duplicate notifications)
      if (
        !loading && 
        contracts.length > 0 && 
        contractsNeedingInspection > 0 && 
        contractsNeedingInspection !== lastNotifiedCountRef.current
      ) {
        // DISABLED: Backend notification API needs to be implemented/verified
        // Uncomment the code below when backend is ready:
        
        /*
        try {
          // Create notification request
          // For INTERNAL scope, targetRole is REQUIRED and must not be null/blank
          // Use 'ALL' to send to all staff roles
          const notificationPayload = {
            type: 'WARNING' as const,
            title: t('notification.title', { defaultValue: 'Cần kiểm tra thiết bị' }),
            message: t('notification.message', { 
              count: contractsNeedingInspection,
              defaultValue: `Có ${contractsNeedingInspection} căn hộ cần kiểm tra thiết bị sau khi hợp đồng hết hạn hoặc bị hủy.` 
            }),
            scope: 'INTERNAL' as const,
            targetRole: 'ALL', // Required for INTERNAL scope - 'ALL' means all staff roles
            targetBuildingId: null, // Must be null for INTERNAL scope
            targetResidentId: null,
            referenceId: null,
            referenceType: 'ASSET_INSPECTION',
            actionUrl: '/base/contract/rental-review?filter=notInspected',
            iconUrl: null,
          };
          
          await addNotification(notificationPayload);
          lastNotifiedCountRef.current = contractsNeedingInspection;
        } catch (error: any) {
          console.warn('⚠️ Failed to create inspection notification:', error?.response?.status || error?.message);
          // Still update the ref to prevent retrying immediately
          lastNotifiedCountRef.current = contractsNeedingInspection;
        }
        */
        
        // For now, just update the ref without creating notification
        // The warning card in the UI provides sufficient visibility
        lastNotifiedCountRef.current = contractsNeedingInspection;
      }
    };

    createInspectionNotification();
  }, [contractsNeedingInspection, contracts.length, loading, addNotification, t]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600 mt-2">{t('subtitle')}</p>
      </div>

      {/* Statistics Cards */}
      {contracts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600">{t('statistics.totalContracts')}</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{contracts.length}</div>
          </div>
          {expiringContractsCount > 0 && (
            <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 p-4">
              <div className="text-sm text-yellow-700 font-medium">{t('statistics.expiringContracts')}</div>
              <div className="text-2xl font-bold text-yellow-900 mt-1">{expiringContractsCount}</div>
              <div className="text-xs text-yellow-600 mt-1">{t('statistics.expiringDays')}</div>
            </div>
          )}
          {/* Always show inspection card - red if > 0, gray if 0 (for debugging) */}
          <div className={`rounded-lg shadow-sm border p-4 ${
            contractsNeedingInspection > 0 
              ? 'bg-red-50 border-red-200' 
              : 'bg-gray-50 border-gray-200 opacity-60'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm font-medium ${
                  contractsNeedingInspection > 0 ? 'text-red-700' : 'text-gray-500'
                }`}>
                  {t('statistics.needingInspection', { defaultValue: 'Cần kiểm tra thiết bị' })}
                </div>
                <div className={`text-2xl font-bold mt-1 ${
                  contractsNeedingInspection > 0 ? 'text-red-900' : 'text-gray-600'
                }`}>
                  {contractsNeedingInspection}
                </div>
                <div className={`text-xs mt-1 ${
                  contractsNeedingInspection > 0 ? 'text-red-600' : 'text-gray-400'
                }`}>
                  {contractsNeedingInspection > 0 
                    ? t('statistics.needingInspectionDesc', { defaultValue: 'Hợp đồng đã hết hạn/hủy chưa kiểm tra' })
                    : 'Tất cả hợp đồng đã được kiểm tra'
                  }
                </div>
              </div>
              <div className="text-3xl">{contractsNeedingInspection > 0 ? '⚠️' : '✅'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('filters.building')}
            </label>
            <select
              value={selectedBuildingId}
              onChange={(e) => {
                setSelectedBuildingId(e.target.value);
                setSelectedUnitId('');
                setPageNo(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('filters.allBuildings')}</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.code} - {building.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('filters.unit')}
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => {
                setSelectedUnitId(e.target.value);
                setPageNo(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedBuildingId}
            >
              <option value="">{t('filters.allUnits')}</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.code} - {unit.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('filters.status')}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | 'active' | 'expired' | 'expiring' | 'cancelled' | 'notInspected');
                setPageNo(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('filters.allStatus')}</option>
              <option value="active">{t('filters.active')}</option>
              <option value="expiring">{t('filters.expiring')}</option>
              <option value="expired">{t('filters.expired')}</option>
              <option value="cancelled">{t('filters.cancelled')}</option>
              <option value="notInspected">{t('filters.notInspected')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('filters.search')}
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPageNo(0);
              }}
              placeholder={t('filters.searchPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">{t('table.loading')}</div>
        ) : filteredContracts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {contracts.length === 0 
              ? t('table.noContracts')
              : t('table.noResults')}
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('table.contractList')} ({filteredContracts.length})
                </h2>
                <button
                  onClick={loadContracts}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  {t('table.refresh')}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.contractNumber')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.building')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.unit')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.startDate')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.endDate')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.monthlyRent')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.inspectionDate')}
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
                  {contractsToDisplay.map((contract) => {
                    const statusInfo = getContractStatusLabel(contract);
                    return (
                      <tr key={contract.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {contract.contractNumber || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {contract.buildingCode || '-'}
                          </div>
                          {contract.buildingName && (
                            <div className="text-xs text-gray-500">
                              {contract.buildingName}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {contract.unitCode || '-'}
                          </div>
                          {contract.unitName && (
                            <div className="text-xs text-gray-500">
                              {contract.unitName}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(contract.startDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(contract.endDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(contract.monthlyRent)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(() => {
                            const inspection = inspectionsByContractId.get(contract.id);
                            return inspection?.inspectionDate 
                              ? formatDate(inspection.inspectionDate)
                              : '-';
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleViewDetail(contract.id)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              {t('table.viewDetail')}
                            </button>
                            {isContractExpired(contract) && (
                              <button
                                onClick={() => handleOpenInspection(contract)}
                                className="text-green-600 hover:text-green-900"
                              >
                                {t('table.inspectAssets')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
          </>
        )}
      </div>

      {/* Detail Modal */}
      {detailModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDetailModalOpen(false);
              setDetailContract(null);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="p-6 flex-shrink-0 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{t('detailModal.title')}</h2>
              <button
                onClick={() => {
                  setDetailModalOpen(false);
                  setDetailContract(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="px-6 py-6 flex-1 min-h-0 overflow-y-auto">
              {detailLoading ? (
                <div className="text-center text-gray-500">{t('detailModal.loading')}</div>
              ) : detailContract ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('detailModal.contractNumber')}</label>
                      <p className="mt-1 text-sm text-gray-900">{detailContract.contractNumber || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('detailModal.contractType')}</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {detailContract.contractType === 'RENTAL' ? t('detailModal.rental') : t('detailModal.purchase')}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('detailModal.startDate')}</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(detailContract.startDate)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('detailModal.endDate')}</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(detailContract.endDate)}</p>
                    </div>
                    {detailContract.monthlyRent && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('detailModal.monthlyRent')}</label>
                        <p className="mt-1 text-sm text-gray-900">{formatCurrency(detailContract.monthlyRent)}</p>
                      </div>
                    )}
                    {detailContract.paymentMethod && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('detailModal.paymentMethod')}</label>
                        <p className="mt-1 text-sm text-gray-900">{detailContract.paymentMethod}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('detailModal.status')}</label>
                      <p className="mt-1 text-sm text-gray-900">{detailContract.status || '-'}</p>
                    </div>
                  </div>
                  {detailContract.paymentTerms && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('detailModal.paymentTerms')}</label>
                      <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{detailContract.paymentTerms}</p>
                    </div>
                  )}
                  {detailContract.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('detailModal.notes')}</label>
                      <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{detailContract.notes}</p>
                    </div>
                  )}
                  {detailContract.files && detailContract.files.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('detailModal.attachments')}</label>
                      <div className="space-y-2">
                        {detailContract.files.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-900">{file.originalFileName || file.fileName || t('detailModal.file')}</span>
                            {file.fileUrl && (
                              <a
                                href={file.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                {t('detailModal.view')}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 text-center">
                    {t('detailModal.notFound')}
                  </div>
                  <div className="flex justify-center">
                    <Link
                      href="/base/contract/contracts"
                      className="px-4 py-2 bg-[#02542D] text-white rounded-lg hover:bg-[#023a20] transition-colors"
                    >
                      {t('detailModal.goToCreate')}
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 pb-6 flex-shrink-0 border-t border-gray-200 pt-4">
              <button
                onClick={() => {
                  setDetailModalOpen(false);
                  setDetailContract(null);
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspection Modal */}
      {inspectionModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={(e) => {
            if (e.target === e.currentTarget) {
              setInspectionModalOpen(false);
              setCurrentInspection(null);
              setInspectorName('');
              setInspectorNotes('');
              setSelectedTechnicianId('');
              setCurrentContract(null);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="p-6 flex-shrink-0 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{t('inspectionModal.title')}</h2>
              <button
                onClick={() => {
                  setInspectionModalOpen(false);
                  setCurrentInspection(null);
                  setInspectorName('');
                  setInspectorNotes('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="px-6 py-6 flex-1 min-h-0 overflow-y-auto">
              {inspectionLoading ? (
                <div className="text-center text-gray-500">{t('inspectionModal.loading')}</div>
              ) : !currentInspection || (currentInspection && currentInspection.status === InspectionStatus.PENDING) ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>{t('inspectionModal.expiredContract')}</strong> - {t('inspectionModal.assignTechnician')}
                    </p>
                    <p className="text-sm text-blue-700">
                      {t('inspectionModal.selectTechnician')}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('inspectionModal.selectTechnicianLabel')} <span className="text-red-500">{t('inspectionModal.required')}</span>
                    </label>
                    {loadingTechnicians ? (
                      <div className="text-sm text-gray-500 py-2">{t('inspectionModal.loadingTechnicians')}</div>
                    ) : technicians.length === 0 ? (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-700 font-medium mb-1">{t('inspectionModal.noTechnicians')}</p>
                        <p className="text-xs text-red-600">{t('inspectionModal.noTechniciansDesc')}</p>
                      </div>
                    ) : (
                      <select
                        value={selectedTechnicianId}
                        onChange={(e) => {
                          setSelectedTechnicianId(e.target.value);
                          // Admin chỉ gán technician, không cần load cycle/assignment
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">{t('inspectionModal.selectPlaceholder')}</option>
                        {technicians.map((tech) => (
                          <option key={tech.userId} value={tech.userId}>
                            {tech.username} {tech.email ? `(${tech.email})` : ''}
                            {tech.buildingCode ? ` - ${tech.buildingCode}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Info: Technician will perform inspection and meter reading */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <p className="text-sm text-blue-800">
                        <strong>{t('inspectionModal.adminNote', { defaultValue: 'Lưu ý' })}:</strong> {t('inspectionModal.adminNoteDesc', { 
                          defaultValue: 'Bạn chỉ cần gán kỹ thuật viên. Kỹ thuật viên sẽ thực hiện kiểm tra thiết bị và đo chỉ số đồng hồ điện nước sau khi được gán.' 
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (currentContract) {
                        handleCreateInspection(currentContract);
                      }
                    }}
                    disabled={creatingInspection || !selectedTechnicianId}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {creatingInspection ? t('inspectionModal.assigning') : t('inspectionModal.assign')}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('inspectionModal.inspectionDate')}</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(currentInspection.inspectionDate)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('inspectionModal.status')}</label>
                      <span className={`mt-1 inline-block px-2 py-1 text-xs font-medium rounded ${
                        currentInspection.status === InspectionStatus.COMPLETED ? 'bg-green-100 text-green-700' :
                        currentInspection.status === InspectionStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {currentInspection.status === InspectionStatus.PENDING ? t('inspectionModal.pending') :
                         currentInspection.status === InspectionStatus.IN_PROGRESS ? t('inspectionModal.inProgress') :
                         currentInspection.status === InspectionStatus.COMPLETED ? t('inspectionModal.completed') : t('inspectionModal.cancelled')}
                      </span>
                    </div>
                    {currentInspection.inspectorName && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('inspectionModal.inspector')}</label>
                        <p className="mt-1 text-sm text-gray-900">{currentInspection.inspectorName}</p>
                      </div>
                    )}
                  </div>

                  {currentInspection.status === InspectionStatus.PENDING && !isAdmin && (
                    <button
                      onClick={handleStartInspection}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {t('inspectionModal.startInspection')}
                    </button>
                  )}

                  {currentInspection.status === InspectionStatus.IN_PROGRESS && (
                    <>
                      <div className="border-t border-gray-200 pt-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('inspectionModal.equipmentList')}</h3>
                        <div className="space-y-3">
                          {currentInspection.items && currentInspection.items.length > 0 ? (
                            currentInspection.items.map((item) => (
                              <InspectionItemRow
                                key={item.id}
                                item={item}
                                onUpdate={(conditionStatus, notes) => handleUpdateInspectionItem(item, conditionStatus, notes)}
                                disabled={item.checked}
                              />
                            ))
                          ) : (
                            <p className="text-gray-500">{t('inspectionModal.noEquipment')}</p>
                          )}
                        </div>
                      </div>

                      {/* Meter Reading Section for Technician */}
                      {currentInspection.unitId && (
                        <div className="border-t border-gray-200 pt-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {t('inspectionModal.meterReadings', { defaultValue: 'Đo chỉ số đồng hồ điện nước' })}
                          </h3>
                          {loadingMeters ? (
                            <div className="text-sm text-gray-500 py-2">{t('inspectionModal.loadingMeters', { defaultValue: 'Đang tải danh sách đồng hồ đo...' })}</div>
                          ) : unitMeters.length > 0 ? (
                            <>
                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  {t('inspectionModal.readingDate', { defaultValue: 'Ngày đo' })}
                                </label>
                                <input
                                  type="date"
                                  value={readingDate}
                                  onChange={(e) => setReadingDate(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              {activeCycle && (
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                  <p className="text-sm text-blue-800">
                                    <strong>{t('inspectionModal.activeCycle', { defaultValue: 'Chu kỳ đọc' })}:</strong> {activeCycle.name}
                                    {activeCycle.periodFrom && activeCycle.periodTo && (
                                      <span className="ml-2">
                                        ({new Date(activeCycle.periodFrom).toLocaleDateString('vi-VN')} - {new Date(activeCycle.periodTo).toLocaleDateString('vi-VN')})
                                      </span>
                                    )}
                                  </p>
                                </div>
                              )}
                              {!activeAssignment && (
                                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                  <p className="text-sm text-yellow-800">
                                    {t('inspectionModal.noAssignment', { defaultValue: '⚠️ Chưa có assignment cho chu kỳ này. Chỉ số đồng hồ đo sẽ không được lưu vào chu kỳ đọc.' })}
                                  </p>
                                </div>
                              )}
                              <div className="space-y-3">
                                {unitMeters.map((meter) => (
                                  <div key={meter.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-3">
                                      <div>
                                        <h4 className="font-medium text-gray-900">{meter.meterCode}</h4>
                                        <p className="text-sm text-gray-500">
                                          {meter.serviceName || meter.serviceCode || 'Unknown Service'}
                                        </p>
                                        {meter.lastReading !== null && meter.lastReading !== undefined && (
                                          <p className="text-xs text-gray-400 mt-1">
                                            {t('inspectionModal.lastReading', { defaultValue: 'Chỉ số trước' })}: {meter.lastReading}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          {t('inspectionModal.currentIndex', { defaultValue: 'Chỉ số hiện tại' })} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={meterReadings[meter.id]?.index || ''}
                                          onChange={(e) => {
                                            setMeterReadings(prev => ({
                                              ...prev,
                                              [meter.id]: {
                                                ...prev[meter.id],
                                                index: e.target.value
                                              }
                                            }));
                                          }}
                                          placeholder={t('inspectionModal.indexPlaceholder', { defaultValue: 'Nhập chỉ số đồng hồ' })}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          {t('inspectionModal.note', { defaultValue: 'Ghi chú' })}
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
                                          placeholder={t('inspectionModal.notePlaceholder', { defaultValue: 'Ghi chú (tùy chọn)' })}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                              <p className="text-sm text-gray-600">
                                {t('inspectionModal.noMeters', { defaultValue: 'Căn hộ này chưa có đồng hồ đo điện nước.' })}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="border-t border-gray-200 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('inspectionModal.inspectionNotes')}
                        </label>
                        <textarea
                          value={inspectorNotes}
                          onChange={(e) => setInspectorNotes(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={t('inspectionModal.notesPlaceholder')}
                        />
                      </div>

                      <button
                        onClick={handleCompleteInspection}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        {t('inspectionModal.completeInspection')}
                      </button>
                    </>
                  )}

                  {currentInspection.status === InspectionStatus.COMPLETED && (
                    <>
                      <div className="border-t border-gray-200 pt-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('inspectionModal.results')}</h3>
                        <div className="space-y-3">
                          {currentInspection.items && currentInspection.items.map((item) => (
                            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-medium text-gray-900">{item.assetName || item.assetCode}</h4>
                                  <p className="text-sm text-gray-500">{item.assetType}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                  item.conditionStatus === 'GOOD' ? 'bg-green-100 text-green-700' :
                                  item.conditionStatus === 'DAMAGED' ? 'bg-red-100 text-red-700' :
                                  item.conditionStatus === 'MISSING' ? 'bg-gray-100 text-gray-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {item.conditionStatus === 'GOOD' ? t('inspectionModal.condition.good') :
                                   item.conditionStatus === 'DAMAGED' ? t('inspectionModal.condition.damaged') :
                                   item.conditionStatus === 'MISSING' ? t('inspectionModal.condition.missing') :
                                   item.conditionStatus || t('inspectionModal.condition.notInspected')}
                                </span>
                              </div>
                              {item.notes && (
                                <p className="text-sm text-gray-700 mt-2">{item.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      {currentInspection.inspectorNotes && (
                        <div className="border-t border-gray-200 pt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('inspectionModal.inspectionNotes')}</label>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{currentInspection.inspectorNotes}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="px-6 pb-6 flex-shrink-0 border-t border-gray-200 pt-4">
              <button
                onClick={() => {
                  setInspectionModalOpen(false);
                  setCurrentInspection(null);
                  setInspectorName('');
                  setInspectorNotes('');
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Đóng
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
  onUpdate, 
  disabled 
}: { 
  item: AssetInspectionItem; 
  onUpdate: (conditionStatus: string, notes: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations('RentalReview.inspectionModal');
  const [conditionStatus, setConditionStatus] = useState(item.conditionStatus || '');
  const [notes, setNotes] = useState(item.notes || '');

  const handleSave = () => {
    if (conditionStatus) {
      onUpdate(conditionStatus, notes);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium text-gray-900">{item.assetName || item.assetCode}</h4>
          <p className="text-sm text-gray-500">{item.assetType}</p>
        </div>
        {item.checked && (
          <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700">
            {t('item.inspected')}
          </span>
        )}
      </div>
      
      {!disabled && (
        <div className="space-y-3 mt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('item.condition')}</label>
            <select
              value={conditionStatus}
              onChange={(e) => setConditionStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('item.selectCondition')}</option>
              <option value="GOOD">{t('condition.good')}</option>
              <option value="DAMAGED">{t('condition.damaged')}</option>
              <option value="MISSING">{t('condition.missing')}</option>
              <option value="REPAIRED">{t('condition.repaired')}</option>
              <option value="REPLACED">{t('condition.replaced')}</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('item.notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('item.notesPlaceholder')}
            />
          </div>
          
          <button
            onClick={handleSave}
            disabled={!conditionStatus}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {t('item.save')}
          </button>
        </div>
      )}
      
      {disabled && item.conditionStatus && (
        <div className="mt-2">
          <span className={`px-2 py-1 text-xs font-medium rounded ${
            item.conditionStatus === 'GOOD' ? 'bg-green-100 text-green-700' :
            item.conditionStatus === 'DAMAGED' ? 'bg-red-100 text-red-700' :
            item.conditionStatus === 'MISSING' ? 'bg-gray-100 text-gray-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {item.conditionStatus === 'GOOD' ? t('condition.good') :
             item.conditionStatus === 'DAMAGED' ? t('condition.damaged') :
             item.conditionStatus === 'MISSING' ? t('condition.missing') :
             item.conditionStatus}
          </span>
          {item.notes && (
            <p className="text-sm text-gray-700 mt-2">{item.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
