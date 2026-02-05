import { useState } from 'react';

interface PopupConfirmData {
    popupTitle: string;
    popupContext: string;
}

interface PopupState {
    data: PopupConfirmData;
    resolve: (confirmed: boolean) => void;
}


export const useConfirmPopup = () => {

   const [popupState, setPopupState] = useState<PopupState | null>(null);

    const showConfirm = (data: PopupConfirmData): Promise<boolean> => {
        return new Promise((resolve) => {
            setPopupState({ data, resolve });
        });
    };

    const handleConfirm = () => {
        if (popupState) {
            popupState.resolve(true);
            setPopupState(null);
        }
    };

    const handleCancel = () => {
        if (popupState) {
            popupState.resolve(false);
            setPopupState(null);
        }
    };

    return {
        isPopupOpen: !!popupState,
        popupData: popupState?.data,
        showConfirm,
        handleConfirm,
        handleCancel,
    };
};
