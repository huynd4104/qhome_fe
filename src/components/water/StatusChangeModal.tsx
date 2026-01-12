'use client'
import React, { useEffect, useState } from 'react';
import { ReadingCycleStatus } from '@/src/services/base/waterService';

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: ReadingCycleStatus;
  cycleId: string;
  onStatusChange: (cycleId: string, status: ReadingCycleStatus) => Promise<void>;
}

export default function StatusChangeModal({ isOpen, onClose, currentStatus, cycleId, onStatusChange }: StatusChangeModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<ReadingCycleStatus>('IN_PROGRESS');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Luôn set thành IN_PROGRESS khi modal mở
    setSelectedStatus('IN_PROGRESS');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStatus === currentStatus) {
      onClose();
      return;
    }
    try {
      setLoading(true);
      await onStatusChange(cycleId, selectedStatus);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#E7E4E8CC]/80 z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" height="16" width="16">
            <g fill="none" fillRule="evenodd">
              <path d="M16 0v16H0V0h16Z"></path>
              <path fill="#000000" d="m8 9.414666666666665 3.535333333333333 3.535333333333333a1 1 0 0 0 1.4146666666666665 -1.4146666666666665L9.413333333333332 8l3.536 -3.535333333333333a1 1 0 1 0 -1.4146666666666665 -1.414L8 6.585999999999999 4.464666666666666 3.0506666666666664a1 1 0 1 0 -1.4146666666666665 1.4133333333333333L6.586666666666667 8l-3.536 3.536a1 1 0 1 0 1.4146666666666665 1.4133333333333333L8 9.415333333333333Z" strokeWidth="0.6667"></path>
            </g>
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-[#02542D] mb-6">Change Status</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#02542D] mb-2">Current Status</label>
            <div className="px-3 py-2 bg-gray-100 rounded-md text-gray-700">
              {currentStatus}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#02542D] mb-2">New Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as ReadingCycleStatus)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559]"
            >
              <option value="IN_PROGRESS">In Progress</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || currentStatus === 'IN_PROGRESS'}
              className="px-4 py-2 bg-[#739559] text-white rounded-md hover:bg-[#5a7347] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


