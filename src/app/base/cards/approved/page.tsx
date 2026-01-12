'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  fetchApprovedCards,
  type CardRegistrationSummaryDto,
} from '@/src/services/card/cardRegistrationQueryService';
import { getBuildings, type Building } from '@/src/services/base/buildingService';
import { getUnitsByBuilding, type Unit } from '@/src/services/base/unitService';
import Pagination from '@/src/components/customer-interaction/Pagination';

export default function ApprovedCardsAdminPage() {
  const t = useTranslations('ApprovedCards');
  const [cards, setCards] = useState<CardRegistrationSummaryDto[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedCardType, setSelectedCardType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const initialPageSize = 10;
  const [pageNo, setPageNo] = useState<number>(0);
  const [pageSize] = useState<number>(initialPageSize);

  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const data = await getBuildings();
        setBuildings(data);
      } catch (err) {
        console.error('Failed to load buildings', err);
      }
    };
    loadBuildings();
  }, []);

  useEffect(() => {
    if (selectedBuildingId) {
      const loadUnits = async () => {
        try {
          const data = await getUnitsByBuilding(selectedBuildingId);
          setUnits(data);
        } catch (err) {
          console.error('Failed to load units', err);
          setUnits([]);
        }
      };
      loadUnits();
    } else {
      setUnits([]);
      setSelectedUnitId('');
    }
  }, [selectedBuildingId]);

  const loadCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApprovedCards(
        selectedBuildingId || undefined,
        selectedUnitId || undefined
      );
      setCards(response.data);
      setPageNo(0);
    } catch (err: any) {
      console.error('Failed to load approved cards', err);
      setError(err?.response?.data?.message || t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [selectedBuildingId, selectedUnitId, t]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const getCardTypeLabel = (cardType: string) => {
    switch (cardType) {
      case 'RESIDENT_CARD':
        return t('cardTypes.resident');
      case 'ELEVATOR_CARD':
        return t('cardTypes.elevator');
      case 'VEHICLE_CARD':
        return t('cardTypes.vehicle');
      default:
        return cardType;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return t('statusLabels.approved');
      case 'COMPLETED':
        return t('statusLabels.completed');
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-50 text-green-700';
      case 'COMPLETED':
        return 'bg-blue-50 text-blue-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getPaymentStatusLabel = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'PAID':
        return t('paymentStatusLabels.paid');
      case 'PAYMENT_PENDING':
        return t('paymentStatusLabels.paymentPending');
      case 'PAYMENT_APPROVAL':
        return t('paymentStatusLabels.paymentApproval');
      case 'UNPAID':
        return t('paymentStatusLabels.unpaid');
      default:
        return paymentStatus;
    }
  };

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'PAID':
        return 'bg-emerald-50 text-emerald-700';
      case 'PAYMENT_PENDING':
        return 'bg-yellow-50 text-yellow-700';
      case 'PAYMENT_APPROVAL':
        return 'bg-blue-50 text-blue-700';
      case 'UNPAID':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const filteredCards = useMemo(() => {
    return cards
      .filter((card) => {
        // Loại bỏ các card có status inactive
        const status = card.status?.toUpperCase();
        return status !== 'INACTIVE';
      })
      .filter((card) => {
        // Filter theo loại thẻ nếu có chọn
        if (selectedCardType) {
          return card.cardType === selectedCardType;
        }
        return true;
      });
  }, [cards, selectedCardType]);

  // Apply pagination to filtered cards
  const cardsToDisplay = useMemo(() => {
    const startIndex = pageNo * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredCards.slice(startIndex, endIndex);
  }, [filteredCards, pageNo, pageSize]);

  const totalPages = useMemo(() => {
    return pageSize > 0 ? Math.ceil(filteredCards.length / pageSize) : 0;
  }, [filteredCards.length, pageSize]);

  const handlePageChange = useCallback((newPage: number) => {
    setPageNo(newPage);
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setPageNo(0);
  }, [selectedCardType, selectedBuildingId, selectedUnitId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#02542D]">
          {t('title')}
        </h1>
        <button
          type="button"
          onClick={loadCards}
          className="px-4 py-2 bg-[#02542D] text-white rounded-md hover:bg-[#024428] transition-colors"
        >
          {t('actions.refresh')}
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-end mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('filters.cardType')}
            </label>
            <select
              value={selectedCardType}
              onChange={(e) => {
                setSelectedCardType(e.target.value);
                setPageNo(0);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6B9B6E]"
            >
              <option value="">{t('filters.allCardTypes')}</option>
              <option value="RESIDENT_CARD">{t('cardTypes.resident')}</option>
              <option value="ELEVATOR_CARD">{t('cardTypes.elevator')}</option>
              <option value="VEHICLE_CARD">{t('cardTypes.vehicle')}</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('filters.building')}
            </label>
            <select
              value={selectedBuildingId}
              onChange={(e) => {
                setSelectedBuildingId(e.target.value);
                setSelectedUnitId('');
                setPageNo(0);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6B9B6E]"
            >
              <option value="">{t('filters.allBuildings')}</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code ? `${b.code} - ` : ''}{b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('filters.unit')}
            </label>
            <select
              value={selectedUnitId}
              onChange={(e) => {
                setSelectedUnitId(e.target.value);
                setPageNo(0);
              }}
              disabled={!selectedBuildingId}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6B9B6E] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">{t('filters.allUnits')}</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#02542D]" />
          </div>
        ) : error ? (
          <div className="text-center text-red-600 py-12">{error}</div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            {t('empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('table.cardType')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('table.displayName')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('table.apartment')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('table.building')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('table.status')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('table.payment')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('table.approvedDate')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {cardsToDisplay.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {getCardTypeLabel(card.cardType)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {card.displayName || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {card.apartmentNumber || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {card.buildingName || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                          card.status
                        )}`}
                      >
                        {getStatusLabel(card.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStatusColor(
                          card.paymentStatus
                        )}`}
                      >
                        {getPaymentStatusLabel(card.paymentStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {card.approvedAt
                        ? new Date(card.approvedAt).toLocaleString('vi-VN')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 0 && (
          <div className="mt-4">
            <Pagination
              currentPage={pageNo + 1}
              totalPages={totalPages}
              onPageChange={(page) => handlePageChange(page - 1)}
            />
          </div>
        )}
        {filteredCards.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            {t('showing', { filtered: filteredCards.length, total: cards.length })}
          </div>
        )}
      </div>
    </div>
  );
}

