'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
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
import { getBuildings, Building } from '@/src/services/base/buildingService';
import Pagination from '@/src/components/customer-interaction/Pagination';
import Select from '@/src/components/customer-interaction/Select';
import PopupConfirm from '@/src/components/common/PopupComfirm';
import { useNotifications } from '@/src/hooks/useNotifications';
import {
  ChevronLeft, ChevronRight,
  Search,
  Filter,
  Download,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Building2,
  User,
  Mail,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';

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
  const tTable = useTranslations('Table'); // Need translations from Table for actions/roles
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
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('ALL');
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<'ALL' | number>('ALL');
  const [canScroll, setCanScroll] = useState(false);
  const floorScrollRef = useRef<HTMLDivElement>(null);

  const [sortConfig, setSortConfig] = useState<{ key: keyof AccountRow; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: keyof AccountRow) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  // Hàm kiểm tra xem danh sách có đang bị tràn hay không
  const checkOverflow = useCallback(() => {
    if (floorScrollRef.current) {
      const { scrollWidth, clientWidth } = floorScrollRef.current;
      // Nếu chiều rộng nội dung (scrollWidth) lớn hơn chiều rộng hiển thị (clientWidth)
      setCanScroll(scrollWidth > clientWidth);
    }
  }, []);

  // -- LOGIC PRESERVED FROM ORIGINAL FILE --

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

  useEffect(() => {
    if (activeTab === 'RESIDENT') {
      const loadBuildings = async () => {
        setLoadingBuildings(true);
        try {
          const data = await getBuildings();
          setBuildings(data);
        } catch (err) {
          console.error('Failed to load buildings:', err);
        } finally {
          setLoadingBuildings(false);
        }
      };
      loadBuildings();
    }
  }, [activeTab]);

  const loadResidentsByBuilding = useCallback(async (buildingId: string, floor?: 'ALL' | number) => {
    setLoadingResidents(true);
    try {
      const residentRes = await fetchResidentAccounts(
        buildingId === 'ALL' ? undefined : buildingId,
        floor !== undefined && floor !== 'ALL' ? floor : undefined
      );
      setResidentAccounts(residentRes.map((row) => toAccountRow(row, 'resident')));
    } catch (err) {
      console.error('Error loading residents:', err);
    } finally {
      setLoadingResidents(false);
    }
  }, []);

  const handleBuildingTabClick = (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    setSelectedFloor('ALL');
    loadResidentsByBuilding(buildingId, 'ALL');
    setResidentPage(1);
  };

  const handleFloorTabClick = (floor: 'ALL' | number) => {
    setSelectedFloor(floor);
    loadResidentsByBuilding(selectedBuildingId, floor);
    setResidentPage(1);
  };

  const selectedBuildingFloorsMax = useMemo(() => {
    if (selectedBuildingId === 'ALL') return 0;
    const building = buildings.find((b) => b.id === selectedBuildingId);
    return building?.floorsMax ?? 0;
  }, [selectedBuildingId, buildings]);

  // Kiểm tra lại mỗi khi dữ liệu tòa nhà/tầng thay đổi hoặc khi resize màn hình
  useEffect(() => {
    checkOverflow();

    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [selectedBuildingId, buildings, selectedBuildingFloorsMax, checkOverflow]);

  // Gọi lại checkOverflow sau một khoảng nghỉ ngắn khi tab active thay đổi để đảm bảo DOM đã render xong
  useEffect(() => {
    if (activeTab === 'RESIDENT') {
      const timer = setTimeout(checkOverflow, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, checkOverflow]);

  useEffect(() => {
    const created = searchParams.get('created');
    if (created === 'true' && !hasShownCreateSuccess.current) {
      hasShownCreateSuccess.current = true;
      show(t('messages.createSuccess'), 'success');
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
        case 'ADMIN': return t('roles.admin');
        case 'ACCOUNTANT': return t('roles.accountant');
        case 'TECHNICIAN': return t('roles.technician');
        case 'SUPPORTER': return t('roles.supporter');
        case 'RESIDENT': return t('roles.resident');
        case 'UNIT OWNER': return t('roles.unitOwner');
        default:
          return role
            .toLowerCase()
            .replace(/_/g, ' ')
            .replace(/(^\w|\s\w)/g, (c) => c.toUpperCase());
      }
    };
  }, [t]);

  const roleOptions: SelectOption[] = useMemo(() => [
    { id: 'ALL', label: t('filters.allRoles') },
    ...uniqueRoles.map((role) => ({
      id: role,
      label: formatRoleLabel(role),
    })),
  ], [uniqueRoles, t, formatRoleLabel]);

  const buildingOptions: SelectOption[] = useMemo(() => [
    { id: 'ALL', label: t('filters.allBuildings') },
    ...uniqueBuildings.map((building) => ({
      id: building.id,
      label: building.name,
    })),
  ], [uniqueBuildings, t]);

  const statusOptions: SelectOption[] = useMemo(() => [
    { id: 'ALL', label: t('filters.allStatus') },
    { id: 'ACTIVE', label: t('filters.active') },
    { id: 'INACTIVE', label: t('filters.inactive') },
  ], [t]);

  const filteredStaff = useMemo(() => {
    const keyword = searchTerm.toLowerCase();
    const filtered = staffAccounts.filter((row) => {
      const matchesSearch =
        !keyword ||
        row.username.toLowerCase().includes(keyword) ||
        row.email.toLowerCase().includes(keyword) ||
        row.roles.toLowerCase().includes(keyword);
      const matchesRole = roleFilter === 'ALL' || row.rolesList.includes(roleFilter);
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? row.active : !row.active);
      return matchesSearch && matchesRole && matchesStatus;
    });
    return filtered.sort((a, b) => {
      if (sortConfig) {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null) return sortConfig.direction === 'asc' ? -1 : 1;
        if (bValue === undefined || bValue === null) return sortConfig.direction === 'asc' ? 1 : -1;

        if (aValue === bValue) return 0;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        }

        const aAny = aValue as any;
        const bAny = bValue as any;
        if (aAny < bAny) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aAny > bAny) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }

      // Default sort
      if (a.active !== b.active) return a.active ? -1 : 1;
      const roleA = a.rolesList[0] || '';
      const roleB = b.rolesList[0] || '';
      return roleA.localeCompare(roleB);
    });
  }, [staffAccounts, searchTerm, roleFilter, statusFilter, sortConfig]);

  const filteredResidents = useMemo(() => {
    const keyword = searchTerm.toLowerCase();
    const filtered = residentAccounts.filter((row) => {
      const matchesSearch =
        !keyword ||
        row.username.toLowerCase().includes(keyword) ||
        row.email.toLowerCase().includes(keyword) ||
        row.roles.toLowerCase().includes(keyword);
      const matchesRole = buildingFilter === 'ALL' || row.buildingId === buildingFilter || row.buildingName === buildingFilter;
      const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? row.active : !row.active);
      return matchesSearch && matchesRole && matchesStatus;
    });
    return filtered.sort((a, b) => {
      if (sortConfig) {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || aValue === null) return sortConfig.direction === 'asc' ? -1 : 1;
        if (bValue === undefined || bValue === null) return sortConfig.direction === 'asc' ? 1 : -1;

        // Handle string comparison for Username/Email specifically
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }

      if (a.active !== b.active) return a.active ? -1 : 1;
      const roleA = a.rolesList[0] || '';
      const roleB = b.rolesList[0] || '';
      return roleA.localeCompare(roleB);
    });
  }, [residentAccounts, searchTerm, buildingFilter, statusFilter, sortConfig]);

  useEffect(() => {
    setStaffPage(1);
    setResidentPage(1);
  }, [searchTerm, roleFilter, buildingFilter, statusFilter]);

  useEffect(() => {
    if (activeTab === 'STAFF') {
      setBuildingFilter('ALL');
      setSelectedBuildingId('ALL');
      // Reset resident list to full list when switching to STAFF tab
      loadResidentsByBuilding('ALL', 'ALL');
    } else {
      setRoleFilter('ALL');
    }
  }, [activeTab, loadResidentsByBuilding]);

  const staffTotalPages = Math.max(1, Math.ceil(filteredStaff.length / PAGE_SIZE));
  const residentTotalPages = Math.max(1, Math.ceil(filteredResidents.length / PAGE_SIZE));

  useEffect(() => {
    if (staffPage > staffTotalPages) setStaffPage(staffTotalPages);
  }, [staffPage, staffTotalPages]);

  useEffect(() => {
    if (residentPage > residentTotalPages) setResidentPage(residentTotalPages);
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
  const currentTotalPages = activeTab === 'STAFF' ? staffTotalPages : residentTotalPages;

  const handlePageChange = (page: number) => {
    if (activeTab === 'STAFF') setStaffPage(page);
    else setResidentPage(page);
  };

  const handleReload = () => window.location.reload();

  const handleDelete = (id: string) => {
    setDeleteAccountId(id);
    setDeletePopupOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteAccountId) return;
    try {
      await deleteAccount(deleteAccountId);
      setDeletePopupOpen(false);
      setDeleteAccountId(null);
      show(t('messages.deleteSuccess'), 'success');
      setTimeout(() => window.location.reload(), 1000);
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
    if (!selectedAccountId || !selectedAccountType || selectedAccountStatus === null) return;
    try {
      const newStatus = !selectedAccountStatus;
      let accountDetail: UserAccountInfo;
      if (selectedAccountType === 'staff') {
        accountDetail = await fetchStaffAccountDetail(selectedAccountId);
      } else {
        accountDetail = await fetchResidentAccountDetail(selectedAccountId);
      }
      await updateUserProfile(selectedAccountId, {
        username: accountDetail.username,
        email: accountDetail.email,
        active: newStatus,
      });
      setPopupOpen(false);
      setSelectedAccountId(null);
      setSelectedAccountType(null);
      setSelectedAccountStatus(null);
      show(newStatus ? t('messages.activateSuccess') : t('messages.deactivateSuccess'), 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || t('messages.updateStatusError');
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
      const message = err?.response?.data?.message || err?.message || t('messages.exportError');
      show(message, 'error');
      console.error('Error exporting accounts:', err);
    } finally {
      setExporting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="bg-red-50 p-6 rounded-full">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-slate-800">{t('errors.loadFailed')}</h3>
          <p className="text-slate-500 max-w-sm mx-auto">{error}</p>
        </div>
        <button
          onClick={handleReload}
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium shadow-lg shadow-slate-200"
        >
          <RefreshCw className="w-4 h-4" />
          {t('buttons.reload')}
        </button>
      </div>
    );
  }

  // --- RENDER HELPERS ---

  const renderRoleBadge = (role: string) => {
    const normalized = role.trim().toUpperCase();
    let bg = 'bg-slate-100 text-slate-700';
    let icon = null;

    switch (normalized) {
      case 'ADMIN':
        bg = 'bg-red-50 text-red-700 border border-red-100';
        icon = <ShieldAlert className="w-3 h-3 mr-1" />;
        break;
      case 'ACCOUNTANT':
        bg = 'bg-blue-50 text-blue-700 border border-blue-100';
        icon = <Activity className="w-3 h-3 mr-1" />;
        break;
      case 'TECHNICIAN':
        bg = 'bg-orange-50 text-orange-700 border border-orange-100';
        break;
      case 'SUPPORTER':
        bg = 'bg-purple-50 text-purple-700 border border-purple-100';
        break;
      case 'RESIDENT':
        bg = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
        icon = <User className="w-3 h-3 mr-1" />;
        break;
      case 'UNIT OWNER':
        bg = 'bg-teal-50 text-teal-700 border border-teal-100';
        icon = <Building2 className="w-3 h-3 mr-1" />;
        break;
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${bg}`}>
        {icon}
        {formatRoleLabel(role)}
      </span>
    );
  };

  const renderStatusBadge = (active: boolean) => (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${active
      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
      : 'bg-slate-50 text-slate-500 border-slate-100'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {active ? tTable('status.active') : tTable('status.inactive')}
    </span>
  );

  const getActions = (item: AccountRow) => {
    const roleTokens = (item.roles || '').split(',').map(t => t.trim().toUpperCase());
    const isAdmin = roleTokens.includes('ADMIN');
    const accountType = item.accountType;
    const detailHref = accountType === 'resident'
      ? `/accountDetailRe/${item.key}`
      : isAdmin ? `/accountDetailStaff/${item.key}` : `/accountEditStaff/${item.key}`;
    const canChangeStatus = !isAdmin;
    const canDelete = !(isAdmin && item.active) && !(accountType === 'resident' && item.active);

    return (
      <div className="flex items-center justify-end gap-2">
        {/* Detail/Edit */}
        <button
          onClick={() => router.push(detailHref)}
          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group"
          title={tTable('actions.viewDetail')}
        >
          <Edit className="w-4 h-4" />
        </button>

        {/* Status */}
        {canChangeStatus ? (
          <button
            onClick={() => handleStatusChange(item.key, accountType)}
            className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title={tTable('actions.changeStatus')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        ) : (
          <button disabled className="p-2 text-slate-300 cursor-not-allowed">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Delete */}
        {canDelete ? (
          <button
            onClick={() => handleDelete(item.key)}
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={tTable('actions.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          <button disabled className="p-2 text-slate-300 cursor-not-allowed">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  // Hàm xử lý cuộn
  const scrollFloors = (direction: 'left' | 'right') => {
    if (floorScrollRef.current) {
      const scrollAmount = 200; // Độ dài mỗi lần cuộn (px)
      floorScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth', // Hiệu ứng lướt mượt mà
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {t('title')}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-500" />
            ) : (
              <Download className="w-4 h-4 mr-2 text-slate-500" />
            )}
            {exporting ? t('buttons.exporting') : t('buttons.exportExcel')}
          </button>

          <button
            onClick={() => router.push(activeTab === 'STAFF' ? '/accountNewStaff' : '/accountNewRe')}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-600 hover:to-teal-700 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('buttons.addAccount')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white/50 overflow-hidden">
        {/* Filters Bar */}
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative group w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('search.placeholder')}
                className="h-10 w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 w-full md:w-auto">
              {activeTab === 'STAFF' && (
                <div className="w-48">
                  <Select
                    options={roleOptions}
                    value={roleFilter}
                    onSelect={(op) => setRoleFilter(op.id === 'ALL' ? 'ALL' : op.id.toUpperCase())}
                    renderItem={(op) => op.label}
                    getValue={(op) => op.id}
                    placeholder={t('filters.allRoles')}
                  />
                </div>
              )}
              <div className="w-48">
                <Select
                  options={statusOptions}
                  value={statusFilter}
                  onSelect={(op) => setStatusFilter(op.id as any)}
                  renderItem={(op) => op.label}
                  getValue={(op) => op.id}
                  placeholder={t('filters.allStatus')}
                />
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('STAFF')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'STAFF'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              {t('tabs.staff', { count: staffAccounts.length })}
            </button>
            <button
              onClick={() => setActiveTab('RESIDENT')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'RESIDENT'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              {t('tabs.resident', { count: residentAccounts.length })}
            </button>
          </div>

          {/* Building Sub-tabs */}
          {activeTab === 'RESIDENT' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              {/* Building Sub-tabs */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleBuildingTabClick('ALL')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedBuildingId === 'ALL'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                >
                  {t('filters.allBuildings')}
                </button>
                {buildings.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleBuildingTabClick(b.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedBuildingId === b.id
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    {b.name || b.code}
                  </button>
                ))}
              </div>

              {/* Section: Floor Selection */}
              {selectedBuildingId !== 'ALL' && selectedBuildingFloorsMax > 0 && (
                <div className="mt-2 animate-in slide-in-from-top-1 duration-200">

                  <div className="mx-2 mb-4 border-t border-slate-100/80" />

                  <div className="flex items-start w-full px-1">

                    {/* Icon Trái - Chỉ hiện khi canScroll = true */}
                    {canScroll && (
                      <button
                        type="button"
                        onClick={() => scrollFloors('left')}
                        className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-white border border-emerald-100 text-emerald-600 rounded-full shadow-sm hover:bg-emerald-50 transition-all mt-[5px]"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    )}

                    {/* Danh sách cuộn: mx-3 chỉ kích hoạt khi có icon để tránh khoảng trống thừa */}
                    <div
                      ref={floorScrollRef}
                      className={`
          flex-1 
          ${canScroll ? 'mx-3' : 'mx-0'} 
          flex gap-2 
          overflow-x-auto 
          custom-scrollbar 
          pt-1 
          pb-3
        `}
                    >
                      <button
                        onClick={() => handleFloorTabClick('ALL')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap flex-shrink-0 ${selectedFloor === 'ALL'
                          ? 'bg-teal-50 text-teal-700 border-teal-200 shadow-sm'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        Tất cả các tầng
                      </button>
                      {Array.from({ length: selectedBuildingFloorsMax }, (_, i) => i + 1).map((floor) => (
                        <button
                          key={floor}
                          onClick={() => handleFloorTabClick(floor)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap flex-shrink-0 ${selectedFloor === floor
                            ? 'bg-teal-50 text-teal-700 border-teal-200 shadow-sm'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                          Tầng {floor}
                        </button>
                      ))}
                    </div>

                    {/* Icon Phải - Chỉ hiện khi canScroll = true */}
                    {canScroll && (
                      <button
                        type="button"
                        onClick={() => scrollFloors('right')}
                        className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-white border border-emerald-100 text-emerald-600 rounded-full shadow-sm hover:bg-emerald-50 transition-all mt-[5px]"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Loading State */}
        {currentLoading ? (
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-sm text-slate-500 font-medium">{t('loading')}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th
                      onClick={() => handleSort('username')}
                      className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                    >
                      <div className="flex items-center gap-1">
                        {t('tableHeaders.username')}
                        {sortConfig?.key === 'username' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                        ) : <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-slate-400" />}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('email')}
                      className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                    >
                      <div className="flex items-center gap-1">
                        {t('tableHeaders.email')}
                        {sortConfig?.key === 'email' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                        ) : <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-slate-400" />}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {t('tableHeaders.roles')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {t('tableHeaders.status')}
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {t('tableHeaders.action')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-3">
                          <div className="bg-slate-100 p-4 rounded-full">
                            <Search className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-sm font-medium">{tTable('noData')}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentRows.map((item) => (
                      <tr key={item.key} className="group hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 flex items-center justify-center font-bold text-xs mr-3">
                              {item.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700 transition-colors">
                              {item.username}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {item.email}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center flex-wrap gap-1.5">
                            {item.rolesList.map((role, idx) => (
                              <div key={idx}>{renderRoleBadge(role)}</div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {renderStatusBadge(item.active)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {getActions(item)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-4 bg-slate-50/50">
              {currentRows.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p>{tTable('noData')}</p>
                </div>
              ) : (
                currentRows.map((item) => (
                  <div key={item.key} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 flex items-center justify-center font-bold">
                          {item.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800">{item.username}</h3>
                          <p className="text-xs text-slate-500">{item.email}</p>
                        </div>
                      </div>
                      {renderStatusBadge(item.active)}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.rolesList.map((role, idx) => (
                        <div key={idx}>{renderRoleBadge(role)}</div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                      {getActions(item)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {currentTotalPages > 1 && (
              <div className="p-4 border-t border-slate-100 bg-white">
                <Pagination
                  currentPage={currentPage}
                  totalPages={currentTotalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
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
