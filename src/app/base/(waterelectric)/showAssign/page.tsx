'use client'
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  getMyAssignments,
  MeterReadingAssignmentDto,
  getAssignmentProgress,
  completeAssignment
} from '@/src/services/base/waterService';
import {
  fetchMeterReadingReminders,
  MeterReadingReminderDto
} from '@/src/services/base/meterReminderService';
import { useNotifications } from '@/src/hooks/useNotifications';
import PopupComfirm from '@/src/components/common/PopupComfirm';

export default function ShowAssignPage() {
  const t = useTranslations('ShowAssign');
  const router = useRouter();
  const { user } = useAuth();
  const { show } = useNotifications();

  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<MeterReadingAssignmentDto[]>([]);
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());
  const [assignmentProgress, setAssignmentProgress] = useState<Record<string, number>>({}); // assignmentId -> progressPercentage
  const [reminders, setReminders] = useState<MeterReadingReminderDto[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [includeAcknowledged] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [pendingAssignmentId, setPendingAssignmentId] = useState<string | null>(null);

  // Group assignments by cycle
  const assignmentsByCycle = assignments.reduce((acc, assignment) => {
    const cycleId = assignment.cycleId;
    if (!acc[cycleId]) {
      acc[cycleId] = {
        cycleId,
        cycleName: assignment.cycleName,
        periodFrom: assignment.startDate,
        periodTo: assignment.endDate,
        assignments: []
      };
    }
    acc[cycleId].assignments.push(assignment);
    return acc;
  }, {} as Record<string, {
    cycleId: string;
    cycleName: string;
    periodFrom: string;
    periodTo: string;
    assignments: MeterReadingAssignmentDto[];
  }>);

  const cycleList = Object.values(assignmentsByCycle).sort((a, b) => 
    new Date(b.periodFrom).getTime() - new Date(a.periodFrom).getTime()
  );

  useEffect(() => {
    if (user?.userId) {
      loadAssignments();
    }
  }, [user]);

  const loadReminders = React.useCallback(async (includeAll = includeAcknowledged) => {
    try {
      setRemindersLoading(true);
      const data = await fetchMeterReadingReminders(includeAll);
      setReminders(data);
    } catch (error: any) {
      console.error("Failed to load reminders:", error);
      show(error?.response?.data?.message || error?.message || t('errors.loadRemindersFailed'), "error");
    } finally {
      setRemindersLoading(false);
    }
  }, [includeAcknowledged, show]);

  useEffect(() => {
    if (user?.userId) {
      loadReminders();
    }
  }, [user, loadReminders]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const data = await getMyAssignments();
      setAssignments(data);
      
      // Load progress for each assignment
      const progressMap: Record<string, number> = {};
      await Promise.all(
        data.map(async (assignment) => {
          try {
            const progress = await getAssignmentProgress(assignment.id);
            // Calculate progress: readingsDone / totalUnits (same logic as in modal)
            const totalUnits = assignment.unitIds?.length || 0;
            const filledCount = progress.readingsDone || 0;
            const progressPercent = totalUnits > 0 
              ? Math.round((filledCount / totalUnits) * 100) 
              : 0;
            progressMap[assignment.id] = progressPercent;
          } catch (error) {
            console.error(`Failed to load progress for assignment ${assignment.id}:`, error);
            progressMap[assignment.id] = 0;
          }
        })
      );
      setAssignmentProgress(progressMap);
    } catch (error: any) {
      console.error('Failed to load assignments:', error);
      show(error?.response?.data?.message || error?.message || 'Failed to load assignments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleCycle = (cycleId: string) => {
    const newExpanded = new Set(expandedCycles);
    if (newExpanded.has(cycleId)) {
      newExpanded.delete(cycleId);
    } else {
      newExpanded.add(cycleId);
    }
    setExpandedCycles(newExpanded);
  };

  const handleStartReading = (assignmentId: string, isCompleted: boolean) => {
    const url = isCompleted 
      ? `/base/indexReading/${assignmentId}?viewOnly=true`
      : `/base/indexReading/${assignmentId}`;
    router.push(url);
  };

  const handleCompleteAssignmentClick = (assignmentId: string) => {
    setPendingAssignmentId(assignmentId);
    setShowCompleteConfirm(true);
  };

  const handleCompleteAssignment = async () => {
    if (!pendingAssignmentId) return;
    setShowCompleteConfirm(false);
    const assignmentId = pendingAssignmentId;
    setPendingAssignmentId(null);

    try {
      await completeAssignment(assignmentId);
      show('Assignment completed successfully', 'success');
      // Reload assignments to update the UI
      loadAssignments();
    } catch (error: any) {
      show(error?.response?.data?.message || error?.message || 'Failed to complete assignment', 'error');
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString();
  };

  if (loading && assignments.length === 0) {
    return (
      <div className="px-[41px] py-12">
        <div className="bg-white p-6 rounded-xl text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#739559] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-[41px] py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#02542D]">My Assignments</h1>
        <p className="text-sm text-gray-600 mt-1">Select an assignment to start reading meters</p>
      </div>

      <div className="mb-8 bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Reminders</h2>
            <p className="text-sm text-gray-500">System reminders before assignment deadlines</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => loadReminders()}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4">
          {remindersLoading ? (
            <div className="py-6 text-center text-sm text-gray-500">Loading reminders...</div>
          ) : reminders.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              {includeAcknowledged ? 'No reminders yet.' : 'No pending reminders.'}
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800">{reminder.title}</h3>
                      {reminder.cycleName && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          {reminder.cycleName}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{reminder.message}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-2">
                      <span>Due: <strong>{formatDate(reminder.dueDate)}</strong></span>
                      {reminder.acknowledgedAt && (
                        <span>Acknowledged: {formatDate(reminder.acknowledgedAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-2">
                    {reminder.assignmentId && (
                      <button
                        onClick={() => router.push(`/base/indexReading/${reminder.assignmentId}`)}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#739559] rounded-md hover:bg-[#5a7447] transition"
                      >
                        Go to assignment
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {cycleList.length === 0 ? (
        <div className="bg-white p-6 rounded-xl text-center">
          <p className="text-gray-600">No assignments found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cycleList.map((cycle) => {
            const isExpanded = expandedCycles.has(cycle.cycleId);
            return (
              <div key={cycle.cycleId} className="bg-white rounded-xl overflow-hidden">
                {/* Cycle Header */}
                <div
                  onClick={() => toggleCycle(cycle.cycleId)}
                  className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer flex items-center justify-between border-b border-gray-200"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{cycle.cycleName}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(cycle.periodFrom).toLocaleDateString()} - {new Date(cycle.periodTo).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {cycle.assignments.length} assignment(s)
                    </p>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Assignments List */}
                {isExpanded && (
                  <div className="p-4 space-y-3">
                    {cycle.assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-[#739559] transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-gray-800">
                                {assignment.serviceName} ({assignment.serviceCode})
                              </h4>
                              {assignment.floor && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Floor {assignment.floor}
                                </span>
                              )}
                            </div>
                            {assignment.buildingName && (
                              <p className="text-sm text-gray-600 mb-1">
                                Building: {assignment.buildingName} ({assignment.buildingCode})
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              Period: {new Date(assignment.startDate).toLocaleDateString()} - {new Date(assignment.endDate).toLocaleDateString()}
                            </p>
                            {assignment.note && (
                              <p className="text-xs text-gray-500 mt-1 italic">{assignment.note}</p>
                            )}
                          </div>
                          <div className="ml-4 flex gap-2">
                            <button
                              onClick={() => handleStartReading(assignment.id, !!assignment.completedAt)}
                              className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                                assignment.completedAt
                                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                                  : 'bg-[#739559] text-white hover:bg-[#5a7447]'
                              }`}
                            >
                              {assignment.completedAt ? 'Xem chi tiết' : 'Làm'}
                            </button>
                            {!assignment.completedAt && (() => {
                              const progressPercent = assignmentProgress[assignment.id] || 0;
                              const isProgressComplete = progressPercent === 100;
                              return (
                                <button
                                  onClick={() => handleCompleteAssignmentClick(assignment.id)}
                                  disabled={!isProgressComplete}
                                  className={`px-3 py-2 w-10 h-10 rounded-md text-xs font-semibold transition ${
                                    isProgressComplete 
                                      ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer' 
                                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  }`}
                                  title={!isProgressComplete ? 'Complete all meter readings to enable' : 'Mark as completed'}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="File-Check-Fill--Streamline-Mingcute-Fill" height="24" width="24">
                                    <g fill="none" fillRule="evenodd">
                                        <path d="M24 0v24H0V0h24ZM12.593 23.258l-0.011 0.002 -0.071 0.035 -0.02 0.004 -0.014 -0.004 -0.071 -0.035c-0.01 -0.004 -0.019 -0.001 -0.024 0.005l-0.004 0.01 -0.017 0.428 0.005 0.02 0.01 0.013 0.104 0.074 0.015 0.004 0.012 -0.004 0.104 -0.074 0.012 -0.016 0.004 -0.017 -0.017 -0.427c-0.002 -0.01 -0.009 -0.017 -0.017 -0.018Zm0.265 -0.113 -0.013 0.002 -0.185 0.093 -0.01 0.01 -0.003 0.011 0.018 0.43 0.005 0.012 0.008 0.007 0.201 0.093c0.012 0.004 0.023 0 0.029 -0.008l0.004 -0.014 -0.034 -0.614c-0.003 -0.012 -0.01 -0.02 -0.02 -0.022Zm-0.715 0.002a0.023 0.023 0 0 0 -0.027 0.006l-0.006 0.014 -0.034 0.614c0 0.012 0.007 0.02 0.017 0.024l0.015 -0.002 0.201 -0.093 0.01 -0.008 0.004 -0.011 0.017 -0.43 -0.003 -0.012 -0.01 -0.01 -0.184 -0.092Z" strokeWidth="1"></path>
                                        <path fill="currentColor" d="M12 2v6.5a1.5 1.5 0 0 0 1.5 1.5H20v10a2 2 0 0 1 -2 2H6a2 2 0 0 1 -2 -2V4a2 2 0 0 1 2 -2h6Zm1.591 11.657 -2.475 2.475 -0.707 -0.707a1 1 0 0 0 -1.414 1.414l1.343 1.344a1.1 1.1 0 0 0 1.556 0l3.111 -3.112a1 1 0 1 0 -1.414 -1.414ZM14 2.043a2 2 0 0 1 1 0.543L19.414 7a2 2 0 0 1 0.543 1H14V2.043Z" strokeWidth="1"></path>
                                    </g>
                                  </svg>
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Assignment Confirm Popup */}
      <PopupComfirm
        isOpen={showCompleteConfirm}
        onClose={() => {
          setShowCompleteConfirm(false);
          setPendingAssignmentId(null);
        }}
        onConfirm={handleCompleteAssignment}
        popupTitle="Are you sure you want to mark this assignment as completed?"
        popupContext=""
        isDanger={false}
      />
    </div>
  );
}

