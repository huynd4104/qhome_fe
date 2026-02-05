import React from 'react';
import {
  MeterReadingAssignmentDto,
  AssignmentProgressDto,
  MeterDto,
} from '@/src/services/base/waterService';

interface AssignmentDetailsModalProps {
  isOpen: boolean;
  assignment: MeterReadingAssignmentDto | null;
  progress: AssignmentProgressDto | null;
  meters: MeterDto[];
  onClose: () => void;
  onComplete?: (assignment: MeterReadingAssignmentDto) => void;
  isCompleting?: boolean;
}

const AssignmentDetailsModal = ({
  isOpen,
  assignment,
  progress,
  meters,
  onClose,
  onComplete,
  isCompleting = false,
}: AssignmentDetailsModalProps) => {
  if (!isOpen || !assignment) return null;

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

        <h2 className="text-2xl font-bold text-[#02542D] mb-6">Assignment Details</h2>

        <div className="space-y-6">
          {/* Assignment Information */}
          <div>
            <h3 className="text-lg font-semibold text-[#02542D] mb-2">Assignment Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Cycle</label>
                <p className="text-[#024023] font-semibold">{assignment.cycleName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Building</label>
                <p className="text-[#024023] font-semibold">
                  {assignment.buildingName || assignment.buildingCode || 'All Buildings'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Service</label>
                <p className="text-[#024023] font-semibold">
                  {assignment.serviceName} ({assignment.serviceCode})
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Assigned To</label>
                <p className="text-[#024023] font-semibold">{assignment.assignedToName || assignment.assignedTo}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Floors</label>
                <p className="text-[#024023] font-semibold">
                  {assignment.floorFrom != null && assignment.floorTo != null
                    ? `Floor ${assignment.floorFrom} - ${assignment.floorTo}`
                    : 'All Floors'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Period</label>
                <p className="text-[#024023] font-semibold">
                  {new Date(assignment.startDate).toLocaleDateString()} -{' '}
                  {new Date(assignment.endDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Assigned At</label>
                <p className="text-[#024023] font-semibold">
                  {new Date(assignment.assignedAt).toLocaleString()}
                </p>
              </div>
              {assignment.completedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Completed At</label>
                  <p className="text-[#024023] font-semibold">
                    {new Date(assignment.completedAt).toLocaleString()}
                  </p>
                </div>
              )}
              {assignment.note && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Note</label>
                  <p className="text-[#024023]">{assignment.note}</p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Section */}
          {progress && assignment && (() => {
            // Calculate progress: filledCount (readingsDone) / totalCount (totalUnits)
            const totalUnits = assignment.unitIds?.length || 0;
            const filledCount = progress.readingsDone || 0;
            const progressPercent = totalUnits > 0 
              ? Math.round((filledCount / totalUnits) * 100) 
              : 0;
            const remaining = totalUnits - filledCount;
            const allDone = totalUnits > 0 && remaining === 0;
            const canComplete = allDone && !assignment.completedAt;
            
            return (
              <div>
                <h3 className="text-lg font-semibold text-[#02542D] mb-2">Progress</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="mb-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">Progress</span>
                      <span className="text-sm font-semibold text-[#024023]">
                        {progressPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-[#739559] h-2.5 rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Total Units</label>
                      <p className="text-xl font-bold text-[#024023]">
                        {totalUnits}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Readings Done</label>
                      <p className="text-xl font-bold text-green-600">{filledCount}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Remaining</label>
                      <p className="text-xl font-bold text-orange-600">
                        {remaining}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Progress: {filledCount} / {totalUnits} readings entered
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-600">
                      {allDone
                        ? 'All units have been read. You can mark the assignment completed.'
                        : 'Complete all meter readings before completing the assignment.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <button
                        onClick={() => canComplete && onComplete?.(assignment)}
                        disabled={!canComplete || isCompleting}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                          canComplete
                            ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        } ${isCompleting ? 'opacity-70 cursor-wait' : ''}`}
                      >
                        {assignment.completedAt
                          ? 'Completed'
                          : isCompleting
                            ? 'Completing...'
                            : 'Mark Completed'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Meters Table */}
          {meters.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-[#02542D] mb-2">Meters in Assignment</h3>
              <div className="overflow-x-auto bg-white border-t-4 border-solid border-[#14AE5C]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-solid border-[#14AE5C]">
                      <th className="px-4 py-3 text-left text-[14px] font-bold text-[#024023] uppercase tracking-wider">
                        Meter Code
                      </th>
                      <th className="px-4 py-3 text-center text-[14px] font-bold text-[#024023] uppercase tracking-wider">
                        Current Index
                      </th>
                      <th className="px-4 py-3 text-center text-[14px] font-bold text-[#024023] uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {meters.map((meter, index) => {
                      const borderClass = index < meters.length - 1 
                        ? 'border-b border-solid border-[#CDCDCD]' 
                        : 'border-b-0';

                      return (
                        <tr key={meter.id} className={`hover:bg-gray-50 transition duration-150 ease-in-out ${borderClass}`}>
                          <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[#024023] font-semibold">
                            {meter.meterCode}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap text-[14px] text-[#024023] font-semibold">
                            {meter.lastReading != null ? meter.lastReading : '-'}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                meter.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {meter.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentDetailsModal;

