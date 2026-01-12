import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';

interface FeedbackReplyProps {
    onReply: (note: string) => Promise<void>;
    isSubmitting: boolean;
    isUnactive: boolean;
}

const FeedbackReply = ({ 
    onReply, 
    isSubmitting,
    isUnactive
}: FeedbackReplyProps) => {
    const t = useTranslations('customer-interaction.Feedback');
    const { hasRole } = useAuth();

    const [note, setNote] = useState('');
    const [error, setError] = useState<string>('');

    // Check if user has supporter role (only supporter can reply)
    const canReply = hasRole('supporter') || hasRole('SUPPORTER') || hasRole('Supporter');

    if (!canReply) {
        return null; // Don't show anything if not supporter
    }

    if (isUnactive) {
        return (
            <div className="bg-gray-100 p-6 rounded-lg border border-gray-200 text-center text-gray-500 italic">
                <p>{t('formInactiveMessage') || 'Phản hồi này đã được xử lý.'}</p>
            </div>
        );
    }

    const handleReply = async () => {
        setError('');
        
        if (!note.trim()) {
            setError(t('noteRequired') || 'Ghi chú không được để trống');
            return;
        }

        try {
            await onReply(note.trim());
            setNote('');
            setError('');
        } catch (err) {
            console.error('Reply failed:', err);
            setError(t('replyFailed') || 'Không thể gửi phản hồi. Vui lòng thử lại.');
        }
    };

    const handleClear = () => {
        setNote('');
        setError('');
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {t('replyFeedback') || 'Phản hồi phản hồi'}
            </h3>
            
            <div className="mb-4">
                <label htmlFor="feedback-note" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('note') || 'Ghi chú'}
                </label>
                <textarea
                    id="feedback-note"
                    rows={5}
                    value={note}
                    onChange={(e) => {
                        setNote(e.target.value);
                        if (error) {
                            setError('');
                        }
                    }}
                    className={`w-full p-3 border rounded-md focus:outline-none resize-none shadow-inner transition duration-150 ${
                        error 
                            ? 'border-red-500 focus:ring-1 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                    }`}
                    placeholder={t('enterNote') || 'Nhập ghi chú phản hồi...'}
                />
                {error && (
                    <span className="text-red-500 text-xs mt-1 block">{error}</span>
                )}
            </div>

            <div className="flex justify-end space-x-3">
                <button
                    onClick={handleClear}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
                >
                    {t('clear') || 'Xóa'}
                </button>
                <button
                    onClick={handleReply}
                    disabled={isSubmitting || !note.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (t('saving') || 'Đang lưu...') : (t('reply') || 'Phản hồi')}
                </button>
            </div>
        </div>
    );
};

export default FeedbackReply;

