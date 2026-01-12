'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Table from '@/src/components/base-service/Table';
import DetailField from '@/src/components/base-service/DetailField';
import { useServiceCategoryList } from '@/src/hooks/useServiceCategoryList';
import { useNotifications } from '@/src/hooks/useNotifications';
import { Page, Service, ServiceCategory } from '@/src/types/service';
import {
  deleteServiceCategory,
  getServices,
  updateServiceCategoryStatus,
  updateService,
} from '@/src/services/asset-maintenance/serviceService';
import PopupConfirm from '@/src/components/common/PopupComfirm';
import Pagination from '@/src/components/customer-interaction/Pagination';

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('vi-VN');
};

type EditFormState = {
  code: string;
  name: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
  createdAt: string;
};

const initialEditState: EditFormState = {
  code: '',
  name: '',
  description: '',
  sortOrder: '',
  isActive: true,
  createdAt: '',
};

export default function ServiceCategoryListPage() {
  const t = useTranslations('ServiceCategory');
  const router = useRouter();
  const { show } = useNotifications();
  const {
    categories,
    loading,
    error,
    isSubmitting,
    refetch,
    updateCategory,
  } = useServiceCategoryList();

  const headers = useMemo(
    () => [
      t('code'),
      t('name'),
      t('status'),
      t('createdAt'),
      t('action'),
    ],
    [t],
  );

  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formState, setFormState] = useState<EditFormState>(initialEditState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [statusPopupOpen, setStatusPopupOpen] = useState(false);
  const [statusTargetId, setStatusTargetId] = useState<string | null>(null);
  const [statusTargetNew, setStatusTargetNew] = useState<boolean | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceLoading, setServiceLoading] = useState<boolean>(true);
  const [serviceError, setServiceError] = useState<string | null>(null);
  
  // Pagination
  const initialPageSize = 10;
  const [pageNo, setPageNo] = useState<number>(0);
  const [pageSize] = useState<number>(initialPageSize);

  const fetchServices = useCallback(async () => {
    setServiceLoading(true);
    setServiceError(null);
    try {
      const result = await getServices();
      let servicesArray: Service[] = [];
      const raw = result as unknown;
      if (Array.isArray(raw)) {
        servicesArray = raw as Service[];
      } else if (
        raw &&
        typeof raw === 'object' &&
        Array.isArray((raw as Page<Service>).content)
      ) {
        servicesArray = (raw as Page<Service>).content;
      }
      setServices(servicesArray);
    } catch (fetchError) {
      console.error('Failed to fetch services', fetchError);
      setServiceError(t('errors.fetchServicesFailed'));
      setServices([]);
    } finally {
      setServiceLoading(false);
    }
  }, []);

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setDeleteTargetId(null);
  };
  const handleCloseStatusPopup = () => {
    setStatusPopupOpen(false);
    setStatusTargetId(null);
    setStatusTargetNew(null);
  };

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    if (!selectedCategory) return;
    setFormState({
      name: selectedCategory.name ?? '',
      code: selectedCategory.code ?? '',
      description: selectedCategory.description ?? '',
      sortOrder:
        selectedCategory.sortOrder !== undefined && selectedCategory.sortOrder !== null
          ? String(selectedCategory.sortOrder)
          : '',
      isActive: true, // Always set to Active
      createdAt: formatDate(selectedCategory.createdAt),
    });
    setFormErrors({});
  }, [selectedCategory]);

  const handleOpenModal = (categoryId: string) => {
    const target = categories.find((item) => item.id === categoryId);
    if (!target) return;
    setSelectedCategory(target);
    setIsModalOpen(true);
  };

  const handleOpenChangeStatus = (categoryId: string) => {
    const target = categories.find((item) => item.id === categoryId);
    if (!target) return;
    setStatusTargetId(categoryId);
    setStatusTargetNew(!(target.isActive ?? true));
    setStatusPopupOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
    setFormState(initialEditState);
    setFormErrors({});
  };

  // Validate individual field
  const validateField = (fieldName: string, value: string) => {
    const newErrors = { ...formErrors };
    
    switch (fieldName) {
      case 'name':
        const name = value.trim();
        if (!name) {
          newErrors.name = t('validation.name');
        } else if (name.length > 40) {
          newErrors.name = t('validation.nameMax40');
        } else {
          delete newErrors.name;
        }
        break;
    }
    
    setFormErrors(newErrors);
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Validate field on change
    if (name === 'name') {
      validateField(name, value);
    }
  };


  const categoryServiceCounts = useMemo(() => {
    return services.reduce<Record<string, number>>((acc, serviceItem) => {
      const categoryId = serviceItem.categoryId ?? serviceItem.category?.id;
      if (categoryId) {
        acc[categoryId] = (acc[categoryId] ?? 0) + 1;
      }
      return acc;
    }, {});
  }, [services]);

  const tableDataAll = useMemo(
    () =>
      categories.map((category) => ({
        categoryId: category.id,
        categoryCode: category.code,
        categoryName: category.name,
        isActive: category.isActive ?? true,
        sortOrder: category.sortOrder ?? null,
        createdAt: formatDate(category.createdAt),
        disableDelete: (categoryServiceCounts[category.id] ?? 0) > 0,
      })),
    [categories, categoryServiceCounts],
  );

  // Apply pagination to table data
  const tableData = useMemo(() => {
    const startIndex = pageNo * pageSize;
    const endIndex = startIndex + pageSize;
    return tableDataAll.slice(startIndex, endIndex);
  }, [tableDataAll, pageNo, pageSize]);

  const totalPages = useMemo(() => {
    return pageSize > 0 ? Math.ceil(tableDataAll.length / pageSize) : 0;
  }, [tableDataAll.length, pageSize]);

  const handlePageChange = useCallback((newPage: number) => {
    setPageNo(newPage);
  }, []);

  const validate = () => {
    const errors: Record<string, string> = {};
    const name = formState.name.trim();
    if (!name) {
      errors.name = t('validation.name');
    } else if (name.length > 40) {
      errors.name = t('validation.nameMax40');
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCategory || isSubmitting) return;
    if (!validate()) return;

    // Đảm bảo code luôn có giá trị hợp lệ
    const categoryCode = selectedCategory.code?.trim() || formState.code.trim();
    if (!categoryCode) {
      show(t('messages.updateError'), 'error');
      return;
    }

    try {
      await updateCategory(selectedCategory.id, {
        code: categoryCode,
        name: formState.name.trim(),
        description: formState.description.trim() || undefined,
        sortOrder: formState.sortOrder
          ? Number(formState.sortOrder)
          : undefined,
        isActive: true, // Always set to Active
      });
      show(t('messages.updateSuccess'), 'success');
      handleCloseModal();
    } catch (submitError) {
      console.error('Failed to update service category', submitError);
      show(t('messages.updateError'), 'error');
    }
  };

  const handleDeleteCategory = (id: string) => {
    if ((categoryServiceCounts[id] ?? 0) > 0) {
      show(t('messages.deleteError'), 'info');
      return;
    }
    setDeleteTargetId(id);
    setIsPopupOpen(true);
  };

  const handleRefresh = () => {
    refetch();
    fetchServices();
    setPageNo(0);
  };

  const isLoading = loading || serviceLoading;
  const hasError = Boolean(error) || Boolean(serviceError);

  if (isLoading) {
    return (
      <div className="px-[41px] py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-2 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="px-[41px] py-12 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{t('error')}</p>
          <button
            onClick={handleRefresh}
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
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-[#02542D]">
            {t('listTitle')}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/base/serviceCateNew')}
              className="px-4 py-2 bg-[#14AE5C] text-white rounded-lg shadow-sm hover:bg-[#0c793f] transition"
            >
              {t('addCategory')}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl w-full min-h-[200px]">
          <Table
            data={tableData}
            headers={headers}
            type="service-category"
            onEdit={handleOpenModal}
            onDelete={handleDeleteCategory}
            onServiceCategoryStatusChange={handleOpenChangeStatus}
          />
          {totalPages > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={pageNo + 1}
                totalPages={totalPages}
                onPageChange={(page) => handlePageChange(page - 1)}
              />
            </div>
          )}
        </div>
      </div>

      {isModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl p-6">
            <div className="flex items-start justify-between border-b pb-4 mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[#02542D]">
                  {t('editTitle')}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {t('editSubtitle', { code: selectedCategory.code ?? '' })}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <DetailField
                  label={t('code')}
                  value={selectedCategory.code ?? ''}
                  readonly={true}
                />
                <DetailField
                  label={t('name')}
                  name="name"
                  value={formState.name}
                  onChange={handleInputChange}
                  readonly={false}
                  error={formErrors.name}
                />
                <DetailField
                  label={t('description')}
                  name="description"
                  value={formState.description}
                  onChange={handleInputChange}
                  readonly={false}
                  type="textarea"
                  isFullWidth
                />

              </div>

              <div className="flex justify-end mt-8 space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
                  disabled={isSubmitting}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-lg bg-[#02542D] text-white hover:bg-opacity-80 transition ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('saving') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <PopupConfirm
        isOpen={statusPopupOpen}
        onClose={handleCloseStatusPopup}
        onConfirm={async () => {
          if (!statusTargetId || statusTargetNew === null) return;
          try {
            await updateServiceCategoryStatus(statusTargetId, statusTargetNew);
            
            // Nếu change status category thành inactive, thì cũng change status của tất cả services trong category đó thành inactive
            if (statusTargetNew === false) {
              const servicesInCategory = services.filter(
                (service) => (service.categoryId ?? service.category?.id) === statusTargetId
              );
              
              // Update status của tất cả services trong category thành inactive
              await Promise.all(
                servicesInCategory.map((service) =>
                  updateService(service.id, { isActive: false }).catch((err) => {
                    console.error(`Failed to update service ${service.id}:`, err);
                    // Continue với các services khác nếu một service fail
                  })
                )
              );
            }
            
            show(t('messages.updateSuccess'), 'success');
            await refetch();
            await fetchServices();
          } catch (err) {
            console.error('Failed to change status for service category', err);
            show(t('messages.updateError'), 'error');
          } finally {
            handleCloseStatusPopup();
          }
        }}
        popupTitle={t('changeStatusTitle')}
        popupContext={
          statusTargetNew === true
            ? t('confirmActivateMessage')
            : t('confirmDeactivateMessage')
        }
      />
      <PopupConfirm
        isOpen={isPopupOpen}
        onClose={handleClosePopup}
        onConfirm={async () => {
          if (!deleteTargetId) return;
          try {
            await deleteServiceCategory(deleteTargetId);
            show(t('messages.deleteSuccess'), 'success');
            await refetch();
            await fetchServices();
          } catch (err) {
            console.error('Failed to delete service category', err);
            show(t('messages.deleteError'), 'error');
          } finally {
            handleClosePopup();
          }
        }}
        popupTitle={t('confirmDeleteTitle')}
        popupContext={t('confirmDeleteMessage')}
        isDanger
      />
    </div>
  );
}
