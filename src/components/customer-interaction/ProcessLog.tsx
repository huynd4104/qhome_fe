import { useTranslations } from 'next-intl';
import ProcessLogItem from './ProcessLogItem';
import { ProcessLog } from '../../types/processLog';

interface RequestLogTimelineProps {
    logData: ProcessLog[];
    title: string;
}
const RequestLogTimeline = ({ logData, title }: RequestLogTimelineProps) => {
    console.log("logData.length:", logData.length);
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
            <div className="relative">
                {logData.map((entry, index) => (
                    <ProcessLogItem
                        key={index}
                        status={entry.requestStatus}
                        createdDate={entry.createdAt}
                        content={entry.content}
                        isNewest= {index == 0}
                    />
                ))}
            </div>
        </div>
    );
};
export default RequestLogTimeline;
