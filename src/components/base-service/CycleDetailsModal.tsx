import React from 'react';
import {
  ReadingCycleDto,
  MeterReadingAssignmentDto,
  type ReadingCycleUnassignedInfoDto,
} from '@/src/services/base/waterService';

interface CycleDetailsModalProps {
  isOpen: boolean;
  cycle: ReadingCycleDto | null;
  assignments: MeterReadingAssignmentDto[];
  unassignedInfo?: ReadingCycleUnassignedInfoDto | null;
  allAssignmentsCompleted: boolean;
  canCompleteCycle: boolean;
  onClose: () => void;
  onExport?: (cycle: ReadingCycleDto) => void;
  isExporting?: boolean;
}

const CycleDetailsModal = ({
  isOpen,
  cycle,
  assignments,
  unassignedInfo,
  allAssignmentsCompleted,
  canCompleteCycle,
  onClose,
  onExport,
  isExporting = false,
}: CycleDetailsModalProps) => {
  if (!isOpen || !cycle) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700';
      case 'OPEN':
        return 'bg-yellow-100 text-yellow-700';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const canExport = cycle.status === 'COMPLETED' || (allAssignmentsCompleted && !(unassignedInfo?.totalUnassigned ?? 0));

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#E7E4E8CC]/80 z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" height="16" width="16">
            <g fill="none" fillRule="evenodd">
              <path d="M16 0v16H0V0h16Z"></path>
              <path
                fill="#000000"
                d="m8 9.414666666666665 3.535333333333333 3.535333333333333a1 1 0 0 0 1.4146666666666665 -1.4146666666666665L9.413333333333332 8l3.536 -3.535333333333333a1 1 0 1 0 -1.4146666666666665 -1.414L8 6.585999999999999 4.464666666666666 3.0506666666666664a1 1 0 1 0 -1.4146666666666665 1.4133333333333333L6.586666666666667 8l-3.536 3.536a1 1 0 1 0 1.4146666666666665 1.4133333333333333L8 9.415333333333333Z"
                strokeWidth="0.6667"
              ></path>
            </g>
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-[#02542D] mb-6">Cycle Details</h2>

        <div className="space-y-6">
          {/* Cycle Information */}
          <div>
            <h3 className="text-lg font-semibold text-[#02542D] mb-2">Cycle Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Cycle Name</label>
                <p className="text-[#024023] font-semibold">{cycle.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <p className="text-[#024023] font-semibold">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(cycle.status)}`}>
                    {cycle.status}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Service</label>
                <p className="text-[#024023] font-semibold">
                  {cycle.serviceName} ({cycle.serviceCode})
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Period</label>
                <p className="text-[#024023] font-semibold">
                  {new Date(cycle.periodFrom).toLocaleDateString()} -{' '}
                  {new Date(cycle.periodTo).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Assignments</label>
                <p className="text-[#024023] font-semibold">
                  {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
                </p>
              </div>
              {cycle.createdAt && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Created At</label>
                  <p className="text-[#024023] font-semibold">
                    {new Date(cycle.createdAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Unassigned Info */}
          {unassignedInfo && unassignedInfo.totalUnassigned > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Unassigned Units</h3>
              <p className="text-sm text-yellow-700 mb-2">
                {unassignedInfo.totalUnassigned} căn hộ chưa được assign.
              </p>
              {unassignedInfo.message && (
                <p className="text-sm text-yellow-700 whitespace-pre-line">{unassignedInfo.message}</p>
              )}
            </div>
          )}

          {/* Assignments Summary */}
          <div>
            <h3 className="text-lg font-semibold text-[#02542D] mb-2">Assignments Summary</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Total Assignments</label>
                  <p className="text-xl font-bold text-[#024023]">{assignments.length}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Completed</label>
                  <p className="text-xl font-bold text-green-600">
                    {assignments.filter((a) => a.completedAt).length}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Pending</label>
                  <p className="text-xl font-bold text-orange-600">
                    {assignments.filter((a) => !a.completedAt).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">
                {canExport
                  ? cycle.status === 'COMPLETED'
                    ? 'Cycle is completed. You can export invoices for this cycle.'
                    : 'All assignments are completed and no unassigned units. You can complete the cycle and export invoices.'
                  : 'Complete all assignments and ensure no unassigned units before exporting invoices.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                {onExport && (
                  <button
                    onClick={() => canExport && onExport(cycle)}
                    disabled={!canExport || isExporting}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                      canExport
                        ? 'bg-[#02542D] text-white hover:bg-[#024428]'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    } ${isExporting ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    {isExporting ? 'Exporting...' : 'Export Invoices'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CycleDetailsModal;




































