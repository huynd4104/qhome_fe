import React, { useState, useEffect } from 'react';
import Select from './Select';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';
import PopupConfirm from '@/src/components/common/PopupComfirm';
import DateTimeBox from './DateTimeBox';
import { formatCurrency, parseCurrency } from '@/src/utils/formatCurrency';

export interface LogUpdateData {
    requestStatus: string;
    content: string;
    repairCost?: number;
    note?: string;
}

interface RequestStatusAndResponseProps {
    initialStatusValue: string;
    preferredDatetime?: string;
    currentNote?: string;
    initialFee?: number;
    onSave: (data: LogUpdateData) => void;
    onAcceptDeny?: (action: string, adminResponse: string | null, fee: number | null, note: string, preferredDatetime?: string) => Promise<void>;
    onAddProgressNote?: (note: string, cost?: number) => Promise<void>;
    onCompleteRequest?: (note?: string) => Promise<void>;
    unactive: boolean;
    isSubmitting: boolean;
}

const RequestLogUpdate = ({ 
    initialStatusValue, 
    preferredDatetime,
    currentNote,
    initialFee,
    onSave, 
    onAcceptDeny, 
    onAddProgressNote,
    onCompleteRequest,
    unactive, 
    isSubmitting 
}: RequestStatusAndResponseProps) => {
    const t = useTranslations('customer-interaction.Request');
    const { hasRole } = useAuth();

    const [content, setContent] = useState('');
    const [repairCost, setRepairCost] = useState<string>('');
    const [note, setNote] = useState('');
    const [action, setAction] = useState<'accept' | 'deny'>('accept'); // For New status
    const [adminResponse, setAdminResponse] = useState<string>('');
    const [acceptFee, setAcceptFee] = useState<string>('');
    const [denyNote, setDenyNote] = useState('');
    const [selectedDatetime, setSelectedDatetime] = useState<string>('');
    const [isCompletePopupOpen, setIsCompletePopupOpen] = useState(false);
    
    // Error states
    const [errors, setErrors] = useState<{
        adminResponse?: string;
        acceptFee?: string;
        note?: string;
        denyNote?: string;
        datetime?: string;
    }>({});

    const isNewStatus = initialStatusValue === 'New' || initialStatusValue === 'new';
    const isPendingStatus = initialStatusValue === 'Pending' || initialStatusValue === 'pending';
    const isInProgressStatus = initialStatusValue === 'Processing' || initialStatusValue === 'IN_PROGRESS' || initialStatusValue === 'In Progress';

    // Check if user has technician role
    const isTechnician = hasRole('technician') || hasRole('TECHNICIAN');

    // Initialize datetime from preferredDatetime if available
    useEffect(() => {
        if (isNewStatus && preferredDatetime) {
            // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
            const date = new Date(preferredDatetime);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            setSelectedDatetime(`${year}-${month}-${day}T${hours}:${minutes}`);
        }
    }, [isNewStatus, preferredDatetime]);

    // Initialize fee from initialFee if available
    useEffect(() => {
        if (isNewStatus && initialFee !== undefined && initialFee !== null) {
            setAcceptFee(formatCurrency(initialFee));
        }
        if (isInProgressStatus && initialFee !== undefined && initialFee !== null) {
            setRepairCost(formatCurrency(initialFee));
        }
    }, [isNewStatus, isInProgressStatus, initialFee]);

    // If not technician, don't show the form
    if (!isTechnician) {
        return (
            <div className="bg-gray-100 p-6 rounded-lg border border-gray-200 text-center text-gray-500 italic">
                <p>{t('onlyTechnicianCanRespond') || 'Chỉ kỹ thuật viên mới có thể phản hồi yêu cầu này.'}</p>
            </div>
        );
    }

    const handleSave = async () => {
        // For other statuses (not New): require content
        const trimmed = content.trim();
        if (!trimmed) {
            return;
        }
        const data: LogUpdateData = {
            requestStatus: initialStatusValue, // Use initial status instead of selected status
            content: trimmed,
        };
        try {
            await onSave(data);
            handleCancel();
        } catch (error) {
            console.error('Save failed:', error);
        }
    };

    const handleCancel = () => {
        setContent('');
        setRepairCost('');
        setNote('');
        setAcceptFee('');
        setAdminResponse('');
        setDenyNote('');
        setAction('accept');
        setSelectedDatetime('');
        setErrors({});
    };

    // Format datetime for API (convert to ISO string with timezone offset)
    const formatDatetimeForAPI = (datetimeLocal: string): string => {
        if (!datetimeLocal) return '';
        // datetime-local format: YYYY-MM-DDTHH:mm
        // Convert to ISO string with timezone offset (not UTC)
        const date = new Date(datetimeLocal);
        // Get timezone offset in minutes
        const offset = -date.getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(offset) / 60);
        const offsetMinutes = Math.abs(offset) % 60;
        const offsetSign = offset >= 0 ? '+' : '-';
        const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
        
        // Format: YYYY-MM-DDTHH:mm:ss+HH:mm
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetString}`;
    };

    if (unactive) {
        return (
            <div className="bg-gray-100 p-6 rounded-lg border border-gray-200 text-center text-gray-500 italic">
                <p>{t('formInactiveMessage')}</p>
            </div>
        );
    }

    // If status is New and onAcceptDeny is available, show accept/deny form
    if (isNewStatus && onAcceptDeny) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                {/* Toggle/Tab for Accept/Deny */}
                <div className="mb-4 flex gap-2 border-b border-gray-200">
                    <button
                        type="button"
                        onClick={() => setAction('accept')}
                        className={`px-4 py-2 font-semibold transition ${
                            action === 'accept'
                                ? 'text-green-600 border-b-2 border-green-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {t('accept')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setAction('deny')}
                        className={`px-4 py-2 font-semibold transition ${
                            action === 'deny'
                                ? 'text-red-600 border-b-2 border-red-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {t('deny')}
                    </button>
                </div>

                {action === 'accept' ? (
                    <>
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                {t('adminResponse') || 'Mô tả vấn đề hỏng hóc'}
                            </h3>
                            <textarea
                                rows={5}
                                value={adminResponse}
                                onChange={(e) => {
                                    setAdminResponse(e.target.value);
                                    if (errors.adminResponse) {
                                        setErrors(prev => ({ ...prev, adminResponse: undefined }));
                                    }
                                }}
                                className={`w-full p-3 border rounded-md focus:outline-none shadow-inner transition duration-150 ${
                                    errors.adminResponse 
                                        ? 'border-red-500 focus:ring-1 focus:ring-red-500' 
                                        : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                                }`}
                                placeholder={t('adminResponsePlaceholder') || 'Nhập mô tả vấn đề hỏng hóc...'}
                            ></textarea>
                            {errors.adminResponse && (
                                <span className="text-red-500 text-xs mt-1">{errors.adminResponse}</span>
                            )}
                        </div>
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                {t('fee')}
                            </h3>
                            <input
                                type="text"
                                value={acceptFee}
                                onChange={(e) => {
                                    const rawValue = parseCurrency(e.target.value);
                                    // Only allow digits
                                    if (rawValue === '' || /^\d+$/.test(rawValue)) {
                                        setAcceptFee(formatCurrency(rawValue));
                                        if (errors.acceptFee) {
                                            setErrors(prev => ({ ...prev, acceptFee: undefined }));
                                        }
                                    }
                                }}
                                className={`w-full p-3 border rounded-md focus:outline-none shadow-inner transition duration-150 ${
                                    errors.acceptFee 
                                        ? 'border-red-500 focus:ring-1 focus:ring-red-500' 
                                        : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                                }`}
                                placeholder={t('enterFee')}
                            />
                            {errors.acceptFee && (
                                <span className="text-red-500 text-xs mt-1">{errors.acceptFee}</span>
                            )}
                        </div>
                        <div className="mb-4">
                            <label htmlFor="preferred-datetime-input" className="block text-lg font-semibold text-gray-800 mb-2">
                                {t('preferredDatetime') || 'Ngày giờ đề xuất'}
                            </label>
                            <DateTimeBox
                                id="preferred-datetime-input"
                                value={selectedDatetime}
                                onChange={(e) => {
                                    setSelectedDatetime(e.target.value);
                                    if (errors.datetime) {
                                        setErrors(prev => ({ ...prev, datetime: undefined }));
                                    }
                                }}
                                className={`${errors.datetime 
                                    ? 'border-red-500 focus-within:ring-1 focus-within:ring-red-500' 
                                    : 'border-gray-300 focus-within:ring-green-500 focus-within:border-green-500'
                                }`}
                            />
                            {errors.datetime && (
                                <span className="text-red-500 text-xs mt-1">{errors.datetime}</span>
                            )}
                        </div>
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                {t('note')}
                            </h3>
                            <textarea
                                rows={5}
                                value={note}
                                onChange={(e) => {
                                    setNote(e.target.value);
                                    if (errors.note) {
                                        setErrors(prev => ({ ...prev, note: undefined }));
                                    }
                                }}
                                className={`w-full p-3 border rounded-md focus:outline-none resize-none shadow-inner transition duration-150 ${
                                    errors.note 
                                        ? 'border-red-500 focus:ring-1 focus:ring-red-500' 
                                        : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                                }`}
                                placeholder={t('enterNote')}
                            ></textarea>
                            {errors.note && (
                                <span className="text-red-500 text-xs mt-1">{errors.note}</span>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {t('denyReason')}
                        </h3>
                        <textarea
                            rows={5}
                            value={denyNote}
                            onChange={(e) => {
                                setDenyNote(e.target.value);
                                if (errors.denyNote) {
                                    setErrors(prev => ({ ...prev, denyNote: undefined }));
                                }
                            }}
                            className={`w-full p-3 border rounded-md focus:outline-none resize-none shadow-inner transition duration-150 ${
                                errors.denyNote 
                                    ? 'border-red-500 focus:ring-1 focus:ring-red-500' 
                                    : 'border-gray-300 focus:ring-red-500 focus:border-red-500'
                            }`}
                            placeholder={t('enterDenyReason')}
                        ></textarea>
                        {errors.denyNote && (
                            <span className="text-red-500 text-xs mt-1">{errors.denyNote}</span>
                        )}
                    </div>
                )}

                <div className="flex justify-end space-x-3 mt-4">
                    <button
                        onClick={() => {
                            setAction('accept');
                            setAcceptFee('');
                            setAdminResponse('');
                            setNote('');
                            setDenyNote('');
                            setSelectedDatetime(preferredDatetime ? (() => {
                                const date = new Date(preferredDatetime);
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                const hours = String(date.getHours()).padStart(2, '0');
                                const minutes = String(date.getMinutes()).padStart(2, '0');
                                return `${year}-${month}-${day}T${hours}:${minutes}`;
                            })() : '');
                            setErrors({});
                        }}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
                    >
                        {t('clear')}
                    </button>
                    <button
                        onClick={async () => {
                            if (action === 'accept') {
                                // Reset errors
                                setErrors({});
                                
                                // Validate all required fields
                                const newErrors: typeof errors = {};
                                
                                // Validate adminResponse is not empty
                                if (!adminResponse.trim()) {
                                    newErrors.adminResponse = t('adminResponseRequired');
                                }
                                
                                // Validate fee is a valid number and not null
                                if (!acceptFee.trim()) {
                                    newErrors.acceptFee = t('allFieldsRequired');
                                } else {
                                    const rawFee = parseCurrency(acceptFee);
                                    const fee = parseFloat(rawFee);
                                    if (isNaN(fee) || fee < 0) {
                                        newErrors.acceptFee = t('invalidFee');
                                    }
                                }
                                
                                // Validate note is not empty
                                if (!note.trim()) {
                                    newErrors.note = t('noteRequired');
                                }
                                
                                // Validate datetime
                                if (!selectedDatetime.trim()) {
                                    newErrors.datetime = t('preferredDatetimeRequired') || 'Ngày giờ đề xuất không được để trống';
                                } else {
                                    const selectedDate = new Date(selectedDatetime);
                                    const now = new Date();
                                    
                                    // Reset time to compare dates only
                                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                    const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                                    
                                    // Validate date must be >= today
                                    if (selectedDateOnly < today) {
                                        newErrors.datetime = t('dateMustBeTodayOrLater') || 'Ngày phải lớn hơn hoặc bằng ngày hôm nay';
                                    } else {
                                        // Validate time must be between 08:00 and 18:00
                                        const hours = selectedDate.getHours();
                                        const minutes = selectedDate.getMinutes();
                                        const timeInMinutes = hours * 60 + minutes;
                                        const startTime = 8 * 60; // 08:00
                                        const endTime = 18 * 60; // 18:00
                                        
                                        if (timeInMinutes < startTime || timeInMinutes > endTime) {
                                            newErrors.datetime = t('timeMustBeBetween0800And1800') || 'Thời gian phải trong khoảng 08:00 - 18:00';
                                        }
                                    }
                                }
                                
                                // If there are errors, set them and return
                                if (Object.keys(newErrors).length > 0) {
                                    setErrors(newErrors);
                                    return;
                                }
                                
                                // All validations passed
                                const rawFee = parseCurrency(acceptFee);
                                const fee = parseFloat(rawFee);
                                const datetimeForAPI = selectedDatetime ? formatDatetimeForAPI(selectedDatetime) : undefined;
                                try {
                                    await onAcceptDeny('accept', adminResponse.trim(), fee, note.trim(), datetimeForAPI);
                                    setAcceptFee('');
                                    setAdminResponse('');
                                    setNote('');
                                    setSelectedDatetime('');
                                    setErrors({});
                                } catch (error) {
                                    console.error('Accept failed:', error);
                                }
                            } else {
                                // Reset errors
                                setErrors({});
                                
                                // Validate deny note is not empty
                                if (!denyNote.trim()) {
                                    setErrors({ denyNote: t('denyReasonRequired') });
                                    return;
                                }
                                
                                try {
                                    await onAcceptDeny('deny', null, null, denyNote.trim());
                                    setDenyNote('');
                                    setErrors({});
                                } catch (error) {
                                    console.error('Deny failed:', error);
                                }
                            }
                        }}
                        disabled={isSubmitting || (action === 'accept' ? (!adminResponse.trim() || !acceptFee.trim() || !note.trim()) : !denyNote.trim())}
                        className={`px-4 py-2 text-white rounded-lg transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                            action === 'accept'
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        {action === 'accept' ? t('accept') : t('deny')}
                    </button>
                </div>
            </div>
        );
    }

    // If status is Pending, show readonly message
    if (isPendingStatus) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
                    {t('pendingStatusMessage') || 'Yêu cầu đang chờ phản hồi từ cư dân. Không thể chỉnh sửa.'}
                </div>
            </div>
        );
    }

    // If status is In Progress, show progress note form
    if (isInProgressStatus && onAddProgressNote && onCompleteRequest) {
        return (
            <>
                <PopupConfirm
                    isOpen={isCompletePopupOpen}
                    onClose={() => setIsCompletePopupOpen(false)}
                    onConfirm={async () => {
                        // AdminServiceRequestActionDto requires @NotBlank note
                        // So we must always send a non-empty string
                        try {
                            await onCompleteRequest(note.trim() || '');
                            setIsCompletePopupOpen(false);
                            setNote('');
                            setRepairCost('');
                            setErrors({});
                        } catch (error) {
                            console.error('Complete failed:', error);
                        }
                    }}
                    popupTitle={t('confirmComplete') || 'Xác nhận hoàn thành'}
                    popupContext={t('confirmCompleteMessage') || 'Bạn có chắc chắn muốn đánh dấu yêu cầu này là đã hoàn thành?'}
                    isDanger={false}
                />
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        {t('addProgressNote') || 'Thêm ghi chú tiến độ'}
                    </h3>
                    
                    {currentNote && (
                        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                            <p className="text-sm font-medium text-gray-700 mb-2">{t('currentNote') || 'Ghi chú hiện tại:'}</p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{currentNote}</p>
                        </div>
                    )}

                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {t('cost') || 'Chi phí'}
                        </h3>
                        <input
                            type="text"
                            value={repairCost}
                            onChange={(e) => {
                                const rawValue = parseCurrency(e.target.value);
                                // Only allow digits
                                if (rawValue === '' || /^\d+$/.test(rawValue)) {
                                    setRepairCost(formatCurrency(rawValue));
                                    if (errors.acceptFee) {
                                        setErrors(prev => ({ ...prev, acceptFee: undefined }));
                                    }
                                }
                            }}
                            className={`w-full p-3 border rounded-md focus:outline-none shadow-inner transition duration-150 ${
                                errors.acceptFee 
                                    ? 'border-red-500 focus:ring-1 focus:ring-red-500' 
                                    : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                            }`}
                            placeholder={t('enterCost') || 'Nhập chi phí (tùy chọn)'}
                        />
                    </div>

                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {t('newNote') || 'Ghi chú mới'}
                        </h3>
                        <textarea
                            rows={5}
                            value={note}
                            onChange={(e) => {
                                setNote(e.target.value);
                                if (errors.note) {
                                    setErrors(prev => ({ ...prev, note: undefined }));
                                }
                            }}
                            className={`w-full p-3 border rounded-md focus:outline-none resize-none shadow-inner transition duration-150 ${
                                errors.note 
                                    ? 'border-red-500 focus:ring-1 focus:ring-red-500' 
                                    : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                            }`}
                            placeholder={t('enterNewNote') || 'Nhập ghi chú mới (sẽ được thêm vào ghi chú hiện tại)...'}
                        ></textarea>
                        {errors.note && (
                            <span className="text-red-500 text-xs mt-1">{errors.note}</span>
                        )}
                    </div>

                    <div className="flex justify-end space-x-3 mt-4">
                        <button
                            onClick={() => {
                                setNote('');
                                setRepairCost('');
                                setErrors({});
                            }}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
                        >
                            {t('clear')}
                        </button>
                        <button
                            onClick={async () => {
                                setErrors({});
                                
                                if (!note.trim()) {
                                    setErrors({ note: t('noteRequired') || 'Ghi chú không được để trống' });
                                    return;
                                }

                                const rawCost = repairCost.trim() ? parseCurrency(repairCost) : '';
                                const cost = rawCost ? parseFloat(rawCost) : undefined;
                                if (cost !== undefined && (isNaN(cost) || cost < 0)) {
                                    setErrors({ acceptFee: t('invalidFee') || 'Chi phí không hợp lệ' });
                                    return;
                                }

                                try {
                                    await onAddProgressNote(note.trim(), cost);
                                    setNote('');
                                    setRepairCost('');
                                    setErrors({});
                                } catch (error) {
                                    console.error('Add progress note failed:', error);
                                }
                            }}
                            disabled={isSubmitting || !note.trim()}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('save')}
                        </button>
                        <button
                            onClick={() => {
                                // Validate note before opening popup (AdminServiceRequestActionDto requires @NotBlank)
                                if (!note.trim()) {
                                    setErrors({ note: t('noteRequired') || 'Ghi chú không được để trống' });
                                    return;
                                }
                                setIsCompletePopupOpen(true);
                            }}
                            disabled={isSubmitting || !note.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('complete') || 'Xác nhận hoàn thành'}
                        </button>
                    </div>
                </div>
            </>
        );
    }

    // For other statuses, return null or empty
    return null;
};

export default RequestLogUpdate;
