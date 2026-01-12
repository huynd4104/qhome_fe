'use client'
import {useTranslations} from 'next-intl';
import RequestInfoAndContext from '@/src/components/customer-interaction/RequestInfo';
import FeedbackReply from '@/src/components/customer-interaction/FeedbackReply';
import Arrow from '@/src/assets/Arrow.svg';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useFeedbackDetails } from '@/src/hooks/useFeedbackDetails';
import { useAuth } from '@/src/contexts/AuthContext'; 


export default function FeedbackDetailPage() {
    const t = useTranslations('customer-interaction.Feedback');
    const router = useRouter();
    const params = useParams();
    const { hasRole } = useAuth();

    const feedbackId = params.id
    const { feedbackData, loading, error, replyFeedback, isSubmitting } = useFeedbackDetails(feedbackId);
    const isUnactive = feedbackData?.status === 'Done' || feedbackData?.status === 'Cancelled';

    // Check user roles
    const isSupporter = hasRole('supporter') || hasRole('SUPPORTER') || hasRole('Supporter');
    const isAdmin = hasRole('admin') || hasRole('ADMIN') || hasRole('Admin');
    
    // Only supporter and admin can view feedback detail
    const canView = isSupporter || isAdmin;

    const handleBack = () => {
        router.back(); // Navigate to the previous page
    }

    if (loading) {
        return <div className="flex justify-center items-center h-screen">{t('loading')}</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-500">{t('error')}: {error.message}</div>;
    }
    
    if (!feedbackData) {
        return <div className="flex justify-center text-xl font-bold items-center h-screen">{t('noData')}</div>;
    }

    // If user doesn't have permission to view, show access denied
    if (!canView) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex flex-col">
                <div className="flex items-center text-xl font-bold text-gray-800 pb-4 text-[#02542D] flex-none">
                    <Image 
                      src={Arrow} 
                      alt={t('back')} 
                      className="h-6 w-6 mr-2 cursor-pointer" 
                      onClick={handleBack}/>
                    {t('feedbackDetails') || 'Chi tiết phản hồi'}
                </div>
                <div className="flex justify-center items-center h-screen">
                    <div className="text-center">
                        <p className="text-red-600 text-lg font-semibold mb-2">
                            {t('accessDenied') || 'Không có quyền truy cập'}
                        </p>
                        <p className="text-gray-600">
                            {t('accessDeniedMessage') || 'Bạn không có quyền xem chi tiết phản hồi này.'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col">
        <div className="flex items-center text-xl font-bold text-gray-800 pb-4 text-[#02542D] flex-none">
            <Image 
              src={Arrow} 
              alt={t('back')} 
              className="h-6 w-6 mr-2 cursor-pointer" 
              onClick={() => {
                  handleBack();
              }}/>
            {t('feedbackDetails') || 'Chi tiết phản hồi'}
        </div>
        <div className="flex-grow min-h-0">
          <div className="max-w-4xl mx-auto space-y-6">
            <RequestInfoAndContext
              value={feedbackData}
              contextTitle={t('contextTitle')}
              contextContextTitle={t('contextContextTitle')}
              contextImageTitle={t('contextImageTitle')}
            ></RequestInfoAndContext>
            {/* Only supporter can reply, admin can only view */}
            {!isUnactive && isSupporter && (
              <FeedbackReply
                onReply={replyFeedback}
                isSubmitting={isSubmitting}
                isUnactive={false}
              />
            )}
          </div>
        </div>
      </div>

    )
}

