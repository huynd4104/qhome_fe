'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';
import { getBuildings } from '@/src/services/base/buildingService';
import { getUnitsByBuilding } from '@/src/services/base/unitService';
import { getAllResidents } from '@/src/services/base/residentService';
import { getAllInvoicesForAdmin } from '@/src/services/finance/invoiceAdminService';
import { fetchCurrentHouseholdByUnit, fetchHouseholdMembersByHousehold } from '@/src/services/base/householdService';
import { getAllInspections } from '@/src/services/base/assetInspectionService';
import { getAssignmentsByStaff } from '@/src/services/base/waterService';
import { RequestService } from '@/src/services/customer-interaction/requestService';
import { getNewsList } from '@/src/services/customer-interaction/newService';
import { getNotificationsList } from '@/src/services/customer-interaction/notiService';
import axios from '@/src/lib/axios';

type DashboardVariant = 'admin' | 'technician' | 'tenant-owner' | 'accountant' | 'supporter';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  const { user } = useAuth();
  
  const [stats, setStats] = useState({
    buildings: 0,
    units: 0,
    residents: 0,
    invoices: 0,
    tasks: 0, // For technician
    newRequests: 0, // For technician
    inProgressRequests: 0, // For technician
    meterReadingTasks: 0, // For technician
    newsCount: 0, // For supporter
    notificationsCount: 0, // For supporter
  });
  const [loading, setLoading] = useState(true);

  const normalizedRoles = user?.roles?.map(role => role.toLowerCase()) ?? [];

  const resolvedVariant: DashboardVariant =
    normalizedRoles.includes('admin')
      ? 'admin'
      : normalizedRoles.includes('technician')
        ? 'technician'
        : normalizedRoles.includes('accountant')
          ? 'accountant'
          : normalizedRoles.includes('supporter')
            ? 'supporter'
            : normalizedRoles.includes('tenant-owner') || normalizedRoles.includes('unit_owner')
              ? 'tenant-owner'
              : 'admin';

  useEffect(() => {
    const fetchStats = async () => {
      if (resolvedVariant === 'technician') {
        // Fetch technician stats: new requests, in-progress requests, meter reading tasks
        try {
          setLoading(true);
          if (!user?.userId) {
            setLoading(false);
            return;
          }

          const requestService = new RequestService();
          
          // Fetch all requests and filter by status
          const allRequests = await requestService.getAllRequests().catch(() => []);
          const newRequests = allRequests.filter(req => req.status === 'New').length;
          const inProgressRequests = allRequests.filter(req => req.status === 'Processing').length;

          // Fetch meter reading assignments
          const meterReadingAssignments = await getAssignmentsByStaff(user.userId).catch(() => []);
          const pendingAssignments = meterReadingAssignments.filter(
            assignment => assignment.status === 'PENDING' || assignment.status === 'IN_PROGRESS'
          );

          setStats({
            buildings: 0,
            units: 0,
            residents: 0,
            invoices: 0,
            tasks: 0,
            newRequests,
            inProgressRequests,
            meterReadingTasks: pendingAssignments.length,
            newsCount: 0,
            notificationsCount: 0,
          });
        } catch (error) {
          console.error('Failed to fetch technician stats:', error);
          setStats({
            buildings: 0,
            units: 0,
            residents: 0,
            invoices: 0,
            tasks: 0,
            newRequests: 0,
            inProgressRequests: 0,
            meterReadingTasks: 0,
            newsCount: 0,
            notificationsCount: 0,
          });
        } finally {
          setLoading(false);
        }
        return;
      }

      if (resolvedVariant === 'accountant') {
        // Fetch invoice count for accountant
        try {
          setLoading(true);
          let invoiceCount = 0;
          try {
            const response = await axios.get(`${BASE_URL}/api/invoices/admin/all`, {
              withCredentials: true,
            });
            if (Array.isArray(response.data)) {
              invoiceCount = response.data.length;
            }
          } catch (error: any) {
            try {
              const invoices = await getAllInvoicesForAdmin();
              invoiceCount = invoices.length;
            } catch (err: any) {
              if (err?.response?.status !== 500) {
                console.warn('Could not fetch invoice count:', err?.message || 'Unknown error');
              }
            }
          }

          setStats({
            buildings: 0,
            units: 0,
            residents: 0,
            invoices: invoiceCount,
            tasks: 0,
            newRequests: 0,
            inProgressRequests: 0,
            meterReadingTasks: 0,
            newsCount: 0,
            notificationsCount: 0,
          });
        } catch (error) {
          console.error('Failed to fetch accountant stats:', error);
          setStats({
            buildings: 0,
            units: 0,
            residents: 0,
            invoices: 0,
            tasks: 0,
            newRequests: 0,
            inProgressRequests: 0,
            meterReadingTasks: 0,
            newsCount: 0,
            notificationsCount: 0,
          });
        } finally {
          setLoading(false);
        }
        return;
      }

      if (resolvedVariant === 'supporter') {
        // Fetch news and notifications count for supporter
        try {
          setLoading(true);
          const [news, notifications] = await Promise.all([
            getNewsList().catch(() => []),
            getNotificationsList().catch(() => [])
          ]);

          setStats({
            buildings: 0,
            units: 0,
            residents: 0,
            invoices: 0,
            tasks: 0,
            newRequests: 0,
            inProgressRequests: 0,
            meterReadingTasks: 0,
            newsCount: news.length,
            notificationsCount: notifications.length,
          });
        } catch (error) {
          console.error('Failed to fetch supporter stats:', error);
          setStats({
            buildings: 0,
            units: 0,
            residents: 0,
            invoices: 0,
            tasks: 0,
            newRequests: 0,
            inProgressRequests: 0,
            meterReadingTasks: 0,
            newsCount: 0,
            notificationsCount: 0,
          });
        } finally {
          setLoading(false);
        }
        return;
      }

      if (resolvedVariant !== 'admin') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch buildings
        const buildingsData: any = await getBuildings();
        const buildingsList = Array.isArray(buildingsData) ? buildingsData : (buildingsData?.content || buildingsData?.data || []);
        const buildingCount = buildingsList.length;

        // Fetch units for all buildings
        let unitCount = 0;
        const unitPromises = buildingsList.map(async (building: any) => {
          try {
            const units = await getUnitsByBuilding(building.id);
            return units.length;
          } catch (error) {
            console.error(`Failed to fetch units for building ${building.id}:`, error);
            return 0;
          }
        });
        const unitCounts = await Promise.all(unitPromises);
        unitCount = unitCounts.reduce((sum, count) => sum + count, 0);

        // Fetch residents count using getAllResidents endpoint
        let residentCount = 0;
        try {
          const residents = await getAllResidents();
          residentCount = residents.length;
        } catch (error: any) {
          // Silently handle error - API might not be available or user might not have permission
          // Set default to 0 and continue
          if (error?.response?.status !== 500) {
            console.warn('Failed to fetch resident count:', error?.message || 'Unknown error');
          }
        }

        // Fetch invoice count
        let invoiceCount = 0;
        try {
          const response = await axios.get(`${BASE_URL}/api/invoices/admin/all`, {
            withCredentials: true,
          });
          // The endpoint returns a list, so count the items
          if (Array.isArray(response.data)) {
            invoiceCount = response.data.length;
          }
        } catch (error: any) {
          // If admin endpoint doesn't work, try alternative method
          try {
            const invoices = await getAllInvoicesForAdmin();
            invoiceCount = invoices.length;
          } catch (err: any) {
            // Silently handle error - API might not be available or user might not have permission
            // Set default to 0 and continue
            if (err?.response?.status !== 500) {
              console.warn('Could not fetch invoice count:', err?.message || 'Unknown error');
            }
          }
        }

        setStats({
          buildings: buildingCount,
          units: unitCount,
          residents: residentCount,
          invoices: invoiceCount,
          tasks: 0,
          newRequests: 0,
          inProgressRequests: 0,
          meterReadingTasks: 0,
          newsCount: 0,
          notificationsCount: 0,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, [resolvedVariant, user?.userId]);

  // Admin sections
  const adminSections = (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tòa nhà</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {loading ? '...' : stats.buildings}
              </p>
            </div>
            <div className="text-3xl">🏢</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Căn hộ</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {loading ? '...' : stats.units}
              </p>
            </div>
            <div className="text-3xl">🏠</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cư dân</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {loading ? '...' : stats.residents}
              </p>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Hóa đơn</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {loading ? '...' : stats.invoices}
              </p>
            </div>
            <div className="text-3xl">🧾</div>
          </div>
        </div>
      </div>

      {/* Account Management */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý tài khoản
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/accountList"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">📋</div>
            <div className="font-medium text-slate-800 text-center">Danh sách tài khoản</div>
            <div className="text-xs text-slate-500 text-center mt-1">Xem tất cả tài khoản</div>
          </Link>

          <Link 
            href="/accountNewStaff"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">🧑‍💼</div>
            <div className="font-medium text-slate-800 text-center">Tạo tài khoản nhân viên</div>
            <div className="text-xs text-slate-500 text-center mt-1">Tạo tài khoản mới</div>
          </Link>

          <Link 
            href="/accountNewRe"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">🏘️</div>
            <div className="font-medium text-slate-800 text-center">Tạo tài khoản cư dân</div>
            <div className="text-xs text-slate-500 text-center mt-1">Đăng ký tài khoản cư dân</div>
          </Link>
        </div>
      </div>

      {/* Building & Unit Management */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý tòa nhà và căn hộ
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/base/building/buildingList"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">🏢</div>
            <div className="font-medium text-slate-800 text-center">Tòa nhà</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý tòa nhà</div>
          </Link>

          <Link 
            href="/base/unit/unitList"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">🏠</div>
            <div className="font-medium text-slate-800 text-center">Căn hộ</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý căn hộ</div>
          </Link>

          <Link 
            href="/base/residentView"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">👨‍👩‍👧‍👦</div>
            <div className="font-medium text-slate-800 text-center">Cư dân</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý cư dân</div>
          </Link>
        </div>
      </div>

      {/* Asset Management */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý tài sản
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <Link 
            href="/base/asset-management"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">🔧</div>
            <div className="font-medium text-slate-800 text-center">Quản lý tài sản</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý tài sản</div>
          </Link>

          <Link 
            href="/base/meter-management"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">⚙️</div>
            <div className="font-medium text-slate-800 text-center">Quản lý đồng hồ</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý đồng hồ đo</div>
          </Link>
        </div>
      </div>

      {/* Services */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý dịch vụ
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/base/serviceCateList"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">🗂️</div>
            <div className="font-medium text-slate-800 text-center">Danh mục dịch vụ</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý danh mục</div>
          </Link>

          <Link 
            href="/base/serviceList"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">🧾</div>
            <div className="font-medium text-slate-800 text-center">Danh sách dịch vụ</div>
            <div className="text-xs text-slate-500 text-center mt-1">Xem tất cả dịch vụ</div>
          </Link>

          <Link 
            href="/base/serviceNew"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">➕</div>
            <div className="font-medium text-slate-800 text-center">Tạo dịch vụ</div>
            <div className="text-xs text-slate-500 text-center mt-1">Tạo dịch vụ mới</div>
          </Link>
        </div>
      </div>

      {/* Finance Management Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý tài chính
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/base/finance/invoices"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">📄</div>
            <div className="font-medium text-slate-800 text-center">Hóa đơn</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý hóa đơn</div>
          </Link>

          <Link 
            href="/base/finance/pricing-tiers"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">📊</div>
            <div className="font-medium text-slate-800 text-center">Bậc giá</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý bậc giá dịch vụ</div>
          </Link>

          <Link 
            href="/base/billingCycles"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">📅</div>
            <div className="font-medium text-slate-800 text-center">Chu kỳ thanh toán</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý chu kỳ</div>
          </Link>
        </div>
      </div>

      {/* Water & Electric Management */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý điện nước
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link 
            href="/base/readingCycles"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">📈</div>
            <div className="font-medium text-slate-800 text-center">Chu kỳ đọc</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý chu kỳ đọc số</div>
          </Link>

          <Link 
            href="/base/readingAssign"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">📝</div>
            <div className="font-medium text-slate-800 text-center">Phân công đọc</div>
            <div className="text-xs text-slate-500 text-center mt-1">Phân công đọc số</div>
          </Link>

          <Link 
            href="/base/meter-management"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">⚙️</div>
            <div className="font-medium text-slate-800 text-center">Quản lý đồng hồ</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý đồng hồ đo</div>
          </Link>

          <Link 
            href="/base/billingCycles/manage"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">🔧</div>
            <div className="font-medium text-slate-800 text-center">Quản lý chu kỳ</div>
            <div className="text-xs text-slate-500 text-center mt-1">Xử lý chu kỳ</div>
          </Link>
        </div>
      </div>

      {/* Resident Interaction */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Tương tác với cư dân
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/customer-interaction/new/newList"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">📰</div>
            <div className="font-medium text-slate-800 text-center">Tin tức</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý tin tức</div>
          </Link>

          <Link 
            href="/customer-interaction/notiList"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">🔔</div>
            <div className="font-medium text-slate-800 text-center">Thông báo</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý thông báo</div>
          </Link>

          <Link 
            href="/customer-interaction/request"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">📨</div>
            <div className="font-medium text-slate-800 text-center">Yêu cầu hỗ trợ</div>
            <div className="text-xs text-slate-500 text-center mt-1">Xử lý yêu cầu</div>
          </Link>
        </div>
      </div>
    </>
  );

  // Technician sections
  const technicianSections = (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Yêu cầu mới</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {loading ? '...' : stats.newRequests}
              </p>
            </div>
            <div className="text-3xl">🆕</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Đang xử lý</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {loading ? '...' : stats.inProgressRequests}
              </p>
            </div>
            <div className="text-3xl">⚙️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Đo điện nước</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {loading ? '...' : stats.meterReadingTasks}
              </p>
            </div>
            <div className="text-3xl">💧⚡</div>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Dịch vụ
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/base/asset-inspection-assignments"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">🔍</div>
            <div className="font-medium text-slate-800 text-center">Kiểm tra tài sản</div>
            <div className="text-xs text-slate-500 text-center mt-1">Nhiệm vụ kiểm tra</div>
          </Link>
        </div>
      </div>

      {/* Water & Electric Management */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý điện nước
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/base/showAssign"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">🧾</div>
            <div className="font-medium text-slate-800 text-center">Danh sách nhiệm vụ</div>
            <div className="text-xs text-slate-500 text-center mt-1">Xem nhiệm vụ được phân công</div>
          </Link>
        </div>
      </div>

      {/* Resident Interaction */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Tương tác với cư dân
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/customer-interaction/new/newList"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">📰</div>
            <div className="font-medium text-slate-800 text-center">Tin tức</div>
            <div className="text-xs text-slate-500 text-center mt-1">Xem tin tức</div>
          </Link>

          <Link 
            href="/customer-interaction/notiList"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">🔔</div>
            <div className="font-medium text-slate-800 text-center">Thông báo</div>
            <div className="text-xs text-slate-500 text-center mt-1">Xem thông báo</div>
          </Link>

          <Link 
            href="/customer-interaction/request"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">📨</div>
            <div className="font-medium text-slate-800 text-center">Yêu cầu hỗ trợ</div>
            <div className="text-xs text-slate-500 text-center mt-1">Xử lý yêu cầu</div>
          </Link>
        </div>
      </div>
    </>
  );

  // Accountant sections
  const accountantSections = (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Hóa đơn</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {loading ? '...' : stats.invoices}
              </p>
            </div>
            <div className="text-3xl">🧾</div>
          </div>
        </div>
      </div>

      {/* Water & Electric Management */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý điện nước
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link 
            href="/base/readingCycles"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">📈</div>
            <div className="font-medium text-slate-800 text-center">Chu kỳ đọc</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý chu kỳ đọc số</div>
          </Link>

          <Link 
            href="/base/billingCycles"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">💡</div>
            <div className="font-medium text-slate-800 text-center">Chu kỳ thanh toán</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý chu kỳ</div>
          </Link>

          <Link 
            href="/base/finance/invoices"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">💰</div>
            <div className="font-medium text-slate-800 text-center">Hóa đơn</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý hóa đơn</div>
          </Link>

          <Link 
            href="/base/finance/pricing-tiers"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">📊</div>
            <div className="font-medium text-slate-800 text-center">Bậc giá</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý bậc giá</div>
          </Link>
        </div>
      </div>

      {/* Resident Interaction */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Tương tác với cư dân
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <Link 
            href="/customer-interaction/new/newList"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">📰</div>
            <div className="font-medium text-slate-800 text-center">Tin tức</div>
            <div className="text-xs text-slate-500 text-center mt-1">Xem tin tức</div>
          </Link>

          <Link 
            href="/customer-interaction/notiList"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">🔔</div>
            <div className="font-medium text-slate-800 text-center">Thông báo</div>
            <div className="text-xs text-slate-500 text-center mt-1">Xem thông báo</div>
          </Link>
        </div>
      </div>
    </>
  );

  // Supporter sections
  const supporterSections = (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tin tức</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {loading ? '...' : stats.newsCount}
              </p>
            </div>
            <div className="text-3xl">📰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Thông báo</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {loading ? '...' : stats.notificationsCount}
              </p>
            </div>
            <div className="text-3xl">🔔</div>
          </div>
        </div>
      </div>

      {/* Resident Interaction */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Tương tác với cư dân
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <Link 
            href="/customer-interaction/new/newList"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">📰</div>
            <div className="font-medium text-slate-800 text-center">Tin tức</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý tin tức</div>
          </Link>

          <Link 
            href="/customer-interaction/notiList"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">🔔</div>
            <div className="font-medium text-slate-800 text-center">Thông báo</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý thông báo</div>
          </Link>
        </div>
      </div>
    </>
  );

  // Tenant-owner sections
  const tenantOwnerSections = (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tòa nhà</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">—</p>
            </div>
            <div className="text-3xl">🏢</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Nhân viên</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">—</p>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>
      </div>

      {/* Management */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/tenant-owner/buildings"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">🏢</div>
            <div className="font-medium text-slate-800 text-center">Tòa nhà</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý tòa nhà</div>
          </Link>

          <Link 
            href="/tenant-owner/employees"
            className="flex flex-col items-center justify-center p-4 border-2 border-slate-200 rounded-lg hover:border-[#02542D] hover:bg-green-50 transition group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition">👥</div>
            <div className="font-medium text-slate-800 text-center">Nhân viên</div>
            <div className="text-xs text-slate-500 text-center mt-1">Quản lý nhân viên</div>
          </Link>
        </div>
      </div>
    </>
  );

  const renderSections = () => {
    switch (resolvedVariant) {
      case 'admin':
        return adminSections;
      case 'technician':
        return technicianSections;
      case 'accountant':
        return accountantSections;
      case 'supporter':
        return supporterSections;
      case 'tenant-owner':
        return tenantOwnerSections;
      default:
        return adminSections;
    }
  };

  return (
    <div className="min-h-full space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#02542D]">
          {t('title') || 'Dashboard'}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {t('subtitle') || 'Tổng quan hệ thống'}
        </p>
      </div>

      {renderSections()}
    </div>
  );
}
