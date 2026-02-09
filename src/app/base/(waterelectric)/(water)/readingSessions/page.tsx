'use client'
import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';
import { getBuildings, Building } from '@/src/services/base/buildingService';
import Select from '@/src/components/customer-interaction/Select';
import {
  startMeterReadingSession,
  completeMeterReadingSession,
  getSessionById,
  getSessionsByAssignment,
  getSessionsByStaff,
  getMySessions,
  getMyActiveSession,
  getCompletedSessionsByStaff,
  MeterReadingSessionDto,
  MeterReadingSessionCreateReq,
  getAssignmentsByCycle,
  MeterReadingAssignmentDto,
  getAllReadingCycles,
  ReadingCycleDto,
} from '@/src/services/base/waterService';
import { useNotifications } from '@/src/hooks/useNotifications';
import PopupComfirm from '@/src/components/common/PopupComfirm';

export default function ReadingSessionsPage() {
  const t = useTranslations('ReadingSessions');
  const { user, hasRole } = useAuth();
  const { show } = useNotifications();
  const [sessions, setSessions] = useState<MeterReadingSessionDto[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<MeterReadingSessionDto[]>([]);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [myActiveSession, setMyActiveSession] = useState<MeterReadingSessionDto | null>(null);
  const [assignments, setAssignments] = useState<MeterReadingAssignmentDto[]>([]);
  const [cycles, setCycles] = useState<ReadingCycleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'my' | 'all' | 'active'>('my');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // Load data on mount
  useEffect(() => {
    loadCycles();
    loadMyActiveSession();
  }, []);

  // Load sessions based on view mode
  useEffect(() => {
    loadSessions();
  }, [viewMode, selectedAssignmentId, selectedStaffId]);

  const loadCycles = async () => {
    try {
      const data = await getAllReadingCycles();
      setCycles(data);
      // Load assignments for active cycles
      const activeCycles = data.filter(c => c.status === 'IN_PROGRESS');
      if (activeCycles.length > 0) {
        const assignmentsData = await getAssignmentsByCycle(activeCycles[0].id);
        setAssignments(assignmentsData);
      }
    } catch (error) {
      console.error('Failed to load cycles:', error);
    }
  };

  const loadMyActiveSession = async () => {
    try {
      const session = await getMyActiveSession();
      setMyActiveSession(session);
    } catch (error) {
      console.error('Failed to load active session:', error);
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      let sessionsData: MeterReadingSessionDto[] = [];

      if (viewMode === 'my') {
        sessionsData = await getMySessions();
      } else if (viewMode === 'active') {
        if (selectedStaffId) {
          // For admin viewing staff active sessions
          sessionsData = []; // API doesn't have this, would need to filter
        } else {
          const active = await getMyActiveSession();
          sessionsData = active ? [active] : [];
        }
      } else if (selectedAssignmentId) {
        sessionsData = await getSessionsByAssignment(selectedAssignmentId);
      } else if (selectedStaffId) {
        sessionsData = await getSessionsByStaff(selectedStaffId);
      } else {
        sessionsData = await getMySessions();
      }

      setSessions(sessionsData);
      setFilteredSessions(sessionsData);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      show(t('errors.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (req: MeterReadingSessionCreateReq) => {
    try {
      await startMeterReadingSession(req);
      show(t('messages.startSuccess'), 'success');
      setIsStartOpen(false);
      loadSessions();
      loadMyActiveSession();
    } catch (error: any) {
      show(error?.message || t('errors.startFailed'), 'error');
    }
  };

  const handleCompleteSessionClick = (sessionId: string) => {
    setPendingSessionId(sessionId);
    setShowCompleteConfirm(true);
  };

  const handleCompleteSession = async () => {
    if (!pendingSessionId) return;
    setShowCompleteConfirm(false);
    const sessionId = pendingSessionId;
    setPendingSessionId(null);

    try {
      await completeMeterReadingSession(sessionId);
      show(t('messages.completeSuccess'), 'success');
      loadSessions();
      loadMyActiveSession();
    } catch (error: any) {
      show(error?.message || t('errors.completeFailed'), 'error');
    }
  };

  return (
    <div className="px-[41px] py-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-[#02542D]">{t('title')}</h1>
        <div className="flex gap-3">
          {!myActiveSession && (
            <button
              onClick={() => setIsStartOpen(true)}
              className="px-4 py-2 bg-[#02542D] text-white rounded-md hover:bg-[#024428] transition-colors"
            >
              {t('buttons.startSession')}
            </button>
          )}
        </div>
      </div>

      {/* Active Session Alert */}
      {myActiveSession && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6">
          <div className="flex justify-between items-center">
            <div>
              <strong>{t('activeSession.label')}</strong> {t('activeSession.startedAt')} {new Date(myActiveSession.startedAt).toLocaleString()}
              ({myActiveSession.unitsRead} {t('activeSession.unitsRead')})
            </div>
            <button
              onClick={() => handleCompleteSessionClick(myActiveSession.id)}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              {t('buttons.completeSession')}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('filters.viewMode')}</label>
            <select
              value={viewMode}
              onChange={(e) => {
                setViewMode(e.target.value as 'my' | 'all' | 'active');
                setSelectedAssignmentId('');
                setSelectedStaffId('');
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559]"
            >
              <option value="my">{t('filters.mySessions')}</option>
              <option value="active">{t('filters.myActive')}</option>
              <option value="all">{t('filters.allSessions')}</option>
            </select>
          </div>
          {viewMode === 'all' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('filters.assignment')}</label>
                <Select
                  options={assignments}
                  value={selectedAssignmentId}
                  onSelect={(a) => {
                    setSelectedAssignmentId(a.id);
                    setSelectedStaffId('');
                  }}
                  renderItem={(a) => `Assignment ${a.id.slice(0, 8)}...`}
                  getValue={(a) => a.id}
                  placeholder={t('filters.selectAssignment')}
                />
              </div>
              {hasRole('admin') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('filters.staff')}</label>
                  <input
                    type="text"
                    value={selectedStaffId}
                    onChange={(e) => {
                      setSelectedStaffId(e.target.value);
                      setSelectedAssignmentId('');
                    }}
                    placeholder={t('filters.enterStaffId')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#739559]"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sessions Table */}
      {filteredSessions.length > 0 && (
        <div className="bg-white p-6 rounded-xl">
          <h2 className="text-xl font-semibold text-[#02542D] mb-4">Sessions ({filteredSessions.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-solid border-[#14AE5C]">
                  <th className="px-4 py-3 text-left text-sm font-bold text-[#024023] uppercase">Session ID</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">Started At</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">Completed At</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">Units Read</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-[#024023] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-[#024023] font-semibold">
                      {session.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-center text-[#024023] font-semibold">
                      {new Date(session.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center text-[#024023] font-semibold">
                      {session.completedAt
                        ? new Date(session.completedAt).toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-[#024023] font-semibold">
                      {session.unitsRead}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${session.isCompleted
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                          }`}
                      >
                        {session.isCompleted ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!session.isCompleted && (
                        <button
                          onClick={() => handleCompleteSessionClick(session.id)}
                          className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredSessions.length === 0 && !loading && (
        <div className="bg-white p-6 rounded-xl text-center text-gray-500">
          No reading sessions found
        </div>
      )}

      {loading && (
        <div className="bg-white p-6 rounded-xl text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#739559] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      )}

      {/* Start Session Modal */}
      {isStartOpen && (
        <StartSessionModal
          isOpen={isStartOpen}
          onClose={() => setIsStartOpen(false)}
          onSubmit={handleStartSession}
          assignments={assignments}
        />
      )}
      {/* Complete Session Confirm Popup */}
      <PopupComfirm
        isOpen={showCompleteConfirm}
        onClose={() => {
          setShowCompleteConfirm(false);
          setPendingSessionId(null);
        }}
        onConfirm={handleCompleteSession}
        popupTitle={t('confirm.completeMessage')}
        popupContext=""
        isDanger={false}
      />
    </div>
  );
}

interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (req: MeterReadingSessionCreateReq) => Promise<void>;
  assignments: MeterReadingAssignmentDto[];
}

function StartSessionModal({ isOpen, onClose, onSubmit, assignments }: StartSessionModalProps) {
  const [assignmentId, setAssignmentId] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setAssignmentId('');
      setDeviceInfo('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSubmit({
        assignmentId,
        deviceInfo: deviceInfo || undefined,
      });
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

        <h2 className="text-2xl font-bold text-[#02542D] mb-6">Start Reading Session</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignment</label>
            <Select
              options={assignments.filter(a => a.status !== 'COMPLETED')}
              value={assignmentId}
              onSelect={(a) => setAssignmentId(a.id)}
              renderItem={(a) => `Assignment - Floor: ${a.floor ?? (a.floorFrom && a.floorTo ? `${a.floorFrom}-${a.floorTo}` : 'N/A')}`}
              getValue={(a) => a.id}
              placeholder="Select assignment"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Device Info (Optional)</label>
            <input
              type="text"
              value={deviceInfo}
              onChange={(e) => setDeviceInfo(e.target.value)}
              placeholder="e.g., Mobile App v1.0"
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
              disabled={loading || !assignmentId}
              className="px-4 py-2 bg-[#739559] text-white rounded-md hover:bg-[#5a7347] disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Session'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

