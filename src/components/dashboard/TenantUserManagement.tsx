"use client";
import React, { useState, useEffect } from 'react';
import { Tenant } from '@/src/services/base';
import {
  getAvailableStaff,
  getEmployeesInTenant,
  assignRolesToEmployee,
  removeRolesFromEmployee,
  getAvailableRoles,
  UserInfoDto,
  EmployeeRoleDto,
  AvailableRoleDto,
} from '@/src/services/iam';
import { useNotifications } from '@/src/hooks/useNotifications';
import AssignRolesModal from './AssignRolesModal';

type Props = {
  tenant: Tenant;
};

export default function TenantUserManagement({ tenant }: Props) {
  const { show } = useNotifications();
  
  const [availableStaff, setAvailableStaff] = useState<UserInfoDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeRoleDto[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRoleDto[]>([]);
  
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  
  const [selectedStaff, setSelectedStaff] = useState<UserInfoDto | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRoleDto | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [tenant.id]);

  const loadData = async () => {
    await Promise.all([
      loadAvailableStaff(),
      loadEmployees(),
      loadAvailableRoles(),
    ]);
  };

  const loadAvailableStaff = async () => {
    try {
      setLoadingStaff(true);
      const data = await getAvailableStaff();
      console.log('📋 Available staff:', data);
      
      // All staff should have IDs now (mapped from userId)
      const validStaff = data.filter(s => s.id || s.userId);
      if (validStaff.length < data.length) {
        console.warn('⚠️ Some staff missing IDs:', data.filter(s => !s.id && !s.userId));
      }
      
      setAvailableStaff(validStaff);
    } catch (err: any) {
      console.error('❌ Failed to load available staff:', err);
      show(`Lỗi tải danh sách staff: ${err.message}`, 'error');
    } finally {
      setLoadingStaff(false);
    }
  };

  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const data = await getEmployeesInTenant(tenant.id);
      console.log('👥 Employees in tenant:', data);
      setEmployees(data);
    } catch (err: any) {
      console.error('❌ Failed to load employees:', err);
      show(`Lỗi tải danh sách nhân viên: ${err.message}`, 'error');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const loadAvailableRoles = async () => {
    try {
      setLoadingRoles(true);
      const data = await getAvailableRoles(tenant.id);
      console.log('🔑 Available roles:', data);
      setAvailableRoles(data);
    } catch (err: any) {
      console.error('❌ Failed to load roles:', err);
      show(`Lỗi tải roles: ${err.message}`, 'error');
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleAddStaffToTenant = (staff: UserInfoDto) => {
    setSelectedStaff(staff);
    setSelectedEmployee(null);
    setModalMode('add');
    setShowAssignModal(true);
  };

  const handleEditEmployee = (employee: EmployeeRoleDto) => {
    setSelectedEmployee(employee);
    setSelectedStaff(null);
    setModalMode('edit');
    setShowAssignModal(true);
  };

  const handleAssignRoles = async (roleNames: string[]) => {
    try {
      if (modalMode === 'add' && selectedStaff) {
        // Add new staff to tenant (use userId or id)
        const staffId = selectedStaff.userId || selectedStaff.id;
        if (!staffId) {
          throw new Error('Staff ID is missing');
        }
        await assignRolesToEmployee(staffId, tenant.id, roleNames);
        show(`Đã thêm ${selectedStaff.username} vào tenant`, 'success');
      } else if (modalMode === 'edit' && selectedEmployee) {
        // Update existing employee roles (add new roles)
        await assignRolesToEmployee(selectedEmployee.userId, tenant.id, roleNames);
        show(`Đã thêm roles cho ${selectedEmployee.username}`, 'success');
      }
      
      // Reload data
      await loadData();
      setShowAssignModal(false);
    } catch (err: any) {
      show(`Lỗi: ${err.message}`, 'error');
      console.error('Failed to assign roles:', err);
    }
  };

  const handleRemoveRoles = async (roleNames: string[]) => {
    try {
      if (modalMode === 'edit' && selectedEmployee) {
        // Remove roles from employee
        await removeRolesFromEmployee({
          userId: selectedEmployee.userId,
          tenantId: tenant.id,
          roleNames: roleNames,
        });
        show(`Đã xóa ${roleNames.length} role(s) khỏi ${selectedEmployee.username}`, 'success');
        
        // Reload data
        await loadData();
      }
    } catch (err: any) {
      show(`Lỗi: ${err.message}`, 'error');
      console.error('Failed to remove roles:', err);
    }
  };

  const handleRemoveEmployee = async (employee: EmployeeRoleDto) => {
    if (!confirm(`Xóa ${employee.username} khỏi tenant này?\nToàn bộ roles sẽ bị remove.`)) {
      return;
    }

    try {
      // Remove all roles = remove from tenant
      const allRoleNames = employee.assignedRoles.map(r => r.roleName);
      await removeRolesFromEmployee({
        userId: employee.userId,
        tenantId: tenant.id,
        roleNames: allRoleNames,
      });
      
      show(`Đã xóa ${employee.username} khỏi tenant`, 'success');
      await loadData();
    } catch (err: any) {
      show(`Lỗi xóa nhân viên: ${err.message}`, 'error');
    }
  };

  // Filter staff/employees by search query
  const filteredStaff = availableStaff.filter(
    s => s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
         s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEmployees = employees.filter(
    e => e.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
         e.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLoading = loadingStaff || loadingEmployees || loadingRoles;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">
          Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên hoặc email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6B9B6E]"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Available Staff */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            📋 Available Staff ({filteredStaff.length})
          </h3>
          <p className="text-sm text-slate-500 mb-3">
            Staff chưa được assign vào tenant nào
          </p>
          
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredStaff.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                Không có staff available
              </div>
            ) : (
              filteredStaff.map((staff, index) => (
                <div
                  key={staff.id || `staff-${index}`}
                  className="p-4 border border-slate-200 rounded-lg hover:border-[#6B9B6E] hover:bg-green-50 transition"
                  title={staff.email}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">{staff.username}</div>
                      
                      {/* Global Roles */}
                      {staff.roles && staff.roles.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {staff.roles.map((role, roleIndex) => (
                            <span
                              key={`${role}-${roleIndex}`}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 uppercase"
                              title="Global role"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddStaffToTenant(staff)}
                      className="px-3 py-1.5 bg-[#6B9B6E] text-white rounded-md hover:bg-[#5a8259] transition text-sm font-medium ml-2 flex-shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Employees in Tenant */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            👥 Employees in Tenant ({filteredEmployees.length})
          </h3>
          <p className="text-sm text-slate-500 mb-3">
            Nhân viên đang trong tenant này
          </p>
          
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                Chưa có nhân viên nào
              </div>
            ) : (
              filteredEmployees.map((employee, index) => (
                <div
                  key={employee.userId || `employee-${index}`}
                  className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition"
                  title={employee.email}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">{employee.username}</div>
                      {employee.department && (
                        <div className="text-xs text-slate-500 mt-1 truncate">
                          📂 {employee.department}
                          {employee.position && ` • ${employee.position}`}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      <button
                        onClick={() => handleEditEmployee(employee)}
                        className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveEmployee(employee)}
                        className="px-2 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  
                  {/* Roles (Tenant roles only) */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {employee.assignedRoles.map((role, index) => (
                      <span
                        key={`${role.roleName}-${index}`}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#6B9B6E] text-white uppercase"
                        title={`Assigned by ${role.assignedBy} at ${new Date(role.assignedAt).toLocaleString()}`}
                      >
                        {role.roleName}
                      </span>
                    ))}
                    {employee.assignedRoles.length === 0 && (
                      <span className="text-xs text-slate-400 italic">No roles assigned</span>
                    )}
                  </div>
                  
                  {/* Permissions count */}
                  <div className="text-xs text-slate-500 mt-2">
                     {employee.totalPermissions} permission(s)
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Assign Roles Modal */}
      {showAssignModal && (
        <AssignRolesModal
          mode={modalMode}
          staff={selectedStaff}
          employee={selectedEmployee}
          availableRoles={availableRoles}
          tenantId={tenant.id}
          onAssign={handleAssignRoles}
          onRemove={handleRemoveRoles}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
}

