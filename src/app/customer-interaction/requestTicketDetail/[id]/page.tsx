// 'use client'
// import {useTranslations} from 'next-intl';
// import FilterForm from "../../../../components/customer-interaction/FilterForm";
// import Table from "../../../../components/customer-interaction/Table";
// import StatusTabs from "@/src/components/customer-interaction/StatusTabs";
// import RequestInfoAndContext from '@/src/components/customer-interaction/RequestInfo';
// import ProcessLog from '@/src/components/customer-interaction/ProcessLog';
// import RequestLogUpdate from '@/src/components/customer-interaction/RequestLogUpdate';
// import Arrow from '@/src/assets/Arrow.svg';
// import Image from 'next/image';

// export default function Home() {
//   const t = useTranslations('customer-interaction.Request');
//   const headers = [t('requestNumber'), t('requestTitle'), t('residentName'), t('assignee'), t('dateCreated'), t('priority'), t('status')];
//   let isDetail = true;
    

  
//     return (
//       <div className="min-h-screen bg-gray-50 p-6 flex flex-col">
       
//         <div className="flex-grow min-h-0">
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
//             <div className="lg:col-span-2 space-y-6">
//               <RequestInfoAndContext
//                 value={requestData}
//                 isTicket={true}
//                 contextTitle={t('contextTitle')}
//                 contextContextTitle={t('contextContextTitle')}
//                 contextImageTitle={t('contextImageTitle')}
//               ></RequestInfoAndContext>
//             </div>
//             <div className="lg:col-span-1 space-y-6">
//               <RequestLogUpdate
//                 initialStatusValue={"Processing"}
//                 onSave={() => {
//                     console.log('Saved status:');
//                     console.log('Saved content:');
//                 }}
//                 onCancel={() => {
//                     console.log('Update canceled');
//                 }}
//               ></RequestLogUpdate>
//             </div>
//           </div>
//         </div>
//       </div>
//     )
// };
