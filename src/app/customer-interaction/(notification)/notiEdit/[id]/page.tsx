'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import DetailField from '@/src/components/base-service/DetailField';
import Select from '@/src/components/customer-interaction/Select';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';
import { getBuildings, Building } from '@/src/services/base/buildingService';
import { useNotificationEdit } from '@/src/hooks/useNotificationEdit';
import { 
    UpdateNotificationRequest, 
} from '@/src/services/customer-interaction/notiService';
import { NotificationScope, NotificationType } from '@/src/types/notification';
import { useNotifications } from '@/src/hooks/useNotifications';

interface NotificationFormData {
    type: NotificationType;
    title: string;
    message: string;
    scope: NotificationScope;
    targetRole?: string;
    targetBuildingId?: string | null;
    referenceId?: string | null;
    referenceType?: string | null;
    iconUrl?: string | null;
}

export default function NotificationEdit() {
    const router = useRouter();
    const params = useParams();
    const t = useTranslations('Noti');
    const { user, hasRole } = useAuth();
    const notificationId = params?.id as string;
    const { notification, updateNotificationItem, loading: loadingNotification, error, isSubmitting } = useNotificationEdit(notificationId);
    const { show } = useNotifications();

    // Check if user is supporter (only allowed EXTERNAL scope)
    const isSupporter = hasRole('SUPPORTER');

    const [buildings, setBuildings] = useState<Building[]>([]);
    const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all'); // 'all' means all buildings, otherwise building.id
    const [loadingBuildings, setLoadingBuildings] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);

    const [formData, setFormData] = useState<NotificationFormData>({
        type: 'INFO',
        title: '',
        message: '',
        scope: 'EXTERNAL',
        targetRole: undefined,
        targetBuildingId: undefined,
        referenceId: null,
        referenceType: null,
        iconUrl: null,
    });

    // Validation errors state
    const [errors, setErrors] = useState<{
        title?: string;
        message?: string;
    }>({});

    // Load existing notification data when it's fetched
    useEffect(() => {
        if (notification) {
            // Check if supporter trying to edit INTERNAL notification
            if (isSupporter && notification.scope === 'INTERNAL') {
                setAccessDenied(true);
                show(t('accessDenied') || 'Bạn không có quyền chỉnh sửa thông báo internal', 'error');
                setTimeout(() => {
                    router.push('/customer-interaction/notiList');
                }, 2000);
                return;
            }
            
            const isAllBuildings = notification.scope === 'EXTERNAL' && !notification.targetBuildingId;
            
            setFormData({
                type: notification.type || 'INFO',
                title: notification.title || '',
                message: notification.message || '',
                scope: notification.scope || 'EXTERNAL',
                targetRole: notification.scope === 'INTERNAL' && !notification.targetRole ? 'ALL' : notification.targetRole,
                targetBuildingId: notification.targetBuildingId || undefined,
                referenceId: notification.referenceId || null,
                referenceType: notification.referenceType || null,
                iconUrl: notification.iconUrl || null,
            });
            
            // Set selectedBuildingId based on targetBuildingId
            setSelectedBuildingId(isAllBuildings ? 'all' : (notification.targetBuildingId || 'all'));
        }
    }, [notification, isSupporter, show, router]);

    // Fetch buildings when notification loads with targetBuildingId
    useEffect(() => {
        const fetchBuildings = async () => {
            if (notification && notification.scope === 'EXTERNAL') {
                setLoadingBuildings(true);
                try {
                    const allBuildings = await getBuildings();
                    setBuildings(allBuildings);
                } catch (error) {
                    console.error('Lỗi khi tải danh sách tòa nhà:', error);
                    show(t('errors.loadBuildings'), 'error');
                } finally {
                    setLoadingBuildings(false);
                }
            } else {
                setBuildings([]);
                setSelectedBuildingId('all');
            }
        };

        fetchBuildings();
    }, [show, formData.targetBuildingId, notification]);

    const handleBack = () => {
        router.push(`/customer-interaction/notiDetail/${notificationId}`);
    };

    // Validate individual field
    const validateField = (fieldName: string, value: string) => {
        const newErrors = { ...errors };
        
        switch (fieldName) {
            case 'title':
                if (!value || value.trim() === '') {
                    newErrors.title = t('validation.emptyTitle');
                } else {
                    delete newErrors.title;
                }
                break;
            case 'message':
                if (!value || value.trim() === '') {
                    newErrors.message = t('validation.emptyMessage');
                } else {
                    delete newErrors.message;
                }
                break;
        }
        
        setErrors(newErrors);
    };

    // Validate all fields
    const validateAllFields = (): boolean => {
        const newErrors: {
            title?: string;
            message?: string;
        } = {};

        // Validate title
        if (!formData.title || formData.title.trim() === '') {
            newErrors.title = t('validation.emptyTitle');
        }

        // Validate message
        if (!formData.message || formData.message.trim() === '') {
            newErrors.message = t('validation.emptyMessage');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Validate all fields
        if (!validateAllFields()) {
            show(t('validation.checkRequiredFields'), 'error');
            return;
        }

        // Additional validations
        // Supporter can only use EXTERNAL scope
        if (isSupporter && formData.scope === 'INTERNAL') {
            show(t('errors.supporterOnlyExternal') || 'Supporter chỉ được chỉnh sửa thông báo external', 'error');
            return;
        }
        if (formData.scope === 'INTERNAL' && !formData.targetRole) {
            show(t('errors.selectTargetRole'), 'error');
            return;
        }

        try {
            // Build request object, only including fields that should be updated
            const request: UpdateNotificationRequest = {
                title: formData.title,
                message: formData.message,
                scope: formData.scope,
            };

            // Add optional fields only if they have values
            if (formData.iconUrl && formData.iconUrl.trim()) {
                request.iconUrl = formData.iconUrl.trim();
            }
            if (formData.scope === 'INTERNAL' && formData.targetRole && formData.targetRole.trim()) {
                request.targetRole = formData.targetRole.trim();
            }
            if (formData.scope === 'EXTERNAL') {
                request.targetBuildingId = selectedBuildingId === 'all' ? null : (selectedBuildingId || null);
            }

            await updateNotificationItem(request);

            // Show success message
            show(t('messages.updated'), 'success');

            // Redirect to notification detail
            router.push(`/customer-interaction/notiDetail/${notificationId}`);
        } catch (error) {
            console.error(t('errors.updateFailed'), error);
            show(t('error.updateFailed'), 'error');
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        // Validate field on change
        validateField(name, value);
    };

    const handleTypeChange = (item: { name: string; value: string }) => {
        setFormData((prevData) => ({
            ...prevData,
            type: item.value as NotificationType,
        }));
    };

    const handleScopeChange = (item: { name: string; value: string }) => {
        // Prevent supporter from selecting INTERNAL
        if (isSupporter && item.value === 'INTERNAL') {
            show(t('errors.supporterOnlyExternal') || 'Supporter chỉ được chọn external', 'error');
            return;
        }
        setSelectedBuildingId('all');
        setFormData((prevData) => ({
            ...prevData,
            scope: item.value as NotificationScope,
            targetRole: item.value === 'INTERNAL' ? 'ALL' : undefined,
            targetBuildingId: undefined,
        }));
    };

    const handleBuildingChange = (item: { name: string; value: string }) => {
        setSelectedBuildingId(item.value);
        setFormData((prev) => ({
            ...prev,
            targetBuildingId: item.value === 'all' ? null as any : item.value,
        }));
    };

    function handleTargetRoleChange(item: { name: string; value: string; }): void {
        setFormData((prev) => ({
            ...prev,
            targetRole: item.value,
        }));
    }

    if (loadingNotification) {
        return (
            <div className="min-h-screen p-4 sm:p-8">
                <div className="max-w-4xl mx-auto">
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

    if (accessDenied) {
        return (
            <div className="min-h-screen p-4 sm:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
                        <p className="text-red-600 mb-4 text-lg font-semibold">
                            {t('accessDenied') || 'Bạn không có quyền chỉnh sửa thông báo này'}
                        </p>
                        <p className="text-gray-600 mb-4">
                            {t('supporterCannotEditInternal') || 'Supporter chỉ có thể chỉnh sửa các thông báo external'}
                        </p>
                        <button
                            onClick={() => router.push('/customer-interaction/notiList')}
                            className="px-4 py-2 bg-[#02542D] text-white rounded-md hover:bg-opacity-80"
                        >
                            {t('back')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!notification) {
        return (
            <div className="min-h-screen p-4 sm:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
                        <p className="text-red-600 mb-4">{t('notFound')}</p>
                        <button
                            onClick={handleBack}
                            className="px-4 py-2 bg-[#02542D] text-white rounded-md hover:bg-opacity-80"
                        >
                            {t('back')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen  p-4 sm:p-8 font-sans`}>
            <div
                className="max-w-4xl mx-auto mb-6 flex items-center cursor-pointer"
                onClick={handleBack}
            >
                <Image
                    src={Arrow}
                    alt={t('back')}
                    width={20}
                    height={20}
                    className="w-5 h-5 mr-2"
                />
                <span
                    className={`text-[#02542D] font-bold text-2xl hover:text-opacity-80 transition duration-150 `}
                >
                    {t('back')}
                </span>
            </div>

            <form
                className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200"
                onSubmit={handleSubmit}
            >
                <div className="flex justify-between items-start border-b pb-4 mb-6">
                    <div className="flex items-center">
                        <h1 className={`text-2xl font-semibold text-[#02542D] mr-3`}>
                            {t('editNotification')}
                        </h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    {/* Type (Read-only - can't change type after creation) */}
                    <div className={`flex flex-col mb-4 col-span-1`}>
                        <label className="text-md font-bold text-[#02542D] mb-1">
                            {t('notificationType')}
                        </label>
                        <input
                            type="text"
                            value={formData.type}
                            disabled
                            className="p-2 border border-gray-300 rounded-md text-gray-500 bg-gray-50 cursor-not-allowed"
                        />
                    </div>

                    {/* Title */}
                    <div className="col-span-full">
                        <DetailField
                            label={t('title')}
                            value={formData.title}
                            onChange={handleChange}
                            name="title"
                            placeholder={t('enterTitle')}
                            readonly={false}
                            required={true}
                            error={errors.title}
                        />
                    </div>

                    {/* Message */}
                    <div className="col-span-full">
                        <DetailField
                            label={t('message')}
                            value={formData.message}
                            onChange={handleChange}
                            name="message"
                            type="textarea"
                            placeholder={t('enterMessage')}
                            readonly={false}
                            required={true}
                            error={errors.message}
                        />
                    </div>

                    {/* Scope */}
                    <div className={`flex flex-col mb-4 col-span-1`}>
                        <label className="text-md font-bold text-[#02542D] mb-1">
                            {t('scope')}
                        </label>
                        <Select
                            options={[
                                // Supporter can only select EXTERNAL
                                ...(isSupporter ? [] : [{ name: t('internal'), value: 'INTERNAL' }]),
                                { name: t('external'), value: 'EXTERNAL' }
                            ]}
                            value={formData.scope}
                            onSelect={handleScopeChange}
                            renderItem={(item) => item.name}
                            getValue={(item) => item.value}
                            placeholder={t('selectScope')}
                            disable={true}
                        />
                    </div>

                    {/* Target Role (for INTERNAL) */}
                    {formData.scope === 'INTERNAL' && (
                        <div className="flex flex-col mb-4 col-span-1">
                            <label className="text-md font-bold text-[#02542D] mb-1 block">
                                {t('targetRole')} <span className="text-red-500">*</span>
                            </label>
                            <Select
                                options={[
                                    { name: t('all'), value: 'ALL' },
                                    { name: t('admin'), value: 'ADMIN' },
                                    { name: t('technician'), value: 'TECHNICIAN' },
                                    { name: t('supporter'), value: 'SUPPORTER' },
                                    { name: t('account'), value: 'ACCOUNT' }
                                ]}
                                value={formData.targetRole}
                                onSelect={handleTargetRoleChange}
                                renderItem={(item) => item.name}
                                getValue={(item) => item.value}
                                placeholder={t('selectTargetRole')}
                                disable={true}
                            />
                        </div>
                    )}

                    {/* Target Building (for EXTERNAL) */}
                    {formData.scope === 'EXTERNAL' && (
                        <div className="flex flex-col mb-4 col-span-1">
                            <label className="text-md font-bold text-[#02542D] mb-1 block">
                                {t('selectBuilding')}
                            </label>
                            {loadingBuildings ? (
                                <p className="text-gray-500 text-sm">{t('loadingBuildings')}</p>
                            ) : (
                                <Select
                                    options={[
                                        { name: t('allBuildings'), value: 'all' },
                                        ...buildings.map(b => ({
                                            name: `${b.name} (${b.code})`, 
                                            value: b.id 
                                        }))
                                    ]}
                                    value={selectedBuildingId}
                                    onSelect={handleBuildingChange}
                                    renderItem={(item) => item.name}
                                    getValue={(item) => item.value}
                                    placeholder={t('selectBuilding')}
                                    disable={true}
                                />
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="col-span-full flex justify-center space-x-3 mt-8">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                            disabled={isSubmitting}
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-[#02542D] text-white rounded-lg hover:bg-opacity-80 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? t('saving') : t('update')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}


