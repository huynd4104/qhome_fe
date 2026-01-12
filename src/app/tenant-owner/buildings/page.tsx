"use client";
import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/contexts/AuthContext';
import Topbar from '@/src/components/layout/Topbar';
import Sidebar from '@/src/components/layout/Sidebar';
import axios from '@/src/lib/axios';
import PopupComfirm from '@/src/components/common/PopupComfirm';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

interface BuildingDeletionRequest {
  id: string;
  buildingId: string;
  buildingName: string;
  buildingCode: string;
  tenantId: string;
  requestedBy: string;
  requestedAt: string;
  status: string;
  totalUnits: number;
  inactiveUnits: number;
  unitsReady: boolean;
}

interface BuildingTargetsStatus {
  totalUnits: number;
  inactiveUnits: number;
  unitsReady: boolean;
}

export default function TenantOwnerBuildingsPage() {
  const t = useTranslations('TenantOwnerBuildings');
  const { user } = useAuth();
  const [deletingBuildings, setDeletingBuildings] = useState<BuildingDeletionRequest[]>([]);
  const [buildingStatuses, setBuildingStatuses] = useState<Record<string, BuildingTargetsStatus>>({});
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [pendingComplete, setPendingComplete] = useState<{ requestId: string; buildingName: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadDeletingBuildings();
  }, []);

  const loadDeletingBuildings = async () => {
    if (!user?.tenantId) return;

    try {
      setLoading(true);
      const response = await axios.get<BuildingDeletionRequest[]>(
        `${BASE_URL}/api/buildings/my-deleting-buildings?tenantId=${user.tenantId}`,
        { withCredentials: true }
      );
      setDeletingBuildings(response.data);

      // Load status for each building
      const statuses: Record<string, BuildingTargetsStatus> = {};
      await Promise.all(
        response.data.map(async (building) => {
          try {
            const statusResponse = await axios.get<BuildingTargetsStatus>(
              `${BASE_URL}/api/buildings/${building.buildingId}/targets-status`,
              { withCredentials: true }
            );
            statuses[building.buildingId] = statusResponse.data;
          } catch (error) {
            console.error(`Failed to load status for building ${building.buildingId}:`, error);
          }
        })
      );
      setBuildingStatuses(statuses);
    } catch (error) {
      console.error('Failed to load deleting buildings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDeletionClick = (requestId: string, buildingName: string) => {
    setPendingComplete({ requestId, buildingName });
    setShowConfirmPopup(true);
  };

  const handleCompleteDeletion = async () => {
    if (!pendingComplete) return;

    setShowConfirmPopup(false);
    try {
      setCompleting(pendingComplete.requestId);
      await axios.post(
        `${BASE_URL}/api/buildings/${pendingComplete.requestId}/complete`,
        {},
        { withCredentials: true }
      );
      setSuccessMessage(t('messages.completeSuccess', { name: pendingComplete.buildingName }));
      setShowSuccessPopup(true);
      loadDeletingBuildings(); // Reload
    } catch (error: any) {
      console.error('Failed to complete deletion:', error);
      setErrorMessage(t('messages.completeError', { message: error?.response?.data?.message || error.message }));
      setShowErrorPopup(true);
    } finally {
      setCompleting(null);
      setPendingComplete(null);
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

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* <Topbar /> */}
      <div className="flex">
        {/* <Sidebar variant="tenant-owner" /> */}
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
                {t('title')}
              </h1>
              <p className="text-sm text-slate-600">
                {t('description')}
              </p>
            </div>

            {/* Buildings List */}
            {deletingBuildings.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <div className="text-6xl mb-4">{t('empty.icon')}</div>
                <div className="text-lg font-medium text-slate-800 mb-2">
                  {t('empty.title')}
                </div>
                <p className="text-sm text-slate-600">
                  {t('empty.description')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {deletingBuildings.map((building) => {
                  const status = buildingStatuses[building.buildingId];
                  const unitsRemaining = status?.totalUnits || 0;
                  const unitsDeleted = status?.inactiveUnits || 0;
                  const canComplete = status?.unitsReady || false;
                  const progress = unitsRemaining > 0 
                    ? Math.round((unitsDeleted / unitsRemaining) * 100) 
                    : 100;

                  return (
                    <div key={building.id} className="bg-white rounded-xl p-6 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-800">
                              {building.buildingName}
                            </h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                              {t('building.status')}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600 space-y-1">
                            <div>
                              <span className="font-medium">{t('building.code')}</span> {building.buildingCode}
                            </div>
                            <div>
                              <span className="font-medium">{t('building.requestedBy')}</span> {building.requestedBy}
                            </div>
                            <div>
                              <span className="font-medium">{t('building.requestedAt')}</span>{' '}
                              {new Date(building.requestedAt).toLocaleDateString('vi-VN', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Progress Section */}
                      {status && (
                        <div className="border-t border-slate-200 pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">
                              {t('building.progress.title')}
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              {t('building.progress.units', { deleted: unitsDeleted, total: unitsRemaining })}
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full bg-slate-200 rounded-full h-2.5 mb-3">
                            <div 
                              className={`h-2.5 rounded-full transition-all duration-300 ${
                                canComplete ? 'bg-green-600' : 'bg-amber-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>

                          {canComplete ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-green-700">
                                <span className="text-2xl">✅</span>
                                <span className="text-sm font-medium">
                                  {t('building.progress.completed')}
                                </span>
                              </div>
                              <button
                                onClick={() => handleCompleteDeletionClick(building.id, building.buildingName)}
                                disabled={completing === building.id}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {completing === building.id ? t('building.progress.completing') : t('building.progress.complete')}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-amber-700">
                              <span className="text-xl">⏳</span>
                              <span className="text-sm">
                                {t('building.progress.remaining', { remaining: unitsRemaining - unitsDeleted })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Confirm Popup */}
            <PopupComfirm
              isOpen={showConfirmPopup}
              onClose={() => {
                setShowConfirmPopup(false);
                setPendingComplete(null);
              }}
              onConfirm={handleCompleteDeletion}
              popupTitle={pendingComplete ? t('confirm.complete', { name: pendingComplete.buildingName }) : ''}
              popupContext=""
              isDanger={false}
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

