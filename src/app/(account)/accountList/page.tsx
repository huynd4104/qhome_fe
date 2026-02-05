'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  fetchResidentAccounts,
  fetchStaffAccounts,
  UserAccountInfo,
  deleteAccount,
  updateStaffAccount,
  updateResidentAccount,
  updateUserProfile,
  fetchStaffAccountDetail,
  fetchResidentAccountDetail,
  exportAccounts,
} from '@/src/services/iam/userService';
import Table from '@/src/components/base-service/Table';
import Pagination from '@/src/components/customer-interaction/Pagination';
import Select from '@/src/components/customer-interaction/Select';
import PopupConfirm from '@/src/components/common/PopupComfirm';
import { useNotifications } from '@/src/hooks/useNotifications';
const PAGE_SIZE = 10;

type SelectOption = {
  id: string;
  label: string;
};

type AccountRow = {
  key: string;
  username: string;
  email: string;
  roles: string;
  active: boolean;
  rolesList: string[];
  buildingId?: string;
  buildingName?: string;
  accountType: 'staff' | 'resident';
};

const toAccountRow = (
  account: UserAccountInfo,
  accountType: 'staff' | 'resident',
): AccountRow => ({
  key: account.userId,
  username: account.username,
  email: account.email,
  roles: account.roles?.join(', ') || '—',
  active: account.active,
  rolesList:
    account.roles?.map((role) => role.trim().toUpperCase()).filter(Boolean) || [],
  buildingId: account.buildingId,
  buildingName: account.buildingName || account.buildingCode,
  accountType,
});

export default function AccountListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('AccountList');
  const [staffAccounts, setStaffAccounts] = useState<AccountRow[]>([]);
  const [residentAccounts, setResidentAccounts] = useState<AccountRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'STAFF' | 'RESIDENT'>('STAFF');
  const [roleFilter, setRoleFilter] = useState<'ALL' | string>('ALL');
  const [buildingFilter, setBuildingFilter] = useState<'ALL' | string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [staffPage, setStaffPage] = useState(1);
  const [residentPage, setResidentPage] = useState(1);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { show } = useNotifications();
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<'staff' | 'resident' | null>(null);
  const [selectedAccountStatus, setSelectedAccountStatus] = useState<boolean | null>(null);
  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const hasShownCreateSuccess = useRef(false);

  const TABLE_HEADERS = [
    t('tableHeaders.username'),
    t('tableHeaders.email'),
    t('tableHeaders.roles'),
    t('tableHeaders.status'),
    t('tableHeaders.action'),
  ];

  useEffect(() => {
    let active = true;

    const loadAccounts = async () => {
      setError(null);
      setLoadingStaff(true);
      setLoadingResidents(true);
      try {
        const [staffRes, residentRes] = await Promise.all([
          fetchStaffAccounts(),
          fetchResidentAccounts(),
        ]);

        if (!active) return;

        setStaffAccounts(staffRes.map((row) => toAccountRow(row, 'staff')));
        setResidentAccounts(residentRes.map((row) => toAccountRow(row, 'resident')));
      } catch (err: any) {
        if (!active) return;
        const message =
          err?.response?.data?.message ||
          err?.message ||
          t('errors.loadFailed');
        setError(message);
      } finally {
        if (active) {
          setLoadingStaff(false);
          setLoadingResidents(false);
        }
      }
    };

    loadAccounts();

    return () => {
      active = false;
    };
  }, []);

  // Check for success message from create/update operations
  useEffect(() => {
    const created = searchParams.get('created');
    if (created === 'true' && !hasShownCreateSuccess.current) {
      hasShownCreateSuccess.current = true;
      show(t('messages.createSuccess'), 'success');
      // Clean up URL by removing query param
      router.replace(window.location.pathname, { scroll: false });
    }
  }, [searchParams, show, t, router]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    staffAccounts.forEach((row) => row.rolesList.forEach((role) => roles.add(role)));
    return Array.from(roles).sort();
  }, [staffAccounts]);

  const uniqueBuildings = useMemo(() => {
    const buildings = new Map<string, string>();
    residentAccounts.forEach((row) => {
      if (row.buildingId) {
        buildings.set(row.buildingId, row.buildingName || row.buildingId);
      } else if (row.buildingName) {
        buildings.set(row.buildingName, row.buildingName);
      }
    });
    return Array.from(buildings.entries()).map(([id, name]) => ({ id, name }));
  }, [residentAccounts]);

  const formatRoleLabel = useMemo(() => {
    return (role: string) => {
      switch (role) {
        case 'ADMIN':
          return t('roles.admin');
        case 'ACCOUNTANT':
          return t('roles.accountant');
        case 'TECHNICIAN':
          return t('roles.technician');
        case 'SUPPORTER':
          return t('roles.supporter');
        case 'RESIDENT':
          return t('roles.resident');
        case 'UNIT OWNER':
          return t('roles.unitOwner');
        default:
          return role
            .toLowerCase()
            .replace(/_/g, ' ')
            .replace(/(^\w|\s\w)/g, (c) => c.toUpperCase());
      }
    };
  }, [t]);

  const roleOptions: SelectOption[] = useMemo(
    () => [
      { id: 'ALL', label: t('filters.allRoles') },
      ...uniqueRoles.map((role) => ({
        id: role,
        label: formatRoleLabel(role),
      })),
    ],
    [uniqueRoles, t, formatRoleLabel],
  );

  const buildingOptions: SelectOption[] = useMemo(
    () => [
      { id: 'ALL', label: t('filters.allBuildings') },
      ...uniqueBuildings.map((building) => ({
        id: building.id,
        label: building.name,
      })),
    ],
    [uniqueBuildings, t],
  );

  const statusOptions: SelectOption[] = useMemo(
    () => [
      { id: 'ALL', label: t('filters.allStatus') },
      { id: 'ACTIVE', label: t('filters.active') },
      { id: 'INACTIVE', label: t('filters.inactive') },
    ],
    [t],
  );

  const filteredStaff = useMemo(() => {
    const keyword = searchTerm.toLowerCase();
    const filtered = staffAccounts.filter((row) => {
      const matchesSearch =
        !keyword ||
        row.username.toLowerCase().includes(keyword) ||
        row.email.toLowerCase().includes(keyword) ||
        row.roles.toLowerCase().includes(keyword);

      const matchesRole =
        roleFilter === 'ALL' || row.rolesList.includes(roleFilter);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' ? row.active : !row.active);

      return matchesSearch && matchesRole && matchesStatus;
    });

    // Sort: active -> inactive, then by role
    return filtered.sort((a, b) => {
      // First sort by status: active (true) comes before inactive (false)
      if (a.active !== b.active) {
        return a.active ? -1 : 1; // active comes first
      }
      // If status is the same, sort by role
      const roleA = a.rolesList[0] || '';
      const roleB = b.rolesList[0] || '';
      return roleA.localeCompare(roleB);
    });
  }, [staffAccounts, searchTerm, roleFilter, statusFilter]);

  const filteredResidents = useMemo(() => {
    const keyword = searchTerm.toLowerCase();
    const filtered = residentAccounts.filter((row) => {
      const matchesSearch =
        !keyword ||
        row.username.toLowerCase().includes(keyword) ||
        row.email.toLowerCase().includes(keyword) ||
        row.roles.toLowerCase().includes(keyword);

      const matchesRole =
        buildingFilter === 'ALL' ||
        row.buildingId === buildingFilter ||
        row.buildingName === buildingFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' ? row.active : !row.active);

      return matchesSearch && matchesRole && matchesStatus;
    });

    // Sort: active -> inactive, then by role
    return filtered.sort((a, b) => {
      // First sort by status: active (true) comes before inactive (false)
      if (a.active !== b.active) {
        return a.active ? -1 : 1; // active comes first
      }
      // If status is the same, sort by role
      const roleA = a.rolesList[0] || '';
      const roleB = b.rolesList[0] || '';
      return roleA.localeCompare(roleB);
    });
  }, [residentAccounts, searchTerm, buildingFilter, statusFilter]);

  useEffect(() => {
    setStaffPage(1);
    setResidentPage(1);
  }, [searchTerm, roleFilter, buildingFilter, statusFilter]);

  useEffect(() => {
    if (activeTab === 'STAFF') {
      setBuildingFilter('ALL');
    } else {
      setRoleFilter('ALL');
    }
  }, [activeTab]);

  const staffTotalPages = Math.max(1, Math.ceil(filteredStaff.length / PAGE_SIZE));
  const residentTotalPages = Math.max(1, Math.ceil(filteredResidents.length / PAGE_SIZE));

  useEffect(() => {
    if (staffPage > staffTotalPages) {
      setStaffPage(staffTotalPages);
    }
  }, [staffPage, staffTotalPages]);

  useEffect(() => {
    if (residentPage > residentTotalPages) {
      setResidentPage(residentTotalPages);
    }
  }, [residentPage, residentTotalPages]);

  const staffRows = useMemo(() => {
    const start = (staffPage - 1) * PAGE_SIZE;
    return filteredStaff.slice(start, start + PAGE_SIZE);
  }, [filteredStaff, staffPage]);

  const residentRows = useMemo(() => {
    const start = (residentPage - 1) * PAGE_SIZE;
    return filteredResidents.slice(start, start + PAGE_SIZE);
  }, [filteredResidents, residentPage]);

  const currentRows = activeTab === 'STAFF' ? staffRows : residentRows;
  const currentLoading = activeTab === 'STAFF' ? loadingStaff : loadingResidents;
  const currentPage = activeTab === 'STAFF' ? staffPage : residentPage;
  const currentTotalPages =
    activeTab === 'STAFF' ? staffTotalPages : residentTotalPages;

  const tableData = currentRows.map((row) => ({
    userId: row.key,
    username: row.username,
    email: row.email,
    roles: row.roles,
    active: row.active,
    accountId: row.key,
    buildingName: row.buildingName,
    accountType: row.accountType,
  }));

  const handlePageChange = (page: number) => {
    if (activeTab === 'STAFF') {
      setStaffPage(page);
    } else {
      setResidentPage(page);
    }
  };

  if (error) {
    return (
      <div className="px-[41px] py-12 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-2 text-white rounded-md hover:bg-primary-3 transition"
          >
            {t('buttons.reload')}
          </button>
        </div>
      </div>
    );
  }

  const handleDelete = (id: string) => {
    setDeleteAccountId(id);
    setDeletePopupOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteAccountId) {
      return;
    }

    try {
      await deleteAccount(deleteAccountId);

      // Close popup first
      setDeletePopupOpen(false);
      setDeleteAccountId(null);

      // Show success notification
      show(t('messages.deleteSuccess'), 'success');

      // Delay reload to ensure notification is visible
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      show(t('messages.deleteError'), 'error');
      console.error('Error deleting account:', error);
    }
  };

  const handleCloseDeletePopup = () => {
    setDeletePopupOpen(false);
    setDeleteAccountId(null);
  };

  const handleStatusChange = (id: string, accountType: 'staff' | 'resident') => {
    // Tìm account để lấy status hiện tại
    const account = accountType === 'staff'
      ? staffAccounts.find(acc => acc.key === id)
      : residentAccounts.find(acc => acc.key === id);

    if (account) {
      setSelectedAccountId(id);
      setSelectedAccountType(accountType);
      setSelectedAccountStatus(account.active);
      setPopupOpen(true);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedAccountId || !selectedAccountType || selectedAccountStatus === null) {
      return;
    }

    try {
      const newStatus = !selectedAccountStatus;
      let accountDetail: UserAccountInfo;

      // Lấy thông tin account hiện tại và update status - dùng chung API cho cả staff và resident
      if (selectedAccountType === 'staff') {
        accountDetail = await fetchStaffAccountDetail(selectedAccountId);
      } else {
        accountDetail = await fetchResidentAccountDetail(selectedAccountId);
      }

      // Dùng chung API updateUserProfile cho cả staff và resident khi chỉ update status
      await updateUserProfile(selectedAccountId, {
        username: accountDetail.username,
        email: accountDetail.email,
        active: newStatus,
      });

      // Close popup first
      setPopupOpen(false);
      setSelectedAccountId(null);
      setSelectedAccountType(null);
      setSelectedAccountStatus(null);

      // Show success notification
      show(
        newStatus ? t('messages.activateSuccess') : t('messages.deactivateSuccess'),
        'success'
      );

      // Delay reload to ensure notification is visible
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('messages.updateStatusError');
      show(message, 'error');
      console.error('Error updating account status:', err);
    }
  };

  const handleClosePopup = () => {
    setPopupOpen(false);
    setSelectedAccountId(null);
    setSelectedAccountType(null);
    setSelectedAccountStatus(null);
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const blob = await exportAccounts();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `accounts_export_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      show(t('messages.exportSuccess'), 'success');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('messages.exportError');
      show(message, 'error');
      console.error('Error exporting accounts:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="lg:col-span-1 space-y-6">
      <div className="max-w-screen overflow-x-hidden">
        <h1 className="text-2xl font-semibold text-[#02542D] mb-4">
          {t('title')}
        </h1>
        <div className="bg-white p-6 rounded-xl w-full min-h-[200px] shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-gray-500">{t('filters.label')}</p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4 md:justify-start md:flex-1">
              <div className="w-full md:w-64">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t('search.placeholder')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              {activeTab === 'STAFF' && (
                <div className="w-full md:w-48">
                  <Select
                    options={roleOptions}
                    value={roleFilter}
                    onSelect={(option) =>
                      setRoleFilter(option.id === 'ALL' ? 'ALL' : option.id.toUpperCase())
                    }
                    renderItem={(option) => option.label}
                    getValue={(option) => option.id}
                    placeholder={t('filters.allRoles')}
                  />
                </div>
              )
              }
              <div className="w-full md:w-48">
                <Select
                  options={statusOptions}
                  value={statusFilter}
                  onSelect={(option) =>
                    setStatusFilter(option.id as 'ALL' | 'ACTIVE' | 'INACTIVE')
                  }
                  renderItem={(option) => option.label}
                  getValue={(option) => option.id}
                  placeholder={t('filters.allStatus')}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>{t('buttons.exporting')}</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>{t('buttons.exportExcel')}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(activeTab === 'STAFF' ? '/accountNewStaff' : '/accountNewRe')
                }
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                {t('buttons.addAccount')}
              </button>
            </div>
          </div>

          <div className="mt-6 flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('STAFF')}
              className={`px-6 py-2 font-medium transition-colors ${activeTab === 'STAFF'
                  ? 'text-[#02542D] border-b-2 border-[#02542D]'
                  : 'text-gray-600 hover:text-[#02542D]'
                }`}
            >
              {t('tabs.staff', { count: filteredStaff.length })}
            </button>
            <button
              onClick={() => setActiveTab('RESIDENT')}
              className={`px-6 py-2 font-medium transition-colors ${activeTab === 'RESIDENT'
                  ? 'text-[#02542D] border-b-2 border-[#02542D]'
                  : 'text-gray-600 hover:text-[#02542D]'
                }`}
            >
              {t('tabs.resident', { count: filteredResidents.length })}
            </button>
          </div>

          {currentLoading ? (
            <div className="px-6 py-10 text-center text-sm text-gray-500">
              {t('loading')}
            </div>
          ) : (
            <>
              <Table
                data={tableData}
                headers={TABLE_HEADERS}
                type="account"
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
              {currentTotalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={currentTotalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </div>
      </div>

      <PopupConfirm
        isOpen={popupOpen}
        onClose={handleClosePopup}
        onConfirm={handleConfirmStatusChange}
        popupTitle={t('popups.statusChange.title')}
        popupContext={
          selectedAccountStatus !== null
            ? selectedAccountStatus ? t('popups.statusChange.deactivate') : t('popups.statusChange.activate')
            : t('popups.statusChange.confirm')
        }
        isDanger={false}
      />

      <PopupConfirm
        isOpen={deletePopupOpen}
        onClose={handleCloseDeletePopup}
        onConfirm={handleConfirmDelete}
        popupTitle={t('popups.delete.title')}
        popupContext={t('popups.delete.context')}
        isDanger={true}
      />
    </div>
  );
}

