'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import DetailField from '@/src/components/base-service/DetailField';
import Select from '@/src/components/customer-interaction/Select';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';
import { getBuildings, Building } from '@/src/services/base/buildingService';
import { useNotificationAdd } from '@/src/hooks/useNotificationAdd';
import { 
    CreateNotificationRequest, 
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

export default function NotificationAdd() {
    const router = useRouter();
    const t = useTranslations('Noti');
    const { user, hasRole } = useAuth();
    const { addNotification, loading, error, isSubmitting } = useNotificationAdd();
    const { show } = useNotifications();

    // Check if user is supporter (only allowed EXTERNAL scope)
    const isSupporter = hasRole('SUPPORTER') || hasRole('supporter');
    const isAdmin = hasRole('ADMIN') || hasRole('admin');

    const [buildings, setBuildings] = useState<Building[]>([]);
    const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all'); // 'all' means all buildings, otherwise building.id
    const [loadingBuildings, setLoadingBuildings] = useState(false);

    const [formData, setFormData] = useState<NotificationFormData>({
        type: 'INFO',
        title: '',
        message: '',
        scope: isSupporter ? 'EXTERNAL' : 'EXTERNAL', // Default to EXTERNAL, but supporter must use EXTERNAL
        targetRole: undefined,
        targetBuildingId: undefined,
        referenceId: null,
        referenceType: null,
        iconUrl: null,
    });

    // Validation errors state
    const [errors, setErrors] = useState<{
        type?: string;
        title?: string;
        message?: string;
    }>({});

    // Fetch buildings when scope is EXTERNAL
    useEffect(() => {
        const fetchBuildings = async () => {
            if (formData.scope === 'EXTERNAL') {
                setLoadingBuildings(true);
                try {
                    const allBuildings = await getBuildings();
                    setBuildings(allBuildings);
                } catch (error) {
                    console.error(t('errors.loadBuildings'), error);
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
    }, [formData.scope, show]);

    const handleBack = () => {
        router.push('/customer-interaction/notiList');
    };

    // Validate individual field
    const validateField = (fieldName: string, value: string) => {
        const newErrors = { ...errors };
        
        switch (fieldName) {
            case 'type':
                if (!value || value.trim() === '') {
                    newErrors.type = t('validation.typeRequired');
                } else {
                    delete newErrors.type;
                }
                break;
            case 'title':
                if (!value || value.trim() === '') {
                    newErrors.title = t('validation.titleRequired');
                } else if (value.trim().length > 200) {
                    newErrors.title = t('validation.titleMaxLength');
                } else {
                    delete newErrors.title;
                }
                break;
            case 'message':
                if (!value || value.trim() === '') {
                    newErrors.message = t('validation.contentRequired');
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
            type?: string;
            title?: string;
            message?: string;
        } = {};

        // Validate type
        if (!formData.type || formData.type.trim() === '') {
            newErrors.type = t('validation.typeRequired');
        }

        // Validate title
        if (!formData.title || formData.title.trim() === '') {
            newErrors.title = t('validation.titleRequired');
        } else if (formData.title.trim().length > 200) {
            newErrors.title = t('validation.titleMaxLength');
        }

        // Validate message
        if (!formData.message || formData.message.trim() === '') {
            newErrors.message = t('validation.contentRequired');
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
            show(t('errors.supporterOnlyExternal') || 'Supporter chỉ được gửi thông báo cho external', 'error');
            return;
        }
        if (formData.scope === 'INTERNAL' && !formData.targetRole) {
            show(t('errors.selectTargetRole'), 'error');
            return;
        }

        try {
            // Build request object, only including fields that have values
            const request: CreateNotificationRequest = {
                type: formData.type,
                title: formData.title,
                message: formData.message,
                scope: formData.scope,
            };

            // Add optional fields only if they have values
            if (formData.scope === 'INTERNAL' && formData.targetRole && formData.targetRole.trim()) {
                request.targetRole = formData.targetRole.trim();
            }
            if (formData.scope === 'EXTERNAL') {
                request.targetBuildingId = selectedBuildingId === 'all' ? null : (selectedBuildingId || null);
            }
            if (formData.referenceId && formData.referenceId.trim()) {
                request.referenceId = formData.referenceId.trim();
            }
            if (formData.referenceType && formData.referenceType.trim()) {
                request.referenceType = formData.referenceType.trim();
            }
            if (formData.iconUrl && formData.iconUrl.trim()) {
                request.iconUrl = formData.iconUrl.trim();
            }

            console.log('Creating notification:', request);
            const createdNotification = await addNotification(request);
            
            // Show success message
            show(t('createNotificationSuccess'), 'success');

            // Redirect to notification list
            router.push(`/customer-interaction/notiList`);
        } catch (error) {
            console.error(t('errors.createFailed'), error);
            show(t('createNotificationError'), 'error');
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        // Enforce max length for title
        let finalValue = value;
        if (name === 'title' && value.length > 200) {
            finalValue = value.substring(0, 200);
        }
        setFormData((prev) => ({
            ...prev,
            [name]: finalValue,
        }));
        // Validate field on change
        validateField(name, finalValue);
    };

    const handleTypeChange = (item: { name: string; value: string }) => {
        const newType = item.value as NotificationType;
        setFormData((prevData) => ({
            ...prevData,
            type: newType,
        }));
        // Validate type on change
        validateField('type', newType);
    };

    const handleScopeChange = (item: { name: string; value: string }) => {
        // Prevent supporter from selecting INTERNAL
        if (isSupporter && item.value === 'INTERNAL') {
            show(t('errors.supporterOnlyExternal') || 'Supporter chỉ được gửi thông báo cho external', 'error');
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
                    {t('backToNotificationList')}
                </span>
            </div>

            <form
                className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200"
                onSubmit={handleSubmit}
            >
                <div className="flex justify-between items-start border-b pb-4 mb-6">
                    <div className="flex items-center">
                        <h1 className={`text-2xl font-semibold text-[#02542D] mr-3`}>
                            {t('createNotification')}
                        </h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    {/* Type */}
                    <div className={`col-span-full`}>
                        <label className="text-md font-bold text-[#02542D] mb-1">
                            {t('notificationType')} <span className="text-red-500">*</span>
                        </label>
                        <Select
                            options={[
                                { name: t('info'), value: 'NEWS' },
                                { name: t('request'), value: 'REQUEST' },
                                { name: t('bill'), value: 'BILL' },
                                { name: t('contract'), value: 'CONTRACT' },
                                { name: t('meterReading'), value: 'METER_READING' }
                            ]}
                            value={formData.type}
                            onSelect={handleTypeChange}
                            renderItem={(item) => item.name}
                            getValue={(item) => item.value}
                            placeholder={t('selectNotificationType')}
                            error={!!errors.type}
                        />
                        {errors.type && (
                            <span className="text-red-500 text-xs mt-1">{errors.type}</span>
                        )}
                    </div>

                    {/* Title */}
                    <div className="col-span-full">
                        <DetailField
                            label={t('title')}
                            value={formData.title}
                            onChange={handleChange}
                            name="title"
                            placeholder={t('enterNotificationTitle')}
                            readonly={false}
                            // required={true}
                            error={errors.title}
                        />
                    </div>

                    {/* Message */}
                    <div className="col-span-full">
                        <DetailField
                            label={t('content')}
                            value={formData.message}
                            onChange={handleChange}
                            name="message"
                            type="textarea"
                            placeholder={t('enterNotificationContent')}
                            readonly={false}
                            // required={true}
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
                                <p className="text-gray-500 text-sm">{t('loadingBuildingList')}</p>
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
                                />
                            )}
                        </div>
                    )}
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
                            {isSubmitting ? t('saving') : t('save')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}


