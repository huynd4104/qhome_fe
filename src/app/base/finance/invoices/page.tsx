'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getAllInvoicesForAdmin, InvoiceDto, InvoiceLineDto } from '@/src/services/finance/invoiceAdminService';
import { useNotifications } from '@/src/hooks/useNotifications';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import axios from '@/src/lib/axios';

// Options will be created inside component with translations

export default function InvoicesManagementPage() {
  const t = useTranslations('Invoices');
  const { show } = useNotifications();
  const { hasRole, user, isLoading } = useAuth();
  const router = useRouter();
  
  // Check user roles - ADMIN and ACCOUNTANT can view
  // Check multiple possible role formats
  const isAdmin = hasRole('ADMIN') || hasRole('admin') || hasRole('ROLE_ADMIN') || hasRole('ROLE_admin');
  const isAccountant = hasRole('ACCOUNTANT') || hasRole('accountant') || hasRole('ROLE_ACCOUNTANT') || hasRole('ROLE_accountant');
  const canView = isAdmin || isAccountant;
  const canEdit = isAdmin || isAccountant; // ADMIN and ACCOUNTANT can edit/create/delete
  const canExport = isAdmin || isAccountant; // ADMIN and ACCOUNTANT can export Excel
  
  const SERVICE_CODE_OPTIONS = [
    { value: '', label: t('filters.allServices') },
    { value: 'ELECTRICITY', label: t('services.electricity') },
    { value: 'WATER', label: t('services.water') },
    { value: 'MAINTENANCE', label: t('services.maintenance') },
    { value: 'VEHICLE_CARD', label: t('services.vehicleCard') },
    { value: 'ELEVATOR_CARD', label: t('services.elevatorCard') },
    { value: 'RESIDENT_CARD', label: t('services.residentCard') },
  ];

  const STATUS_OPTIONS = [
    { value: '', label: t('filters.allStatuses') },
    { value: 'DRAFT', label: t('statuses.draft') },
    { value: 'PUBLISHED', label: t('statuses.published') },
    { value: 'PAID', label: t('statuses.paid') },
    { value: 'VOID', label: t('statuses.void') },
    { value: 'UNPAID', label: t('statuses.unpaid') },
  ];

  const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    DRAFT: { label: t('statuses.draft'), className: 'bg-gray-100 text-gray-700' },
    PUBLISHED: { label: t('statuses.published'), className: 'bg-yellow-100 text-yellow-700' },
    PAID: { label: t('statuses.paid'), className: 'bg-green-100 text-green-700' },
    VOID: { label: t('statuses.void'), className: 'bg-red-100 text-red-700' },
    UNPAID: { label: t('statuses.unpaid'), className: 'bg-orange-100 text-orange-700' },
  };

  const SERVICE_CODE_LABELS: Record<string, string> = {
    ELECTRICITY: t('services.electricity'),
    ELECTRIC: t('services.electricity'), // Alternative service code
    WATER: t('services.water'),
    MAINTENANCE: t('services.maintenance'),
    VEHICLE_CARD: t('services.vehicleCard'),
    ELEVATOR_CARD: t('services.elevatorCard'),
    RESIDENT_CARD: t('services.residentCard'),
    ASSET_DAMAGE: 'Thiệt hại thiết bị',
  };
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);
  
  // Filters
  const [serviceCodeFilter, setServiceCodeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate month options (last 12 months + current month)
  const monthOptions = useMemo(() => {
    const options = [{ value: '', label: t('filters.allMonths') }];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      options.push({ value, label: month });
    }
    return options;
  }, []);

  useEffect(() => {
    // Wait for user to load before checking permissions
    if (isLoading) {
      return;
    }
    
    // Debug: log user roles to help diagnose permission issues
    if (user) {
      console.log('User roles:', user.roles);
      console.log('isAccountant:', isAccountant, 'canView:', canView);
    }
    
    // Check if user has permission to view
    if (!canView) {
      show('Bạn không có quyền truy cập trang này', 'error');
      router.push('/');
      return;
    }
    loadInvoices();
  }, [serviceCodeFilter, statusFilter, monthFilter, canView, show, router, isLoading, user, isAdmin, isAccountant]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (serviceCodeFilter) params.serviceCode = serviceCodeFilter;
      if (statusFilter) params.status = statusFilter;
      
      // Convert month filter (YYYY-MM) to startDate and endDate
      if (monthFilter) {
        const [year, month] = monthFilter.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month
        params.startDate = startDate.toISOString().split('T')[0];
        params.endDate = endDate.toISOString().split('T')[0];
      }
      
      const data = await getAllInvoicesForAdmin(params);
      setInvoices(data);
    } catch (error: any) {
      console.error('Failed to load invoices:', error);
      show(t('errors.loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    // First, deduplicate invoices by ID to avoid showing the same invoice multiple times
    const uniqueInvoicesMap = new Map<string, InvoiceDto>();
    invoices.forEach(invoice => {
      if (!uniqueInvoicesMap.has(invoice.id)) {
        uniqueInvoicesMap.set(invoice.id, invoice);
      }
    });
    let filtered = Array.from(uniqueInvoicesMap.values());
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(invoice => 
        invoice.code?.toLowerCase().includes(query) ||
        invoice.billToName?.toLowerCase().includes(query) ||
        invoice.billToAddress?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [invoices, searchQuery]);

  const statistics = useMemo(() => {
    const stats = {
      total: 0, // Will be calculated after filtering
      totalAmount: 0,
      byStatus: {
        DRAFT: { count: 0, amount: 0 },
        PUBLISHED: { count: 0, amount: 0 },
        PAID: { count: 0, amount: 0 },
        VOID: { count: 0, amount: 0 },
        UNPAID: { count: 0, amount: 0 },
      },
      byService: {} as Record<string, { count: number; amount: number }>,
    };

    // Find invoices that have ASSET_DAMAGE and include water/electric lines
    // These are main invoices from asset inspection that already include water/electric costs
    const mainInspectionInvoices = new Set<string>();
    filteredInvoices.forEach(invoice => {
      const hasAssetDamage = invoice.lines?.some(line => line.serviceCode === 'ASSET_DAMAGE') || false;
      const hasWaterElectric = invoice.lines?.some(line => 
        line.serviceCode === 'WATER' || line.serviceCode === 'ELECTRIC'
      ) || false;
      
      if (hasAssetDamage && hasWaterElectric) {
        // This is a main invoice that includes water/electric
        // Find the water/electric invoice IDs that are referenced in this invoice
        invoice.lines?.forEach(line => {
          if (line.externalRefType === 'WATER_ELECTRIC_INVOICE' && line.externalRefId) {
            mainInspectionInvoices.add(line.externalRefId);
          }
        });
      }
    });

    filteredInvoices.forEach(invoice => {
      // Skip water/electric invoices that are already included in main inspection invoice
      if (mainInspectionInvoices.has(invoice.id)) {
        return; // Don't count this invoice as it's already included in main invoice
      }

      stats.total++; // Count unique invoices
      const amount = invoice.totalAmount || 0;
      stats.totalAmount += amount;
      
      const status = invoice.status || 'DRAFT';
      if (stats.byStatus[status as keyof typeof stats.byStatus]) {
        stats.byStatus[status as keyof typeof stats.byStatus].count++;
        stats.byStatus[status as keyof typeof stats.byStatus].amount += amount;
      }

      // Group by service code from invoice lines
      invoice.lines?.forEach(line => {
        const serviceCode = line.serviceCode || 'OTHER';
        if (!stats.byService[serviceCode]) {
          stats.byService[serviceCode] = { count: 0, amount: 0 };
        }
        stats.byService[serviceCode].count++;
        stats.byService[serviceCode].amount += line.lineTotal || 0;
      });
    });

    return stats;
  }, [filteredInvoices]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const normalizeBillToName = (billToName: string | null | undefined): string => {
    if (!billToName) return '-';
    
    // Normalize different formats to "Căn hộ {unitCode}"
    // Handle formats like:
    // - "Căn hộ B---04" (already correct)
    // - "Cư dân - B---04" (needs normalization)
    // - "B---04" (needs normalization)
    // - Any other format with unit code
    
    // Extract unit code from various formats
    const unitCodeMatch = billToName.match(/([A-Z]+-{2,3}\d+)/);
    if (unitCodeMatch) {
      const unitCode = unitCodeMatch[1];
      return `Căn hộ ${unitCode}`;
    }
    
    // If no unit code found, return as is
    return billToName;
  };

  const handleExportExcel = async () => {
    try {
      const params: any = {};
      if (serviceCodeFilter) params.serviceCode = serviceCodeFilter;
      if (statusFilter) params.status = statusFilter;
      if (monthFilter) {
        params.month = monthFilter;
        const [year, month] = monthFilter.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        params.startDate = startDate.toISOString().split('T')[0];
        params.endDate = endDate.toISOString().split('T')[0];
      }
      
      const BASE_URL = process.env.NEXT_PUBLIC_FINANCE_BASE_URL || 'http://localhost:8085';
      const queryString = new URLSearchParams(params).toString();
      
      const response = await axios.get(
        `${BASE_URL}/api/invoices/admin/export?${queryString}`,
        {
          responseType: 'blob',
          withCredentials: true,
        }
      );
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = `danh_sach_hoa_don_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      } else if (monthFilter) {
        const monthFormatted = monthFilter.replace('-', '');
        filename = `danh_sach_hoa_don_${monthFormatted}.xlsx`;
      }
      
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      show(t('messages.exportSuccess'), 'success');
    } catch (error: any) {
      console.error('Failed to export Excel:', error);
      show(t('errors.exportFailed'), 'error');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 relative">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
          <p className="text-gray-600">{t('description')}</p>
        </div>
        <button
          onClick={handleExportExcel}
          disabled={!canExport}
          className="px-4 py-2 bg-[#02542D] text-white rounded-md hover:bg-[#014a26] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          title={!canExport ? 'Chỉ Admin và Accountant mới có quyền export Excel' : ''}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {t('buttons.exportExcel')}
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">{t('statistics.totalInvoices')}</div>
          <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">{t('statistics.totalValue')}</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(statistics.totalAmount)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">{t('statistics.paid')}</div>
          <div className="text-2xl font-bold text-green-600">
            {statistics.byStatus.PAID.count} ({formatCurrency(statistics.byStatus.PAID.amount)})
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">{t('statistics.unpaid')}</div>
          <div className="text-2xl font-bold text-yellow-600">
            {statistics.byStatus.PUBLISHED.count} ({formatCurrency(statistics.byStatus.PUBLISHED.amount)})
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('filters.search')}</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('filters.searchPlaceholder')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#02542D]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('filters.serviceType')}</label>
            <select
              value={serviceCodeFilter}
              onChange={(e) => setServiceCodeFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#02542D]"
            >
              {SERVICE_CODE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('filters.status')}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#02542D]"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('filters.month')}</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#02542D]"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden relative z-0">
        {loading ? (
          <div className="p-8 text-center text-gray-500">{t('loading')}</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">{t('table.empty')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.invoiceCode')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.issuedDate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.payer')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.service')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.totalAmount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.code || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.issuedAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div>{normalizeBillToName(invoice.billToName) || '-'}</div>
                      <div className="text-xs text-gray-400">{invoice.billToAddress || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {(() => {
                        // Get unique service codes from invoice lines
                        const uniqueServiceCodes = Array.from(
                          new Set(invoice.lines?.map(line => line.serviceCode).filter(Boolean) || [])
                        );
                        return uniqueServiceCodes.map((serviceCode, idx) => {
                          // For WATER and ELECTRIC, show English service code for clarity
                          // For other services, use translation if available
                          let displayText = SERVICE_CODE_LABELS[serviceCode] || serviceCode;
                          if (serviceCode === 'WATER') {
                            displayText = 'Water';
                          } else if (serviceCode === 'ELECTRIC' || serviceCode === 'ELECTRICITY') {
                            displayText = 'Electric';
                          }
                          return (
                            <div key={idx} className="text-xs">
                              {displayText}
                            </div>
                          );
                        });
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(invoice.totalAmount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        STATUS_CONFIG[invoice.status]?.className || 'bg-gray-100 text-gray-700'
                      }`}>
                        {STATUS_CONFIG[invoice.status]?.label || invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="text-[#02542D] hover:text-[#023a20] font-medium"
                      >
                        {t('buttons.viewDetails')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{t('modal.title')}</h2>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm text-gray-600">{t('modal.invoiceCode')}</div>
                  <div className="font-medium">{selectedInvoice.code || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t('modal.status')}</div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    STATUS_CONFIG[selectedInvoice.status]?.className || 'bg-gray-100 text-gray-700'
                  }`}>
                    {STATUS_CONFIG[selectedInvoice.status]?.label || selectedInvoice.status}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t('modal.issuedDate')}</div>
                  <div className="font-medium">{formatDate(selectedInvoice.issuedAt)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t('modal.dueDate')}</div>
                  <div className="font-medium">{formatDate(selectedInvoice.dueDate)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t('modal.payer')}</div>
                  <div className="font-medium">{selectedInvoice.billToName || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">{t('modal.address')}</div>
                  <div className="font-medium">{selectedInvoice.billToAddress || '-'}</div>
                </div>
                {selectedInvoice.paidAt && (
                  <div>
                    <div className="text-sm text-gray-600">{t('modal.paidDate')}</div>
                    <div className="font-medium">{formatDate(selectedInvoice.paidAt)}</div>
                  </div>
                )}
                {selectedInvoice.paymentGateway && (
                  <div>
                    <div className="text-sm text-gray-600">{t('modal.paymentMethod')}</div>
                    <div className="font-medium">{selectedInvoice.paymentGateway}</div>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">{t('modal.serviceDetails')}</h3>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('modal.service')}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('modal.description')}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('modal.quantity')}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('modal.unitPrice')}</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('modal.lineTotal')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      // For invoices from asset inspection (has ASSET_DAMAGE service code),
                      // only show WATER/ELECTRIC lines that have "Đo cùng với kiểm tra thiết bị" in description
                      // This ensures we only display water/electric costs from the inspection, not from previous cycles
                      const hasAssetDamage = selectedInvoice.lines?.some(line => line.serviceCode === 'ASSET_DAMAGE') || false;
                      const inspectionMarker = 'Đo cùng với kiểm tra thiết bị';
                      
                      let linesToDisplay = selectedInvoice.lines || [];
                      
                      if (hasAssetDamage) {
                        linesToDisplay = selectedInvoice.lines?.filter(line => {
                          // Always include ASSET_DAMAGE lines
                          if (line.serviceCode === 'ASSET_DAMAGE') {
                            return true;
                          }
                          // For WATER/ELECTRIC, only include if description contains inspection marker
                          if (line.serviceCode === 'WATER' || line.serviceCode === 'ELECTRIC') {
                            return line.description && line.description.includes(inspectionMarker);
                          }
                          // Include all other service codes
                          return true;
                        }) || [];
                      }
                      
                      return linesToDisplay.map((line) => (
                        <tr key={line.id}>
                          <td className="px-4 py-2 text-sm">
                            {SERVICE_CODE_LABELS[line.serviceCode] || line.serviceCode}
                          </td>
                          <td className="px-4 py-2 text-sm">{line.description || '-'}</td>
                          <td className="px-4 py-2 text-sm">{line.quantity} {line.unit}</td>
                          <td className="px-4 py-2 text-sm">{formatCurrency(line.unitPrice || 0)}</td>
                          <td className="px-4 py-2 text-sm font-medium">{formatCurrency(line.lineTotal || 0)}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">{t('modal.total')}</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {(() => {
                        // For invoices from asset inspection, calculate total from filtered lines only
                        // For other invoices, use the original totalAmount
                        const hasAssetDamage = selectedInvoice.lines?.some(line => line.serviceCode === 'ASSET_DAMAGE') || false;
                        
                        if (hasAssetDamage) {
                          const inspectionMarker = 'Đo cùng với kiểm tra thiết bị';
                          const filteredLines = selectedInvoice.lines?.filter(line => {
                            if (line.serviceCode === 'ASSET_DAMAGE') return true;
                            if (line.serviceCode === 'WATER' || line.serviceCode === 'ELECTRIC') {
                              return line.description && line.description.includes(inspectionMarker);
                            }
                            return true;
                          }) || [];
                          
                          const filteredTotal = filteredLines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
                          return formatCurrency(filteredTotal);
                        }
                        
                        return formatCurrency(selectedInvoice.totalAmount || 0);
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

