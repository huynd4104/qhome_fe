
import React from 'react';
import ActiveLogIcon from '../../assets/ActiveLog.svg';
import InactiveLogIcon from '../../assets/InactiveLog.svg';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface ProcessLogItemProps {
    status: string;
    createdDate: string;
    content: string;
    isNewest: boolean;
}

const ProcessLogItem = ({ status, createdDate, content, isNewest }: ProcessLogItemProps) => {
    const t = useTranslations('customer-interaction.Request');

    return (
        <div className="flex relative pb-4">
            <div className={`absolute top-0 left-3.5 w-[0.6px] h-full bg-[#D9D9D9]`}></div>

            <div className={`z-10 flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0`}>
                <Image
                src={isNewest ? ActiveLogIcon : InactiveLogIcon}
                alt={isNewest ? "Active" : "Inactive"}
                width={20}
                height={20}
                />
            </div>

            <div className="flex-grow pl-4">
                <p className={`font-semibold text-[#14AE5C]`}>{status}</p>
                <p className="text-sm text-[#024023]">{createdDate}: {content}</p>
            </div>
        </div>
    );
};

export default ProcessLogItem;
