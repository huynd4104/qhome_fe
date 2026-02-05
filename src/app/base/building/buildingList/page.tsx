'use client'
import {useTranslations} from 'next-intl';
import FilterForm from "../../../../components/base-service/FilterForm";
import Table from "../../../../components/base-service/Table";
import { useMemo, useState, useRef } from 'react';
import { useProjectPage } from '@/src/hooks/useProjectPage';
import Pagination from '@/src/components/customer-interaction/Pagination';
import { create } from 'domain';
import { useProjectAdd } from '@/src/hooks/useProjectAdd';
import { useRouter } from 'next/navigation';
import { useBuildingPage } from '@/src/hooks/useBuildingPage';
import { useAuth } from '@/src/contexts/AuthContext';
import PopupConfirm from '@/src/components/common/PopupComfirm';
import { updateBuildingStatus } from '@/src/services/base/buildingService';
import { downloadBuildingImportTemplate, importBuildings, exportBuildings, type BuildingImportResponse } from '@/src/services/base/buildingImportService';
import { Building } from '@/src/types/building';

export default function Home() {
  const { user, hasRole } = useAuth();
  const t = useTranslations('Building');
  const headers = [t('buildingCode'), t('buildingName'), t('createAt'), t('createBy'), t('action')];

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BuildingImportResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    data,
    loading,
    error,
    filters,        
    allProjects, 
    pageNo,        
    totalPages,        
    handleFilterChange,
    handleClear,
    handlePageChange
  } = useBuildingPage()

  // Filter only ACTIVE buildings and order by code (ABC order)
  const ordered = (data?.content || [])
    .filter((item: any) => item.status === 'ACTIVE')
    .slice()
    .sort((a: any, b: any) => {
      const codeA = (a.code || '').toUpperCase();
      const codeB = (b.code || '').toUpperCase();
      return codeA.localeCompare(codeB);
    });

  const tableData = ordered.map((item: any) => ({
    buildingId: item.id,      
    buildingCode: item.code,  
    buildingName: item.name,  
    floors: item.floorsMax,  
    status: item.status,
    createBy: item.createdBy,
    createdAt: item.createdAt?.slice(0, 10).replace(/-/g, '/')
  })) || [];

  const router = useRouter();
  const handleAdd = () => {
    router.push(`/base/building/buildingNew`);
  };

  const handleDelete = () => {
    router.push(`/base/building/buildingList`);
  };

  // Change building status with confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedBuildingStatus, setSelectedBuildingStatus] = useState<string | null>(null);

  const onBuildingStatusChange = (buildingId: string) => {
    const row = tableData.find(r => r.buildingId === buildingId);
    setSelectedBuildingId(buildingId);
    setSelectedBuildingStatus(row?.status ?? null);
    setConfirmOpen(true);
  };

  const handleConfirmChange = async () => {
    if (!selectedBuildingId || !selectedBuildingStatus) {
      setConfirmOpen(false);
      return;
    }
    const newStatus = selectedBuildingStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateBuildingStatus(selectedBuildingId, newStatus);
      
      setConfirmOpen(false);
      setSelectedBuildingId(null);
      setSelectedBuildingStatus(null);
      window.location.reload();
    } catch (e: any) {
      console.error('Error updating building status:', e);
      const errorMessage = e?.response?.data?.message || e?.message || t('messages.updateStatusError');
      setImportError(errorMessage);
      setConfirmOpen(false);
    }
  };

  const handleCloseConfirm = () => {
    setConfirmOpen(false);
    setSelectedBuildingId(null);
    setSelectedBuildingStatus(null);
  };
 
   
  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadBuildingImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'building_import_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error('Download template error:', e);
      let errorMessage = t('messages.downloadTemplateError');
      
      if (e?.response?.data) {
        errorMessage = e.response.data.message 
          || e.response.data.error 
          || e.response.data 
          || errorMessage;
        
        if (typeof errorMessage === 'object') {
          errorMessage = JSON.stringify(errorMessage);
        }
      } else if (e?.message) {
        errorMessage = e.message;
      } else if (e?.response?.statusText) {
        errorMessage = `${e.response.status} ${e.response.statusText}`;
      }
      
      setImportError(errorMessage);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportBuildings(false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `buildings_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error('Export buildings error:', e);
      let errorMessage = t('messages.exportError');
      
      if (e?.response?.data) {
        errorMessage = e.response.data.message 
          || e.response.data.error 
          || e.response.data 
          || errorMessage;
        
        if (typeof errorMessage === 'object') {
          errorMessage = JSON.stringify(errorMessage);
        }
      } else if (e?.message) {
        errorMessage = e.message;
      } else if (e?.response?.statusText) {
        errorMessage = `${e.response.status} ${e.response.statusText}`;
      }
      
      setImportError(errorMessage);
    }
  };

  const handleExportWithUnits = async () => {
    try {
      const blob = await exportBuildings(true);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `buildings_with_units_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error('Export buildings with units error:', e);
      let errorMessage = t('messages.exportError');
      
      if (e?.response?.data) {
        errorMessage = e.response.data.message 
          || e.response.data.error 
          || e.response.data 
          || errorMessage;
        
        if (typeof errorMessage === 'object') {
          errorMessage = JSON.stringify(errorMessage);
        }
      } else if (e?.message) {
        errorMessage = e.message;
      } else if (e?.response?.statusText) {
        errorMessage = `${e.response.status} ${e.response.statusText}`;
      }
      
      setImportError(errorMessage);
    }
  };

  const handlePickFile = () => {
    setImportError(null);
    setImportResult(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const res = await importBuildings(f);
      setImportResult(res);
    } catch (e: any) {
      console.error('Import buildings error:', e);
      let errorMessage = t('messages.importError');
      
      if (e?.response?.data) {
        // Try to get error message from different possible locations
        errorMessage = e.response.data.message 
          || e.response.data.error 
          || e.response.data 
          || errorMessage;
        
        // If it's an object, try to stringify it
        if (typeof errorMessage === 'object') {
          errorMessage = JSON.stringify(errorMessage);
        }
      } else if (e?.message) {
        errorMessage = e.message;
      } else if (e?.response?.statusText) {
        errorMessage = `${e.response.status} ${e.response.statusText}`;
      }
      
      setImportError(errorMessage);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  
  // Handle loading and error states
  if (loading) {
    return (
        <div className="px-[41px] py-12 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-2 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('loading')}</p>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="px-[41px] py-12 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">
              {t('error')}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-2 text-white rounded-md hover:bg-primary-3"
            >
              {t('retry')}
            </button>
          </div>
        </div>
    );
  }

  return (
    <div className="lg:col-span-1 space-y-6 ">
      <div className="max-w-screen overflow-x-hidden ">
          <h1 className="text-2xl font-semibold text-[#02542D] mb-4">{t('requestlist')}</h1>
          <div className="bg-white p-6 rounded-xl w-full min-h-[200px]">
              <FilterForm
                filters={filters}
                page='building'
                onFilterChange={handleFilterChange}
                onAdd={handleAdd}
                onClear={handleClear}
                onDelete={handleDelete}
                projectList={allProjects}
              ></FilterForm>

              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 transition"
                >
                  {t('actions.downloadTemplate')}
                </button>
                <button
                  onClick={handlePickFile}
                  disabled={importing}
                  className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
                >
                  {importing ? t('actions.importing') : t('actions.selectFileToImport')}
                </button>
                <button
                  onClick={handleExport}
                  className="px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  {t('actions.exportBuildings')}
                </button>
                <button
                  onClick={handleExportWithUnits}
                  className="px-3 py-2 rounded bg-teal-600 text-white hover:bg-teal-700 transition"
                >
                  {t('actions.exportBuildingsWithUnits')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              {importError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">Lỗi import:</span>
                  </div>
                  <p className="mt-1 text-red-600 text-sm">{importError}</p>
                </div>
              )}
              {importResult && (
                <div className="mb-4">
                  {/* Validation Errors */}
                  {importResult.hasValidationErrors && importResult.validationErrors && importResult.validationErrors.length > 0 && (
                    <div className="mb-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700 mb-3">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold text-lg">Lỗi template/định dạng file</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1">
                        {importResult.validationErrors.map((err, idx) => (
                          <li key={idx} className="text-red-600 text-sm">{err}</li>
                        ))}
                      </ul>
                      <div className="mt-3 pt-3 border-t border-red-200">
                        <p className="text-red-700 text-sm font-medium">
                          💡 Vui lòng tải template mẫu và kiểm tra lại file Excel của bạn.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Summary - Only show if no validation errors */}
                  {!importResult.hasValidationErrors && (
                    <div className="mb-3 p-3 rounded-lg border" style={{
                      backgroundColor: importResult.errorCount > 0 ? '#fef2f2' : '#f0fdf4',
                      borderColor: importResult.errorCount > 0 ? '#fecaca' : '#bbf7d0'
                    }}>
                      <div className="flex items-center gap-2 mb-1">
                        {importResult.errorCount > 0 ? (
                          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className={`font-semibold ${importResult.errorCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                          {t('importResult.summary', { 
                            totalRows: importResult.totalRows, 
                            successCount: importResult.successCount, 
                            errorCount: importResult.errorCount 
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Results Table - Only show if no validation errors */}
                  {!importResult.hasValidationErrors && importResult.rows.length > 0 && (
                  <div className="max-h-96 overflow-auto border rounded-lg shadow-sm">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">{t('importResult.row')}</th>
                          <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">{t('importResult.success')}</th>
                          <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">{t('importResult.message')}</th>
                          <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">{t('importResult.buildingId')}</th>
                          <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">{t('importResult.code')}</th>
                          <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">{t('importResult.name')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.rows.map((r, i) => (
                          <tr 
                            key={i}
                            className={r.success ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'}
                          >
                            <td className="border px-3 py-2 text-sm font-medium">{r.rowNumber}</td>
                            <td className="border px-3 py-2 text-sm">
                              {r.success ? (
                                <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Thành công
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                  Lỗi
                                </span>
                              )}
                            </td>
                            <td className={`border px-3 py-2 text-sm ${r.success ? 'text-green-800' : 'text-red-800 font-medium'}`}>
                              {r.message}
                            </td>
                            <td className="border px-3 py-2 text-sm text-gray-600">{r.buildingId || '—'}</td>
                            <td className="border px-3 py-2 text-sm text-gray-600">{r.code || '—'}</td>
                            <td className="border px-3 py-2 text-sm text-gray-600">{r.name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>
              )}

              <Table 
                  data={tableData} 
                  headers={headers}
                  type='building'
                  onBuildingStatusChange={onBuildingStatusChange}
              ></Table>
              <Pagination
                  currentPage={pageNo + 1} 
                  totalPages={totalPages}
                  onPageChange={(page) => handlePageChange(page - 1)} 
              />
          </div>
      </div>
      <PopupConfirm
        isOpen={confirmOpen}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirmChange}
        popupTitle={t('confirmDeleteBuildingTitle')}
        popupContext={t('confirmDeleteBuildingMessage')}
        isDanger={true}
      />
    </div>
  )

};
