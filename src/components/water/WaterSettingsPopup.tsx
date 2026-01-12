'use client'
import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import DateBox from '@/src/components/customer-interaction/DateBox';

export interface WaterFormula {
  id: string;
  fromAmount: number;
  toAmount: number | null; // null means infinity
  price: number;
}

interface WaterCycle {
  fromDate: string;
  toDate: string;
}

interface WaterSettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  buildingId: string;
  initialCycle?: WaterCycle;
  initialFormula?: WaterFormula[];
  onSave: (cycle: WaterCycle, formula: WaterFormula[]) => Promise<void>;
}

export default function WaterSettingsPopup({
  isOpen,
  onClose,
  buildingId,
  initialCycle,
  initialFormula,
  onSave
}: WaterSettingsPopupProps) {
  const t = useTranslations("Water");
  const [isEditMode, setIsEditMode] = useState(false);
  const [cycle, setCycle] = useState<WaterCycle>(initialCycle || { fromDate: '', toDate: '' });
  const [formula, setFormula] = useState<WaterFormula[]>(
    initialFormula || [{ id: '1', fromAmount: 0, toAmount: null, price: 0 }]
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialCycle) {
      setCycle(initialCycle);
    } else {
      // Reset to empty if no initial cycle
      setCycle({ fromDate: '', toDate: '' });
    }
    if (initialFormula) {
      setFormula(initialFormula);
    } else {
      // Default formula if none provided
      setFormula([{ id: '1', fromAmount: 0, toAmount: null, price: 0 }]);
    }
  }, [initialCycle, initialFormula]);

  if (!isOpen) return null;

  const handleAddFormulaRow = () => {
    const lastRow = formula[formula.length - 1];
    const newFromAmount = lastRow.toAmount !== null ? lastRow.toAmount + 1 : 0;
    setFormula([
      ...formula,
      {
        id: Date.now().toString(),
        fromAmount: newFromAmount,
        toAmount: null,
        price: 0
      }
    ]);
  };

  const handleRemoveFormulaRow = (id: string) => {
    if (formula.length > 1) {
      setFormula(formula.filter(row => row.id !== id));
    }
  };

  const handleFormulaChange = (id: string, field: keyof WaterFormula, value: number | null) => {
    setFormula(formula.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await onSave(cycle, formula);
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving water settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#E7E4E8CC]/80 z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-auto relative">
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

        <h2 className="text-2xl font-bold text-[#02542D] mb-6">{t('settings')}</h2>

        {/* Water Cycle */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-[#02542D] mb-3">{t('waterCycle')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('waterCycleFromDate')}</label>
              <div className={!isEditMode ? 'pointer-events-none opacity-50' : ''}>
                <DateBox
                  value={cycle.fromDate || ''}
                  onChange={(e) => setCycle({ ...cycle, fromDate: e.target.value })}
                  placeholderText={t('selectDate') || 'Select date'}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('waterCycleToDate')}</label>
              <div className={!isEditMode ? 'pointer-events-none opacity-50' : ''}>
                <DateBox
                  value={cycle.toDate || ''}
                  onChange={(e) => setCycle({ ...cycle, toDate: e.target.value })}
                  placeholderText={t('selectDate') || 'Select date'}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Water Formula */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-[#02542D]">{t('waterFormula')}</h3>
            {isEditMode && (
              <button
                onClick={handleAddFormulaRow}
                className="px-3 py-1 bg-[#739559] text-white rounded-md hover:bg-[#5a7347] text-sm"
              >
                {t('addRow')}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-[#02542D]">{t('fromAmount')}</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-[#02542D]">{t('toAmount')}</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-[#02542D]">{t('price')}</th>
                  {isEditMode && <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-[#02542D]">{t('action')}</th>}
                </tr>
              </thead>
              <tbody>
                {formula.map((row) => (
                  <tr key={row.id}>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={row.fromAmount}
                        onChange={(e) => handleFormulaChange(row.id, 'fromAmount', Number(e.target.value))}
                        disabled={!isEditMode}
                        className="w-full border-none focus:outline-none disabled:bg-transparent"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={row.toAmount ?? ''}
                        onChange={(e) => handleFormulaChange(row.id, 'toAmount', e.target.value === '' ? null : Number(e.target.value))}
                        disabled={!isEditMode}
                        placeholder="∞"
                        className="w-full border-none focus:outline-none disabled:bg-transparent"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={row.price}
                        onChange={(e) => handleFormulaChange(row.id, 'price', Number(e.target.value))}
                        disabled={!isEditMode}
                        className="w-full border-none focus:outline-none disabled:bg-transparent"
                      />
                    </td>
                    {isEditMode && (
                      <td className="border border-gray-300 px-4 py-2">
                        {formula.length > 1 && (
                          <button
                            onClick={() => handleRemoveFormulaRow(row.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            {t('remove') || 'Remove'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          {!isEditMode ? (
            <>
              <button
                onClick={() => setIsEditMode(true)}
                className="px-4 py-2 bg-[#739559] text-white rounded-md hover:bg-[#5a7347]"
              >
                {t('edit') || 'Edit'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                {t('close') || 'Close'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditMode(false);
                  if (initialCycle) setCycle(initialCycle);
                  if (initialFormula) setFormula(initialFormula);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-[#739559] text-white rounded-md hover:bg-[#5a7347] disabled:opacity-50"
              >
                {loading ? (t('saving') || 'Saving...') : (t('save') || 'Save')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

