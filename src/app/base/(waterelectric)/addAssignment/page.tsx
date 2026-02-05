'use client'
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';
import { getBuildings, Building } from '@/src/services/base/buildingService';
import {
  getAllReadingCycles,
  getAllServices,
  createMeterReadingAssignment,
  MeterReadingAssignmentCreateReq,
  ReadingCycleDto,
  ServiceDto,
  ALLOWED_SERVICE_CODES,
} from '@/src/services/base/waterService';
import { useNotifications } from '@/src/hooks/useNotifications';
import Select from '@/src/components/customer-interaction/Select';
import DateBox from '@/src/components/customer-interaction/DateBox';
import { getEmployeesByRole, EmployeeRoleDto, getEmployeesByRoleNew } from '@/src/services/iam/employeeService';
import { getUnitsByBuilding, getUnitsByFloor, Unit } from '@/src/services/base/unitService';
import { fetchCurrentHouseholdByUnit } from '@/src/services/base/householdService';
import Checkbox from '@/src/components/customer-interaction/Checkbox';
import { getAssignmentsByCycle, MeterReadingAssignmentDto, getMetersByUnit } from '@/src/services/base/waterService';

export default function AddAssignmentPage() {
  const t = useTranslations('AddAssignment');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasRole, isLoading } = useAuth();
  const { show } = useNotifications();
  
  // Check user roles - ADMIN and TECHNICIAN can view
  const isAdmin = hasRole('ADMIN') || hasRole('admin') || hasRole('ROLE_ADMIN') || hasRole('ROLE_admin');
  const isTechnician = hasRole('TECHNICIAN') || hasRole('technician') || hasRole('ROLE_TECHNICIAN') || hasRole('ROLE_technician');
  const canView = isAdmin || isTechnician;

  const [loading, setLoading] = useState(false);
  const [cycles, setCycles] = useState<ReadingCycleDto[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [staffList, setStaffList] = useState<EmployeeRoleDto[]>([]);

  // Form fields
  const [selectedCycleId, setSelectedCycleId] = useState<string>(
    searchParams.get('cycleId') || ''
  );
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set()); // All selected units
  const [expandedFloors, setExpandedFloors] = useState<Set<number>>(new Set()); // Floors with expanded dropdown
  const [allBuildingUnits, setAllBuildingUnits] = useState<Unit[]>([]); // All units in building
  const [note, setNote] = useState<string>('');
  const [availableFloors, setAvailableFloors] = useState<number[]>([]);
  const [unitsByFloor, setUnitsByFloor] = useState<Map<number, Unit[]>>(new Map());
  const [loadingUnits, setLoadingUnits] = useState<Map<number, boolean>>(new Map());
  const [assignedFloors, setAssignedFloors] = useState<Set<number>>(new Set());
  const [assignedUnitIds, setAssignedUnitIds] = useState<Set<string>>(new Set()); // Units already assigned for this cycle/service/building
  const [startDateError, setStartDateError] = useState<string>('');
  const [endDateError, setEndDateError] = useState<string>('');

  // Check permissions and load initial data
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
    
    const loadData = async () => {
      try {
        setLoading(true);
        const [cyclesData, buildingsData, servicesData] = await Promise.all([
          getAllReadingCycles(),
          getBuildings(),
          getAllServices()
        ]);

        setCycles(cyclesData);
        setBuildings(buildingsData);
        // Filter services that are active, require meter, and are water/electric only
        setServices(servicesData.filter(s => 
          s.active && s.requiresMeter && ALLOWED_SERVICE_CODES.includes(s.code)
        ));

        // Load staff with technician role
        try {
          const staffData = await getEmployeesByRoleNew('technician');
          setStaffList(staffData);
        } catch (error) {
          console.error('Failed to load staff list:', error);
          // Don't show error, just continue without staff list
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        show(t('errors.loadDataFailed'), 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isLoading, canView, show, router]);

  const buildingParam = searchParams.get('buildingId') || '';
  const serviceParam = searchParams.get('serviceId') || '';

  useEffect(() => {
    if (buildingParam && buildings.some((building) => building.id === buildingParam)) {
      setSelectedBuildingId(buildingParam);
    }
  }, [buildingParam, buildings]);

  useEffect(() => {
    if (serviceParam && services.some((service) => service.id === serviceParam)) {
      setSelectedServiceId(serviceParam);
    }
  }, [serviceParam, services]);

  // Auto-fill dates when cycle is selected
  useEffect(() => {
    if (selectedCycleId) {
      const cycle = cycles.find(c => c.id === selectedCycleId);
      if (cycle) {
        const startDateStr = cycle.periodFrom.split('T')[0];
        setStartDate(startDateStr);
        
        // Fix endDate to always be the 15th of the month from cycle.periodFrom
        const [year, month] = startDateStr.split('-').map(Number);
        const fixedEndDate = `${year}-${String(month).padStart(2, '0')}-15`;
        setEndDate(fixedEndDate);
      }
    }
  }, [selectedCycleId, cycles]);

  // Auto-update endDate to the 15th of the month whenever startDate changes
  useEffect(() => {
    if (startDate) {
      const [year, month] = startDate.split('-').map(Number);
      if (year && month) {
        const fixedEndDate = `${year}-${String(month).padStart(2, '0')}-15`;
        setEndDate(fixedEndDate);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate]);

  // Load assigned units for the current cycle/service/building
  useEffect(() => {
    const loadAssignedUnits = async () => {
      if (selectedCycleId && selectedServiceId && selectedBuildingId) {
        try {
          const assignments = await getAssignmentsByCycle(selectedCycleId);
          // Filter assignments with same cycle, service, and building
          const relevantAssignments = assignments.filter(
            (assignment: MeterReadingAssignmentDto) =>
              assignment.serviceId === selectedServiceId &&
              assignment.buildingId === selectedBuildingId
          );
          
          // Extract assigned unitIds from all relevant assignments
          const assignedUnitIdsSet = new Set<string>();
          relevantAssignments.forEach((assignment: MeterReadingAssignmentDto) => {
            if (assignment.unitIds && assignment.unitIds.length > 0) {
              assignment.unitIds.forEach(unitId => assignedUnitIdsSet.add(unitId));
            }
          });
          
          setAssignedUnitIds(assignedUnitIdsSet);
          
          // Also extract assigned floors for backward compatibility
          const assigned = new Set<number>();
          relevantAssignments.forEach((assignment: MeterReadingAssignmentDto) => {
            // Check both floor field (new) and floorFrom (old) for compatibility
            if (assignment.floor !== null && assignment.floor !== undefined) {
              assigned.add(assignment.floor);
            } else if (assignment.floorFrom !== null && assignment.floorFrom !== undefined) {
              // If floorFrom exists, add all floors from floorFrom to floorTo
              const from = assignment.floorFrom;
              const to = assignment.floorTo || assignment.floorFrom;
              for (let f = from; f <= to; f++) {
                assigned.add(f);
              }
            }
          });
          
          setAssignedFloors(assigned);
        } catch (error) {
          console.error('Failed to load assigned units:', error);
          setAssignedUnitIds(new Set());
          setAssignedFloors(new Set());
        }
      } else {
        setAssignedUnitIds(new Set());
        setAssignedFloors(new Set());
      }
    };

    loadAssignedUnits();
  }, [selectedCycleId, selectedServiceId, selectedBuildingId]);

  // Load available floors and all units when building is selected
  // Filter out units that are already assigned for this cycle/service/building
  // Only show units with primary resident AND meter for the selected service
  useEffect(() => {
    const loadFloors = async () => {
      if (selectedBuildingId && selectedServiceId) {
        try {
          const units = await getUnitsByBuilding(selectedBuildingId);
          
          // Filter units: only keep those with primary resident AND meter for the selected service
          const unitsWithResidentAndMeter: Unit[] = [];
          for (const unit of units) {
            try {
              // Check primary resident
              const household = await fetchCurrentHouseholdByUnit(unit.id);
              if (!household || !household.primaryResidentId) {
                continue; // Skip units without primary resident
              }
              
              // Check if unit has meter for the selected service
              const meters = await getMetersByUnit(unit.id);
              const hasMeterForService = meters.some(meter => 
                meter.serviceId === selectedServiceId && meter.active === true
              );
              
              if (hasMeterForService) {
                unitsWithResidentAndMeter.push(unit);
              }
            } catch (error) {
              // Skip units without household, primary resident, or meter
              // fetchCurrentHouseholdByUnit returns null for 404, which is valid
            }
          }
          
          // Filter out units that are already assigned
          const availableUnits = unitsWithResidentAndMeter.filter(unit => !assignedUnitIds.has(unit.id));
          setAllBuildingUnits(availableUnits); // Store only available units for dropdown selection
          
          // Extract unique floors from available units and sort them
          const uniqueFloors = Array.from(
            new Set(availableUnits.map(unit => unit.floor).filter(floor => floor != null))
          ).sort((a, b) => a - b);
          
          // Filter out already assigned floors (for backward compatibility)
          const available = uniqueFloors.filter(floor => !assignedFloors.has(floor));
          setAvailableFloors(available);
          
          // Load units for each available floor (filter out assigned units and units without primary resident)
          const unitsMap = new Map<number, Unit[]>();
          const loadingMap = new Map<number, boolean>();
          
          for (const floor of available) {
            loadingMap.set(floor, true);
            try {
              const floorUnits = await getUnitsByFloor(selectedBuildingId, floor);
              
              // Filter units: only keep those with primary resident AND meter for the selected service
              const floorUnitsWithResidentAndMeter: Unit[] = [];
              for (const unit of floorUnits) {
                try {
                  // Check primary resident
                  const household = await fetchCurrentHouseholdByUnit(unit.id);
                  if (!household || !household.primaryResidentId) {
                    continue; // Skip units without primary resident
                  }
                  
                  // Check if unit has meter for the selected service
                  const meters = await getMetersByUnit(unit.id);
                  const hasMeterForService = meters.some(meter => 
                    meter.serviceId === selectedServiceId && meter.active === true
                  );
                  
                  if (hasMeterForService) {
                    floorUnitsWithResidentAndMeter.push(unit);
                  }
                } catch (error) {
                  // Skip units without household, primary resident, or meter
                  // fetchCurrentHouseholdByUnit returns null for 404, which is valid
                }
              }
              
              // Filter out units that are already assigned
              const availableFloorUnits = floorUnitsWithResidentAndMeter.filter(unit => !assignedUnitIds.has(unit.id));
              unitsMap.set(floor, availableFloorUnits);
            } catch (error) {
              console.error(`Failed to load units for floor ${floor}:`, error);
              unitsMap.set(floor, []);
            } finally {
              loadingMap.set(floor, false);
            }
          }
          
          setUnitsByFloor(unitsMap);
          setLoadingUnits(loadingMap);
        } catch (error) {
          console.error('Failed to load floors from units:', error);
          setAvailableFloors([]);
          setAllBuildingUnits([]);
          setUnitsByFloor(new Map());
        }
      } else {
        setAvailableFloors([]);
        setAllBuildingUnits([]);
        setSelectedUnitIds(new Set());
        setExpandedFloors(new Set());
        setUnitsByFloor(new Map());
        setLoadingUnits(new Map());
      }
    };

    loadFloors();
  }, [selectedBuildingId, selectedServiceId, assignedFloors, assignedUnitIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCycleId) {
      show(t('errors.selectCycle'), 'error');
      return;
    }

    if (!selectedServiceId) {
      show(t('errors.selectService'), 'error');
      return;
    }

    if (!assignedTo) {
      show(t('errors.selectStaff'), 'error');
      return;
    }

    setStartDateError('');
    setEndDateError('');

    const parseDateOnly = (value: string) => {
      const [datePart] = value.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const selectedCycle = cycles.find(cycle => cycle.id === selectedCycleId);

    if (selectedCycle) {
      const cycleStartDate = parseDateOnly(selectedCycle.periodFrom);
      const cycleEndDate = parseDateOnly(selectedCycle.periodTo);

      if (startDate) {
        const startDateValue = parseDateOnly(startDate);
        if (startDateValue < cycleStartDate) {
          setStartDateError(t('errors.startDateBeforeCycle'));
          return;
        }
      }

      // EndDate is fixed to 15th, so validation is handled automatically
      // Ensure endDate is always the 15th of the month from startDate
      if (startDate) {
        const [year, month] = startDate.split('-').map(Number);
        if (year && month) {
          const fixedEndDate = `${year}-${String(month).padStart(2, '0')}-15`;
          if (endDate !== fixedEndDate) {
            setEndDate(fixedEndDate);
          }
          // Validate that endDate is not after cycle end date
          const endDateValue = parseDateOnly(fixedEndDate);
        if (endDateValue > cycleEndDate) {
          setEndDateError(t('errors.endDateAfterCycle'));
          return;
          }
        }
      }
    }

    // Validate: must select at least one unit when building is selected
    if (selectedBuildingId && selectedUnitIds.size === 0) {
      show(t('errors.selectAtLeastOneUnit'), 'error');
      return;
    }

    try {
      setLoading(true);

      // Calculate included unitIds (units that ARE selected)
      // If building is selected, send the selected units
      let includedUnitIds: string[] | undefined = undefined;
      
      if (selectedBuildingId && selectedUnitIds.size > 0) {
        // Send units that ARE selected
        includedUnitIds = Array.from(selectedUnitIds);
      }

      // Create one assignment with included unitIds (selected units)
      const req: MeterReadingAssignmentCreateReq = {
        cycleId: selectedCycleId,
        serviceId: selectedServiceId,
        assignedTo: assignedTo,
        buildingId: selectedBuildingId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        unitIds: includedUnitIds && includedUnitIds.length > 0 ? includedUnitIds : undefined,
        note: note || undefined,
      };

      const response = await createMeterReadingAssignment(req);

      if (response.id) {
        show(t('messages.createSuccess'), 'success');
        router.push('/base/readingAssign');
      } else {
        show(t('messages.createError'), 'error');
      }
    } catch (error: any) {
      console.error('Failed to create assignment:', error);
      show(error?.response?.data?.message || error?.message || t('messages.createError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading && cycles.length === 0) {
    return (
      <div className="px-[41px] py-12">
        <div className="bg-white p-6 rounded-xl text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#739559] mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-[41px] py-12">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleCancel}
          className="text-gray-600 hover:text-gray-900"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-semibold text-[#02542D]">{t('title')}</h1>
      </div>

      <div className="bg-white p-6 rounded-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">  
            {/* Reading Cycle */}
            <div className={`flex flex-col mb-4 col-span-1`}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('fields.readingCycle')} <span className="text-red-500">*</span>
              </label>
              <Select
                options={cycles}
                value={selectedCycleId}
                onSelect={(cycle) => setSelectedCycleId(cycle.id)}
                renderItem={(cycle) => `${cycle.name} (${cycle.status}) - ${new Date(cycle.periodFrom).toLocaleDateString()} to ${new Date(cycle.periodTo).toLocaleDateString()}`}
                getValue={(cycle) => cycle.id}
                placeholder={t('placeholders.selectCycle')}
                disable={true}
              />
            </div>

            {/* Building (Optional) */}
            <div className={`flex flex-col mb-4 col-span-1`}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('fields.building')} <span className="text-gray-500 text-xs">({t('fields.buildingOptional')})</span>
              </label>
              <Select
                options={buildings}
                value={selectedBuildingId}
                onSelect={(building) => setSelectedBuildingId(building.id)}
                renderItem={(building) => `${building.name} (${building.code})`}
                getValue={(building) => building.id}
                placeholder={t('placeholders.selectBuilding')}
              />
            </div>

            {/* Service */}
            <div className={`flex flex-col mb-4 col-span-1`}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('fields.service')} <span className="text-red-500">*</span>
              </label>
              <Select
                options={services}
                value={selectedServiceId}
                onSelect={(service) => setSelectedServiceId(service.id)}
                renderItem={(service) => `${service.name} (${service.code})`}
                getValue={(service) => service.id}
                placeholder={t('placeholders.selectService')}
              />
            </div>

            {/* Assigned To */}
            <div className={`flex flex-col mb-4 col-span-1`}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('fields.assignTo')} <span className="text-red-500">*</span>
              </label>
              <Select
                options={staffList}
                value={assignedTo}
                onSelect={(staff) => setAssignedTo(staff.userId)}
                renderItem={(staff) => `${staff.fullName || staff.username} (${staff.email})`}
                getValue={(staff) => staff.userId}
                placeholder={t('placeholders.selectStaff')}
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('fields.startDate')} <span className="text-gray-500 text-xs">({t('fields.startDateOptional')})</span>
              </label>
              <DateBox
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (startDateError) {
                    setStartDateError('');
                  }
                }}
                placeholderText={t('placeholders.selectStartDate')}
              />
              {startDateError && (
                <span className="text-red-500 text-xs mt-1">{startDateError}</span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('fields.endDate')} <span className="text-gray-500 text-xs">(Cố định: ngày 15)</span>
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
                placeholderText={t('placeholders.selectEndDate')}
                disabled={true}
              />
              {endDateError && (
                <span className="text-red-500 text-xs mt-1">{endDateError}</span>
              )}
            </div>
          </div>

          {/* Floor/Unit Selection */}
          {selectedBuildingId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('fields.selectUnits')} <span className="text-red-500">*</span>
                {assignedFloors.size > 0 && (
                  <span className="text-gray-500 text-xs ml-2">
                    {t('fields.floorsAssigned', { count: assignedFloors.size })}
                  </span>
                )}
              </label>
              
              {availableFloors.length === 0 ? (
                <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
                  <p className="text-sm text-gray-600">
                    {assignedFloors.size > 0 
                      ? t('messages.allFloorsAssigned')
                      : t('messages.noFloorsAvailable')}
                  </p>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-md p-4 max-h-96 overflow-y-auto">
                  <div className="space-y-3">
                    {availableFloors.map((floor) => {
                      const floorUnits = unitsByFloor.get(floor) || [];
                      const isLoading = loadingUnits.get(floor);
                      const isExpanded = expandedFloors.has(floor);
                      
                      // Check if all units in floor are selected
                      const allUnitsSelected = floorUnits.length > 0 && 
                        floorUnits.every(unit => selectedUnitIds.has(unit.id));
                      // Check if at least one unit is selected
                      const someUnitsSelected = floorUnits.some(unit => selectedUnitIds.has(unit.id));
                      
                      return (
                        <div
                          key={floor}
                          className="border border-gray-200 rounded-md p-3 hover:border-[#739559] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="mt-0.5">
                              <Checkbox
                                checked={allUnitsSelected}
                                onClick={() => {
                                  const newSelectedUnitIds = new Set(selectedUnitIds);
                                  
                                  if (allUnitsSelected) {
                                    // Uncheck floor - remove all units in this floor
                                    floorUnits.forEach(unit => newSelectedUnitIds.delete(unit.id));
                                  } else {
                                    // Check floor - add all units in this floor
                                    floorUnits.forEach(unit => newSelectedUnitIds.add(unit.id));
                                  }
                                  
                                  setSelectedUnitIds(newSelectedUnitIds);
                                }}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-gray-700">
                                  {t('fields.floor', { floor })}
                                </span>
                                {floorUnits.length > 0 && (
                                  <span className="text-xs text-gray-500">
                                    {t('fields.unitsCount', { count: floorUnits.length })}
                                  </span>
                                )}
                                {someUnitsSelected && !allUnitsSelected && (
                                  <span className="text-xs text-blue-600">
                                    {t('fields.selectedCount', { count: floorUnits.filter(u => selectedUnitIds.has(u.id)).length })}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newExpanded = new Set(expandedFloors);
                                    if (isExpanded) {
                                      newExpanded.delete(floor);
                                    } else {
                                      newExpanded.add(floor);
                                    }
                                    setExpandedFloors(newExpanded);
                                  }}
                                  className="ml-auto text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  {isExpanded ? t('actions.hideUnits') : t('actions.showUnits')}
                                </button>
                              </div>
                              
                              {isExpanded && (
                                <div className="mt-2 ml-6 space-y-1 border-l-2 border-gray-200 pl-3">
                                  {isLoading ? (
                                    <div className="text-xs text-gray-500 italic">{t('loadingUnits')}</div>
                                  ) : floorUnits.length > 0 ? (
                                    floorUnits.map((unit) => {
                                      const isUnitSelected = selectedUnitIds.has(unit.id);
                                      return (
                                        <div
                                          key={unit.id}
                                          className="flex items-center gap-2 py-1"
                                        >
                                          <Checkbox
                                            checked={isUnitSelected}
                                            onClick={() => {
                                              const newSelectedUnitIds = new Set(selectedUnitIds);
                                              
                                              if (isUnitSelected) {
                                                // Uncheck unit - remove from selected
                                                newSelectedUnitIds.delete(unit.id);
                                              } else {
                                                // Check unit - add to selected
                                                newSelectedUnitIds.add(unit.id);
                                              }
                                              
                                              setSelectedUnitIds(newSelectedUnitIds);
                                            }}
                                          />
                                          <span className="text-xs text-gray-700">{unit.code}</span>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="text-xs text-gray-400 italic">{t('messages.noUnitsFound')}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {selectedUnitIds.size > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {t('fields.selectedUnits', { count: selectedUnitIds.size })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedUnitIds(new Set())}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    {t('actions.clearAll')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('fields.note')} <span className="text-gray-500 text-xs">({t('fields.optional')})</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('placeholders.additionalNotes')}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !selectedCycleId || !selectedServiceId || !assignedTo}
              className="px-6 py-2 bg-[#02542D] text-white rounded-md hover:bg-[#024428] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('actions.creating') : t('actions.createAssignment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

