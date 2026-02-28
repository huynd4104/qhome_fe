'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2, Home, Users, Receipt, ClipboardList, UserPlus, Wrench, Settings, 
  Briefcase, TrendingUp, Banknote, Newspaper, Bell, Mail, Search, FileText, 
  CreditCard, CheckSquare, UserCheck, UserCog, Car, LayoutDashboard, 
  Plus, Lightbulb, UserRound, Zap, Droplet
} from "lucide-react";
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
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Tòa nhà</p>
              <p className="text-3xl font-semibold text-slate-800 mt-2">
                {loading ? '...' : stats.buildings}
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl"><Building2 className="w-7 h-7 text-emerald-600" /></div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Căn hộ</p>
              <p className="text-3xl font-semibold text-slate-800 mt-2">
                {loading ? '...' : stats.units}
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl"><Home className="w-7 h-7 text-emerald-600" /></div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Cư dân</p>
              <p className="text-3xl font-semibold text-slate-800 mt-2">
                {loading ? '...' : stats.residents}
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl"><Users className="w-7 h-7 text-emerald-600" /></div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Hóa đơn</p>
              <p className="text-3xl font-semibold text-slate-800 mt-2">
                {loading ? '...' : stats.invoices}
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl"><Receipt className="w-7 h-7 text-emerald-600" /></div>
          </div>
        </div>
      </div>

      {/* Account Management */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý tài khoản
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/accountList"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <ClipboardList className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Danh sách tài khoản</div>
              <div className="text-sm text-slate-500 mt-0.5">Xem tất cả tài khoản</div>
            </div>
          </Link>

          <Link 
            href="/accountNewStaff"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <UserPlus className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Tạo tài khoản nhân viên</div>
              <div className="text-sm text-slate-500 mt-0.5">Tạo tài khoản mới</div>
            </div>
          </Link>

          <Link 
            href="/accountNewRe"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Tạo tài khoản cư dân</div>
              <div className="text-sm text-slate-500 mt-0.5">Đăng ký tài khoản cư dân</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Building & Unit Management */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý tòa nhà và căn hộ
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/base/building/buildingList"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Tòa nhà</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý tòa nhà</div>
            </div>
          </Link>

          <Link 
            href="/base/unit/unitList"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Home className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Căn hộ</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý căn hộ</div>
            </div>
          </Link>

          <Link 
            href="/base/residentView"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Cư dân</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý cư dân</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Asset Management */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý tài sản
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <Link 
            href="/base/asset-management"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Wrench className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Quản lý tài sản</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý tài sản</div>
            </div>
          </Link>

          <Link 
            href="/base/meter-management"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Settings className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Quản lý đồng hồ</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý đồng hồ đo</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Services */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý dịch vụ
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/base/serviceCateList"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Briefcase className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Danh mục dịch vụ</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý danh mục</div>
            </div>
          </Link>

          <Link 
            href="/base/serviceList"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Receipt className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Danh sách dịch vụ</div>
              <div className="text-sm text-slate-500 mt-0.5">Xem tất cả dịch vụ</div>
            </div>
          </Link>

          <Link 
            href="/base/serviceNew"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Plus className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Tạo dịch vụ</div>
              <div className="text-sm text-slate-500 mt-0.5">Tạo dịch vụ mới</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Finance Management Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý tài chính
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/base/finance/invoices"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Hóa đơn</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý hóa đơn</div>
            </div>
          </Link>

          <Link 
            href="/base/finance/pricing-tiers"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Bậc giá</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý bậc giá dịch vụ</div>
            </div>
          </Link>

          <Link 
            href="/base/billingCycles"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <CheckSquare className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Chu kỳ thanh toán</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý chu kỳ</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Water & Electric Management */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý điện nước
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link 
            href="/base/readingCycles"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Chu kỳ đọc</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý chu kỳ đọc số</div>
            </div>
          </Link>

          <Link 
            href="/base/readingAssign"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <ClipboardList className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Phân công đọc</div>
              <div className="text-sm text-slate-500 mt-0.5">Phân công đọc số</div>
            </div>
          </Link>

          <Link 
            href="/base/meter-management"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Settings className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Quản lý đồng hồ</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý đồng hồ đo</div>
            </div>
          </Link>

          <Link 
            href="/base/billingCycles/manage"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Wrench className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Quản lý chu kỳ</div>
              <div className="text-sm text-slate-500 mt-0.5">Xử lý chu kỳ</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Resident Interaction */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Tương tác với cư dân
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/customer-interaction/new/newList"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Newspaper className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Tin tức</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý tin tức</div>
            </div>
          </Link>

          <Link 
            href="/customer-interaction/notiList"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Bell className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Thông báo</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý thông báo</div>
            </div>
          </Link>

          <Link 
            href="/customer-interaction/request"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Mail className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Yêu cầu hỗ trợ</div>
              <div className="text-sm text-slate-500 mt-0.5">Xử lý yêu cầu</div>
            </div>
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
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Yêu cầu mới</p>
              <p className="text-3xl font-semibold text-slate-800 mt-2">
                {loading ? '...' : stats.newRequests}
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl"><Plus className="w-7 h-7 text-emerald-600" /></div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Đang xử lý</p>
              <p className="text-3xl font-semibold text-slate-800 mt-2">
                {loading ? '...' : stats.inProgressRequests}
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl"><Settings className="w-7 h-7 text-emerald-600" /></div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Đo điện nước</p>
              <p className="text-3xl font-semibold text-slate-800 mt-2">
                {loading ? '...' : stats.meterReadingTasks}
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl"><Zap className="w-7 h-7 text-emerald-600" /></div>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Dịch vụ
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/base/asset-inspection-assignments"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Search className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Kiểm tra tài sản</div>
              <div className="text-sm text-slate-500 mt-0.5">Nhiệm vụ kiểm tra</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Water & Electric Management */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý điện nước
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/base/showAssign"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Receipt className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Danh sách nhiệm vụ</div>
              <div className="text-sm text-slate-500 mt-0.5">Xem nhiệm vụ được phân công</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Resident Interaction */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Tương tác với cư dân
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/customer-interaction/new/newList"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Newspaper className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Tin tức</div>
              <div className="text-sm text-slate-500 mt-0.5">Xem tin tức</div>
            </div>
          </Link>

          <Link 
            href="/customer-interaction/notiList"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Bell className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Thông báo</div>
              <div className="text-sm text-slate-500 mt-0.5">Xem thông báo</div>
            </div>
          </Link>

          <Link 
            href="/customer-interaction/request"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Mail className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Yêu cầu hỗ trợ</div>
              <div className="text-sm text-slate-500 mt-0.5">Xử lý yêu cầu</div>
            </div>
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
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Hóa đơn</p>
              <p className="text-3xl font-semibold text-slate-800 mt-2">
                {loading ? '...' : stats.invoices}
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl"><Receipt className="w-7 h-7 text-emerald-600" /></div>
          </div>
        </div>
      </div>

      {/* Water & Electric Management */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý điện nước
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link 
            href="/base/readingCycles"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Chu kỳ đọc</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý chu kỳ đọc số</div>
            </div>
          </Link>

          <Link 
            href="/base/billingCycles"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Lightbulb className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Chu kỳ thanh toán</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý chu kỳ</div>
            </div>
          </Link>

          <Link 
            href="/base/finance/invoices"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Banknote className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Hóa đơn</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý hóa đơn</div>
            </div>
          </Link>

          <Link 
            href="/base/finance/pricing-tiers"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Bậc giá</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý bậc giá</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Resident Interaction */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Tương tác với cư dân
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <Link 
            href="/customer-interaction/new/newList"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Newspaper className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Tin tức</div>
              <div className="text-sm text-slate-500 mt-0.5">Xem tin tức</div>
            </div>
          </Link>

          <Link 
            href="/customer-interaction/notiList"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Bell className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Thông báo</div>
              <div className="text-sm text-slate-500 mt-0.5">Xem thông báo</div>
            </div>
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
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Tin tức</p>
              <p className="text-3xl font-semibold text-slate-800 mt-2">
                {loading ? '...' : stats.newsCount}
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl"><Newspaper className="w-7 h-7 text-emerald-600" /></div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Thông báo</p>
              <p className="text-3xl font-semibold text-slate-800 mt-2">
                {loading ? '...' : stats.notificationsCount}
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl"><Bell className="w-7 h-7 text-emerald-600" /></div>
          </div>
        </div>
      </div>

      {/* Resident Interaction */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Tương tác với cư dân
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <Link 
            href="/customer-interaction/new/newList"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Newspaper className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Tin tức</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý tin tức</div>
            </div>
          </Link>

          <Link 
            href="/customer-interaction/notiList"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Bell className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Thông báo</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý thông báo</div>
            </div>
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
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Tòa nhà</p>
              <p className="text-3xl font-semibold text-slate-800 mt-2">—</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl"><Building2 className="w-7 h-7 text-emerald-600" /></div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Nhân viên</p>
              <p className="text-3xl font-semibold text-slate-800 mt-2">—</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl"><Users className="w-7 h-7 text-emerald-600" /></div>
          </div>
        </div>
      </div>

      {/* Management */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 p-6 hover:-translate-y-1 transition-transform duration-300">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Quản lý
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link 
            href="/tenant-owner/buildings"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Tòa nhà</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý tòa nhà</div>
            </div>
          </Link>

          <Link 
            href="/tenant-owner/employees"
            className="flex items-start p-4 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50 bg-white transition-all duration-300 group hover:-translate-y-0.5"
          >
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 mr-4 group-hover:bg-emerald-100/50 group-hover:scale-110 transition-all duration-300">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-slate-800">Nhân viên</div>
              <div className="text-sm text-slate-500 mt-0.5">Quản lý nhân viên</div>
            </div>
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
    <div className="space-y-6 animate-in fade-in duration-500 min-h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-800 to-emerald-600 bg-clip-text text-transparent">
          {t('title') || 'Dashboard'}
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          {t('subtitle') || 'Tổng quan hệ thống'}
        </p>
      </div>

      {renderSections()}
    </div>
  );
}
