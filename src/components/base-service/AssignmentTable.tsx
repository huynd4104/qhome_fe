import React from 'react';
import { MeterReadingAssignmentDto } from '@/src/services/base/waterService';
import Image from 'next/image';
import Delete from '@/src/assets/Delete.svg';
import Edit from '@/src/assets/Edit.svg';

interface AssignmentTableProps {
  assignments: MeterReadingAssignmentDto[];
  onView: (assignment: MeterReadingAssignmentDto) => void;
  onDelete: (assignmentId: string) => void;
}

const AssignmentTable = ({ assignments, onView, onDelete }: AssignmentTableProps) => {
  return (
    <div className="overflow-x-auto bg-white border-t-4 border-solid border-[#14AE5C]">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-solid border-[#14AE5C]">
            <th className="px-4 py-3 text-left text-[14px] font-bold text-[#024023] uppercase tracking-wider">
              Building
            </th>
            <th className="px-4 py-3 text-left text-[14px] font-bold text-[#024023] uppercase tracking-wider">
              Service
            </th>
            <th className="px-4 py-3 text-center text-[14px] font-bold text-[#024023] uppercase tracking-wider">
              Floors
            </th>
            <th className="px-4 py-3 text-left text-[14px] font-bold text-[#024023] uppercase tracking-wider">
              Assigned To
            </th>
            <th className="px-4 py-3 text-center text-[14px] font-bold text-[#024023] uppercase tracking-wider">
              Period
            </th>
            <th className="px-4 py-3 text-center text-[14px] font-bold text-[#024023] uppercase tracking-wider">
              Created
            </th>
            <th className="px-4 py-3 text-center text-[14px] font-bold text-[#024023] uppercase tracking-wider">
              Completed
            </th>
            <th className="px-4 py-3 text-center text-[14px] font-bold text-[#024023] uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((assignment, index) => {
            const borderClass = index < assignments.length - 1 
              ? 'border-b border-solid border-[#CDCDCD]' 
              : 'border-b-0';

            return (
              <tr 
                key={assignment.id} 
                className={`hover:bg-gray-50 transition duration-150 ease-in-out ${borderClass}`}
              >
                <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[#024023] font-semibold">
                  {assignment.buildingName || assignment.buildingCode || 'All Buildings'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[#024023] font-semibold">
                  {assignment.serviceName || assignment.serviceCode}
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap text-[14px] text-[#024023] font-semibold">
                  {assignment.floorFrom != null && assignment.floorTo != null
                    ? `${assignment.floorFrom}-${assignment.floorTo}`
                    : 'All Floors'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-[14px] text-[#024023] font-semibold">
                  {assignment.assignedToName || assignment.assignedTo}
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap text-[14px] text-[#024023] font-semibold">
                  {new Date(assignment.startDate).toLocaleDateString()} - {new Date(assignment.endDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap text-[14px] text-[#024023] font-semibold">
                  {new Date(assignment.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap text-[14px] text-[#024023] font-semibold">
                  {assignment.completedAt 
                    ? new Date(assignment.completedAt).toLocaleDateString()
                    : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex space-x-2 justify-center">
                    <button
                      onClick={() => onView(assignment)}
                      className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-xs font-semibold transition w-[47px]"
                      title="View assignment details"
                    >
                      <Image 
                        src={Edit}
                        alt="Edit"
                        width={24}
                        height={24}
                      />
                    </button>
                    {/* {!assignment.completedAt && ( */}
                      <button
                        onClick={() => onDelete(assignment.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-xs font-semibold transition w-[47px]"
                      >
                        <Image
                          src={Delete}
                          alt="Delete"
                          width={24}
                          height={24}
                        />
                      </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AssignmentTable;

