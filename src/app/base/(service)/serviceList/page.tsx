'use client'

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import FilterForm from '@/src/components/base-service/FilterForm';
import Table from '@/src/components/base-service/Table';
import Pagination from '@/src/components/customer-interaction/Pagination';
import PopupConfirm from '@/src/components/common/PopupComfirm';
import { useServicePage } from '@/src/hooks/useServicePage';
import { updateServiceStatus } from '@/src/services/asset-maintenance/serviceService';
import { useNotifications } from '@/src/hooks/useNotifications';

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('vi-VN');
};

export default function ServiceListPage() {
  const t = useTranslations('Service');
  const router = useRouter();
  const { show } = useNotifications();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const headers = useMemo(
    () => [
      t('code'),
      t('name'),
      t('category'),
      // t('pricingType'),
      // t('status'),
      t('createdAt'),
      t('action'),
    ],
    [t],
  );

  const {
    data,
    categories,
    filters,
    loading,
    error,
    pageNo,
    totalPages,
    handleFilterChange,
    handleClear,
    handlePageChange,
    refetch,
  } = useServicePage();

  const tableData = useMemo(
    () =>
      data.content
        .filter((service) => service.isActive === true)
        .map((service) => ({
          serviceId: service.id,
          serviceCode: service.code,
          serviceName: service.name,
          categoryName: service.category?.name ?? '-',
          pricingType: t(`pricing.${service.pricingType?.toLowerCase() ?? 'unknown'}`),
          bookingType: t(`booking.${service.bookingType?.toLowerCase() ?? 'unknown'}`),
          isActive: service.isActive ?? false,
          createdAt: formatDate(service.createdAt),
        })),
    [data, t],
  );

  const handleAdd = () => {
    router.push('/base/serviceNew');
  };

  const handleDelete = (serviceId: string) => {
    setPendingDeleteId(serviceId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    
    if (isDeleting === pendingDeleteId) return;
    
    setIsDeleting(pendingDeleteId);
    try {
      // Gọi API để thay đổi status thành inactive (soft delete)
      await updateServiceStatus(pendingDeleteId, false);
      show(t('deleteSuccess') || 'Service đã được vô hiệu hóa thành công', 'success');
      await refetch();
    } catch (error) {
      console.error('Failed to delete service:', error);
      show(t('deleteError') || 'Có lỗi xảy ra khi vô hiệu hóa service', 'error');
    } finally {
      setIsDeleting(null);
      setShowDeleteConfirm(false);
      setPendingDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="px-[41px] py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-2 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-[41px] py-12 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{t('error')}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-2 text-white rounded-md hover:bg-primary-3"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-1 space-y-6">
      <div className="max-w-screen overflow-x-hidden">
        <h1 className="text-2xl font-semibold text-[#02542D] mb-4">
          {t('listTitle')}
        </h1>
        <div className="bg-white p-6 rounded-xl w-full min-h-[200px]">
          <FilterForm
            filters={filters}
            page="service"
            onFilterChange={handleFilterChange}
            onAdd={handleAdd}
            onClear={handleClear}
            onDelete={() => {}}
            categoryList={categories}
          />
          <Table
            data={tableData}
            headers={headers}
            type="service"
            onDelete={handleDelete}
          />
          <Pagination
            currentPage={pageNo + 1}
            totalPages={totalPages}
            onPageChange={(page) => handlePageChange(page - 1)}
          />
        </div>
      </div>
      <PopupConfirm
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPendingDeleteId(null);
        }}
        onConfirm={confirmDelete}
        popupTitle={t('confirmDeleteTitle')}
        popupContext={t('confirmDeleteMessage')}
        isDanger={true}
      />
    </div>
  );
}
