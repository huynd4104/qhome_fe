import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  HouseholdDto,
  HouseholdMemberDto,
  fetchHouseholdById,
  fetchHouseholdMembersByResident,
} from '@/src/services/base/householdService';
import { getUnit } from '@/src/services/base/unitService';

export interface ResidentUnitAssignment {
  memberId: string;
  householdId: string;
  unitId: string | null;
  unitCode: string | null;
  buildingId: string | null;
  buildingName: string | null;
  buildingCode: string | null;
  isPrimary: boolean;
  relation: string | null;
  joinedAt: string | null;
}

function mapAssignment(
  member: HouseholdMemberDto,
  household: HouseholdDto,
  unitMeta?: { buildingId: string | null; buildingName: string | null; buildingCode: string | null; code: string | null },
): ResidentUnitAssignment {
  return {
    memberId: member.id,
    householdId: member.householdId,
    unitId: household.unitId,
    unitCode: household.unitCode ?? unitMeta?.code ?? null,
    buildingId: unitMeta?.buildingId ?? null,
    buildingName: unitMeta?.buildingName ?? null,
    buildingCode: unitMeta?.buildingCode ?? null,
    isPrimary: Boolean(member.isPrimary),
    relation: member.relation,
    joinedAt: member.joinedAt,
  };
}

export function useResidentUnits(residentId?: string) {
  const [assignments, setAssignments] = useState<ResidentUnitAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!residentId) {
      setAssignments([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const members = await fetchHouseholdMembersByResident(residentId);
      console.log('members', members);
      if (!members.length) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      const householdResults = await Promise.all(
        members.map(async (member) => {
          try {
            const household = await fetchHouseholdById(member.householdId);
            return { member, household };
          } catch (err) {
            console.error('Failed to fetch household detail', err);
            return null;
          }
        }),
      );

      const compacted = householdResults.filter(Boolean) as Array<{ member: HouseholdMemberDto; household: HouseholdDto }>;

      const unitResults = await Promise.all(
        compacted.map(async ({ member, household }) => {
          if (!household.unitId) {
            return mapAssignment(member, household);
          }

          try {
            const unit = await getUnit(household.unitId);
            const unitExtras = unit as unknown as {
              buildingName?: string | null;
              buildingCode?: string | null;
            };
            return mapAssignment(member, household, {
              buildingId: unit.buildingId ?? null,
              buildingName: unitExtras.buildingName ?? null,
              buildingCode: unitExtras.buildingCode ?? null,
              code: unit.code ?? null,
            });
          } catch (err) {
            console.error('Failed to fetch unit detail', err);
            return mapAssignment(member, household);
          }
        }),
      );

      const deduped = new Map<string, ResidentUnitAssignment>();
      unitResults.forEach((assignment) => {
        const key = assignment.unitId ?? assignment.householdId;
        if (!deduped.has(key) || assignment.isPrimary) {
          deduped.set(key, assignment);
        }
      });

      setAssignments(Array.from(deduped.values()));
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || 'Không thể tải danh sách căn hộ của cư dân.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [residentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const householdIds = useMemo(() => new Set(assignments.map((item) => item.householdId)), [assignments]);

  return {
    assignments,
    loading,
    error,
    refresh: load,
    knownHouseholdIds: householdIds,
  } as const;
}
