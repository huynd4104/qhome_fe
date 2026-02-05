'use client'
import React, { useState } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import DetailField from '@/src/components/base-service/DetailField';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { uploadAssetImages, deleteAssetImage, setPrimaryImage, getAssetImageUrl, AssetResponse } from '@/src/services/asset-maintenance/assetImageService';
import { useNotifications } from '@/src/hooks/useNotifications';
import PopupComfirm from '@/src/components/common/PopupComfirm';

export default function AssetImageDetail() {
    const t = useTranslations('AssetImage.detail'); 
    const router = useRouter();
    const params = useParams();
    const assetId = params.id as string;
    const { show } = useNotifications();
    
    const [assetData, setAssetData] = useState<AssetResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
    
    const handleBack = () => {
        router.back();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setSelectedFiles(files);
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            show(t('upload.selectFiles'), 'error');
            return;
        }

        try {
            setUploading(true);
            const result = await uploadAssetImages(assetId, selectedFiles);
            setAssetData(result);
            setSelectedFiles([]);
            show(t('messages.uploadSuccess'), 'success');
        } catch (err: any) {
            show(t('messages.uploadError', { error: err?.message || '' }), 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteImageClick = (imageUrl: string) => {
        setPendingImageUrl(imageUrl);
        setShowDeleteConfirm(true);
    };

    const handleDeleteImage = async () => {
        if (!pendingImageUrl) return;
        setShowDeleteConfirm(false);
        const imageUrl = pendingImageUrl;
        setPendingImageUrl(null);

        try {
            setLoading(true);
            const result = await deleteAssetImage(assetId, imageUrl);
            setAssetData(result);
            show(t('messages.deleteSuccess'), 'success');
        } catch (err: any) {
            show(t('messages.deleteError', { error: err?.message || '' }), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSetPrimary = async (imageUrl: string) => {
        try {
            setLoading(true);
            const result = await setPrimaryImage(assetId, imageUrl);
            setAssetData(result);
            show(t('messages.setPrimarySuccess'), 'success');
        } catch (err: any) {
            show(t('messages.setPrimaryError', { error: err?.message || '' }), 'error');
        } finally {
            setLoading(false);
        }
    };

    const images = assetData?.images || [];
    const primaryImage = assetData?.primaryImage;

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

                {assetData && (
                    <div className="mb-6">
                        <DetailField 
                            label={t('fields.assetName')}
                            value={assetData.name ?? ""} 
                            readonly={true}
                        />
                        {assetData.code && (
                            <DetailField 
                                label={t('fields.assetCode')}
                                value={assetData.code ?? ""} 
                                readonly={true}
                            />
                        )}
                    </div>
                )}

                <div className="mb-6">
                    <label className="block text-md font-bold text-[#02542D] mb-2">
                        {t('upload.label')}
                    </label>
                    <div className="flex items-center space-x-3">
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-[#739559] file:text-white
                                hover:file:bg-opacity-80"
                        />
                        <button
                            onClick={handleUpload}
                            disabled={selectedFiles.length === 0 || uploading}
                            className="px-4 py-2 bg-[#739559] text-white rounded-md hover:bg-opacity-80 disabled:opacity-50"
                        >
                            {uploading ? t('upload.uploading') : t('upload.button')}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map((imageUrl, index) => {
                        const fullImageUrl = imageUrl.startsWith('http') 
                            ? imageUrl 
                            : getAssetImageUrl(imageUrl);
                        const isPrimary = imageUrl === primaryImage;

                        return (
                            <div key={index} className="relative group">
                                <div className="relative aspect-square overflow-hidden rounded-lg border-2 border-gray-200">
                                    <Image
                                        src={fullImageUrl}
                                        alt={`Image ${index + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                    {isPrimary && (
                                        <div className="absolute top-2 left-2 bg-[#739559] text-white px-2 py-1 rounded text-xs font-semibold">
                                            {t('image.primary')}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 flex space-x-2">
                                            {!isPrimary && (
                                                <button
                                                    onClick={() => handleSetPrimary(imageUrl)}
                                                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                                                >
                                                    {t('image.setPrimary')}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteImageClick(imageUrl)}
                                                disabled={loading}
                                                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50"
                                            >
                                                {t('image.delete')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {images.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        {t('empty')}
                    </div>
                )}
            </div>

            {/* Delete Image Confirm Popup */}
            <PopupComfirm
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setPendingImageUrl(null);
                }}
                onConfirm={handleDeleteImage}
                popupTitle={t('messages.deleteConfirm')}
                popupContext=""
                isDanger={true}
            />
        </div>
    );
}

