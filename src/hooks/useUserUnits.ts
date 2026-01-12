import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  HouseholdMemberDto,
  fetchHouseholdMembersByHousehold,
  fetchCurrentHouseholdByUnit,
} from '@/src/services/base/householdService';
import { getUnit, Unit } from '@/src/services/base/unitService';
import { fetchContractsByUserId, ContractSummary } from '@/src/services/base/contractService';

export interface UserUnitAssignment {
  unitId: string;
  unitCode: string | null;
  buildingId: string | null;
  buildingName: string | null;
  buildingCode: string | null;
  householdId: string | null;
  isPrimary: boolean;
  relation: string | null;
  joinedAt: string | null;
}

function mapAssignment(
  unit: Unit & { buildingName?: string | null; buildingCode?: string | null },
  householdId: string | null,
  member: HouseholdMemberDto | null,
): UserUnitAssignment {
  return {
    unitId: unit.id,
    unitCode: unit.code ?? null,
    buildingId: unit.buildingId ?? null,
    buildingName: (unit as any).buildingName ?? null,
    buildingCode: (unit as any).buildingCode ?? null,
    householdId: householdId,
    isPrimary: Boolean(member?.isPrimary),
    relation: member?.relation ?? null,
    joinedAt: member?.joinedAt ?? null,
  };
}

export function useUserUnits(userId?: string) {
  const [assignments, setAssignments] = useState<UserUnitAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setAssignments([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Bước 1: Fetch contracts từ userId (ContractController) để lấy unit IDs
      const contracts = await fetchContractsByUserId(userId);

      if (!contracts.length) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // Extract unique unit IDs từ contracts
      const unitIds = Array.from(new Set(contracts.map((c) => c.unitId).filter(Boolean))) as string[];

      if (!unitIds.length) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // Bước 2: Fetch unit details từ unitIds (UnitController)
      const unitResults = await Promise.all(
        unitIds.map(async (unitId) => {
          try {
            const unit = await getUnit(unitId);
            return unit;
          } catch (err) {
            console.error('Failed to fetch unit detail', unitId, err);
            return null;
          }
        }),
      );

      const units = unitResults.filter((u): u is Unit => u !== null);

      // Bước 3: Với mỗi unit, fetch household và members (HouseholdMemberController)
      const assignmentResults = await Promise.all(
        units.map(async (unit) => {
          try {
            // Lấy current household của unit
            const household = await fetchCurrentHouseholdByUnit(unit.id);

            if (!household) {
              return mapAssignment(unit, null, null);
            }

            // Lấy members của household
            const members = await fetchHouseholdMembersByHousehold(household.id);

            // Lấy primary member hoặc member đầu tiên
            const primaryMember = members.find((m) => m.isPrimary) || members[0] || null;

            return mapAssignment(unit, household.id, primaryMember);
          } catch (err) {
            console.error('Failed to fetch household/member detail for unit', unit.id, err);
            return mapAssignment(unit, null, null);
          }
        }),
      );

      setAssignments(assignmentResults);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || 'Không thể tải danh sách căn hộ của tài khoản.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const householdIds = useMemo(() => new Set(assignments.map((item) => item.householdId).filter(Boolean)), [assignments]);

  return {
    assignments,
    loading,
    error,
    refresh: load,
    knownHouseholdIds: householdIds,
  } as const;
}

