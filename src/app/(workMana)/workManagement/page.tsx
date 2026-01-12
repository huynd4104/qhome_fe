'use client';

import React from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useKanbanTasks } from '@/src/hooks/useKanbanTasks';
import KanbanBoard from '@/src/components/workMa/kanban/KanbanBoard';

export default function WorkManagementPage() {
  const { user } = useAuth();
  const {
    tasksByStatus,
    columnsConfig,
    employees,
    isAdmin,
    userRole,
    filter,
    loading,
    error,
    updateTaskStatus,
    assignTask,
    updateFilter,
  } = useKanbanTasks();

  // Show loading if columns config is not loaded yet
  const isLoadingConfig = columnsConfig.length === 0 && !error;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Lỗi: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Tải lại
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingConfig || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-2 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải kanban board...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Quản lý công việc
        </h1>
        <p className="text-gray-600">
          {isAdmin 
            ? 'Xem và phân công công việc cho nhân viên' 
            : 'Quản lý công việc của bạn'}
        </p>
      </div>

      <KanbanBoard
        tasksByStatus={tasksByStatus}
        columnsConfig={columnsConfig}
        employees={employees}
        isAdmin={isAdmin}
        userRole={userRole}
        filter={filter}
        onFilterChange={updateFilter}
        onTaskStatusChange={updateTaskStatus}
        onTaskAssign={assignTask}
        loading={loading}
      />
    </div>
  );
}

