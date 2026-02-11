'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getYears, ResidentViewYearDto } from '@/src/services/base/residentViewService';
import { YearRow, ImportModal } from '@/src/components/resident-view/ResidentViewComponents';
import { Upload } from 'lucide-react';

export default function ResidentDirectoryPage() {
  const router = useRouter();
  const t = useTranslations('ResidentDirectory');
  const [years, setYears] = useState<ResidentViewYearDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getYears();
      setYears(data);
    } catch (error) {
      console.error("Failed to load years", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-[#02542D]">{t('title')}</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
          >
            <Upload className="w-4 h-4" />
            {t('importResidents')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/base/regisresiView')}
            className="inline-flex items-center justify-center rounded-lg border border-green-600 bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:border-green-700 hover:bg-green-700"
          >
            {t('viewRegistrationButton')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary-2"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {years.map(year => (
            <YearRow key={year.year} yearData={year} />
          ))}
          {years.length === 0 && (
            <div className="text-center py-10 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-500">
              {t('noData')}
            </div>
          )}
        </div>
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
