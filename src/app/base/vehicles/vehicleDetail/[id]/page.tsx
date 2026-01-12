'use client'
import React from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import Edit from '@/src/assets/Edit.svg';
import DetailField from '@/src/components/base-service/DetailField';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useVehicleDetailPage } from '../../../../../hooks/useVehicleDetailPage';
import { VehicleKind } from '@/src/types/vehicle';

export default function VehicleDetailPage() {
  const t = useTranslations('Vehicle');
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  const { vehicle, loading, error } = useVehicleDetailPage(vehicleId);

  const getVehicleKindLabel = (kind?: VehicleKind) => {
    if (!kind) return '';
    switch (kind) {
      case VehicleKind.CAR:
        return t('car');
      case VehicleKind.MOTORCYCLE:
        return t('motorcycle');
      case VehicleKind.BICYCLE:
        return t('bicycle');
      case VehicleKind.OTHER:
        return t('other');
      default:
        return String(kind);
    }
  };

  const handleBack = () => {
    router.push(`/base/vehicles/vehicleAll`);
  };

  return (
    <div className={`min-h-screen p-4 sm:p-8 font-sans`}>
      <div className="max-w-4xl mx-auto mb-6 flex items-center cursor-pointer" onClick={handleBack}>
        <Image
          src={Arrow}
          alt={t('altText.back')}
          width={20}
          height={20}
          className="w-5 h-5 mr-2"
        />
        <span className={`text-[#02542D] font-bold text-2xl hover:text-opacity-80 transition duration-150`}>
          {t('vehicleListReturn')}
        </span>
      </div>

      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-start border-b pb-4 mb-6">
          <div className="flex items-center">
            <h1 className={`text-2xl font-semibold text-[#02542D] mr-3`}>
              {t('vehicleDetail')}
            </h1>
            <span
              className={`text-sm font-semibold px-3 py-1 rounded-full ${vehicle?.active ? 'bg-[#739559] text-white' : 'bg-[#EEEEEE] text-[#02542D]'}`}
            >
              {vehicle?.active ? t('active') : t('inactive')}
            </span>
          </div>

          <div className="flex space-x-2">
            <button
              className={`p-2 rounded-lg bg-[#739559] hover:bg-opacity-80 transition duration-150`}
              onClick={() => router.push(`/base/vehicles/vehicleEdit/${vehicleId}`)}
            >
              <Image src={Edit} alt={t('altText.edit')} width={24} height={24} className="w-6 h-6" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">{t('loading')}</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{t('error')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            <DetailField label={t('plateNo')} value={vehicle?.plateNo ?? ''} readonly={true} />
            <DetailField label={t('residentName')} value={vehicle?.residentName ?? ''} readonly={true} />
            <DetailField label={t('unitCode')} value={vehicle?.unitCode ?? ''} readonly={true} />
            <DetailField label={t('vehicleKind')} value={getVehicleKindLabel(vehicle?.kind)} readonly={true} />
            <DetailField label={t('color')} value={vehicle?.color ?? ''} readonly={true} />
            <DetailField
              label={t('approvedDate')}
              value={vehicle?.registrationApprovedAt?.slice(0, 10).replace(/-/g, '/') || '-'}
              readonly={true}
            />
            <DetailField
              label={t('createAt')}
              value={vehicle?.createdAt ? vehicle.createdAt.slice(0, 10).replace(/-/g, '/') : ''}
              readonly={true}
            />
            <DetailField label={t('createBy')} value={vehicle?.approvedBy ?? '-'} readonly={true} />
          </div>
        )}
      </div>
    </div>
  );
}


