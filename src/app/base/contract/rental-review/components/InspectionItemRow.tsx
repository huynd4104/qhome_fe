'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AssetInspectionItem } from '@/src/services/base/assetInspectionService';

interface InspectionItemRowProps {
  item: AssetInspectionItem;
  onUpdate: (conditionStatus: string, notes: string) => void;
  disabled: boolean;
}

export default function InspectionItemRow({ 
  item, 
  onUpdate, 
  disabled 
}: InspectionItemRowProps) {
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














