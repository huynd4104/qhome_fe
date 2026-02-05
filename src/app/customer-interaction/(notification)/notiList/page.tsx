'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useNotificationList } from '@/src/hooks/useNotificationList';
import { deleteNotification, updateNotification } from '@/src/services/customer-interaction/notiService';
import { useAuth } from '@/src/contexts/AuthContext';
import Table from '@/src/components/base-service/Table';
import Select from '@/src/components/customer-interaction/Select';
import { useNotifications } from '@/src/hooks/useNotifications';
import { NotificationType, NotificationScope } from '@/src/types/notification';
import PopupConfirm from '@/src/components/common/PopupComfirm';
import Pagination from '@/src/components/customer-interaction/Pagination';
import { getBuildings, type Building } from '@/src/services/base/buildingService';

export default function NotificationList() {
    const t = useTranslations('Noti');
    const router = useRouter();
    const { user, hasRole } = useAuth();
    const { show } = useNotifications();
    
    // Check if user is supporter (only show EXTERNAL items)
    const isSupporter = hasRole('SUPPORTER');
    // Check if user is technician (view only, no edit/delete)
    const isTechnician = hasRole('TECHNICIAN') || hasRole('technician') || hasRole('ROLE_TECHNICIAN') || hasRole('ROLE_technician');
    // Check if user is accountant (view only, no edit/delete)
    const isAccountant = hasRole('ACCOUNTANT') || hasRole('accountant') || hasRole('ROLE_ACCOUNTANT') || hasRole('ROLE_accountant');
    
    const [selectedType, setSelectedType] = useState<NotificationType | ''>('');
    const [pageNo, setPageNo] = useState<number>(0);
    const [pageSize] = useState<number>(10);
    const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
    const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
    
    const { notificationList, loading, error, refetch } = useNotificationList(selectedType || undefined);

    const headers = [t('title'), t('content'), t('type'), t('createdAt'), t('action')];

    // Filter and sort notifications by createdAt desc (newest first)
    // Supporter can only see EXTERNAL notifications
    // Technician and Accountant can only see notifications with matching targetRole (or 'ALL')
    const orderedNotifications = useMemo(() => {
        if (!notificationList || notificationList.length === 0) return [];
        
        // Get current user roles for filtering
        const userRoles = user?.roles?.map(r => r.toUpperCase()) || [];
        const isAdmin = userRoles.includes('ADMIN');
        
        // Filter by scope if supporter
        let filtered = notificationList;
        if (isSupporter) {
            filtered = notificationList.filter(n => n.scope === 'EXTERNAL');
        }
        
        // Filter by targetRole: if notification has targetRole, only show if user has that role or is admin
        // This ensures Technician and Accountant only see notifications targeted to their role (or 'ALL')
        filtered = filtered.filter(n => {
            // If notification has no targetRole or targetRole is 'ALL', show to everyone
            if (!n.targetRole || n.targetRole === 'ALL') {
                return true;
            }
            
            // Admin can see all notifications
            if (isAdmin) {
                return true;
            }
            
            // Check if user has the target role (applies to Technician, Accountant, and other roles)
            const targetRoleUpper = n.targetRole.toUpperCase();
            return userRoles.includes(targetRoleUpper);
        });
        
        return filtered.slice().sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta; // Descending order (newest first)
        });
    }, [notificationList, isSupporter, isTechnician, isAccountant, user?.roles]);

    // Paginate the sorted notifications
    const paginatedNotifications = useMemo(() => {
        const startIndex = pageNo * pageSize;
        const endIndex = startIndex + pageSize;
        return orderedNotifications.slice(startIndex, endIndex);
    }, [orderedNotifications, pageNo, pageSize]);

    const totalPages = useMemo(() => {
        return pageSize > 0 ? Math.ceil(orderedNotifications.length / pageSize) : 0;
    }, [orderedNotifications.length, pageSize]);

    const handlePageChange = (newPage: number) => {
        setPageNo(newPage);
    };

    const handleAdd = () => {
        router.push('/customer-interaction/notiAdd');
    };

    const handleTypeChange = (item: { name: string; value: string }) => {
        setSelectedType(item.value as NotificationType | '');
        setPageNo(0); // Reset to first page when filter changes
    };

    const handleEdit = (id: string) => {
        router.push(`/customer-interaction/notiDetail/${id}`);
    };

    // For technician: view only (same route but detail page should handle read-only)
    const handleView = (id: string) => {
        router.push(`/customer-interaction/notiDetail/${id}`);
    };

    const handleDelete = (id: string) => {
        setNotificationToDelete(id);
        setIsDeletePopupOpen(true);
    };

    const confirmDelete = async () => {
        if (!notificationToDelete) return;

        try {
            await deleteNotification(notificationToDelete);
            show(t('messages.deleteSuccess'), 'success');
            refetch(); // Refresh list after deletion
        } catch (error) {
            console.error('Error deleting notification:', error);
            show(t('messages.deleteError'), 'error');
        } finally {
            setNotificationToDelete(null);
        }
    };

    // Change scope modal state
    const [changeOpen, setChangeOpen] = useState(false);
    const [changeId, setChangeId] = useState<string | null>(null);
    const [changeScope, setChangeScope] = useState<NotificationScope>('INTERNAL');
    const [changeTargetRole, setChangeTargetRole] = useState<string>('ALL');
    const [changeBuildingId, setChangeBuildingId] = useState<string>('all');
    const [changing, setChanging] = useState(false);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [loadingBuildings, setLoadingBuildings] = useState<boolean>(false);

    const handleOpenChangeScope = (id: string) => {
        setChangeId(id);
        // Prefill from existing item if available
        const item = notificationList.find(n => n.id === id);
        if (item) {
            // Supporter can only change to EXTERNAL
            setChangeScope(isSupporter ? 'EXTERNAL' : (item.scope ?? 'INTERNAL'));
            setChangeTargetRole(item.targetRole ?? 'ALL');
            setChangeBuildingId(item.targetBuildingId ?? 'all');
        } else {
            setChangeScope(isSupporter ? 'EXTERNAL' : 'INTERNAL');
            setChangeTargetRole('ALL');
            setChangeBuildingId('all');
        }
        setChangeOpen(true);
    };

    const handleCloseChange = () => {
        setChangeOpen(false);
        setChangeId(null);
        setChanging(false);
    };

    useEffect(() => {
        if (!changeOpen) return;
        let mounted = true;
        const loadBuildings = async () => {
            setLoadingBuildings(true);
            try {
                const result = await getBuildings();
                if (mounted) {
                    setBuildings(result);
                }
            } catch (e) {
                console.error('Failed to load buildings for notification change scope', e);
                setBuildings([]);
            } finally {
                setLoadingBuildings(false);
            }
        };
        void loadBuildings();
        return () => {
            mounted = false;
        };
    }, [changeOpen]);

    const handleConfirmChange = async () => {
        if (!changeId) return;
        
        // Prevent supporter from changing to INTERNAL
        if (isSupporter && changeScope === 'INTERNAL') {
            show(t('errors.supporterOnlyExternal') || 'Supporter chỉ được chọn external', 'error');
            return;
        }
        
        try {
            setChanging(true);
            await updateNotification(changeId, {
                scope: changeScope,
                targetRole: changeScope === 'INTERNAL' ? (changeTargetRole || 'ALL') : undefined,
                targetBuildingId: changeScope === 'EXTERNAL'
                    ? (changeBuildingId === 'all' ? null : changeBuildingId)
                    : undefined,
            });
            show(t('messages.updateScopeSuccess'), 'success');
            await refetch();
            handleCloseChange();
        } catch (e: any) {
            console.error('Failed to update notification scope', e);
            show(t('messages.updateScopeError'), 'error');
            setChanging(false);
        }
    };

    // Transform paginated notification list to table data format
    const tableData = paginatedNotifications.map((notification) => ({
        notificationId: notification.id,
        title: notification.title,
        message: notification.message.length > 100 ? notification.message.substring(0, 100) + '...' : notification.message,
        type: notification.type,
        createdAt: notification.createdAt,
    }));

    // Handle loading state
    if (loading) {
        return (
            <div className="min-h-screen  p-4 sm:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#02542D] mx-auto mb-4"></div>
                            <p className="text-gray-600">{t('loading')}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Handle error state
    if (error) {
        return (
            <div className="min-h-screen  p-4 sm:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <p className="text-red-600 mb-4">{t('errors.loadListFailed')}</p>
                            <button
                                onClick={() => refetch()}
                                className="px-4 py-2 bg-[#02542D] text-white rounded-md hover:bg-opacity-80"
                            >
                                {t('retry')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen  p-4 sm:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-semibold text-[#02542D]">
                            {t('listTitle')}
                        </h1>
                        {!isTechnician && !isAccountant && (
                            <button
                                onClick={handleAdd}
                                className="px-6 py-2 bg-[#02542D] text-white rounded-lg hover:bg-opacity-80 transition shadow-md font-semibold"
                            >
                                {t('addNotification')}
                            </button>
                        )}
                    </div>
                    
                    {/* Filter Section */}
                    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                        <div className="flex items-center gap-4">
                            <label className="text-sm font-semibold text-[#02542D] whitespace-nowrap">
                                {t('filterByType')}
                            </label>
                            <div className="w-full max-w-md">
                                <Select
                                    options={[
                                        { name: t('allTypes'), value: '' },
                                        { name: t('info'), value: 'NEWS' },
                                        { name: t('request'), value: 'REQUEST' },
                                        { name: t('bill'), value: 'BILL' },
                                        { name: t('contract'), value: 'CONTRACT' },
                                        { name: t('meterReading'), value: 'METER_READING' }
                                    ]}
                                    value={selectedType}
                                    onSelect={handleTypeChange}
                                    renderItem={(item) => item.name}
                                    getValue={(item) => item.value}
                                    placeholder={t('selectType')}
                                />
                            </div>
                            {selectedType && (
                                <button
                                    onClick={() => {
                                        setSelectedType('');
                                        setPageNo(0);
                                    }}
                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                >
                                    {t('clearFilter')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table */}
                {orderedNotifications.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center text-gray-500">
                        {t('emptyList')}
                    </div>
                ) : (
                    <>
                        <Table
                            data={tableData}
                            headers={headers}
                            type="notification"
                            onEdit={(isTechnician || isAccountant) ? handleView : handleEdit}
                            onDelete={(!isTechnician && !isAccountant) ? handleDelete : undefined}
                            onNotificationChangeScope={(!isTechnician && !isAccountant) ? handleOpenChangeScope : undefined}
                        />
                        <Pagination
                            currentPage={pageNo + 1}
                            totalPages={totalPages}
                            onPageChange={(page) => handlePageChange(page - 1)}
                        />
                        {changeOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                                <div className="bg-white w-full max-w-md rounded-lg shadow-xl p-6">
                                    <div className="flex items-start justify-between border-b pb-3 mb-4">
                                        <h3 className="text-lg font-semibold text-[#02542D]">{t('changeScopeModal.title')}</h3>
                                        <button
                                            onClick={handleCloseChange}
                                            className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex flex-col">
                                            <label className="text-sm font-medium text-[#02542D]">{t('changeScopeModal.scope')}</label>
                                            <Select
                                                options={[
                                                    // Supporter can only select EXTERNAL
                                                    ...(isSupporter ? [] : [{ name: t('internal'), value: 'INTERNAL' }]),
                                                    { name: t('external'), value: 'EXTERNAL' },
                                                ]}
                                                value={changeScope}
                                                onSelect={(item) => {
                                                    // Prevent supporter from selecting INTERNAL
                                                    if (isSupporter && item.value === 'INTERNAL') {
                                                        show(t('errors.supporterOnlyExternal') || 'Supporter chỉ được chọn external', 'error');
                                                        return;
                                                    }
                                                    setChangeScope(item.value as NotificationScope);
                                                }}
                                                renderItem={(item) => item.name}
                                                getValue={(item) => item.value}
                                                placeholder={t('changeScopeModal.selectScope')}
                                            />
                                        </div>
                                        {changeScope === 'INTERNAL' && (
                                            <div className="flex flex-col">
                                                <label className="text-sm font-medium text-[#02542D]">{t('changeScopeModal.targetRole')}</label>
                                                <Select
                                                    options={[
                                                        { name: t('all'), value: 'ALL' },
                                                        { name: t('admin'), value: 'ADMIN' },
                                                        { name: t('technician'), value: 'TECHNICIAN' },
                                                        { name: t('supporter'), value: 'SUPPORTER' },
                                                        { name: t('account'), value: 'ACCOUNT' }
                                                    ]}
                                                    value={changeTargetRole}
                                                    onSelect={(item) => setChangeTargetRole(item.value)}
                                                    renderItem={(item) => item.name}
                                                    getValue={(item) => item.value}
                                                    placeholder={t('changeScopeModal.selectTargetRole')}
                                                />
                                            </div>
                                        )}
                                        {changeScope === 'EXTERNAL' && (
                                            <div className="flex flex-col">
                                                <label className="text-sm font-medium text-[#02542D]">{t('changeScopeModal.selectBuilding')}</label>
                                                {loadingBuildings ? (
                                                    <p className="text-gray-500 text-sm">{t('changeScopeModal.loadingBuildings')}</p>
                                                ) : (
                                                    <Select
                                                        options={[
                                                            { name: t('changeScopeModal.allBuildings'), value: 'all' },
                                                            ...buildings.map((b) => ({
                                                                name: `${b.name} (${b.code})`,
                                                                value: b.id,
                                                            })),
                                                        ]}
                                                        value={changeBuildingId}
                                                        onSelect={(item) => setChangeBuildingId(item.value)}
                                                        renderItem={(item) => item.name}
                                                        getValue={(item) => item.value}
                                                        placeholder={t('changeScopeModal.selectBuilding')}
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            type="button"
                                            onClick={handleCloseChange}
                                            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
                                            disabled={changing}
                                        >
                                            {t('changeScopeModal.cancel')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleConfirmChange}
                                            className="px-4 py-2 rounded-lg bg-[#02542D] text-white hover:bg-opacity-80 transition disabled:opacity-50"
                                            disabled={changing}
                                        >
                                            {changing ? t('changeScopeModal.saving') : t('changeScopeModal.save')}
                                        </button>
                                    </div>
                                </div>
                        </div>
                        )}
                    </>
                )}
            </div>

            {/* Delete Confirmation Popup */}
            <PopupConfirm
                isOpen={isDeletePopupOpen}
                onClose={() => {
                    setIsDeletePopupOpen(false);
                    setNotificationToDelete(null);
                }}
                onConfirm={confirmDelete}
                popupTitle={t('deleteConfirm.title')}
                popupContext={t('deleteConfirm.message')}
                isDanger={true}
            />
        </div>
    );
}

