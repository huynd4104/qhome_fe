'use client'
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { getBuildings, Building } from '@/src/services/base/buildingService';
import { getUnitsByBuilding, Unit } from '@/src/services/base/unitService';
import Select from '@/src/components/customer-interaction/Select';
import { useWaterPage } from '@/src/hooks/useWaterPage';
import {
  getMetersByBuilding,
  MeterDto,
  getAllMeters,
  getMeterById,
  getMetersByUnit,
  getMetersByService,
  createMeter,
  updateMeter,
  deactivateMeter,
  deleteMeter,
  MeterCreateReq,
  getAllReadingCycles,
  ReadingCycleDto,
  createReadingCycle,
  updateReadingCycle,
  changeReadingCycleStatus,
  deleteReadingCycle,
  ReadingCycleCreateReq,
  ReadingCycleUpdateReq,
} from '@/src/services/base/waterService';
import { useNotifications } from '@/src/hooks/useNotifications';
import WaterSettingsPopup, { WaterFormula } from '@/src/components/water/WaterSettingsPopup';
import { useTranslations } from 'next-intl';
import PopupComfirm from '@/src/components/common/PopupComfirm';

interface WaterCycle {
  fromDate: string;
  toDate: string;
}

export default function WaterShowPage() {
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const { show } = useNotifications();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [waterServiceId, setWaterServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMeterModalOpen, setIsMeterModalOpen] = useState(false);
  const [isEditMeterModalOpen, setIsEditMeterModalOpen] = useState(false);
  const [waterCycle, setWaterCycle] = useState<ReadingCycleDto | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingMeterId, setPendingMeterId] = useState<string | null>(null);
  const [waterFormula, setWaterFormula] = useState<WaterFormula[] | undefined>();
  const [meters, setMeters] = useState<MeterDto[]>([]);
  const [selectedMeter, setSelectedMeter] = useState<MeterDto | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const t = useTranslations('Water');

  // Use water page hook
  const {
    loading: hookLoading,
    error: hookError,
    waterReadings,
    refresh,
  } = useWaterPage({
    buildingId: selectedBuildingId,
    serviceId: waterServiceId || undefined,
    autoLoad: !!selectedBuildingId,
  });

  // Load buildings on mount
  useEffect(() => {
    const loadBuildings = async () => {
      try {
        setLoading(true);
        const data = await getBuildings();
        setBuildings(data);
      } catch (error) {
        console.error('Failed to load buildings:', error);
        show(t('messages.failedToLoadBuildings'), 'error');
      } finally {
        setLoading(false);
      }
    };
    loadBuildings();
  }, [user, hasRole, show]);

  // Load water service ID
  useEffect(() => {
    const findWaterServiceId = async () => {
      if (!selectedBuildingId) return;

      try {
        const allMeters = await getMetersByBuilding(selectedBuildingId);
        const waterMeter = allMeters.find(m =>
          m.serviceId?.toLowerCase().includes('water') ||
          m.serviceCode?.toLowerCase().includes('water')
        );
        if (waterMeter?.serviceId) {
          setWaterServiceId(waterMeter.serviceId);
        } else if (allMeters.length > 0) {
          setWaterServiceId(allMeters[0].serviceId);
        }
      } catch (error) {
        console.error('Failed to find water service ID:', error);
      }
    };

    findWaterServiceId();
  }, [selectedBuildingId]);

  // Load meters when building is selected
  useEffect(() => {
    const loadMetersData = async () => {
      if (!selectedBuildingId) {
        setMeters([]);
        return;
      }

      try {
        setLoading(true);
        let metersData: MeterDto[] = [];

        if (filterActive !== null) {
          metersData = await getAllMeters({ buildingId: selectedBuildingId, active: filterActive });
        } else {
          metersData = await getMetersByBuilding(selectedBuildingId);
        }

        if (waterServiceId) {
          const waterMeters = metersData.filter(m => m.serviceId === waterServiceId);
          setMeters(waterMeters);
        } else {
          setMeters(metersData);
        }
      } catch (error) {
        console.error('Failed to load meters:', error);
        show(t('messages.failedToLoadMeters'), 'error');
      } finally {
        setLoading(false);
      }
    };

    loadMetersData();
  }, [selectedBuildingId, waterServiceId, filterActive, show]);

  // Load units
  useEffect(() => {
    const loadUnits = async () => {
      if (!selectedBuildingId) {
        setUnits([]);
        return;
      }
      try {
        const unitsData = await getUnitsByBuilding(selectedBuildingId);
        setUnits(unitsData.filter(u => u.status?.toUpperCase() !== 'INACTIVE'));
      } catch (error) {
        console.error('Failed to load units:', error);
      }
    };
    loadUnits();
  }, [selectedBuildingId]);

  // Load active cycle when settings popup is opened
  useEffect(() => {
    const loadActiveCycle = async () => {
      if (!isSettingsOpen || !selectedBuildingId) return;

      if (waterServiceId) {
        try {
          const cycles = await getAllReadingCycles();
          const activeCycle = cycles.find(
            c => c.serviceId === waterServiceId && c.status === 'IN_PROGRESS'
          );

          if (activeCycle) {
            setWaterCycle(activeCycle);
          } else {
            setWaterCycle(null);
          }

          setWaterFormula([
            { id: '1', fromAmount: 0, toAmount: 10, price: 15000 },
            { id: '2', fromAmount: 11, toAmount: 20, price: 18000 },
            { id: '3', fromAmount: 21, toAmount: null, price: 20000 }
          ]);
        } catch (error) {
          console.error('Failed to load active cycle:', error);
          setWaterCycle(null);
          setWaterFormula([
            { id: '1', fromAmount: 0, toAmount: 10, price: 15000 },
            { id: '2', fromAmount: 11, toAmount: 20, price: 18000 },
            { id: '3', fromAmount: 21, toAmount: null, price: 20000 }
          ]);
        }
      } else {
        setWaterCycle(null);
        setWaterFormula([
          { id: '1', fromAmount: 0, toAmount: 10, price: 15000 },
          { id: '2', fromAmount: 11, toAmount: 20, price: 18000 },
          { id: '3', fromAmount: 21, toAmount: null, price: 20000 }
        ]);
      }
    };

    loadActiveCycle();
  }, [selectedBuildingId, waterServiceId, isSettingsOpen]);

  const handleBuildingSelect = (building: Building) => {
    setSelectedBuildingId(building.id);
    setFilterActive(null);
  };

  const handleSaveSettings = async (cycle: WaterCycle, formula: WaterFormula[]) => {
    if (!waterServiceId) {
      show(t('messages.waterServiceIdRequired'), 'error');
      return;
    }

    try {
      if (waterCycle) {
        const updateReq: ReadingCycleUpdateReq = {
          fromDate: cycle.fromDate,
          toDate: cycle.toDate,
        };
        await updateReadingCycle(waterCycle.id, updateReq);
        show(t('messages.waterSettingsUpdated'), 'success');
      } else {
        const createReq: ReadingCycleCreateReq = {
          name: `Water Cycle ${cycle.fromDate} - ${cycle.toDate}`,
          periodFrom: cycle.fromDate,
          periodTo: cycle.toDate,
          serviceId: waterServiceId,
        };
        const newCycle = await createReadingCycle(createReq);
        setWaterCycle(newCycle);
        show(t('messages.waterSettingsCreated'), 'success');
      }

      setWaterFormula(formula);
      refresh();
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      show(error?.message || t('messages.failedToSaveSettings'), 'error');
    }
  };

  const handleCreateMeter = async (meterData: Partial<MeterCreateReq>) => {
    if (!selectedBuildingId || !waterServiceId) {
      show(t('messages.pleaseSelectBuilding'), 'error');
      return;
    }

    try {
      const req: MeterCreateReq = {
        unitId: meterData.unitId!,
        serviceId: waterServiceId,
        meterCode: meterData.meterCode!,
      };

      await createMeter(req);
      show(t('messages.meterCreated'), 'success');
      setIsMeterModalOpen(false);
      refresh();

      // Reload meters
      const metersData = await getMetersByBuilding(selectedBuildingId);
      if (waterServiceId) {
        const waterMeters = metersData.filter(m => m.serviceId === waterServiceId);
        setMeters(waterMeters);
      } else {
        setMeters(metersData);
      }
    } catch (error: any) {
      show(error?.message || t('messages.failedToCreateMeter'), 'error');
    }
  };

  const handleUpdateMeter = async (meterData: Partial<MeterCreateReq>) => {
    if (!selectedMeter) return;

    try {
      await updateMeter(selectedMeter.id, meterData);
      show(t('messages.meterUpdated'), 'success');
      setIsEditMeterModalOpen(false);
      setSelectedMeter(null);
      refresh();

      // Reload meters
      const metersData = await getMetersByBuilding(selectedBuildingId);
      if (waterServiceId) {
        const waterMeters = metersData.filter(m => m.serviceId === waterServiceId);
        setMeters(waterMeters);
      } else {
        setMeters(metersData);
      }
    } catch (error: any) {
      show(error?.message || t('messages.failedToUpdateMeter'), 'error');
    }
  };

  const handleDeactivateMeterClick = (meterId: string) => {
    setPendingMeterId(meterId);
    setShowDeactivateConfirm(true);
  };

  const handleDeactivateMeter = async () => {
    if (!pendingMeterId) return;
    setShowDeactivateConfirm(false);
    const meterId = pendingMeterId;
    setPendingMeterId(null);

    try {
      await deactivateMeter(meterId);
      show(t('messages.meterDeactivated'), 'success');
      refresh();

      // Reload meters
      const metersData = await getMetersByBuilding(selectedBuildingId);
      if (waterServiceId) {
        const waterMeters = metersData.filter(m => m.serviceId === waterServiceId);
        setMeters(waterMeters);
      } else {
        setMeters(metersData);
      }
    } catch (error: any) {
      show(error?.message || t('messages.failedToDeactivateMeter'), 'error');
    }
  };

  const handleDeleteMeterClick = (meterId: string) => {
    setPendingMeterId(meterId);
    setShowDeleteConfirm(true);
  };

  const handleDeleteMeter = async () => {
    if (!pendingMeterId) return;
    setShowDeleteConfirm(false);
    const meterId = pendingMeterId;
    setPendingMeterId(null);

    try {
      await deleteMeter(meterId);
      show(t('messages.meterDeleted'), 'success');
      refresh();

      // Reload meters
      const metersData = await getMetersByBuilding(selectedBuildingId);
      if (waterServiceId) {
        const waterMeters = metersData.filter(m => m.serviceId === waterServiceId);
        setMeters(waterMeters);
      } else {
        setMeters(metersData);
      }
    } catch (error: any) {
      show(error?.message || t('messages.failedToDeleteMeter'), 'error');
    }
  };

  const handleEditMeter = (meter: MeterDto) => {
    setSelectedMeter(meter);
    setIsEditMeterModalOpen(true);
  };

  const handleAssignTask = (unitId: string) => {
    router.push(`/base/(waterelectric)/(water)/waterAssign?unitId=${unitId}&buildingId=${selectedBuildingId}`);
  };

  const displayLoading = loading || hookLoading;

  return (
    <div className="px-[41px] py-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-[#02542D]">{t('waterMeterList')}</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-4 py-2 bg-[#02542D] text-white rounded-md hover:bg-[#024428] transition-colors"
          >
            {t('settings')}
          </button>
          {selectedBuildingId && (
            <button
              onClick={() => setIsMeterModalOpen(true)}
              className="px-4 py-2 bg-[#739559] text-white rounded-md hover:bg-[#5a7347] transition-colors"
            >
              {t('addMeter')}
            </button>
          )}
        </div>
      </div>

      {/* Building Selector */}
      <div className="bg-white p-6 rounded-xl mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('selectBuilding')}</label>
        <Select
          options={buildings}
          value={selectedBuildingId}
          onSelect={handleBuildingSelect}
          renderItem={(b) => `${b.name} (${b.code})`}
          getValue={(b) => b.id}
          placeholder={t('selectBuilding')}
        />
      </div>

      {/* Filter Meters */}
      {selectedBuildingId && (
        <div className="bg-white p-6 rounded-xl mb-6">
          <h3 className="text-lg font-semibold text-[#02542D] mb-4">{t('filters')}</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('status')}</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterActive(null)}
                  className={`px-3 py-1 rounded-md text-sm ${filterActive === null
                    ? 'bg-[#739559] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  {t('all')}
                </button>
                <button
                  onClick={() => setFilterActive(true)}
                  className={`px-3 py-1 rounded-md text-sm ${filterActive === true
                    ? 'bg-[#739559] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  {t('active')}
                </button>
                <button
                  onClick={() => setFilterActive(false)}
                  className={`px-3 py-1 rounded-md text-sm ${filterActive === false
                    ? 'bg-[#739559] text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  {t('inactive')}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('filterByUnit')}</label>
              <Select
                options={[{ id: '', name: t('allUnits'), code: '' }, ...units]}
                value=""
                onSelect={(unit) => {
                  // Reset filter for now - can add unit filter if needed
                }}
                renderItem={(u) => u.name || t('allUnits')}
                getValue={(u) => u.id}
                placeholder={t('allUnits')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {hookError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {hookError}
        </div>
      )}

      {/* Meters Table */}
      {selectedBuildingId && meters.length > 0 && (
        <div className="bg-white p-6 rounded-xl mb-6">
          <h2 className="text-xl font-semibold text-[#02542D] mb-4">{t('meters')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-solid border-[#14AE5C]">
                  <th className="px-4 py-3 text-left text-sm font-bold text-[#024023] uppercase">{t('meterCode')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('type')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('location')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('lastReading')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('lastReadingDate')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('status')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {meters.map((meter) => (
                  <tr key={meter.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-[#024023] font-semibold">{meter.meterCode}</td>
                    <td className="px-4 py-3 text-center text-[#024023] font-semibold">{meter.serviceCode || 'WATER'}</td>
                    <td className="px-4 py-3 text-center text-[#024023] font-semibold">{meter.unitCode || '-'}</td>
                    <td className="px-4 py-3 text-center text-[#024023] font-semibold">
                      {meter.lastReading != null ? meter.lastReading : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-[#024023] font-semibold">
                      {meter.lastReadingDate
                        ? new Date(meter.lastReadingDate).toISOString().split('T')[0]
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${meter.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                          }`}
                      >
                        {meter.active ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEditMeter(meter)}
                          className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                        >
                          {t('edit')}
                        </button>
                        {meter.active ? (
                          <button
                            onClick={() => handleDeactivateMeterClick(meter.id)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm"
                          >
                            {t('deactivate')}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteMeterClick(meter.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                          >
                            {t('delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Units and Water Readings Table */}
      {selectedBuildingId && (waterReadings.length > 0 || meters.length > 0) && (
        <div className="bg-white p-6 rounded-xl">
          <h2 className="text-xl font-semibold text-[#02542D] mb-4">{t('apartmentWaterReadings')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-solid border-[#14AE5C]">
                  <th className="px-4 py-3 text-left text-sm font-bold text-[#024023] uppercase">{t('apartmentName')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('apartmentCode')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('waterReading')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('date')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('status')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('action')}</th>
                </tr>
              </thead>
              <tbody>
                {waterReadings.length > 0 ? (
                  waterReadings.map((readingData) => {
                    const meter = readingData.meter;
                    const hasReading = meter?.lastReading != null;
                    const readingDate = meter?.lastReadingDate
                      ? new Date(meter.lastReadingDate).toISOString().split('T')[0]
                      : null;

                    return (
                      <tr key={readingData.unit.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-[#024023] font-semibold">{readingData.unit.name}</td>
                        <td className="px-4 py-3 text-center text-[#024023] font-semibold">{readingData.unit.code}</td>
                        <td className="px-4 py-3 text-center text-[#024023] font-semibold">
                          {hasReading ? meter.lastReading : '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-[#024023] font-semibold">
                          {readingDate || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${readingData.status === 'measured'
                              ? 'bg-green-100 text-green-700'
                              : readingData.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                              }`}
                          >
                            {readingData.status === 'measured'
                              ? t('measured')
                              : readingData.status === 'pending'
                                ? t('pending')
                                : t('noMeter')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleAssignTask(readingData.unit.id)}
                            className="px-3 py-1 bg-[#739559] text-white rounded-md hover:bg-[#5a7347] text-sm"
                            disabled={readingData.status === 'not_metered'}
                          >
                            {t('assignTask')}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-center text-gray-500">
                      {t('noReadingsAvailable')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedBuildingId && meters.length === 0 && waterReadings.length === 0 && !displayLoading && (
        <div className="bg-white p-6 rounded-xl text-center text-gray-500">
          {t('noMetersOrApartments')}
        </div>
      )}

      {displayLoading && (
        <div className="bg-white p-6 rounded-xl text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#739559] mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      )}

      {/* Settings Popup */}
      <WaterSettingsPopup
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        buildingId={selectedBuildingId || ''}
        initialCycle={waterCycle && (waterCycle.fromDate || waterCycle.periodFrom) ? {
          fromDate: waterCycle.fromDate || waterCycle.periodFrom || '',
          toDate: waterCycle.toDate || waterCycle.periodTo || '',
        } : undefined}
        initialFormula={waterFormula}
        onSave={handleSaveSettings}
      />

      {/* Create Meter Modal */}
      {isMeterModalOpen && selectedBuildingId && (
        <MeterModal
          isOpen={isMeterModalOpen}
          onClose={() => setIsMeterModalOpen(false)}
          units={units}
          onSubmit={handleCreateMeter}
          mode="create"
        />
      )}

      {/* Edit Meter Modal */}
      {isEditMeterModalOpen && selectedMeter && (
        <MeterModal
          isOpen={isEditMeterModalOpen}
          onClose={() => {
            setIsEditMeterModalOpen(false);
            setSelectedMeter(null);
          }}
          units={units}
          onSubmit={handleUpdateMeter}
          mode="edit"
          initialData={selectedMeter}
        />
      )}

      {/* Deactivate Meter Confirm Popup */}
      <PopupComfirm
        isOpen={showDeactivateConfirm}
        onClose={() => {
          setShowDeactivateConfirm(false);
          setPendingMeterId(null);
        }}
        onConfirm={handleDeactivateMeter}
        popupTitle={t('confirm.deactivateMeter')}
        popupContext=""
        isDanger={true}
      />

      {/* Delete Meter Confirm Popup */}
      <PopupComfirm
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPendingMeterId(null);
        }}
        onConfirm={handleDeleteMeter}
        popupTitle={t('confirm.deleteMeter')}
        popupContext=""
        isDanger={true}
      />
    </div>
  );
}

// Meter Modal Component
interface MeterModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: Unit[];
  onSubmit: (data: Partial<MeterCreateReq>) => Promise<void>;
  mode: 'create' | 'edit';
  initialData?: MeterDto;
}

function MeterModal({ isOpen, onClose, units, onSubmit, mode, initialData }: MeterModalProps) {
  const t = useTranslations('Water');
  const [meterCode, setMeterCode] = useState('');
  const [unitId, setUnitId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setMeterCode(initialData.meterCode);
      setUnitId(initialData.unitId);
    } else {
      setMeterCode('');
      setUnitId('');
    }
  }, [mode, initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSubmit({
        meterCode,
        unitId,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#E7E4E8CC]/80 z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" height="16" width="16">
            <g fill="none" fillRule="evenodd">
              <path d="M16 0v16H0V0h16Z"></path>
              <path fill="#000000" d="m8 9.414666666666665 3.535333333333333 3.535333333333333a1 1 0 0 0 1.4146666666666665 -1.4146666666666665L9.413333333333332 8l3.536 -3.535333333333333a1 1 0 1 0 -1.4146666666666665 -1.414L8 6.585999999999999 4.464666666666666 3.0506666666666664a1 1 0 1 0 -1.4146666666666665 1.4133333333333333L6.586666666666667 8l-3.536 3.536a1 1 0 1 0 1.4146666666666665 1.4133333333333333L8 9.415333333333333Z" strokeWidth="0.6667"></path>
            </g>
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-[#02542D] mb-6">
          {mode === 'create' ? t('createMeter') : t('editMeter')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('unit')}</label>
            <Select
              options={units}
              value={unitId}
              onSelect={(unit) => setUnitId(unit.id)}
              renderItem={(u) => `${u.name} (${u.code})`}
              getValue={(u) => u.id}
              placeholder={t('selectUnit')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('meterCode')}</label>
            <input
              type="text"
              value={meterCode}
              onChange={(e) => setMeterCode(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559]"
            />
          </div>


          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#739559] text-white rounded-md hover:bg-[#5a7347] disabled:opacity-50"
            >
              {loading ? t('saving') : mode === 'create' ? t('create') : t('update')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
