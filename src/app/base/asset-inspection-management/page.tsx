'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';
import { useNotifications } from '@/src/hooks/useNotifications';
import { useRouter } from 'next/navigation';
import {
  AssetInspection,
  InspectionStatus,
  getAllInspections,
  getInspectionById,
} from '@/src/services/base/assetInspectionService';

export default function AssetInspectionManagementPage() {
  const t = useTranslations('AssetInspectionManagement');
  const { show } = useNotifications();
  const { hasRole, isLoading } = useAuth();
  const router = useRouter();
  
  // Check user roles - only ADMIN can view
  const isAdmin = hasRole('ADMIN') || hasRole('admin') || hasRole('ROLE_ADMIN') || hasRole('ROLE_admin');
  const canView = isAdmin;
  
  const [inspections, setInspections] = useState<AssetInspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<AssetInspection | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Filters
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
  }, [isLoading, canView]);

  const loadInspections = async () => {
    setLoading(true);
    try {
      // Load all inspections (no userId filter for admin)
      const data = await getAllInspections(undefined, statusFilter || undefined);
      setInspections(data);
    } catch (error: any) {
      show(error?.response?.data?.message || error?.message || 'Không thể tải danh sách kiểm tra', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (inspectionId: string) => {
    try {
      const inspection = await getInspectionById(inspectionId);
      if (inspection) {
        setSelectedInspection(inspection);
        setModalOpen(true);
      }
    } catch (error: any) {
      show(error?.response?.data?.message || error?.message || 'Không thể tải chi tiết kiểm tra', 'error');
    }
  };

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

  // Filter inspections by search query
  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch = !searchQuery || 
      inspection.unitCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.inspectorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (!canView) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý kiểm tra thiết bị</h1>
        <p className="text-gray-600 mt-1">Xem và quản lý tất cả các kiểm tra thiết bị</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm kiếm
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã căn hộ, tên kỹ thuật viên..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as InspectionStatus | '');
                setTimeout(() => loadInspections(), 100);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả</option>
              <option value={InspectionStatus.PENDING}>Chờ xử lý</option>
              <option value={InspectionStatus.IN_PROGRESS}>Đang thực hiện</option>
              <option value={InspectionStatus.COMPLETED}>Đã hoàn thành</option>
              <option value={InspectionStatus.CANCELLED}>Đã hủy</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadInspections}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Đang tải...
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Không có kiểm tra nào
          </div>
        ) : (
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
                    Kỹ thuật viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng chi phí
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hóa đơn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInspections.map((inspection) => (
                  <tr key={inspection.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {inspection.unitCode || inspection.unitId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(inspection.inspectionDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {inspection.inspectorName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(inspection.status)}`}>
                        {getStatusLabel(inspection.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {inspection.totalDamageCost 
                        ? `${inspection.totalDamageCost.toLocaleString('vi-VN')} VNĐ`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {inspection.invoiceId ? (
                        <span className="text-green-600">Đã tạo</span>
                      ) : (
                        <span className="text-gray-400">Chưa có</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(inspection.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {modalOpen && selectedInspection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Chi tiết kiểm tra</h2>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setSelectedInspection(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mã căn hộ</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedInspection.unitCode || selectedInspection.unitId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ngày kiểm tra</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedInspection.inspectionDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kỹ thuật viên</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedInspection.inspectorName || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
                  <p className="mt-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedInspection.status)}`}>
                      {getStatusLabel(selectedInspection.status)}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tổng chi phí thiệt hại</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedInspection.totalDamageCost 
                      ? `${selectedInspection.totalDamageCost.toLocaleString('vi-VN')} VNĐ`
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mã hóa đơn</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedInspection.invoiceId || '-'}</p>
                </div>
              </div>
              
              {selectedInspection.inspectorNotes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ghi chú</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedInspection.inspectorNotes}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Danh sách thiết bị</label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Thiết bị</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tình trạng</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Chi phí</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedInspection.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {item.assetName || item.assetCode || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {item.conditionStatus || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {(item.repairCost || item.damageCost) 
                              ? `${(item.repairCost || item.damageCost || 0).toLocaleString('vi-VN')} VNĐ`
                              : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {item.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setModalOpen(false);
                  setSelectedInspection(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

