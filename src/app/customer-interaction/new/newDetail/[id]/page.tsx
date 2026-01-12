'use client';
import React, { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Arrow from '@/src/assets/Arrow.svg';
import { useRouter, useParams } from 'next/navigation';
import { getNewsDetail } from '@/src/services/customer-interaction/newService';
import { News } from '@/src/types/news';
import { useNotifications } from '@/src/hooks/useNotifications';
import { getBuilding, Building } from '@/src/services/base/buildingService';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';

export default function NewsDetail() {
    const router = useRouter();
    const params = useParams();
    const { show } = useNotifications();
    const { hasRole } = useAuth();
    const id = params?.id as string;
    const t = useTranslations('News');

    // Check if user is supporter (cannot view/edit INTERNAL items)
    const isSupporter = hasRole('SUPPORTER');
    // Check if user is technician (view only, no edit)
    const isTechnician = hasRole('TECHNICIAN') || hasRole('technician') || hasRole('ROLE_TECHNICIAN') || hasRole('ROLE_technician');
    // Check if user is accountant (view only, no edit)
    const isAccountant = hasRole('ACCOUNTANT') || hasRole('accountant') || hasRole('ROLE_ACCOUNTANT') || hasRole('ROLE_accountant');

    const [news, setNews] = useState<News | null>(null);
    const [loading, setLoading] = useState(true);
    const [building, setBuilding] = useState<Building | null>(null);
    const [accessDenied, setAccessDenied] = useState(false);

    useEffect(() => {
        const fetchNews = async () => {
            if (!id) return;

            setLoading(true);
            try {
                const data = await getNewsDetail(id);
                
                // Check if supporter trying to view INTERNAL news
                if (isSupporter && data.scope === 'INTERNAL') {
                    setAccessDenied(true);
                    setLoading(false);
                    show(t('accessDenied') || 'Bạn không có quyền xem tin tức internal', 'error');
                    setTimeout(() => {
                        router.push('/customer-interaction/new/newList');
                    }, 2000);
                    return;
                }
                
                setNews(data);
                
                // Fetch building if targetBuildingId exists
                if (data.scope === 'EXTERNAL' && data.targetBuildingId) {
                    try {
                        const buildingData = await getBuilding(data.targetBuildingId);
                        setBuilding(buildingData);
                    } catch (error) {
                        console.error('Error fetching building:', error);
                    }
                }
            } catch (error) {
                console.error('Error fetching news detail:', error);
                show(t('noLoadDetail'), 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, [id, show, isSupporter, router]);

    const handleBack = () => {
        router.push(`/customer-interaction/new/newList`);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return t('notAvailable') || 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateString;
        }
    };

    if (loading) {
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
                            {t('accessDenied') || 'Bạn không có quyền xem tin tức này'}
                        </p>
                        <p className="text-gray-600 mb-4">
                            {t('supporterCannotViewInternal') || 'Supporter chỉ có thể xem các tin tức external'}
                        </p>
                        <button
                            onClick={handleBack}
                            className="px-4 py-2 bg-[#02542D] text-white rounded-md hover:bg-opacity-80"
                        >
                            {t('returnNewsList')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!news) {
        return (
            <div className="min-h-screen p-4 sm:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
                        <p className="text-red-600 mb-4">{t('noNewsFound')}</p>
                        <button
                            onClick={handleBack}
                            className="px-4 py-2 bg-[#02542D] text-white rounded-md hover:bg-opacity-80"
                        >
                            {t('returnNewsList')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <div
                    className="mb-6 flex items-center cursor-pointer"
                    onClick={handleBack}
                >
                    <Image
                        src={Arrow}
                        alt="Back"
                        width={20}
                        height={20}
                        className="w-5 h-5 mr-2"
                    />
                    <span className="text-[#02542D] font-bold text-2xl hover:text-opacity-80 transition duration-150">
                        {t('returnNewsList')}
                    </span>
                </div>

                {/* News Detail Card */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 sm:p-8">
                    {/* Header */}
                    <div className="border-b pb-4 mb-6">
                        <h1 className="text-3xl font-bold text-[#02542D] mb-2">
                            {news.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <span className={`px-3 py-1 rounded-full font-semibold ${
                                news.status === 'PUBLISHED' 
                                    ? 'bg-green-100 text-green-800'
                                    : news.status === 'DRAFT'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}>
                                {news.status === 'PUBLISHED' ? t('publishedStatus') : 
                                 news.status === 'DRAFT' ? t('draftStatus') : t('archivedStatus')}
                            </span>
                            <span>{t('publishDate')}: {formatDate(news.publishAt)}</span>
                            {news.expireAt && (
                                <span>{t('expireDate')}: {formatDate(news.expireAt)}</span>
                            )}
                            {news.viewCount !== undefined && (
                                <span>{t('viewCount')}: {news.viewCount}</span>
                            )}
                        </div>
                    </div>

                    {/* Cover Image */}
                    {news.coverImageUrl && (
                        <div className="mb-6">
                            <img
                                src={news.coverImageUrl}
                                alt={news.title}
                                className="w-full h-auto rounded-lg border border-gray-300"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                    )}

                    {/* Summary */}
                    {news.summary && (
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-[#02542D] mb-2">{t('summaryLabel')}</h2>
                            <p className="text-gray-700 leading-relaxed">{news.summary}</p>
                        </div>
                    )}

                    {/* Body Content */}
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-[#02542D] mb-2">{t('contentLabel')}</h2>
                        <div 
                            className="text-gray-700 leading-relaxed prose max-w-none"
                            dangerouslySetInnerHTML={{ __html: news.bodyHtml }}
                        />
                    </div>

                    {/* Images */}
                    {news.images && news.images.length > 0 && (
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-[#02542D] mb-4">
                                {t('images')} ({news.images.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {news.images
                                    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                                    .map((image, index) => (
                                        <div key={image.id || index} className="space-y-2 bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                                            <div className="relative w-full aspect-video overflow-hidden rounded-lg">
                                                <img
                                                    src={image.url}
                                                    alt={image.caption || `${t('images')} ${index + 1}`}
                                                    className="w-full h-full object-cover rounded-lg"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                            {image.caption && (
                                                <p className="text-sm text-gray-700 font-medium pt-2">{image.caption}</p>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="border-t pt-6 mt-6">
                        <h2 className="text-lg font-semibold text-[#02542D] mb-4">{t('additionalInfo')}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {news.scope && (
                                <div>
                                    <span className="font-semibold text-gray-700">{t('scope')}:</span>
                                    <span className="ml-2 text-gray-600">
                                        {news.scope === 'INTERNAL' ? t('internal') : t('external')}
                                    </span>
                                </div>
                            )}
                            {news.targetRole && (
                                <div>
                                    <span className="font-semibold text-gray-700">{t('targetRole')}:</span>
                                    <span className="ml-2 text-gray-600">{news.targetRole}</span>
                                </div>
                            )}
                            {news.scope === 'EXTERNAL' && (
                                <div>
                                    <span className="font-semibold text-gray-700">{t('building')}:</span>
                                    <span className="ml-2 text-gray-600">
                                        {building 
                                            ? `${building.name} (${building.code})`
                                            : news.targetBuildingId 
                                            ? `ID: ${news.targetBuildingId}`
                                            : t('allBuildingsText')}
                                    </span>
                                </div>
                            )}
                            {news.createdAt && (
                                <div>
                                    <span className="font-semibold text-gray-700">{t('createdAt')}:</span>
                                    <span className="ml-2 text-gray-600">{formatDate(news.createdAt)}</span>
                                </div>
                            )}
                            {news.updatedAt && (
                                <div>
                                    <span className="font-semibold text-gray-700">{t('updatedAt')}:</span>
                                    <span className="ml-2 text-gray-600">{formatDate(news.updatedAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-center space-x-3 mt-8">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                        >
                            {t('back')}
                        </button>
                        {/* Supporter cannot edit INTERNAL news, Technician and Accountant cannot edit any news */}
                        {!(isSupporter && news.scope === 'INTERNAL') && !isTechnician && !isAccountant && (
                            <button
                                type="button"
                                onClick={() => router.push(`/customer-interaction/new/newEdit/${id}`)}
                                className="px-6 py-2 bg-[#02542D] text-white rounded-lg hover:bg-opacity-80 transition shadow-md"
                            >
                                {t('edit')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

