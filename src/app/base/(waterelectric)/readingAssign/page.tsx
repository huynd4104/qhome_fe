import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function ReadingAssignIndexPage() {
  const t = useTranslations('ReadingAssign');
  
  const services = [
    {
      slug: 'water',
      label: t('services.water'),
      description: t('services.waterDescription'),
    },
    {
      slug: 'electric',
      label: t('services.electric'),
      description: t('services.electricDescription'),
    },
  ];

  return (
    <div className="px-[41px] py-12 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">{t('subtitle')}</p>
        <h1 className="text-3xl font-semibold text-[#02542D] mt-2">{t('title')}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {t('description')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <Link
            key={service.slug}
            href={`/base/readingAssign/${service.slug}`}
            className="block border border-gray-200 rounded-xl p-6 shadow-sm hover:border-[#02542D] transition-colors"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold text-gray-500">{t('serviceLabel')}</p>
                <h2 className="text-xl font-semibold text-[#02542D]">{service.label}</h2>
              </div>
              <span className="text-xs font-semibold text-[#02542D] uppercase">{t('open')}</span>
            </div>
            <p className="text-sm text-gray-600 mt-3">{service.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
