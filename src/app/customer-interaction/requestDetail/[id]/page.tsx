'use client'
import {useTranslations} from 'next-intl';
import RequestInfoAndContext from '@/src/components/customer-interaction/RequestInfo';
import RequestLogUpdate from '@/src/components/customer-interaction/RequestLogUpdate';
import Arrow from '@/src/assets/Arrow.svg';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useRequestDetails } from '@/src/hooks/useRequestDetails'; 


export default function RequestDetailPage() {
    const t = useTranslations('customer-interaction.Request');
    const router = useRouter();
    const params = useParams();

    const requestId = params.id
    const { requestData, loading, error, acceptOrDenyRequest, addProgressNote, completeRequest, isSubmitting } = useRequestDetails(requestId);
    const isUnactive = requestData?.status === 'Done' || requestData?.status === 'Cancelled';

    const handleBack = () => {
        router.back(); // Navigate to the previous page
    }

    if (loading) {
        return <div className="flex justify-center items-center h-screen">{t('loading')}</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-500">{t('error')}: {error.message}</div>;
    }
    
    if (!requestData) {
        return <div className="flex justify-center text-xl font-bold items-center h-screen">{t('noData')}</div>;
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
            {t('requestDetails')}
        </div>
        <div className="flex-grow min-h-0">
          <div className="max-w-4xl mx-auto space-y-6">
            <RequestInfoAndContext
              value={requestData}
              contextTitle={t('contextTitle')}
              contextContextTitle={t('contextContextTitle')}
              contextImageTitle={t('contextImageTitle')}
            ></RequestInfoAndContext>
            {!isUnactive && (
              <RequestLogUpdate
                initialStatusValue={requestData.status ?? 'New'}
                preferredDatetime={requestData.preferredDatetime}
                currentNote={requestData.note}
                initialFee={requestData.fee}
                onSave={async () => {}}
                onAcceptDeny={acceptOrDenyRequest}
                onAddProgressNote={addProgressNote}
                onCompleteRequest={completeRequest}
                unactive={false}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        </div>
      </div>

    )
}
