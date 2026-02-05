"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { createDeletionRequest, type CreateDeletionReq } from '@/src/services/base';
import Delete from '@/src/assets/Delete.svg';

type Props = {
  tenantId: string;
  tenantName: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function CreateDeletionRequestModal({
  tenantId,
  tenantName,
  onClose,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (reason.trim().length < 10) {
      setError('Lý do phải có ít nhất 10 ký tự');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn gửi yêu cầu xóa tenant "${tenantName}"?`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const data: CreateDeletionReq = {
        tenantId,
        reason: reason.trim(),
      };
      
      await createDeletionRequest(data);
      
      alert('✅ Yêu cầu xóa tenant đã được gửi thành công!\nChờ admin phê duyệt.');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create deletion request:', err);
      setError(err.response?.data?.message || err.message || 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
                <Image src={Delete} alt="Delete" width={20} height={20} />
                Yêu cầu Xóa Tenant
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Tenant: <span className="font-medium">{tenantName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-red-600 hover:text-red-800 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {/* Reason */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Lý do xóa tenant <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do chi tiết (tối thiểu 10 ký tự)..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
              rows={4}
              required
              minLength={10}
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500 mt-1">
              {reason.length}/10 ký tự tối thiểu
            </p>
          </div>

          {/* Warning Box */}
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <h4 className="font-medium text-amber-900 mb-2">Lưu ý quan trọng:</h4>
                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                  <li>Tất cả buildings sẽ chuyển sang trạng thái <strong>PENDING_DELETION</strong></li>
                  <li>Yêu cầu cần <strong>admin phê duyệt</strong></li>
                  <li>Sau khi admin phê duyệt, <strong>không thể hoàn tác</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              ❌ {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isSubmitting || reason.trim().length < 10}
            >
              {isSubmitting ? '⏳ Đang gửi...' : (
                <>
                  <Image src={Delete} alt="Delete" width={16} height={16} />
                  Gửi Yêu Cầu
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

