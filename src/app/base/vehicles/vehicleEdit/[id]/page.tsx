"use client"
import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Vehicle, VehicleKind } from '@/src/types/vehicle';
import { useVehicleDetailPage } from '../../../../../hooks/useVehicleDetailPage';
import { updateVehicle } from '@/src/services/base/vehicleService';

export default function VehicleEditPage() {
  const t = useTranslations('Vehicle');
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  const { vehicle, loading, error } = useVehicleDetailPage(vehicleId);

  const [form, setForm] = useState<Partial<Vehicle>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle) {
      setForm({
        plateNo: vehicle.plateNo,
        color: vehicle.color,
        kind: vehicle.kind,
        active: vehicle.active,
      });
    }
  }, [vehicle]);

  const vehicleKindOptions = useMemo(
    () => [
      { value: VehicleKind.CAR, label: t('car') },
      { value: VehicleKind.MOTORCYCLE, label: t('motorcycle') },
      { value: VehicleKind.BICYCLE, label: t('bicycle') },
      { value: VehicleKind.OTHER, label: t('other') },
    ],
    [t]
  );

  const handleBack = () => {
    router.push(`/base/vehicles/vehicleDetail/${vehicleId}`);
  };

  const handleChange = (field: keyof Vehicle, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) return;
    try {
      setSaving(true);
      setSaveError(null);
      await updateVehicle(vehicleId, form);
      router.push(`/base/vehicles/vehicleDetail/${vehicleId}`);
    } catch (err: any) {
      console.error(err);
      setSaveError(err?.message || t('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen p-4 sm:p-8 font-sans`}>
      <div className="max-w-4xl mx-auto mb-6 flex items-center cursor-pointer" onClick={handleBack}>
        <Image src={Arrow} alt={t('altText.back')} width={20} height={20} className="w-5 h-5 mr-2" />
        <span className={`text-[#02542D] font-bold text-2xl hover:text-opacity-80 transition duration-150`}>
          {t('vehicleDetailReturn')}
        </span>
      </div>

      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200">
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <h1 className={`text-2xl font-semibold text-[#02542D]`}>
            {t('vehicleEdit')}
          </h1>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">{t('loading')}</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{t('error')}</div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('plateNo')}</label>
                <input
                  type="text"
                  value={form.plateNo ?? ''}
                  onChange={(e) => handleChange('plateNo', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('color')}</label>
                <input
                  type="text"
                  value={form.color ?? ''}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('vehicleKind')}</label>
                <select
                  value={form.kind ?? ''}
                  onChange={(e) => handleChange('kind', e.target.value as VehicleKind)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#739559]"
                >
                  <option value="" disabled>
                    {t('select')}
                  </option>
                  {vehicleKindOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <input
                  id="active"
                  type="checkbox"
                  checked={!!form.active}
                  onChange={(e) => handleChange('active', e.target.checked)}
                  className="h-4 w-4 text-[#739559] border-gray-300 rounded focus:ring-[#739559]"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">
                  {t('active')}
                </label>
              </div>
            </div>

            {saveError && (
              <div className="text-red-600 text-sm">{saveError}</div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`px-4 py-2 rounded-md text-white bg-[#739559] hover:bg-opacity-90 disabled:opacity-60`}
              >
                {saving ? t('saving') : t('save')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


