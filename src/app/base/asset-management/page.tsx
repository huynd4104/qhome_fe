'use client';

import React, { useEffect, useState } from 'react';
import { getBuildings, type Building } from '@/src/services/base/buildingService';
import { exportAssetsToExcel } from '@/src/services/base/assetService';
import { BuildingRow, AssetImportModal } from '@/src/components/asset-view/AssetViewComponents';
import { FileSpreadsheet, Upload } from 'lucide-react';

export default function AssetManagementPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const loadBuildings = async () => {
    setLoading(true);
    try {
      const data = await getBuildings();
      const list = Array.isArray(data) ? data : ((data as any)?.content || (data as any)?.data || []);
      setBuildings(list);
    } catch (error) {
      console.error('Failed to load buildings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuildings();
  }, []);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const blob = await exportAssetsToExcel();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `danh_sach_thiet_bi_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export Excel:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#02542D]">Quản lý tài sản</h1>
          <p className="text-sm text-slate-500 mt-1">
            Toà nhà → Tầng → Căn hộ → Phòng & Thiết bị
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50"
          >
            <Upload className="w-4 h-4" />
            Import Excel
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary-2"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {buildings.map(building => (
            <BuildingRow key={building.id} building={building} />
          ))}
          {buildings.length === 0 && (
            <div className="text-center py-10 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-500">
              Không có toà nhà nào
            </div>
          )}
        </div>
      )}

      {showImport && (
        <AssetImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            loadBuildings();
          }}
        />
      )}
    </div>
  );
}
