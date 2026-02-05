'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';

export default function NotFoundPage() {
  const router = useRouter();
  const t = useTranslations('NotFound');

  const handleBack = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
          <h1 className="text-6xl font-bold text-slate-800 mb-4">{t('title')}</h1>
          <h2 className="text-2xl font-semibold text-slate-700 mb-2">{t('heading')}</h2>
          <p className="text-slate-500 mb-6">
            {t('description')}
          </p>
          <button
            onClick={handleBack}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <Image src={Arrow} alt={t('backAlt')} width={16} height={16} className="mr-2 rotate-180" />
            {t('backButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

