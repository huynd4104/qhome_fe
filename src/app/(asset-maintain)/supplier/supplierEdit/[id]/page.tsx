'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import DetailField from '@/src/components/base-service/DetailField';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSupplierDetailPage } from '@/src/hooks/useSupplierDetailPage';
import { UpdateSupplierRequest } from '@/src/services/asset-maintenance/supplierService';
import { useAuth } from '@/src/contexts/AuthContext';
import { useNotifications } from '@/src/hooks/useNotifications';

export default function SupplierEdit() {
    const { user, hasRole } = useAuth();
    const t = useTranslations('Supplier.edit');
    const router = useRouter();
    const params = useParams();
    const supplierId = params.id as string;
    const { show } = useNotifications();
    const { supplierData, loading, error, isSubmitting, editSupplier } = useSupplierDetailPage(supplierId);

    const [formData, setFormData] = useState<UpdateSupplierRequest>({
        name: '',
        type: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        taxCode: '',
        website: '',
        notes: '',
    });

    const [errors, setErrors] = useState<{[key: string]: string}>({});

    useEffect(() => {
        if (supplierData) {
            setFormData({
                name: supplierData.name || '',
                type: supplierData.type || '',
                contactPerson: supplierData.contactPerson || '',
                phone: supplierData.phone || '',
                email: supplierData.email || '',
                address: supplierData.address || '',
                taxCode: supplierData.taxCode || '',
                website: supplierData.website || '',
                notes: supplierData.notes || '',
            });
        }
    }, [supplierData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validate = (): boolean => {
        const newErrors: {[key: string]: string} = {};
        if (!formData.name?.trim()) newErrors.name = t('validation.nameRequired');
        if (!formData.type?.trim()) newErrors.type = t('validation.typeRequired');
        if (!formData.contactPerson?.trim()) newErrors.contactPerson = t('validation.contactPersonRequired');
        if (!formData.phone?.trim()) newErrors.phone = t('validation.phoneRequired');
        if (!formData.email?.trim()) newErrors.email = t('validation.emailRequired');
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = t('validation.emailInvalid');
        }
        if (!formData.address?.trim()) newErrors.address = t('validation.addressRequired');
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            await editSupplier(supplierId, formData);
            show(t('messages.updateSuccess'), 'success');
            router.push(`/asset-maintain/supplier/supplierDetail/${supplierId}`);
        } catch (err: any) {
            show(t('messages.updateError', { error: err?.message || '' }), 'error');
        }
    };

    const handleBack = () => {
        router.push(`/asset-maintain/supplier/supplierDetail/${supplierId}`);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-2 mx-auto mb-4"></div>
                    <p className="text-gray-600">{t('loading')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-screen text-red-500">
                {t('error', { error: error.message })}
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8 font-sans">
            <div className="max-w-4xl mx-auto mb-6 flex items-center cursor-pointer" onClick={handleBack}>
                <Image
                    src={Arrow}
                    alt="Back"
                    width={20}
                    height={20}
                    className="w-5 h-5 mr-2"
                />
                <span className="text-[#02542D] font-bold text-2xl hover:text-opacity-80 transition duration-150">
                    {t('back')}
                </span>
            </div>

            <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md border border-gray-200">
                <div className="flex justify-between items-start border-b pb-4 mb-6">
                    <h1 className="text-2xl font-semibold text-[#02542D]">
                        {t('title')}
                    </h1>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <DetailField
                            label={t('fields.name')}
                            value={formData.name || ""}
                            onChange={handleChange}
                            name="name"
                            placeholder={t('fields.namePlaceholder')}
                            readonly={false}
                            error={errors.name}
                            required
                        />
                        <div className="col-span-1 hidden md:block"></div>

                        <DetailField
                            label={t('fields.type')}
                            value={formData.type || ""}
                            onChange={handleChange}
                            name="type"
                            placeholder={t('fields.typePlaceholder')}
                            readonly={false}
                            error={errors.type}
                            required
                        />

                        <DetailField
                            label={t('fields.contactPerson')}
                            value={formData.contactPerson || ""}
                            onChange={handleChange}
                            name="contactPerson"
                            placeholder={t('fields.contactPersonPlaceholder')}
                            readonly={false}
                            error={errors.contactPerson}
                            required
                        />

                        <DetailField
                            label={t('fields.phone')}
                            value={formData.phone || ""}
                            onChange={handleChange}
                            name="phone"
                            placeholder={t('fields.phonePlaceholder')}
                            readonly={false}
                            error={errors.phone}
                            required
                        />

                        <DetailField
                            label={t('fields.email')}
                            value={formData.email || ""}
                            onChange={handleChange}
                            name="email"
                            placeholder={t('fields.emailPlaceholder')}
                            readonly={false}
                            error={errors.email}
                            required
                        />

                        <DetailField
                            label={t('fields.address')}
                            value={formData.address || ""}
                            onChange={handleChange}
                            name="address"
                            placeholder={t('fields.addressPlaceholder')}
                            readonly={false}
                            error={errors.address}
                            required
                            isFullWidth={true}
                        />

                        <DetailField
                            label={t('fields.taxCode')}
                            value={formData.taxCode || ""}
                            onChange={handleChange}
                            name="taxCode"
                            placeholder={t('fields.taxCodePlaceholder')}
                            readonly={false}
                        />

                        <DetailField
                            label={t('fields.website')}
                            value={formData.website || ""}
                            onChange={handleChange}
                            name="website"
                            placeholder={t('fields.websitePlaceholder')}
                            readonly={false}
                        />

                        <DetailField
                            label={t('fields.notes')}
                            value={formData.notes || ""}
                            onChange={handleChange}
                            name="notes"
                            placeholder={t('fields.notesPlaceholder')}
                            readonly={false}
                            type="textarea"
                            isFullWidth={true}
                        />
                    </div>

                    <div className="flex justify-end space-x-3 mt-8">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            {t('buttons.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-[#739559] text-white rounded-md hover:bg-opacity-80 disabled:opacity-50"
                        >
                            {isSubmitting ? t('buttons.saving') : t('buttons.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
