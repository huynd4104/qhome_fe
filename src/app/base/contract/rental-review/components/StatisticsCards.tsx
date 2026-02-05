'use client';

import { useTranslations } from 'next-intl';
import { RentalContractWithUnit } from '../types';
import { calculateRemainingDays, getToday } from '../utils/dateUtils';

interface StatisticsCardsProps {
  contracts: RentalContractWithUnit[];
  contractsWithInspection: Set<string>;
}

export default function StatisticsCards({ contracts, contractsWithInspection }: StatisticsCardsProps) {
  const t = useTranslations('RentalReview');

  // Calculate expiring contracts (<= 30 days)
  const expiringContractsCount = contracts.filter(c => {
    if (c.status !== 'ACTIVE') return false;
    if (!c.endDate) return false;
    
    const remainingDays = calculateRemainingDays(c.endDate);
    return remainingDays <= 30 && remainingDays >= 0;
  }).length;

  // Calculate contracts needing inspection
  const contractsNeedingInspection = contracts.filter(c => {
    const isExpiredOrCancelled = c.status === 'EXPIRED' || c.status === 'CANCELLED';
    const hasInspection = contractsWithInspection.has(c.id);
    return isExpiredOrCancelled && !hasInspection;
  }).length;

  if (contracts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="text-sm text-gray-600">{t('statistics.totalContracts')}</div>
        <div className="text-2xl font-bold text-gray-900 mt-1">{contracts.length}</div>
      </div>
      
      {expiringContractsCount > 0 && (
        <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 p-4">
          <div className="text-sm text-yellow-700 font-medium">{t('statistics.expiringContracts')}</div>
          <div className="text-2xl font-bold text-yellow-900 mt-1">{expiringContractsCount}</div>
          <div className="text-xs text-yellow-600 mt-1">{t('statistics.expiringDays')}</div>
        </div>
      )}
      
      <div className={`rounded-lg shadow-sm border p-4 ${
        contractsNeedingInspection > 0 
          ? 'bg-red-50 border-red-200' 
          : 'bg-gray-50 border-gray-200 opacity-60'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-sm font-medium ${
              contractsNeedingInspection > 0 ? 'text-red-700' : 'text-gray-500'
            }`}>
              {t('statistics.needingInspection', { defaultValue: 'Cần kiểm tra thiết bị' })}
            </div>
            <div className={`text-2xl font-bold mt-1 ${
              contractsNeedingInspection > 0 ? 'text-red-900' : 'text-gray-600'
            }`}>
              {contractsNeedingInspection}
            </div>
            <div className={`text-xs mt-1 ${
              contractsNeedingInspection > 0 ? 'text-red-600' : 'text-gray-400'
            }`}>
              {contractsNeedingInspection > 0 
                ? t('statistics.needingInspectionDesc', { defaultValue: 'Hợp đồng đã hết hạn/hủy chưa kiểm tra' })
                : 'Tất cả hợp đồng đã được kiểm tra'
              }
            </div>
          </div>
          <div className="text-3xl">{contractsNeedingInspection > 0 ? '⚠️' : '✅'}</div>
        </div>
      </div>
    </div>
  );
}














