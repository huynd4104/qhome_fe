'use client'
import React, { useEffect, useState } from 'react';
import DateBox from '@/src/components/customer-interaction/DateBox';
import {
  ReadingCycleDto,
  ReadingCycleStatus,
  ReadingCycleCreateReq,
  ReadingCycleUpdateReq,
} from '@/src/services/base/waterService';

interface CycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (req: ReadingCycleCreateReq | ReadingCycleUpdateReq) => Promise<void>;
  mode: 'create' | 'edit';
  initialData?: ReadingCycleDto;
  existingCycles?: ReadingCycleDto[];
}

export default function CycleModal({ isOpen, onClose, onSubmit, mode, initialData, existingCycles = [] }: CycleModalProps) {
  const [name, setName] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState<string>('');
  const [dateErrorFrom, setDateErrorFrom] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');

  // Helper function to convert ISO date to YYYY-MM-DD for DateBox display
  const formatISOToDate = (isoString: string): string => {
    if (!isoString) return '';
    
    // If already in YYYY-MM-DD format, return as is
    if (!isoString.includes('T')) {
      return isoString;
    }
    
    // Extract YYYY-MM-DD from ISO string
    return isoString.split('T')[0];
  };

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setName(initialData.name);
      setPeriodFrom(formatISOToDate(initialData.fromDate || initialData.periodFrom));
      setPeriodTo(formatISOToDate(initialData.toDate || initialData.periodTo));
      setDescription(initialData.description || '');
      setDateError('');
    } else {
      setName('');
      setPeriodFrom('');
      setPeriodTo('');
      setDescription('');
      setDateError('');
    }
  }, [mode, initialData, isOpen]);

  // Validate date range (only for create mode)
  useEffect(() => {
    if (mode === 'create' && periodFrom && periodTo) {
      const fromDate = new Date(periodFrom);
      const toDate = new Date(periodTo);
      if (fromDate > toDate) {
        setDateError('From date cannot be greater than To date');
      } else {
        setDateErrorFrom('');
        setDateError('');
      }
    } else {
        setDateErrorFrom('');
        setDateError('');
        setNameError('');
    }
  }, [periodFrom, periodTo, name, mode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setNameError('');
    setDateErrorFrom('');
    setDateError('');
    
    // Validation flags
    let hasError = false;
    
    // Validate name
    if (!name.trim()) {
      setNameError('Name is required');
      hasError = true;
    } else if (mode === 'create') {
      // Check if name already exists
      const nameExists = existingCycles.some(
        cycle => cycle.name.toLowerCase().trim() === name.toLowerCase().trim()
      );
      if (nameExists) {
        setNameError('Name is taken');
        hasError = true;
      }
    } else if (mode === 'edit' && initialData) {
      // Check if name already exists (excluding current cycle)
      const nameExists = existingCycles.some(
        cycle => cycle.id !== initialData.id && cycle.name.toLowerCase().trim() === name.toLowerCase().trim()
      );
      if (nameExists) {
        setNameError('Name is taken');
        hasError = true;
      }
    }
    
    // Validate from date
    if (!periodFrom) {
      setDateErrorFrom('From date is required');
      hasError = true;
    }
    
    // Validate to date
    if (!periodTo) {
      setDateError('To date is required');
      hasError = true;
    }
    
    // Validate date range for create mode
    if (mode === 'create' && periodFrom && periodTo) {
      const fromDate = new Date(periodFrom);
      const toDate = new Date(periodTo);
      if (fromDate > toDate) {
        setDateError('From date cannot be greater than To date');
        hasError = true;
      }
    }
    
    // Return early if there are any errors
    if (hasError) {
      return;
    }
    
    try {
      setLoading(true);
      if (mode === 'create') {
        await onSubmit({
          name,
          periodFrom,
          periodTo,
          description,
        } as ReadingCycleCreateReq);
      } else {
        await onSubmit({
          name,
          periodFrom,
          periodTo,
          description,
        } as ReadingCycleUpdateReq);
      }
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

        <h2 className="text-2xl font-bold text-[#02542D] mb-6">
          {mode === 'create' ? 'Create Reading Cycle' : 'Edit Reading Cycle'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#02542D] mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559]"
            />
            {nameError && (
              <p className="text-red-500 text-sm mt-1">{nameError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#02542D] mb-1">From Date</label>
            <DateBox
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              placeholderText="Select from date"
            />
            {dateErrorFrom && mode === 'create' && (
              <p className="text-red-500 text-sm mt-1">{dateErrorFrom}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#02542D] mb-1">To Date</label>
            <DateBox
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              placeholderText="Select to date"
            />
            {dateError && mode === 'create' && (
              <p className="text-red-500 text-sm mt-1">{dateError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#02542D] mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559]"
            />
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
              disabled={loading || (mode === 'create' && (!!dateError || !!nameError))}
              className="px-4 py-2 bg-[#739559] text-white rounded-md hover:bg-[#5a7347] disabled:opacity-50"
            >
              {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

