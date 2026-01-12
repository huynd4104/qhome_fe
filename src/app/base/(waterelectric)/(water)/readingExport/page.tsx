'use client'
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  getAllReadingCycles,
  ReadingCycleDto,
  ReadingCycleStatus,
  exportReadingsByCycle,
  MeterReadingImportResponse,
} from '@/src/services/base/waterService';
import { useNotifications } from '@/src/hooks/useNotifications';
import { useTranslations } from 'next-intl';
import PopupComfirm from '@/src/components/common/PopupComfirm';

export default function ReadingExportPage() {
  const { user } = useAuth();
  const { show } = useNotifications();
  const t = useTranslations('ReadingExport');
  const [cycles, setCycles] = useState<ReadingCycleDto[]>([]);
  const [filteredCycles, setFilteredCycles] = useState<ReadingCycleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportResults, setExportResults] = useState<Map<string, MeterReadingImportResponse>>(new Map());
  const [statusFilter, setStatusFilter] = useState<ReadingCycleStatus | "ALL">();
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [pendingCycleId, setPendingCycleId] = useState<string | null>(null);

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    let filtered = cycles;
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    setFilteredCycles(filtered);
  }, [cycles, statusFilter]);

  const loadCycles = async () => {
    try {
      setLoading(true);
      const data = await getAllReadingCycles();
      setCycles(data);
    } catch (error) {
      console.error('Failed to load cycles:', error);
      show(t('messages.failedToLoadCycles'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportClick = (cycleId: string) => {
    setPendingCycleId(cycleId);
    setShowExportConfirm(true);
  };

  const handleExport = async () => {
    if (!pendingCycleId) return;
    setShowExportConfirm(false);
    const cycleId = pendingCycleId;
    setPendingCycleId(null);

    try {
      setExporting(cycleId);
      const result = await exportReadingsByCycle(cycleId);
      setExportResults(prev => new Map(prev).set(cycleId, result));
      show(t('messages.exportCompleted', { totalReadings: result.totalReadings, invoicesCreated: result.invoicesCreated }), 'success');
    } catch (error: any) {
      show(error?.message || t('messages.failedToExport'), 'error');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="px-[41px] py-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-[#02542D]">{t('title')}</h1>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6">
        <p>
          <strong>{t('exportProcess')}</strong> {t('exportProcessDescription')}
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white p-6 rounded-xl mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('filterByStatus')}</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReadingCycleStatus | 'ALL')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559]"
          >
            <option value="ALL">{t('all')}</option>
            <option value="DRAFT">{t('draft')}</option>
            <option value="ACTIVE">{t('active')}</option>
            <option value="CLOSED">{t('closed')}</option>
            <option value="CANCELLED">{t('cancelled')}</option>
          </select>
        </div>
      </div>

      {/* Cycles Table */}
      {filteredCycles.length > 0 && (
        <div className="bg-white p-6 rounded-xl">
          <h2 className="text-xl font-semibold text-[#02542D] mb-4">{t('readingCycles')} ({filteredCycles.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-solid border-[#14AE5C]">
                  <th className="px-4 py-3 text-left text-sm font-bold text-[#024023] uppercase">{t('cycleName')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('period')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('status')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('createdAt')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('exportResult')}</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCycles.map((cycle) => {
                  const result = exportResults.get(cycle.id);
                  return (
                    <tr key={cycle.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-[#024023] font-semibold">{cycle.name}</td>
                      <td className="px-4 py-3 text-center text-[#024023] font-semibold">
                        {new Date(cycle.fromDate || cycle.periodFrom).toLocaleDateString()} - {' '}
                        {new Date(cycle.toDate || cycle.periodTo).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            cycle.status === 'OPEN'
                              ? 'bg-blue-100 text-blue-700'
                              : cycle.status === 'IN_PROGRESS'
                              ? 'bg-yellow-100 text-yellow-700'
                              : cycle.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-700'
                              : cycle.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {cycle.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-[#024023] font-semibold">
                        {new Date(cycle.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {result ? (
                          <div className="text-sm">
                            <div className="text-green-600 font-semibold">
                              ✓ {result.totalReadings} {t('readings')}
                            </div>
                            <div className="text-blue-600">
                              {result.invoicesCreated} {t('invoices')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">{t('notExported')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleExportClick(cycle.id)}
                          disabled={exporting === cycle.id || cycle.status === 'CANCELLED'}
                          className="px-3 py-1 bg-[#739559] text-white rounded-md hover:bg-[#5a7347] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {exporting === cycle.id ? t('exporting') : t('export')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredCycles.length === 0 && !loading && (
        <div className="bg-white p-6 rounded-xl text-center text-gray-500">
          {t('noReadingCycles')}
        </div>
      )}

      {loading && (
        <div className="bg-white p-6 rounded-xl text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#739559] mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      )}

      {/* Export Confirm Popup */}
      <PopupComfirm
        isOpen={showExportConfirm}
        onClose={() => {
          setShowExportConfirm(false);
          setPendingCycleId(null);
        }}
        onConfirm={handleExport}
        popupTitle={t('confirm.exportReadings')}
        popupContext=""
        isDanger={false}
      />
    </div>
  );
}

