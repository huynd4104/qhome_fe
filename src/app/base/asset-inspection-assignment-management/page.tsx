'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';
import { useNotifications } from '@/src/hooks/useNotifications';
import { useRouter } from 'next/navigation';
import {
  AssetInspection,
  InspectionStatus,
  getAllInspections,
  assignInspector,
  type AssignInspectorRequest,
} from '@/src/services/base/assetInspectionService';
import axios from '@/src/lib/axios';

interface Technician {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
}

export default function AssetInspectionAssignmentManagementPage() {
  const t = useTranslations('AssetInspectionAssignmentManagement');
  const { show } = useNotifications();
  const { hasRole, isLoading } = useAuth();
  const router = useRouter();
  
  // Check user roles - only ADMIN can view
  const isAdmin = hasRole('ADMIN') || hasRole('admin') || hasRole('ROLE_ADMIN') || hasRole('ROLE_admin');
  const canView = isAdmin;
  
  const [inspections, setInspections] = useState<AssetInspection[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<InspectionStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isLoading) return;
    
    if (!canView) {
      show('Bạn không có quyền truy cập trang này', 'error');
      router.push('/dashboard');
      return;
    }
    
    loadInspections();
    loadTechnicians();
  }, [isLoading, canView]);

  const loadInspections = async () => {
    setLoading(true);
    try {
      // Load all pending and in-progress inspections
      const allInspections = await getAllInspections();
      setInspections(allInspections);
    } catch (error: any) {
      show(error?.response?.data?.message || error?.message || 'Không thể tải danh sách kiểm tra', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTechnicians = async () => {
    setLoadingTechnicians(true);
    try {
      // Load users with TECHNICIAN role
      const BASE_URL = process.env.NEXT_PUBLIC_IAM_URL || 'http://localhost:8080';
      const response = await axios.get(`${BASE_URL}/api/users/role/TECHNICIAN`);
      setTechnicians(response.data || []);
    } catch (error: any) {
      console.error('Failed to load technicians:', error);
      // Try alternative endpoint or use empty array
      setTechnicians([]);
    } finally {
      setLoadingTechnicians(false);
    }
  };

  const handleAssignInspector = async (inspectionId: string, inspectorId: string, inspectorName: string) => {
    try {
      const request: AssignInspectorRequest = {
        inspectorId,
        inspectorName,
      };
      await assignInspector(inspectionId, request);
      show('Đã phân công kỹ thuật viên thành công', 'success');
      await loadInspections();
    } catch (error: any) {
      show(error?.response?.data?.message || error?.message || 'Không thể phân công kỹ thuật viên', 'error');
    }
  };

  // Filter and sort inspections - show all that need assignment
  const filteredInspections = useMemo(() => {
    let filtered = inspections;

    // Filter by status - default to PENDING and IN_PROGRESS (need assignment)
    if (statusFilter) {
      filtered = filtered.filter(inspection => inspection.status === statusFilter);
    } else {
      // Show PENDING and IN_PROGRESS by default (inspections that need assignment)
      filtered = filtered.filter(inspection => 
        inspection.status === InspectionStatus.PENDING || 
        inspection.status === InspectionStatus.IN_PROGRESS
      );
    }

    // Filter by date
    if (dateFilter) {
      filtered = filtered.filter(inspection => {
        const inspectionDate = new Date(inspection.inspectionDate).toISOString().split('T')[0];
        return inspectionDate === dateFilter;
      });
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inspection =>
        inspection.unitCode?.toLowerCase().includes(query) ||
        inspection.inspectorName?.toLowerCase().includes(query) ||
        inspection.id.toLowerCase().includes(query)
      );
    }

    // Sort by inspectionDate (ascending - earliest first), then by unitCode
    return filtered.sort((a, b) => {
      const dateA = new Date(a.inspectionDate).getTime();
      const dateB = new Date(b.inspectionDate).getTime();
      if (dateA !== dateB) {
        return dateA - dateB; // Earliest date first
      }
      return (a.unitCode || '').localeCompare(b.unitCode || '');
    });
  }, [inspections, dateFilter, statusFilter, searchQuery]);

  const getStatusLabel = (status: InspectionStatus): string => {
    const labels: Record<InspectionStatus, string> = {
      [InspectionStatus.PENDING]: 'Chờ xử lý',
      [InspectionStatus.IN_PROGRESS]: 'Đang thực hiện',
      [InspectionStatus.COMPLETED]: 'Đã hoàn thành',
      [InspectionStatus.CANCELLED]: 'Đã hủy',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: InspectionStatus): string => {
    const colors: Record<InspectionStatus, string> = {
      [InspectionStatus.PENDING]: 'bg-yellow-100 text-yellow-700',
      [InspectionStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700',
      [InspectionStatus.COMPLETED]: 'bg-green-100 text-green-700',
      [InspectionStatus.CANCELLED]: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Quản lý phân công kỹ thuật viên
        </h1>
        <p className="text-gray-600">
          Phân công kỹ thuật viên cho các cuộc kiểm tra thiết bị theo ngày
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lọc theo ngày
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#02542D]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as InspectionStatus | '')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#02542D]"
            >
              <option value="">Tất cả</option>
              <option value={InspectionStatus.PENDING}>Chờ xử lý</option>
              <option value={InspectionStatus.IN_PROGRESS}>Đang thực hiện</option>
              <option value={InspectionStatus.COMPLETED}>Đã hoàn thành</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tìm kiếm
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Mã căn hộ, tên kỹ thuật viên..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#02542D]"
            />
          </div>
        </div>
      </div>

      {/* Inspections table */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Đang tải...</div>
      ) : filteredInspections.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Không có cuộc kiểm tra nào cần phân công
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-900">
              Danh sách căn hộ cần kiểm tra
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredInspections.length} cuộc kiểm tra
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã căn hộ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày kiểm tra
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kỹ thuật viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phân công
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInspections.map((inspection) => (
                  <tr key={inspection.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {inspection.unitCode || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(inspection.inspectionDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(inspection.status)}`}>
                        {getStatusLabel(inspection.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {inspection.inspectorName || (
                        <span className="text-yellow-600 font-medium">Chưa phân công</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {inspection.status !== InspectionStatus.COMPLETED && (
                        <select
                          value={inspection.inspectorId || ''}
                          onChange={(e) => {
                            const selectedTechnician = technicians.find(t => t.id === e.target.value);
                            if (selectedTechnician) {
                              handleAssignInspector(
                                inspection.id,
                                selectedTechnician.id,
                                selectedTechnician.fullName || selectedTechnician.username
                              );
                            }
                          }}
                          className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#02542D]"
                        >
                          <option value="">
                            {inspection.inspectorId ? 'Thay đổi kỹ thuật viên' : 'Chọn kỹ thuật viên'}
                          </option>
                          {technicians.map((technician) => (
                            <option key={technician.id} value={technician.id}>
                              {technician.fullName || technician.username}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

