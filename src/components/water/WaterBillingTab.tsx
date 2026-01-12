'use client'
import React, { useEffect, useMemo, useState } from 'react';
import {
  getAllReadingCycles,
  ReadingCycleDto,
  getAssignmentsByCycle,
  getMeterReadingsByCycleAndAssignmentAndUnit,
  MeterReadingDto,
  exportReadingsByCycle,
  MeterReadingImportResponse,
} from '@/src/services/base/waterService';
import { useNotifications } from '@/src/hooks/useNotifications';
import { getBuildings } from '@/src/services/base/buildingService';
import { getUnit, Unit } from '@/src/services/base/unitService';
import {
  PricingTierDto,
  getPricingTiersByService,
} from '@/src/services/finance/pricingTierService';

type Building = {
  id: string;
  code: string;
  name: string;
};

interface BillingUnitData {
  unitId: string;
  unitCode: string;
  meterCode: string;
  prevIndex: number;
  currentIndex: number;
  usage: number;
  amount: number;
}

interface BillingBuildingData {
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  units: BillingUnitData[];
}

interface WaterBillingTabProps {
  formulaVersion: number;
}

export default function WaterBillingTab({ formulaVersion }: WaterBillingTabProps) {
  const { show } = useNotifications();
  
  const [cycles, setCycles] = useState<ReadingCycleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());
  const [billingData, setBillingData] = useState<Record<string, Record<string, BillingBuildingData>>>({});
  const [pricingTiers, setPricingTiers] = useState<PricingTierDto[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    loadPricingFormula();
  }, [formulaVersion]);

  const loadCycles = async () => {
    try {
      setLoading(true);
      setIsInitialLoad(true);
      const data = await getAllReadingCycles();
      // Filter cycles that are completed or in progress
      const filteredCycles = data.filter(cycle => 
        cycle.status === 'COMPLETED' || cycle.status === 'IN_PROGRESS'
      );
      setCycles(filteredCycles);
      
      // Auto-expand first cycle
      if (filteredCycles.length > 0) {
        setExpandedCycles(new Set([filteredCycles[0].id]));
        await loadBillingDataForCycle(filteredCycles[0].id);
      }
    } catch (error: any) {
      console.error('Failed to load cycles:', error);
      show(error?.response?.data?.message || error?.message || 'Failed to load cycles', 'error');
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  const loadBillingDataForCycle = async (cycleId: string) => {
    try {
      setLoading(true);
      // Get all assignments for this cycle
      const assignments = await getAssignmentsByCycle(cycleId);
      
      // Filter by WATER service
      const serviceAssignments = assignments.filter(a => 
        a.serviceCode === 'WATER'
      );

      // Get all readings for these assignments using the new API
      const allReadings: MeterReadingDto[] = [];
      const processedUnits = new Set<string>(); // Track processed unitIds to avoid duplicates
      
      for (const assignment of serviceAssignments) {
        if (!assignment.unitIds || assignment.unitIds.length === 0) continue;
        
        // Get readings for each unit in this assignment
        for (const unitId of assignment.unitIds) {
          // Skip if already processed (to avoid duplicates across assignments)
          if (processedUnits.has(unitId)) continue;
          
          try {
            const readings = await getMeterReadingsByCycleAndAssignmentAndUnit(
              cycleId,
              unitId,
              assignment.id
            );
            
            // Only add the first reading for this unit (should be only one per unit typically)
            if (readings.length > 0) {
              allReadings.push(readings[0]);
              processedUnits.add(unitId);
            }
          } catch (error) {
            console.error(`Failed to load readings for assignment ${assignment.id}, unit ${unitId}:`, error);
          }
        }
      }

      // Group by building
      const buildingsMap: Record<string, BillingBuildingData> = {};
      
      // Load all buildings once
      let allBuildings: Building[] = [];
      try {
        allBuildings = await getBuildings();
      } catch (error) {
        console.error('Failed to load buildings:', error);
      }
      
      // Cache units to avoid duplicate API calls
      const unitsCache: Record<string, Unit> = {};
      
      for (const reading of allReadings) {
        if (!reading.unitId || !reading.meterCode) continue;
        
        // Get unit to find building (use cache if available)
        let unit: Unit | null = unitsCache[reading.unitId] || null;
        if (!unit) {
          try {
            unit = await getUnit(reading.unitId);
            unitsCache[reading.unitId] = unit;
          } catch (error) {
            console.error(`Failed to load unit ${reading.unitId}:`, error);
            continue;
          }
        }

        if (!unit?.buildingId) continue;

        // Get building from pre-loaded list
        const building = allBuildings.find(b => b.id === unit.buildingId);
        if (!building) continue;

        const buildingId = building.id;
        if (!buildingsMap[buildingId]) {
          buildingsMap[buildingId] = {
            buildingId,
            buildingCode: building.code,
            buildingName: building.name,
            units: [],
          };
        }

        const prevIndex = reading.prevIndex || 0;
        const currentIndex = reading.currentIndex || 0;
        const usage = currentIndex - prevIndex;
        const amount = calculateAmount(usage);

        buildingsMap[buildingId].units.push({
          unitId: reading.unitId,
          unitCode: unit.code,
          meterCode: reading.meterCode,
          prevIndex,
          currentIndex,
          usage,
          amount,
        });
      }

      setBillingData(prev => ({
        ...prev,
        [cycleId]: buildingsMap,
      }));
    } catch (error: any) {
      console.error(`Failed to load billing data for cycle ${cycleId}:`, error);
      show(error?.response?.data?.message || error?.message || 'Failed to load billing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPricingFormula = async () => {
    try {
      const tiers = await getPricingTiersByService('WATER');
      setPricingTiers(tiers ?? []);
    } catch (error: any) {
      console.error('Failed to load pricing tiers:', error);
      show(error?.response?.data?.message || error?.message || 'Failed to load pricing tiers', 'error');
      setPricingTiers([]);
    }
  };

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const applicablePricingTiers = useMemo(() => {
    return [...pricingTiers]
      .filter((tier) => tier.active !== false)
      .filter((tier) => {
        const from = tier.effectiveFrom ? new Date(tier.effectiveFrom) : null;
        const until = tier.effectiveUntil ? new Date(tier.effectiveUntil) : null;
        if (from) from.setHours(0, 0, 0, 0);
        if (until) until.setHours(0, 0, 0, 0);

        const afterFrom = !from || today >= from;
        const beforeUntil = !until || today <= until;
        return afterFrom && beforeUntil;
      })
      .sort((a, b) => {
        const orderDiff = (a.tierOrder ?? 0) - (b.tierOrder ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return Number(a.minQuantity ?? 0) - Number(b.minQuantity ?? 0);
      });
  }, [pricingTiers, today]);

  const calculateAmount = (usage: number): number => {
    if (!applicablePricingTiers.length || usage <= 0) return 0;

    // Logic matches backend: PricingTierService.calculateInvoiceLines()
    let total = 0;
    let previousMax = 0; // Track the upper bound of previous tier

    for (const tier of applicablePricingTiers) {
      if (previousMax >= usage) {
        break; // All usage has been covered
      }

      const unitPrice = Number(tier.unitPrice ?? 0);
      if (Number.isNaN(unitPrice) || unitPrice <= 0) continue;

      const maxQtyRaw = tier.maxQuantity !== null && tier.maxQuantity !== undefined
        ? Number(tier.maxQuantity)
        : null;

      // Calculate effective max for this tier
      let tierEffectiveMax: number;
      if (maxQtyRaw === null || maxQtyRaw === undefined) {
        // Last tier (no max) - use all remaining usage
        tierEffectiveMax = usage;
      } else {
        // Tier has max quantity - use min of usage and maxQty
        tierEffectiveMax = Math.min(usage, maxQtyRaw);
      }

      // Calculate applicable quantity for this tier
      const applicableQuantity = Math.max(0, tierEffectiveMax - previousMax);

      if (applicableQuantity > 0) {
        total += applicableQuantity * unitPrice;
        previousMax = tierEffectiveMax; // Update for next tier
      }
    }

    return total;
  };

  const toggleCycle = async (cycleId: string) => {
    const newExpanded = new Set(expandedCycles);
    if (newExpanded.has(cycleId)) {
      newExpanded.delete(cycleId);
    } else {
      newExpanded.add(cycleId);
      // Load billing data if not already loaded
      if (!billingData[cycleId]) {
        await loadBillingDataForCycle(cycleId);
      }
    }
    setExpandedCycles(newExpanded);
  };

  const toggleBuilding = (buildingId: string) => {
    const newExpanded = new Set(expandedBuildings);
    if (newExpanded.has(buildingId)) {
      newExpanded.delete(buildingId);
    } else {
      newExpanded.add(buildingId);
    }
    setExpandedBuildings(newExpanded);
  };

  const handleExportInvoice = async (cycleId: string) => {
    try {
      const response: MeterReadingImportResponse = await exportReadingsByCycle(cycleId);
      show(`Exported ${response.totalReadings} readings. ${response.invoicesCreated} invoices created.`, 'success');
    } catch (error: any) {
      console.error('Failed to export invoice:', error);
      show(error?.response?.data?.message || error?.message || 'Failed to export invoice', 'error');
    }
  };

  if (isInitialLoad || loading) {
    return (
      <div className="bg-white p-6 rounded-xl text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#739559] mx-auto mb-4"></div>
        <p className="text-gray-600">Loading billing data...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Cycles List */}
      <div className="space-y-4">
        {cycles.map((cycle) => {
          const isExpanded = expandedCycles.has(cycle.id);
          const cycleBuildings = billingData[cycle.id] || {};
          const buildingsList = Object.values(cycleBuildings);

          return (
            <div key={cycle.id} className="bg-white rounded-xl overflow-hidden">
              {/* Cycle Header */}
              <div className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center justify-between border-b border-gray-200">
                <div
                  onClick={() => toggleCycle(cycle.id)}
                  className="flex-1 flex items-center gap-4"
                >
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{cycle.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(cycle.periodFrom).toLocaleDateString()} - {new Date(cycle.periodTo).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleExportInvoice(cycle.id)}
                  className="ml-4 px-4 py-2 bg-[#739559] text-white rounded-md hover:bg-[#5a7447] transition-colors text-sm font-medium"
                >
                  Xuất Hóa Đơn
                </button>
              </div>

              {/* Buildings List */}
              {isExpanded && (
                <div className="p-4 space-y-3">
                  {buildingsList.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No buildings with readings found</p>
                  ) : (
                    buildingsList.map((building) => {
                      const isBuildingExpanded = expandedBuildings.has(building.buildingId);
                      const totalAmount = building.units.reduce((sum, unit) => sum + calculateAmount(unit.usage), 0);

                      return (
                        <div
                          key={building.buildingId}
                          className="border border-gray-200 rounded-lg overflow-hidden"
                        >
                          {/* Building Header */}
                          <div
                            onClick={() => toggleBuilding(building.buildingId)}
                            className="p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <svg
                                className={`w-4 h-4 text-gray-600 transition-transform ${isBuildingExpanded ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="font-medium text-gray-800">
                                {building.buildingName} ({building.buildingCode})
                              </span>
                              <span className="text-sm text-gray-600">
                                {building.units.length} unit(s)
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-[#02542D]">
                              Total: {totalAmount.toLocaleString('vi-VN')} VNĐ
                            </span>
                          </div>

                          {/* Units Table */}
                          {isBuildingExpanded && (
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Unit ID</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Meter Code</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Prev Index</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Current Index</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Usage</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {building.units.map((unit, index) => {
                                    const unitAmount = calculateAmount(unit.usage);
                                    return (
                                      <tr key={unit.unitId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-4 py-2 text-sm text-gray-800">{unit.unitCode}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800">{unit.meterCode}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 text-right">{unit.prevIndex.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 text-right">{unit.currentIndex.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm text-gray-800 text-right">{unit.usage.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm font-semibold text-[#02542D] text-right">
                                          {unitAmount.toLocaleString('vi-VN')} VNĐ
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

