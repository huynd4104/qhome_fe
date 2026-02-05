'use client'
import React, { useState } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import Delete from '@/src/assets/Delete.svg';
import Edit from '@/src/assets/Edit.svg';
import DetailField from '@/src/components/base-service/DetailField';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSupplierDetailPage } from '@/src/hooks/useSupplierDetailPage';
import { useAuth } from '@/src/contexts/AuthContext';
import PopupConfirm from '@/src/components/common/PopupComfirm';
import { deleteSupplier } from '@/src/services/asset-maintenance/supplierService';

export default function SupplierDetail() {
    const { user, hasRole } = useAuth();
    const t = useTranslations('Supplier.detail'); 
    const router = useRouter();
    const params = useParams();
    const supplierId = params.id as string;
    const { supplierData, loading, error } = useSupplierDetailPage(supplierId);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    
    const handleBack = () => {
        router.push(`/asset-maintain/supplier/supplierList`);
    }

    const handleDelete = () => {
        setIsPopupOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!supplierId) {
            setIsPopupOpen(false);
            return;
        }

        try {
            await deleteSupplier(supplierId);
            setIsPopupOpen(false);
            router.push(`/asset-maintain/supplier/supplierList`);
        } catch (err) {
            console.error('Failed to delete supplier:', err);
            setIsPopupOpen(false);
        }
    };

    const handleClosePopup = () => {
        setIsPopupOpen(false);
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
    
    if (!supplierData) {
        return (
            <div className="flex justify-center text-xl font-bold items-center h-screen">
                {t('notFound')}
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
                    <div className="flex items-center">
                        <h1 className="text-2xl font-semibold text-[#02542D] mr-3">
                            {t('title')}
                        </h1>
                        <span
                            className={`text-sm font-semibold px-3 py-1 rounded-full ${supplierData.isActive ? 'bg-[#739559] text-white' : 'bg-[#EEEEEE] text-[#02542D]'}`}
                        >
                            {supplierData.isActive ? t('status.active') : t('status.inactive')}
                        </span>
                    </div>

                    <div className="flex space-x-2">
                        <button
                            className="p-2 rounded-lg bg-[#739559] hover:bg-opacity-80 transition duration-150"
                            onClick={() => router.push(`/asset-maintain/supplier/supplierEdit/${supplierId}`)}
                        >
                            <Image src={Edit} alt="Edit" width={24} height={24} className="w-6 h-6" />
                        </button>
                        {hasRole('admin') && (
                            <button
                                className="p-2 rounded-lg bg-red-500 hover:bg-opacity-80 transition duration-150"
                                onClick={handleDelete}
                            >
                                <Image src={Delete} alt="Delete" width={24} height={24} className="w-6 h-6" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <DetailField 
                        label={t('fields.name')}
                        value={supplierData.name ?? ""} 
                        readonly={true}
                    />
                    <div className="col-span-1 hidden md:block"></div>

                    <DetailField 
                        label={t('fields.type')}
                        value={supplierData.type ?? ""} 
                        readonly={true}
                    />

                    <DetailField 
                        label={t('fields.contactPerson')}
                        value={supplierData.contactPerson ?? ""} 
                        readonly={true}
                    />

                    <DetailField 
                        label={t('fields.phone')}
                        value={supplierData.phone ?? ""} 
                        readonly={true}
                    />
                    
                    <DetailField 
                        label={t('fields.email')}
                        value={supplierData.email ?? ""} 
                        readonly={true}
                    />

                    <DetailField 
                        label={t('fields.address')}
                        value={supplierData.address ?? ""} 
                        readonly={true}
                        isFullWidth={true}
                    />

                    {supplierData.taxCode && (
                        <DetailField 
                            label={t('fields.taxCode')}
                            value={supplierData.taxCode ?? ""} 
                            readonly={true}
                        />
                    )}

                    {supplierData.website && (
                        <DetailField 
                            label={t('fields.website')}
                            value={supplierData.website ?? ""} 
                            readonly={true}
                        />
                    )}

                    {supplierData.notes && (
                        <DetailField 
                            label={t('fields.notes')}
                            value={supplierData.notes ?? ""} 
                            readonly={true}
                            type="textarea"
                            isFullWidth={true}
                        />
                    )}

                    <DetailField 
                        label={t('fields.createdAt')}
                        value={supplierData.createdAt ? supplierData.createdAt.slice(0, 10).replace(/-/g, '/') : ''}
                        readonly={true}
                    />
                    
                    <DetailField 
                        label={t('fields.createdBy')} 
                        value={supplierData.createdBy ?? ""} 
                        readonly={true}
                    />
                </div>
            </div>

            <PopupConfirm
                isOpen={isPopupOpen}
                onClose={handleClosePopup}
                onConfirm={handleConfirmDelete}
                popupTitle={t('delete.title')}
                popupContext={t('delete.message')}
                isDanger={true}
            />
        </div>
    );
}

