"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/src/contexts/AuthContext';
import Topbar from '@/src/components/layout/Topbar';
import Sidebar from '@/src/components/layout/Sidebar';
import axios from '@/src/lib/axios';
import Delete from '@/src/assets/Delete.svg';
import PopupComfirm from '@/src/components/common/PopupComfirm';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';
const IAM_URL = process.env.NEXT_PUBLIC_IAM_URL || 'http://localhost:8088';

interface Employee {
  userId: string;
  username: string;
  email: string;
  roles: string[];
}

interface TenantDeletionTargetsStatus {
  buildings: Record<string, number>;
  units: Record<string, number>;
  totalBuildings: number;
  totalUnits: number;
  buildingsArchived: number;
  unitsInactive: number;
  buildingsReady: boolean;
  unitsReady: boolean;
  employeesCount: number;
  employeesReady: boolean;
  allTargetsReady: boolean;
  requirements: {
    buildings: string;
    units: string;
    employees: string;
  };
}

export default function TenantOwnerEmployeesPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deletionStatus, setDeletionStatus] = useState<TenantDeletionTargetsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [unassigning, setUnassigning] = useState<string | null>(null);
  const [showConfirmUnassignPopup, setShowConfirmUnassignPopup] = useState(false);
  const [showConfirmUnassignAllPopup, setShowConfirmUnassignAllPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [pendingUnassign, setPendingUnassign] = useState<{ userId: string; username: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const employeesResponse = await axios.get<Employee[]>(
        `${IAM_URL}/api/employees`,
        { withCredentials: true }
      );
      setEmployees(employeesResponse.data);

      // Load deletion status
      try {
        const statusResponse = await axios.get<TenantDeletionTargetsStatus>(
          `${BASE_URL}/api/tenant-deletions/my-requests`,
          { withCredentials: true }
        );
        if (statusResponse.data && statusResponse.data.length > 0) {
          // Get the first APPROVED request's status
          const approvedRequest = statusResponse.data.find(r => r.status === 'APPROVED');
          if (approvedRequest) {
            const targetsResponse = await axios.get<TenantDeletionTargetsStatus>(
              `${BASE_URL}/api/tenant-deletions/${approvedRequest.id}/targets-status`,
              { withCredentials: true }
            );
            setDeletionStatus(targetsResponse.data);
          }
        }
      } catch (error) {
        console.log('No active deletion request found');
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignEmployeeClick = (userId: string, username: string) => {
    setPendingUnassign({ userId, username });
    setShowConfirmUnassignPopup(true);
  };

  const handleUnassignEmployee = async () => {
    if (!pendingUnassign) return;

    setShowConfirmUnassignPopup(false);
    try {
      setUnassigning(pendingUnassign.userId);
      // Note: Individual unassign API not available, using remove role instead
      await axios.post(
        `${IAM_URL}/api/employee-roles/remove`,
        { userId: pendingUnassign.userId, tenantId: user?.tenantId, roles: [] }, // Remove all roles
        { withCredentials: true }
      );
      setSuccessMessage(`✅ Đã gỡ bỏ "${pendingUnassign.username}" khỏi tenant!`);
      setShowSuccessPopup(true);
      loadData(); // Reload
    } catch (error: any) {
      console.error('Failed to unassign employee:', error);
      setErrorMessage(`❌ Gỡ bỏ thất bại: ${error?.response?.data?.message || error.message}`);
      setShowErrorPopup(true);
    } finally {
      setUnassigning(null);
      setPendingUnassign(null);
    }
  };

  const handleUnassignAllEmployeesClick = () => {
    if (employees.length === 0) return;
    setShowConfirmUnassignAllPopup(true);
  };

  const handleUnassignAllEmployees = async () => {
    setShowConfirmUnassignAllPopup(false);
    try {
      setUnassigning('all');
      await axios.post(
        `${IAM_URL}/api/employee-roles/${user?.tenantId}/employees/unassign-all`,
        {},
        { withCredentials: true }
      );
      setSuccessMessage(`✅ Đã gỡ bỏ tất cả ${employees.length} nhân viên khỏi tenant!`);
      setShowSuccessPopup(true);
      loadData(); // Reload
    } catch (error: any) {
      console.error('Failed to unassign all employees:', error);
      setErrorMessage(`❌ Gỡ bỏ thất bại: ${error?.response?.data?.message || error.message}`);
      setShowErrorPopup(true);
    } finally {
      setUnassigning(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0]">
        <Topbar />
        <div className="flex">
          <Sidebar variant="tenant-owner" />
          <main className="flex-1 ml-64 p-6">
            <div className="text-center py-12 text-slate-500">⏳ Đang tải...</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="flex">
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">
                👥 Nhân viên trong Tenant
              </h1>
              <p className="text-sm text-slate-600">
                Quản lý nhân viên trong tenant. Cần gỡ bỏ tất cả nhân viên trước khi hoàn tất xóa tenant.
              </p>
            </div>

            {/* Deletion Status Card */}
            {deletionStatus && (
              <div className="bg-white rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">📊 Trạng thái Xóa Tenant</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg border ${deletionStatus.buildingsReady ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" id="Building-5-Fill--Streamline-Mingcute-Fill" height="24" width="24">
                        <g fill="none" fillRule="evenodd">
                          <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
                          <path fill="#1e293b" d="M10 2a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 1.3333333333333333v2.6666666666666665h1.3333333333333333a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 1.3333333333333333v5.333333333333333a0.6666666666666666 0.6666666666666666 0 1 1 0 1.3333333333333333H2a0.6666666666666666 0.6666666666666666 0 1 1 0 -1.3333333333333333V6a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 -1.3333333333333333h1.3333333333333333V3.333333333333333a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 -1.3333333333333333h4ZM4.666666666666666 6H3.333333333333333v6.666666666666666h1.3333333333333333V6Zm8 1.3333333333333333h-1.3333333333333333v5.333333333333333h1.3333333333333333v-5.333333333333333Zm-4 2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333v-1.3333333333333333Zm0 -2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333v-1.3333333333333333Zm0 -2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333V4.666666666666666Z" strokeWidth="0.6667"></path>
                        </g>
                      </svg>
                      <span className="font-medium text-slate-800">Buildings</span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {deletionStatus.buildingsArchived} / {deletionStatus.totalBuildings} đã ARCHIVED
                    </div>
                    <div className={`text-xs font-medium mt-1 ${deletionStatus.buildingsReady ? 'text-green-700' : 'text-amber-700'}`}>
                      {deletionStatus.buildingsReady ? '✅ Hoàn thành' : '⏳ Đang xử lý'}
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg border ${deletionStatus.unitsReady ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🏠</span>
                      <span className="font-medium text-slate-800">Units</span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {deletionStatus.unitsInactive} / {deletionStatus.totalUnits} đã INACTIVE
                    </div>
                    <div className={`text-xs font-medium mt-1 ${deletionStatus.unitsReady ? 'text-green-700' : 'text-amber-700'}`}>
                      {deletionStatus.unitsReady ? '✅ Hoàn thành' : '⏳ Đang xử lý'}
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg border ${deletionStatus.employeesReady ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">👥</span>
                      <span className="font-medium text-slate-800">Employees</span>
                    </div>
                    <div className="text-sm text-slate-600">
                      {deletionStatus.employeesCount} nhân viên còn lại
                    </div>
                    <div className={`text-xs font-medium mt-1 ${deletionStatus.employeesReady ? 'text-green-700' : 'text-red-700'}`}>
                      {deletionStatus.employeesReady ? '✅ Hoàn thành' : '❌ Cần gỡ bỏ'}
                    </div>
                  </div>
                </div>

                {!deletionStatus.allTargetsReady && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-sm text-amber-800">
                      <strong>⚠️ Lưu ý:</strong> Cần hoàn thành tất cả các bước trên trước khi có thể hoàn tất xóa tenant.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Employees List */}
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  👥 Danh sách Nhân viên ({employees.length})
                </h2>
                {employees.length > 0 && (
                  <button
                    onClick={handleUnassignAllEmployeesClick}
                    disabled={unassigning === 'all'}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {unassigning === 'all' ? '⏳ Đang xử lý...' : (
                      <>
                        <Image src={Delete} alt="Delete" width={16} height={16} />
                        Gỡ bỏ tất cả
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {employees.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">✅</div>
                  <div className="text-slate-800 font-medium mb-2">
                    Không có nhân viên nào trong tenant
                  </div>
                  <p className="text-sm text-slate-600">
                    Tất cả nhân viên đã được gỡ bỏ khỏi tenant
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {employees.map((employee) => (
                    <div key={employee.userId} className="p-4 rounded-xl hover:border-red-300 transition bg-white border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-slate-800">
                              {employee.username}
                            </h3>
                            <span className="text-sm text-slate-500">
                              {employee.email}
                            </span>
                          </div>
                          {employee.roles && employee.roles.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {employee.roles.map((role, index) => (
                                <span
                                  key={`${role}-${index}`}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 uppercase"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleUnassignEmployeeClick(employee.userId, employee.username)}
                          disabled={unassigning === employee.userId}
                          className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {unassigning === employee.userId ? '⏳ Đang xử lý...' : (
                            <>
                              <Image src={Delete} alt="Delete" width={16} height={16} />
                              Gỡ bỏ
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Unassign Popup */}
            <PopupComfirm
              isOpen={showConfirmUnassignPopup}
              onClose={() => {
                setShowConfirmUnassignPopup(false);
                setPendingUnassign(null);
              }}
              onConfirm={handleUnassignEmployee}
              popupTitle={pendingUnassign ? `Bạn có chắc muốn gỡ bỏ "${pendingUnassign.username}" khỏi tenant?` : ''}
              popupContext="Họ sẽ không còn quyền truy cập vào tenant này."
              isDanger={true}
            />

            {/* Confirm Unassign All Popup */}
            <PopupComfirm
              isOpen={showConfirmUnassignAllPopup}
              onClose={() => setShowConfirmUnassignAllPopup(false)}
              onConfirm={handleUnassignAllEmployees}
              popupTitle={employees.length > 0 ? `Bạn có chắc muốn gỡ bỏ TẤT CẢ ${employees.length} nhân viên khỏi tenant?` : ''}
              popupContext="Họ sẽ không còn quyền truy cập vào tenant này."
              isDanger={true}
            />

            {/* Success Popup */}
            <PopupComfirm
              isOpen={showSuccessPopup}
              onClose={() => setShowSuccessPopup(false)}
              onConfirm={() => setShowSuccessPopup(false)}
              popupTitle={successMessage}
              popupContext=""
              isDanger={false}
            />

            {/* Error Popup */}
            <PopupComfirm
              isOpen={showErrorPopup}
              onClose={() => setShowErrorPopup(false)}
              onConfirm={() => setShowErrorPopup(false)}
              popupTitle={errorMessage}
              popupContext=""
              isDanger={true}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

