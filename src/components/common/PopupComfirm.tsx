'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface PopupConfirmProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    popupTitle: string;
    popupContext: string;
    isDanger?: boolean;
}

const PopupConfirm = ({ isOpen, onClose, onConfirm, popupTitle, popupContext, isDanger = false }: PopupConfirmProps) => {
    const t = useTranslations('Popup');
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!shouldRender) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${isVisible ? 'bg-slate-900/40 backdrop-blur-sm opacity-100' : 'bg-transparent opacity-0'
                }`}
            onClick={onClose}
        >
            <div
                className={`w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-2xl transition-all duration-300 ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
                    }`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className={`flex items-center gap-3 ${isDanger ? 'text-red-600' : 'text-emerald-600'}`}>
                        <div className={`p-2 rounded-full ${isDanger ? 'bg-red-50' : 'bg-emerald-50'}`}>
                            {isDanger ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                        </div>
                        <h3 className="text-lg font-bold leading-6 text-slate-900">
                            {popupTitle}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="mt-2">
                    <p className="text-sm text-slate-500 leading-relaxed">
                        {popupContext}
                    </p>
                </div>

                {/* Actions */}
                <div className="mt-8 flex justify-end gap-3">
                    <button
                        type="button"
                        className="inline-flex justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 transition-all"
                        onClick={onClose}
                    >
                        {t('no')}
                    </button>
                    <button
                        type="button"
                        className={`inline-flex justify-center items-center gap-2 rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${isDanger
                                ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 shadow-red-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500 shadow-emerald-200'
                            }`}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {t('yes')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PopupConfirm;
