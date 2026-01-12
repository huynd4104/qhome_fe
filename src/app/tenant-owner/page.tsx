"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';
import { getAllTenants, getBuildingsByTenant, type Tenant, type Building } from '@/src/services/base';
import { getMyDeletionRequests, approveDeletionRequest, type TenantDeletionRequest } from '@/src/services/base';
import Link from 'next/link';
import Topbar from '@/src/components/layout/Topbar';
import Sidebar from '@/src/components/layout/Sidebar';
import Delete from '@/src/assets/Delete.svg';
import PopupComfirm from '@/src/components/common/PopupComfirm';

export default function TenantOwnerHomePage() {
  const t = useTranslations('TenantOwner');
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<TenantDeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TenantDeletionRequest | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      const [tenantsData, buildingsData, requestsData] = await Promise.all([
        getAllTenants(),
        getBuildingsByTenant(user.tenantId),
        getMyDeletionRequests().catch(() => []), // Graceful fail
      ]);

      const myTenant = tenantsData.find(t => t.id === user.tenantId);
      setTenant(myTenant || null);
      setBuildings(buildingsData);
      setDeletionRequests(requestsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = (request: TenantDeletionRequest) => {
    setSelectedRequest(request);
    setApproveNote('');
    setShowApproveModal(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setApproving(selectedRequest.id);
      await approveDeletionRequest(selectedRequest.id, { note: approveNote });
      setSuccessMessage(t('messages.approveSuccess'));
      setShowSuccessPopup(true);
      setShowApproveModal(false);
      loadData(); // Reload to show updated status
    } catch (error: any) {
      console.error('Failed to approve request:', error);
      setErrorMessage(t('messages.approveError', { message: error?.response?.data?.message || error.message }));
      setShowErrorPopup(true);
    } finally {
      setApproving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0]">
        <div className="flex">
          <main className="flex-1 p-6">
            <div className="text-center py-12 text-slate-500">⏳ {t('loading')}</div>
          </main>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-[#F5F5F0]">
        <div className="flex">
          <main className="flex-1 p-6">
            <div className="text-center py-12 text-red-500">❌ {t('notFound')}</div>
          </main>
        </div>
      </div>
    );
  }

  const activeBuildings = buildings.filter(b => b.status === 'ACTIVE').length;
  const totalUnits = buildings.reduce((sum, b) => sum + (b.totalUnits || 0), 0);
  const pendingRequests = deletionRequests.filter(r => r.status === 'PENDING').length;
  const hasActiveRequest = deletionRequests.some(r => ['PENDING', 'APPROVED', 'IN_PROGRESS'].includes(r.status));

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="flex">
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" id="Building-5-Fill--Streamline-Mingcute-Fill" height="24" width="24">
                  <g fill="none" fillRule="evenodd">
                    <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
                    <path fill="#1e293b" d="M10 2a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 1.3333333333333333v2.6666666666666665h1.3333333333333333a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 1.3333333333333333v5.333333333333333a0.6666666666666666 0.6666666666666666 0 1 1 0 1.3333333333333333H2a0.6666666666666666 0.6666666666666666 0 1 1 0 -1.3333333333333333V6a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 -1.3333333333333333h1.3333333333333333V3.333333333333333a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 -1.3333333333333333h4ZM4.666666666666666 6H3.333333333333333v6.666666666666666h1.3333333333333333V6Zm8 1.3333333333333333h-1.3333333333333333v5.333333333333333h1.3333333333333333v-5.333333333333333Zm-4 2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333v-1.3333333333333333Zm0 -2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333v-1.3333333333333333Zm0 -2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333V4.666666666666666Z" strokeWidth="0.6667"></path>
                  </g>
                </svg>
                {t('title', { name: tenant.name })}
              </h1>
              <p className="text-sm text-slate-600">
                {t('welcome', { username: user?.username || '' })}
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-600 mb-1">{t('stats.buildings')}</div>
                    <div className="text-3xl font-bold text-[#02542D]">{activeBuildings}</div>
                    <div className="text-xs text-slate-500 mt-1">{t('stats.active')}</div>
                  </div>
                  <div className="text-4xl">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" id="Building-5-Fill--Streamline-Mingcute-Fill" height="40" width="40">
                      <g fill="none" fillRule="evenodd">
                        <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
                        <path fill="#02542D" d="M10 2a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 1.3333333333333333v2.6666666666666665h1.3333333333333333a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 1.3333333333333333v5.333333333333333a0.6666666666666666 0.6666666666666666 0 1 1 0 1.3333333333333333H2a0.6666666666666666 0.6666666666666666 0 1 1 0 -1.3333333333333333V6a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 -1.3333333333333333h1.3333333333333333V3.333333333333333a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 -1.3333333333333333h4ZM4.666666666666666 6H3.333333333333333v6.666666666666666h1.3333333333333333V6Zm8 1.3333333333333333h-1.3333333333333333v5.333333333333333h1.3333333333333333v-5.333333333333333Zm-4 2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333v-1.3333333333333333Zm0 -2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333v-1.3333333333333333Zm0 -2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333V4.666666666666666Z" strokeWidth="0.6667"></path>
                      </g>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-600 mb-1">{t('stats.units')}</div>
                    <div className="text-3xl font-bold text-blue-600">{totalUnits}</div>
                    <div className="text-xs text-slate-500 mt-1">{t('stats.totalUnits')}</div>
                  </div>
                  <div className="text-4xl">🏠</div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-600 mb-1">{t('stats.deletionRequests')}</div>
                    <div className="text-3xl font-bold text-amber-600">{pendingRequests}</div>
                    <div className="text-xs text-slate-500 mt-1">{t('stats.pending')}</div>
                  </div>
                  <div className="text-4xl">
                    <Image src={Delete} alt="Delete" width={40} height={40} />
                  </div>
                </div>
              </div>
            </div>

            {/* Tenant Info Card */}
            <div className="bg-white rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">{t('tenantInfo.title')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-600">{t('tenantInfo.name')}</div>
                  <div className="font-medium text-slate-800">{tenant.name}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-600">{t('tenantInfo.code')}</div>
                  <code className="text-sm bg-slate-100 px-2 py-1 rounded">{tenant.code || tenant.id}</code>
                </div>
              </div>
            </div>

            {/* Buildings List */}
            <div className="bg-white rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" id="Building-5-Fill--Streamline-Mingcute-Fill" height="20" width="20">
                    <g fill="none" fillRule="evenodd">
                      <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
                      <path fill="#1e293b" d="M10 2a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 1.3333333333333333v2.6666666666666665h1.3333333333333333a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 1.3333333333333333v5.333333333333333a0.6666666666666666 0.6666666666666666 0 1 1 0 1.3333333333333333H2a0.6666666666666666 0.6666666666666666 0 1 1 0 -1.3333333333333333V6a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 -1.3333333333333333h1.3333333333333333V3.333333333333333a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 -1.3333333333333333h4ZM4.666666666666666 6H3.333333333333333v6.666666666666666h1.3333333333333333V6Zm8 1.3333333333333333h-1.3333333333333333v5.333333333333333h1.3333333333333333v-5.333333333333333Zm-4 2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333v-1.3333333333333333Zm0 -2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333v-1.3333333333333333Zm0 -2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333V4.666666666666666Z" strokeWidth="0.6667"></path>
                    </g>
                  </svg>
                  {t('buildings.title')}
                </h2>
                <span className="text-sm text-slate-600">{t('buildings.count', { count: buildings.length })}</span>
              </div>
              
              {buildings.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {t('buildings.empty')}
                </div>
              ) : (
                <div className="space-y-3">
                  {buildings.map(building => (
                    <div key={building.id} className="p-4 border border-slate-200 rounded-xl hover:border-[#02542D] transition">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-800">{building.name}</div>
                          <div className="text-sm text-slate-600 mt-1">
                            {t('buildings.address')} {building.address || t('buildings.noAddress')}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            building.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {building.status}
                          </span>
                          <div className="text-sm text-slate-600 mt-1">
                            {t('buildings.units', { count: building.totalUnits || 0 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Deletion Requests Section */}
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Image src={Delete} alt="Delete" width={20} height={20} />
                  {t('deletionRequests.title')}
                </h2>
                <span className="text-sm text-slate-600">{t('deletionRequests.count', { count: deletionRequests.length })}</span>
              </div>
              
              {deletionRequests.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📭</div>
                  <div className="text-slate-800 font-medium mb-2">{t('deletionRequests.empty.title')}</div>
                  <p className="text-sm text-slate-600 mb-4">
                    {t('deletionRequests.empty.description')}
                  </p>
                  <Link
                    href="/tenants"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#02542D] text-white rounded-lg hover:bg-[#024030] transition"
                  >
                    {t('deletionRequests.empty.button')}
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {deletionRequests.map(request => {
                    const statusColors: Record<string, string> = {
                      PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
                      APPROVED: 'bg-blue-100 text-blue-800 border-blue-200',
                      IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-200',
                      COMPLETED: 'bg-green-100 text-green-800 border-green-200',
                      REJECTED: 'bg-red-100 text-red-800 border-red-200',
                      CANCELLED: 'bg-slate-100 text-slate-800 border-slate-200',
                    };
                    const statusLabels: Record<string, string> = {
                      PENDING: t('deletionRequests.status.pending'),
                      APPROVED: t('deletionRequests.status.approved'),
                      IN_PROGRESS: t('deletionRequests.status.inProgress'),
                      COMPLETED: t('deletionRequests.status.completed'),
                      REJECTED: t('deletionRequests.status.rejected'),
                      CANCELLED: t('deletionRequests.status.cancelled'),
                    };

                    return (
                      <div key={request.id} className="p-4 border border-slate-200 rounded-xl hover:border-[#02542D] transition">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusColors[request.status]}`}>
                                {statusLabels[request.status]}
                              </span>
                              <span className="text-xs text-slate-500">
                                {new Date(request.requestedAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            {request.reason && (
                              <p className="text-sm text-slate-600 italic mb-2">
                                "{request.reason}"
                              </p>
                            )}
                            {request.status === 'REJECTED' && request.rejectionReason && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                                <strong>{t('deletionRequests.rejectionReason')}</strong> {request.rejectionReason}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            {request.status === 'PENDING' && (
                              <button
                                onClick={() => handleApproveClick(request)}
                                disabled={approving === request.id}
                                className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {approving === request.id ? t('deletionRequests.buttons.approving') : t('deletionRequests.buttons.approve')}
                              </button>
                            )}
                            <Link
                              href={`/tenant-deletions/${request.id}`}
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition"
                            >
                              {t('deletionRequests.buttons.details')}
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Approve Modal */}
            {showApproveModal && selectedRequest && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    {t('modals.approve.title')}
                  </h3>
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-sm text-amber-800 mb-2">
                      <strong>{t('modals.approve.warning')}</strong>
                    </p>
                    <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                      <li>{t('modals.approve.notes.buildingStatus')}</li>
                      <li>{t('modals.approve.notes.unitsDeleted')}</li>
                      <li>{t('modals.approve.notes.buildingArchived')}</li>
                      <li>{t('modals.approve.notes.tenantArchived')}</li>
                    </ul>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t('modals.approve.noteLabel')}
                    </label>
                    <textarea
                      value={approveNote}
                      onChange={(e) => setApproveNote(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      rows={3}
                      placeholder={t('modals.approve.notePlaceholder')}
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowApproveModal(false)}
                      disabled={approving !== null}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition disabled:opacity-50"
                    >
                      {t('modals.approve.cancel')}
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={approving !== null}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {approving ? t('modals.approve.confirming') : t('modals.approve.confirm')}
                    </button>
                  </div>
                </div>
              </div>
            )}

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

