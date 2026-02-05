/**
 * Hook for managing water page state and data fetching
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  getMetersByBuilding,
  getMetersByUnit,
  MeterDto,
  MeterReadingDto,
  createMeterReading,
  MeterReadingCreateReq,
  ReadingCycleDto,
  getReadingCycleById,
  getReadingCyclesByPeriod,
  createReadingCycle,
  updateReadingCycle,
  ReadingCycleCreateReq,
  ReadingCycleUpdateReq,
  MeterReadingAssignmentDto,
  getAssignmentsByCycle,
  createMeterReadingAssignment,
  MeterReadingAssignmentCreateReq,
  getMyActiveAssignments,
} from '@/src/services/base/waterService';
import { getUnitsByBuilding, Unit } from '@/src/services/base/unitService';

export interface WaterReadingData {
  unit: Unit;
  meter: MeterDto | null;
  reading: MeterReadingDto | null;
  status: 'measured' | 'pending' | 'not_metered';
}

export interface WaterCycleData {
  cycle: ReadingCycleDto | null;
  fromDate: string;
  toDate: string;
}

export interface WaterFormulaData {
  id: string;
  fromAmount: number;
  toAmount: number | null;
  price: number;
}

interface UseWaterPageOptions {
  buildingId?: string;
  serviceId?: string; // Water service ID
  autoLoad?: boolean;
}

export function useWaterPage(options: UseWaterPageOptions = {}) {
  const { user } = useAuth();
  const { buildingId, serviceId, autoLoad = true } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [meters, setMeters] = useState<MeterDto[]>([]);
  const [waterReadings, setWaterReadings] = useState<WaterReadingData[]>([]);
  const [cycle, setCycle] = useState<ReadingCycleDto | null>(null);
  const [assignments, setAssignments] = useState<MeterReadingAssignmentDto[]>([]);

  // Load units when buildingId changes
  useEffect(() => {
    if (!buildingId || !autoLoad) return;

    const loadUnits = async () => {
      try {
        setLoading(true);
        setError(null);
        const unitsData = await getUnitsByBuilding(buildingId);
        const activeUnits = unitsData.filter(u => u.status?.toUpperCase() !== 'INACTIVE');
        setUnits(activeUnits);
      } catch (err: any) {
        setError(err?.message || 'Failed to load apartments');
        console.error('Failed to load units:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUnits();
  }, [buildingId, autoLoad]);

  // Load meters when buildingId or serviceId changes
  useEffect(() => {
    if (!buildingId || !serviceId || !autoLoad) return;

    const loadMeters = async () => {
      try {
        setLoading(true);
        setError(null);
        const metersData = await getMetersByBuilding(buildingId);
        // Filter by serviceId if provided
        const waterMeters = serviceId 
          ? metersData.filter(m => m.serviceId === serviceId)
          : metersData;
        setMeters(waterMeters);
      } catch (err: any) {
        setError(err?.message || 'Failed to load meters');
        console.error('Failed to load meters:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMeters();
  }, [buildingId, serviceId, autoLoad]);

  // Combine units and meters to create water reading data
  useEffect(() => {
    const readingsData: WaterReadingData[] = units.map(unit => {
      const unitMeter = meters.find(m => m.unitId === unit.id);
      
      // TODO: Load actual readings from API when available
      // For now, we'll mark as 'not_metered' if no meter exists
      const status = unitMeter 
        ? (unitMeter.lastReadingDate ? 'measured' : 'pending')
        : 'not_metered';

      return {
        unit,
        meter: unitMeter || null,
        reading: null, // TODO: Load actual reading data
        status,
      };
    });

    setWaterReadings(readingsData);
  }, [units, meters]);

  // Load cycle data
  const loadCycle = useCallback(async (cycleId: string) => {
    try {
      setLoading(true);
      setError(null);
      const cycleData = await getReadingCycleById(cycleId);
      setCycle(cycleData);
      return cycleData;
    } catch (err: any) {
      setError(err?.message || 'Failed to load cycle');
      console.error('Failed to load cycle:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load assignments for a cycle
  const loadAssignments = useCallback(async (cycleId: string) => {
    try {
      setLoading(true);
      setError(null);
      const assignmentsData = await getAssignmentsByCycle(cycleId);
      setAssignments(assignmentsData);
      return assignmentsData;
    } catch (err: any) {
      setError(err?.message || 'Failed to load assignments');
      console.error('Failed to load assignments:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load my active assignments
  const loadMyActiveAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const assignmentsData = await getMyActiveAssignments();
      setAssignments(assignmentsData);
      return assignmentsData;
    } catch (err: any) {
      setError(err?.message || 'Failed to load my assignments');
      console.error('Failed to load my assignments:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create meter reading
  const submitMeterReading = useCallback(async (req: MeterReadingCreateReq) => {
    try {
      setLoading(true);
      setError(null);
      const reading = await createMeterReading(req);
      // Refresh data after creating reading
      if (buildingId && serviceId) {
        const metersData = await getMetersByBuilding(buildingId);
        const waterMeters = serviceId 
          ? metersData.filter(m => m.serviceId === serviceId)
          : metersData;
        setMeters(waterMeters);
      }
      return reading;
    } catch (err: any) {
      setError(err?.message || 'Failed to create meter reading');
      console.error('Failed to create meter reading:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [buildingId, serviceId]);

  // Create reading cycle
  const createCycle = useCallback(async (req: ReadingCycleCreateReq) => {
    try {
      setLoading(true);
      setError(null);
      const cycleData = await createReadingCycle(req);
      setCycle(cycleData);
      return cycleData;
    } catch (err: any) {
      setError(err?.message || 'Failed to create cycle');
      console.error('Failed to create cycle:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update reading cycle
  const updateCycleData = useCallback(async (cycleId: string, req: ReadingCycleUpdateReq) => {
    try {
      setLoading(true);
      setError(null);
      const cycleData = await updateReadingCycle(cycleId, req);
      setCycle(cycleData);
      return cycleData;
    } catch (err: any) {
      setError(err?.message || 'Failed to update cycle');
      console.error('Failed to update cycle:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create assignment
  const createAssignment = useCallback(async (req: MeterReadingAssignmentCreateReq) => {
    try {
      setLoading(true);
      setError(null);
      const assignment = await createMeterReadingAssignment(req);
      // Refresh assignments if cycle is loaded
      if (req.cycleId) {
        await loadAssignments(req.cycleId);
      }
      return assignment;
    } catch (err: any) {
      setError(err?.message || 'Failed to create assignment');
      console.error('Failed to create assignment:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadAssignments]);

  // Refresh data
  const refresh = useCallback(() => {
    if (buildingId && autoLoad) {
      // Trigger reload of units and meters
      const loadData = async () => {
        try {
          setLoading(true);
          const [unitsData, metersData] = await Promise.all([
            getUnitsByBuilding(buildingId),
            serviceId ? getMetersByBuilding(buildingId) : Promise.resolve([])
          ]);
          
          const activeUnits = unitsData.filter(u => u.status?.toUpperCase() !== 'INACTIVE');
          setUnits(activeUnits);
          
          if (serviceId && metersData.length > 0) {
            const waterMeters = metersData.filter(m => m.serviceId === serviceId);
            setMeters(waterMeters);
          }
        } catch (err: any) {
          setError(err?.message || 'Failed to refresh data');
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [buildingId, serviceId, autoLoad]);

  return {
    // State
    loading,
    error,
    units,
    meters,
    waterReadings,
    cycle,
    assignments,

    // Actions
    loadCycle,
    loadAssignments,
    loadMyActiveAssignments,
    submitMeterReading,
    createCycle,
    updateCycleData,
    createAssignment,
    refresh,

    // Helpers
    setError,
  };
}

