"use client";
import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { getAllTenants, type Tenant } from '@/src/services/base';
import CreateDeletionRequestModal from '@/src/components/tenant/CreateDeletionRequestModal';
import { useAuth } from '@/src/contexts/AuthContext';
import Delete from '@/src/assets/Delete.svg';
import PopupComfirm from '@/src/components/common/PopupComfirm';

export default function TenantsPage() {
  const { user, hasRole } = useAuth();
  const t = useTranslations('AdminTenants');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const data = await getAllTenants();
      
      // Filter tenants based on user role
      let filteredData = data;
      if (!hasRole('admin')) {
        // If not admin, only show user's own tenant
        filteredData = data.filter(tenant => tenant.id === user?.tenantId);
      }
      
      setTenants(filteredData);
    } catch (error) {
      console.error('Failed to load tenants:', error);
      setErrorMessage(t('error'));
      setShowErrorPopup(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDeletion = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowDeleteModal(true);
  };

  const handleDeletionSuccess = () => {
    loadTenants(); // Reload to show updated status
  };

  // Filter tenants by search
  const filteredTenants = tenants.filter(tenant => 
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="lg:col-span-1 space-y-6">
      <div className="max-w-screen overflow-x-hidden ">
        {/* Header */}
        <h1 className="text-2xl font-semibold text-[#02542D] mb-2 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" id="Building-5-Fill--Streamline-Mingcute-Fill" height="24" width="24">
            <g fill="none" fillRule="evenodd">
              <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
              <path fill="#02542D" d="M10 2a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 1.3333333333333333v2.6666666666666665h1.3333333333333333a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 1.3333333333333333v5.333333333333333a0.6666666666666666 0.6666666666666666 0 1 1 0 1.3333333333333333H2a0.6666666666666666 0.6666666666666666 0 1 1 0 -1.3333333333333333V6a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 -1.3333333333333333h1.3333333333333333V3.333333333333333a1.3333333333333333 1.3333333333333333 0 0 1 1.3333333333333333 -1.3333333333333333h4ZM4.666666666666666 6H3.333333333333333v6.666666666666666h1.3333333333333333V6Zm8 1.3333333333333333h-1.3333333333333333v5.333333333333333h1.3333333333333333v-5.333333333333333Zm-4 2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333v-1.3333333333333333Zm0 -2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333v-1.3333333333333333Zm0 -2.6666666666666665h-1.3333333333333333v1.3333333333333333h1.3333333333333333V4.666666666666666Z" strokeWidth="0.6667"></path>
            </g>
          </svg>
          {t('title')}
        </h1>
        <p className="text-sm text-slate-600 mb-4">
          {t('subtitle')}
        </p>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" id="Search-2-Fill--Streamline-Mingcute-Fill" height="16" width="16">
                <g fill="none" fillRule="evenodd">
                  <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
                  <path fill="#000000" d="M3.6666666666666665 6.666666666666666a3 3 0 1 1 6 0 3 3 0 0 1 -6 0ZM6.666666666666666 1.6666666666666665a5 5 0 1 0 2.7573333333333334 9.171333333333333l3.202 3.2026666666666666a1 1 0 0 0 1.4146666666666665 -1.4146666666666665l-3.2026666666666666 -3.202A5 5 0 0 0 6.666666666666666 1.6666666666666665Z" strokeWidth="0.6667"></path>
                </g>
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02542D]"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="px-[41px] py-12 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-2 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('loading')}</p>
            </div>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="bg-white rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  {t('table.headers.tenant')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  {t('table.headers.code')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  {t('table.headers.address')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  {t('table.headers.status')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                  {t('table.headers.action')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    {searchQuery 
                      ? t('table.empty.noResults')
                      : t('table.empty.noData')
                    }
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr 
                    key={tenant.id} 
                    className="hover:bg-slate-50 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">
                        {tenant.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {tenant.code || '-'}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {tenant.address || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${tenant.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-800' 
                            : tenant.status === 'PENDING_DELETION'
                            ? 'bg-yellow-100 text-yellow-800'
                            : tenant.status === 'ARCHIVED'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-slate-100 text-slate-600'
                          }`}
                      >
                        {tenant.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRequestDeletion(tenant)}
                        disabled={tenant.status !== 'ACTIVE'}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2 ml-auto"
                        title={tenant.status !== 'ACTIVE' ? t('actions.onlyActiveTooltip') : t('actions.requestDeletionTooltip')}
                      >
                        <Image src={Delete} alt="Delete" width={16} height={16} />
                        {t('actions.requestDeletion')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

            {/* Footer Stats */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-600">
              {t('table.footer.total', { count: filteredTenants.length })}
              {searchQuery && t('table.footer.filtered', { total: tenants.length })}
            </div>
          </div>
        )}

        {/* Deletion Request Modal */}
        {showDeleteModal && selectedTenant && (
          <CreateDeletionRequestModal
            tenantId={selectedTenant.id}
            tenantName={selectedTenant.name}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedTenant(null);
            }}
            onSuccess={handleDeletionSuccess}
          />
        )}

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
    </div>
  );
}

