'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('HomePage');
  
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-[#02542D]">{t('title')}</h1>
        <p className="text-sm text-gray-600">{t('description')}</p>
      </div>
    </div>
  );
}
