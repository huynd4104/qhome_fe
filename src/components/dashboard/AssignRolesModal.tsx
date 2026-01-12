"use client";
import React, { useState, useEffect } from 'react';
import { UserInfoDto, EmployeeRoleDto, AvailableRoleDto } from '@/src/services/iam';

type Props = {
  mode: 'add' | 'edit';
  staff?: UserInfoDto | null;
  employee?: EmployeeRoleDto | null;
  availableRoles: AvailableRoleDto[];
  tenantId: string;
  onAssign: (roleNames: string[]) => Promise<void>;
  onRemove?: (roleNames: string[]) => Promise<void>;
  onClose: () => void;
};

export default function AssignRolesModal({
  mode,
  staff,
  employee,
  availableRoles,
  tenantId,
  onAssign,
  onRemove,
  onClose,
}: Props) {
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [initialRoles, setInitialRoles] = useState<Set<string>>(new Set()); // Track original roles
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize selected roles
  useEffect(() => {
    if (mode === 'edit' && employee) {
      // EDIT mode: pre-select existing tenant roles
      const currentRoles = new Set(
        employee.assignedRoles.map(r => r.roleName.toLowerCase())
      );
      setSelectedRoles(currentRoles);
      setInitialRoles(currentRoles); // Save initial state
    } else if (mode === 'add' && staff) {
      // ADD mode: pre-select global roles of staff
      const globalRoles = new Set(
        (staff.roles || []).map(role => role.toLowerCase())
      );
      setSelectedRoles(globalRoles);
      setInitialRoles(new Set()); // No initial roles for add mode
      
      if (globalRoles.size > 0) {
        console.log('🔄 Auto-selected global roles:', Array.from(globalRoles));
      }
    }
  }, [mode, employee, staff]);

  const handleToggleRole = (roleName: string) => {
    const newSelected = new Set(selectedRoles);
    const lowerRoleName = roleName.toLowerCase();
    
    if (newSelected.has(lowerRoleName)) {
      newSelected.delete(lowerRoleName);
    } else {
      newSelected.add(lowerRoleName);
    }
    
    setSelectedRoles(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedRoles.size === 0) {
      alert('Vui lòng chọn ít nhất 1 role');
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (mode === 'edit') {
        // EDIT MODE: Calculate delta changes
        // 1. Roles to ADD: selected now but NOT in initial state
        const rolesToAdd = Array.from(selectedRoles).filter(role => !initialRoles.has(role));
        
        // 2. Roles to REMOVE: were in initial state but NOT selected now
        const rolesToRemove = Array.from(initialRoles).filter(role => !selectedRoles.has(role));
        
        if (rolesToAdd.length === 0 && rolesToRemove.length === 0) {
          alert('Không có thay đổi nào');
          setIsSubmitting(false);
          return;
        }
        
        console.log('📝 Edit mode - Changes detected:');
        console.log('  ➕ Roles to ADD:', rolesToAdd);
        console.log('  ➖ Roles to REMOVE:', rolesToRemove);
        
        // Execute ADD and REMOVE operations
        const promises: Promise<void>[] = [];
        
        // 1. Add new roles
        if (rolesToAdd.length > 0) {
          console.log('➕ Adding roles:', rolesToAdd);
          promises.push(onAssign(rolesToAdd));
        }
        
        // 2. Remove old roles
        if (rolesToRemove.length > 0 && onRemove) {
          console.log('➖ Removing roles:', rolesToRemove);
          promises.push(onRemove(rolesToRemove));
        }
        
        // Wait for all operations to complete
        if (promises.length > 0) {
          await Promise.all(promises);
          console.log('✅ All role changes applied successfully');
        }
      } else {
        // ADD MODE: Send all selected roles
        const rolesToSend = Array.from(selectedRoles);
        console.log('➕ Add mode - Assigning roles:', rolesToSend);
        await onAssign(rolesToSend);
      }
    } catch (err) {
      console.error('Failed to assign roles:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter roles by search
  const filteredRoles = availableRoles.filter(role =>
    role.roleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group roles by category
  const groupedRoles = filteredRoles.reduce((acc, role) => {
    const category = role.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(role);
    return acc;
  }, {} as Record<string, AvailableRoleDto[]>);

  const displayName = staff?.username || employee?.username || 'User';
  const displayEmail = staff?.email || employee?.email || '';

  // Calculate changes for edit mode
  const rolesToAdd = mode === 'edit' ? Array.from(selectedRoles).filter(role => !initialRoles.has(role)) : [];
  const rolesToRemove = mode === 'edit' ? Array.from(initialRoles).filter(role => !selectedRoles.has(role)) : [];
  const hasChanges = mode === 'edit' ? (rolesToAdd.length > 0 || rolesToRemove.length > 0) : selectedRoles.size > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-[#6B9B6E] text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {mode === 'add' ? '+ Add Staff to Tenant' : '✏️ Edit Employee Roles'}
              </h3>
              <p className="text-sm opacity-90 mt-1">
                {displayName} • {displayEmail}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1.5 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-slate-200">
          <input
            type="text"
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6B9B6E]"
          />
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(85vh-220px)]">
          <div className="mb-4">
            <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-3">
              <span>Selected: {selectedRoles.size} role(s)</span>
              {mode === 'edit' && rolesToAdd.length > 0 && (
                <span className="text-green-600 font-medium text-xs">+{rolesToAdd.length} new</span>
              )}
              {mode === 'edit' && rolesToRemove.length > 0 && (
                <span className="text-red-600 font-medium text-xs">-{rolesToRemove.length} removed</span>
              )}
            </div>
            {selectedRoles.size > 0 && (
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedRoles).map(role => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-[#6B9B6E] text-white rounded-md text-sm uppercase"
                  >
                    {role}
                    <button
                      onClick={() => handleToggleRole(role)}
                      className="hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {Object.entries(groupedRoles).map(([category, roles]) => (
              <div key={category} className="border border-slate-200 rounded-lg p-4">
                <h4 className="font-medium text-slate-700 mb-3">{category}</h4>
                <div className="space-y-2">
                  {roles.map(role => {
                    const lowerRoleName = role.roleName.toLowerCase();
                    const isSelected = selectedRoles.has(lowerRoleName);
                    
                    return (
                      <label
                        key={role.roleName}
                        className={`flex items-start p-3 border rounded-lg cursor-pointer transition ${
                          isSelected
                            ? 'border-[#6B9B6E] bg-green-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRole(role.roleName)}
                          className="mt-1 h-4 w-4 text-[#6B9B6E] border-slate-300 rounded focus:ring-[#6B9B6E]"
                        />
                        <div className="ml-3 flex-1">
                          <div className="font-medium text-slate-800 uppercase">
                            {role.roleName}
                          </div>
                          {role.description && (
                            <div className="text-sm text-slate-500 mt-0.5">
                              {role.description}
                            </div>
                          )}
                          <div className="text-xs text-slate-400 mt-1">
                            🔑 {role.permissionCount} permission(s)
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredRoles.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                Không tìm thấy role nào
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasChanges}
            className="px-4 py-2 bg-[#6B9B6E] text-white rounded-md hover:bg-[#5a8259] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : mode === 'add' ? 'Add to Tenant' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

