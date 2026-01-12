'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CardPricingDto,
  createOrUpdateCardPricing,
  getAllCardPricing,
} from '@/src/services/card/cardPricingService';
import { useNotifications } from '@/src/hooks/useNotifications';

// Options will be created inside component with translations

export default function CardPricingManagementPage() {
  const t = useTranslations('CardPricing');
  const { show } = useNotifications();
  
  const CARD_TYPE_OPTIONS = [
    { value: 'VEHICLE', label: t('cardTypes.vehicle'), description: t('descriptions.vehicle') },
    { value: 'RESIDENT', label: t('cardTypes.resident'), description: t('descriptions.resident') },
    { value: 'ELEVATOR', label: t('cardTypes.elevator'), description: t('descriptions.elevator') },
  ];

  const CARD_TYPE_LABELS: Record<string, string> = {
    VEHICLE: t('cardTypes.vehicle'),
    RESIDENT: t('cardTypes.resident'),
    ELEVATOR: t('cardTypes.elevator'),
  };
  const [pricingList, setPricingList] = useState<CardPricingDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [editingPrice, setEditingPrice] = useState<Record<string, number>>({});
  const [editingDescription, setEditingDescription] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const data = await getAllCardPricing();
      setPricingList(data);
      
      // Initialize editing values
      const priceMap: Record<string, number> = {};
      const descMap: Record<string, string> = {};
      data.forEach((pricing) => {
        priceMap[pricing.cardType] = pricing.price;
        descMap[pricing.cardType] = pricing.description || '';
      });
      setEditingPrice(priceMap);
      setEditingDescription(descMap);
    } catch (error: any) {
      console.error('Failed to load card pricing:', error);
      show(t('errors.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPricingForType = (cardType: string): CardPricingDto | undefined => {
    return pricingList.find((p) => p.cardType === cardType);
  };

  const handleSave = async (cardType: string) => {
    setSaving((prev) => ({ ...prev, [cardType]: true }));
    try {
      const pricing = getPricingForType(cardType);
      const request = {
        cardType,
        price: editingPrice[cardType] || 0,
        currency: pricing?.currency || 'VND',
        description: editingDescription[cardType] || '',
        isActive: pricing?.isActive ?? true,
      };

      if (request.price <= 0) {
        show(t('validation.priceMustBePositive'), 'error');
        return;
      }

      await createOrUpdateCardPricing(request);
      show(t('messages.updateSuccess'), 'success');
      await loadPricing();
    } catch (error: any) {
      console.error('Failed to save pricing:', error);
      show(
        error?.response?.data?.message || t('errors.updateFailed'),
        'error'
      );
    } finally {
      setSaving((prev) => ({ ...prev, [cardType]: false }));
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600 mt-2">
          {t('description')}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="space-y-6">
            {CARD_TYPE_OPTIONS.map((option) => {
              const pricing = getPricingForType(option.value);
              const isSaving = saving[option.value] || false;
              const currentPrice = editingPrice[option.value] || pricing?.price || 0;
              const currentDescription = editingDescription[option.value] || pricing?.description || '';

              return (
                <div
                  key={option.value}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {option.label}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {option.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {pricing?.isActive === false && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                          {t('status.inactive')}
                        </span>
                      )}
                      {pricing?.isActive !== false && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                          {t('status.active')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('fields.price')}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={currentPrice}
                          onChange={(e) =>
                            setEditingPrice({
                              ...editingPrice,
                              [option.value]: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={t('placeholders.enterPrice')}
                        />
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          = {formatCurrency(currentPrice)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('fields.description')}
                      </label>
                      <input
                        type="text"
                        value={currentDescription}
                        onChange={(e) =>
                          setEditingDescription({
                            ...editingDescription,
                            [option.value]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={t('placeholders.enterDescription')}
                      />
                    </div>
                  </div>

                  {pricing && (
                    <div className="mt-4 text-xs text-gray-500">
                      <div>
                        {t('fields.lastUpdated')}:{' '}
                        {pricing.updatedAt
                          ? new Date(pricing.updatedAt).toLocaleString('vi-VN')
                          : t('common.notSet')}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleSave(option.value)}
                      disabled={isSaving || currentPrice <= 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSaving ? t('buttons.saving') : t('buttons.saveChanges')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          {t('notes.title')}:
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>{t('notes.newPriceApplies')}</li>
          <li>{t('notes.currentPriceUsed')}</li>
          <li>{t('notes.suspendPrice')}</li>
        </ul>
      </div>
    </div>
  );
}









































