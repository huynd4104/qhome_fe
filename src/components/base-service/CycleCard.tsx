'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ReadingCycleDto,
  MeterReadingAssignmentDto,
  type ReadingCycleUnassignedInfoDto,
  createMissingMeters,
  createMeter,
  type MeterCreateReq,
  type UnitWithoutMeterDto,
} from '@/src/services/base/waterService';
import { fetchCurrentHouseholdByUnit } from '@/src/services/base/householdService';
import AssignmentTable from './AssignmentTable';
import { useNotifications } from '@/src/hooks/useNotifications';

interface CycleCardProps {
  cycle: ReadingCycleDto;
  assignments: MeterReadingAssignmentDto[];
  isExpanded: boolean;
  onToggle: () => void;
  onViewAssignment: (assignment: MeterReadingAssignmentDto) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  canCompleteCycle?: boolean;
  onCompleteCycle?: (cycle: ReadingCycleDto) => void;
  isCompleting?: boolean;
  unassignedInfo?: ReadingCycleUnassignedInfoDto;
  onAddAssignment?: (cycle: ReadingCycleDto) => void;
  onViewUnassigned?: (cycle: ReadingCycleDto, info: ReadingCycleUnassignedInfoDto) => void;
  onViewCycle?: (cycle: ReadingCycleDto) => void;
  assignmentBlockedReason?: string;
  onMetersCreated?: () => void;
}

const CycleCard = ({
  cycle,
  assignments,
  isExpanded,
  onToggle,
  onViewAssignment,
  onDeleteAssignment,
  canCompleteCycle = false,
  onCompleteCycle,
  isCompleting = false,
  unassignedInfo,
  onAddAssignment,
  onViewUnassigned,
  onViewCycle,
  assignmentBlockedReason,
  onMetersCreated,
}: CycleCardProps) => {
  const router = useRouter();
  const { show } = useNotifications();
  const t = useTranslations('ReadingAssign');
  const [creatingMeters, setCreatingMeters] = useState<Set<string>>(new Set());
  const [showCreateMeterModal, setShowCreateMeterModal] = useState(false);
  const [selectedMeterGroup, setSelectedMeterGroup] = useState<{
    title: string;
    units: string[];
    unitIds: string[];
    buildingId?: string;
    unitId?: string;
    unitData: UnitWithoutMeterDto[];
  } | null>(null);
  const [unitsWithPrimaryResident, setUnitsWithPrimaryResident] = useState<UnitWithoutMeterDto[]>([]);
  const [selectedUnitsForMeter, setSelectedUnitsForMeter] = useState<Set<string>>(new Set());
  const [loadingUnitsWithResident, setLoadingUnitsWithResident] = useState(false);
  const [creatingMetersForSelected, setCreatingMetersForSelected] = useState(false);
  const [unitsWithResidentMap, setUnitsWithResidentMap] = useState<Map<string, boolean>>(new Map());
  const [checkingResidents, setCheckingResidents] = useState(false);

  // Backend now filters units with primary resident, so we can mark all as having resident
  useEffect(() => {
    if (!unassignedInfo?.missingMeterUnits || unassignedInfo.missingMeterUnits.length === 0) {
      setUnitsWithResidentMap(new Map());
      setCheckingResidents(false);
      return;
    }

    // Since backend filters by onlyWithOwner=true, all units in missingMeterUnits have primary resident
    const map = new Map<string, boolean>();
    for (const unit of unassignedInfo.missingMeterUnits) {
      map.set(unit.unitId, true);
    }
    setUnitsWithResidentMap(map);
    setCheckingResidents(false);
  }, [
    unassignedInfo?.missingMeterUnits,
    unassignedInfo?.totalUnassigned,
    cycle.id,
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700';
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-700';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const assignmentAllowed = !Boolean(assignmentBlockedReason);

  const missingMeterGroups = useMemo(() => {
    if (!unassignedInfo?.missingMeterUnits || unassignedInfo.missingMeterUnits.length === 0) {
      console.log('[CycleCard] No missingMeterUnits:', {
        hasUnassignedInfo: !!unassignedInfo,
        missingMeterUnitsLength: unassignedInfo?.missingMeterUnits?.length ?? 0,
        missingMeterUnits: unassignedInfo?.missingMeterUnits,
      });
      return [];
    }

    console.log('[CycleCard] Processing missingMeterUnits:', {
      count: unassignedInfo.missingMeterUnits.length,
      units: unassignedInfo.missingMeterUnits.map(u => ({ unitId: u.unitId, unitCode: u.unitCode, buildingId: u.buildingId })),
    });

    const map = new Map<
      string,
      { 
        title: string; 
        units: string[]; 
        unitIds: string[];
        buildingId?: string; 
        unitId?: string;
        unitData: UnitWithoutMeterDto[];
      }
    >();
    
    // Backend already filters by onlyWithOwner=true, so all units in missingMeterUnits have primary resident
    // Group by building only (not by building + floor)
    unassignedInfo.missingMeterUnits.forEach((unit) => {
      const buildingLabel =
        unit.buildingCode || unit.buildingName || 'Tòa nhà chưa rõ';
      const key = buildingLabel; // Group by building only
      const existing = map.get(key);
      const unitLabel = unit.unitCode || unit.unitId;
      if (existing) {
        existing.units.push(unitLabel);
        existing.unitIds.push(unit.unitId);
        existing.unitData.push(unit);
        if (!existing.unitId) {
          existing.unitId = unit.unitId;
        }
      } else {
        map.set(key, {
          title: buildingLabel, // Only building name, no floor
          units: [unitLabel],
          unitIds: [unit.unitId],
          buildingId: unit.buildingId,
          unitId: unit.unitId,
          unitData: [unit],
        });
      }
    });

    const result = Array.from(map.values());
    console.log('[CycleCard] missingMeterGroups result:', {
      count: result.length,
      groups: result.map(g => ({ title: g.title, unitsCount: g.units.length })),
    });
    return result;
  }, [unassignedInfo]);

  const handleAddAssignmentClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!assignmentAllowed) {
      return;
    }
    if (onAddAssignment) {
      onAddAssignment(cycle);
      return;
    }
    router.push(`/base/addAssignment?cycleId=${cycle.id}`);
  };

  const handleOpenCreateMeterModal = useCallback(async (
    event: React.MouseEvent<HTMLButtonElement>,
    group: { title: string; units: string[]; unitIds: string[]; buildingId?: string; unitId?: string; unitData: UnitWithoutMeterDto[] }
  ) => {
    event.stopPropagation();
    
    if (!cycle.serviceId) {
      show('Không tìm thấy thông tin dịch vụ', 'error');
      return;
    }

    if (!group.buildingId) {
      show('Không tìm thấy thông tin tòa nhà', 'error');
      return;
    }

    setSelectedMeterGroup(group);
    setLoadingUnitsWithResident(true);
    setSelectedUnitsForMeter(new Set());

    try {
      // Filter units that have primary resident
      const unitsWithResident: UnitWithoutMeterDto[] = [];
      for (const unit of group.unitData) {
        // fetchCurrentHouseholdByUnit returns null for 404 (no household), which is valid
        const household = await fetchCurrentHouseholdByUnit(unit.unitId);
        if (household && household.primaryResidentId) {
          unitsWithResident.push(unit);
        }
      }

      setUnitsWithPrimaryResident(unitsWithResident);
      if (unitsWithResident.length === 0) {
        show('Không có căn hộ nào có chủ nhà trong tòa này', 'error');
        return;
      }
      setShowCreateMeterModal(true);
    } catch (error: any) {
      show(error?.message || 'Không thể tải danh sách căn hộ', 'error');
    } finally {
      setLoadingUnitsWithResident(false);
    }
  }, [cycle.serviceId, show]);

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
    if (!cycle.serviceId || !selectedMeterGroup || selectedUnitsForMeter.size === 0) {
      show('Vui lòng chọn ít nhất một căn hộ', 'error');
      return;
    }

    setCreatingMetersForSelected(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      for (const unitId of selectedUnitsForMeter) {
        try {
          const unit = unitsWithPrimaryResident.find(u => u.unitId === unitId);
          if (!unit) continue;

          const meterReq: MeterCreateReq = {
            unitId: unitId,
            serviceId: cycle.serviceId,
            installedAt: new Date().toISOString().split('T')[0],
          };

          await createMeter(meterReq);
          successCount++;
        } catch (error: any) {
          errorCount++;
          const unit = unitsWithPrimaryResident.find(u => u.unitId === unitId);
          const unitCode = unit?.unitCode || unitId;
          const errorMsg = error?.response?.data?.message || error?.message || 'Lỗi không xác định';
          errors.push(`${unitCode}: ${errorMsg}`);
        }
      }

      if (successCount > 0) {
        show(
          `Đã tạo thành công ${successCount} công tơ${successCount > 1 ? '' : ''}${errorCount > 0 ? `. ${errorCount} lỗi.` : ''}`,
          'success'
        );
        
        // Close modal first
        setShowCreateMeterModal(false);
        setSelectedUnitsForMeter(new Set());
        setSelectedMeterGroup(null);
        
        // THEN call the callback to refresh data
        if (onMetersCreated) {
          // Add a small delay to ensure modal closes smoothly
          setTimeout(() => {
            onMetersCreated();
          }, 100);
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }

      if (errorCount > 0 && successCount === 0) {
        show(`Không thể tạo công tơ. Lỗi: ${errors.join('; ')}`, 'error');
      }
    } catch (error: any) {
      show(error?.message || 'Không thể tạo công tơ', 'error');
    } finally {
      setCreatingMetersForSelected(false);
    }
  }, [cycle.serviceId, selectedMeterGroup, selectedUnitsForMeter, unitsWithPrimaryResident, show, onMetersCreated]);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Cycle Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-[#02542D]">{cycle.name}</h2>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(cycle.status)}`}>
                {cycle.status}
              </span>
            </div>
          <p className="text-sm text-gray-600 mt-1">
            Period: {new Date(cycle.periodFrom).toLocaleDateString()} -{' '}
            {new Date(cycle.periodTo).toLocaleDateString()}
          </p>
          {assignmentBlockedReason && (
            <p className="text-xs text-red-500 mt-1">{assignmentBlockedReason}</p>
          )}
          <p className="text-sm text-gray-500">
            {cycle.serviceName
              ? `${t('servicePrefix')} ${cycle.serviceName}`
              : cycle.serviceCode
              ? `${t('codePrefix')} ${cycle.serviceCode}`
              : t('serviceUnknown')}
          </p>
            <button
              type="button"
              onClick={(e) => {
                handleAddAssignmentClick(e);
              }}
              className={`mt-3 text-sm font-semibold ${
                assignmentAllowed ? 'text-[#02542D] hover:underline' : 'text-gray-400'
              }`}
              aria-label="Add assignment for this cycle"
              disabled={!assignmentAllowed}
            >
              {t('addAssignmentForCycle')}
            </button>
          </div>
          <div className="text-sm text-gray-600">
            {assignments.length === 1 
              ? t('assignmentsCount', { count: assignments.length })
              : t('assignmentsCountPlural', { count: assignments.length })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {onViewCycle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewCycle(cycle);
              }}
              className="px-4 py-2 text-white bg-[#02542D] hover:bg-[#024428] rounded-md transition-colors"
            >
              {t('viewCycle')}
            </button>
          )}
        </div>

        {assignmentBlockedReason && (
          <div className="px-4 pb-2 text-xs text-red-600">{assignmentBlockedReason}</div>
        )}

        {/* Expand Icon */}
        <svg
          className={`ml-4 w-5 h-5 text-gray-600 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {!assignmentBlockedReason && (unassignedInfo?.totalUnassigned || missingMeterGroups.length > 0) ? (
        <div className="border-t border-b border-yellow-200 bg-yellow-50 text-yellow-800 text-sm space-y-2">
          {checkingResidents ? (
            <div className="px-4 py-2 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-700"></div>
              <span>Đang kiểm tra căn hộ có chủ nhà...</span>
            </div>
          ) : (
            <>
              {missingMeterGroups.length > 0 ? (
                <div className="px-4 py-2">
                  <p className="font-semibold mb-2">
                    Còn {missingMeterGroups.reduce((sum, group) => sum + group.units.length, 0)} căn hộ/phòng chưa được assign (chỉ hiển thị căn có chủ nhà):
                  </p>
                  <div className="space-y-1 text-xs">
                    {missingMeterGroups.map((group) => (
                      <div key={group.title}>
                        <span className="font-semibold">{group.title}:</span> {group.units.length} căn hộ chưa có công tơ
                      </div>
                    ))}
                  </div>
                </div>
              ) : unassignedInfo?.message ? (
                <div className="px-4 py-2 whitespace-pre-line">{unassignedInfo.message}</div>
              ) : null}
            </>
          )}
          {onViewUnassigned && !checkingResidents && unassignedInfo && (
            <div className="px-4 pb-3 flex justify-end">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onViewUnassigned(cycle, unassignedInfo);
                }}
                className="text-xs font-semibold text-[#02542D] hover:underline"
              >
                Xem danh sách chưa được phân công
              </button>
            </div>
          )}
          {!checkingResidents && missingMeterGroups.length > 0 && (
            <div className="px-4 pb-3 border-t border-yellow-200 pt-2 text-[#6b4500] text-xs space-y-1">
              <div className="font-semibold text-sm">Các căn chưa có công tơ</div>
              {missingMeterGroups.map((group) => {
                const groupKey = `${group.buildingId}-${group.title}`;
                const isCreating = creatingMeters.has(groupKey);
                
                return (
                  <div key={group.title} className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold">{group.title}:</span> {group.units.length} căn hộ chưa có công tơ
                    </div>
                    {group.buildingId && cycle.serviceId && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenCreateMeterModal(e, group)}
                        disabled={loadingUnitsWithResident}
                        className={`text-[11px] font-semibold bg-white border border-[#02542D] rounded-full px-3 py-1 text-[#02542D] hover:bg-[#02542D] hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${
                          loadingUnitsWithResident ? 'animate-pulse' : ''
                        }`}
                      >
                        {loadingUnitsWithResident ? 'Đang tải...' : 'Thêm công tơ'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* Assignments List */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {assignments.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {t('noAssignmentsYet')}
            </div>
          ) : (
            <AssignmentTable
              assignments={assignments}
              onView={onViewAssignment}
              onDelete={onDeleteAssignment}
            />
          )}
        </div>
      )}

      {/* Create Meter Modal */}
      {showCreateMeterModal && selectedMeterGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-w-4xl w-full rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-500">Tạo công tơ</p>
                <h3 className="text-lg font-semibold text-[#02542D]">
                  {selectedMeterGroup.title}
                </h3>
                <p className="text-sm text-gray-600">
                  Chọn các căn hộ cần tạo công tơ (chỉ hiển thị căn hộ có chủ nhà)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateMeterModal(false);
                  setSelectedUnitsForMeter(new Set());
                  setSelectedMeterGroup(null);
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
                  <p className="text-sm text-yellow-700">Không có căn hộ nào có chủ nhà trong tòa này</p>
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
                          disabled={creatingMetersForSelected}
                          className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingMetersForSelected ? 'Đang tạo...' : `Tạo công tơ cho ${selectedUnitsForMeter.size} căn hộ`}
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
};

export default CycleCard;

