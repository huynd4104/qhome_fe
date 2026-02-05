'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';
import ReadingAssignDashboard from '@/src/components/base-service/ReadingAssignDashboard';

const SERVICE_CONFIG: Record<string, { code: string; labelKey: string }> = {
  water: { code: 'WATER', labelKey: 'services.water' },
  electric: { code: 'ELECTRIC', labelKey: 'services.electric' },
};

interface ReadingAssignServicePageProps {
  params: Promise<{
    service: string;
  }>;
}

export default function ReadingAssignServicePage({ params }: ReadingAssignServicePageProps) {
  const t = useTranslations('ReadingAssign');
  const resolvedParams = use(params);
  const slug = resolvedParams.service?.toLowerCase() ?? '';
  const config = SERVICE_CONFIG[slug];

  if (!config) {
    return (
      <div className="px-[41px] py-12">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
          <h1 className="text-xl font-semibold text-[#02542D]">{t('errors.invalidService')}</h1>
          <p className="text-sm text-gray-600 mt-2">{t('errors.invalidServiceMessage')}</p>
        </div>
      </div>
    );
  }

  return (
    <ReadingAssignDashboard serviceCode={config.code} serviceLabel={t(config.labelKey)} />
  );
}


