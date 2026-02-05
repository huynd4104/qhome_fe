'use client'
import {useTranslations} from 'next-intl';

interface PopupConfirmProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    popupTitle: string;
    popupContext: string;
    isDanger?: boolean;
};

const PopupConfirm = ({ isOpen, onClose, onConfirm, popupTitle, popupContext, isDanger }: PopupConfirmProps) => {
    const t = useTranslations('Popup');
    if(!isOpen) return null;
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#E7E4E8CC]/80 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 relative border-[#E7E7E7] border-[1px] gap-y-4">
            <h2 className={`text-[20px] font-semibold ${isDanger ? 'text-[#EC221F]': 'text-[#739559]' } `}>{popupTitle}</h2>
            <p className="text-sm text-[#343C6A]">{popupContext}</p>
            <div className='flex flex-row items-center justify-end gap-x-2 mt-4'>
                <button
                    onClick={() => {
                    onConfirm();
                    onClose();
                    }}
                    className={`pt-2 pr-4 pb-2 pl-4 ${isDanger ? 'bg-[#EC221F] hover:bg-[#b81a18]': 'bg-[#739559] hover:bg-[#1A4BBF]' } text-white text-sm rounded-[8px] font-md  transition-colors duration-200`}
                >
                    {t('yes')}
                </button>
                <button
                    onClick={onClose}
                    className="pt-2 pr-4 pb-2 pl-4 bg-white border-[1px] border-[#E7E7E7] text-[#343C6A] text-sm rounded-[8px] font-md hover:bg-[#F5F5F5] transition-colors duration-200"
                >
                    {t('no')}
                </button>
            </div>
          </div>
        </div>
    )
};
export default PopupConfirm;
