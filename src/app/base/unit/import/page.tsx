"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  downloadUnitImportTemplate,
  importUnits,
  UnitImportResponse,
} from "@/src/services/base/unitImportService";

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

type ApiError = {
  response?: {
    data?: ApiErrorResponse | string;
    status?: number;
    statusText?: string;
  };
  message?: string;
};

export default function UnitImportPage() {
  const t = useTranslations("Unit.import");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UnitImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setResult(null);
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  const extractErrorMessage = (err: unknown, fallback: string): string => {
    if (typeof err !== "object" || err === null) return fallback;

    const e = err as ApiError;

    if (e.response?.data) {
      if (typeof e.response.data === "string") {
        return e.response.data;
      }

      return (
        e.response.data.message ??
        e.response.data.error ??
        fallback
      );
    }

    if (e.message) return e.message;

    if (e.response?.statusText && e.response?.status) {
      return `${e.response.status} ${e.response.statusText}`;
    }

    return fallback;
  };

  const onDownloadTemplate = async () => {
    try {
      const blob = await downloadUnitImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "unit_import_template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, t("downloadFailed")));
    }
  };

  const onImport = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await importUnits(file);
      setResult(res);
    } catch (err: unknown) {
      console.error("Import units error:", err);
      setError(extractErrorMessage(err, t("importFailed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">{t("title")}</h2>

      <div className="flex gap-2">
        <button
          className="px-3 py-2 rounded bg-gray-200"
          onClick={onDownloadTemplate}
        >
          {t("downloadTemplate")}
        </button>

        <input type="file" accept=".xlsx" onChange={onChangeFile} />

        <button
          disabled={!file || loading}
          className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
          onClick={onImport}
        >
          {loading ? t("importing") : t("import")}
        </button>
      </div>
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">Lỗi import:</span>
          </div>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      {result && (
        <div className="space-y-4">
          {/* Validation Errors */}
          {result.hasValidationErrors && result.validationErrors && result.validationErrors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 mb-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-lg">Lỗi template/định dạng file</span>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {result.validationErrors.map((err, idx) => (
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
          {!result.hasValidationErrors && (
            <div className="p-4 rounded-lg border" style={{
              backgroundColor: result.errorCount > 0 ? '#fef2f2' : '#f0fdf4',
              borderColor: result.errorCount > 0 ? '#fecaca' : '#bbf7d0'
            }}>
              <div className="flex items-center gap-2">
                {result.errorCount > 0 ? (
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                <span className={`font-semibold ${result.errorCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {t('summary', { total: result.totalRows, success: result.successCount, errors: result.errorCount })}
                </span>
              </div>
            </div>
          )}

          {/* Results Table - Only show if no validation errors */}
          {!result.hasValidationErrors && result.rows.length > 0 && (
            <div className="overflow-auto border rounded-lg shadow-sm max-h-96">
              <table className="min-w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">{t('tableHeaders.row')}</th>
                    <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">{t('tableHeaders.success')}</th>
                    <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">{t('tableHeaders.message')}</th>
                    <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">{t('tableHeaders.unitId')}</th>
                    <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">{t('tableHeaders.buildingId')}</th>
                    <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">{t('tableHeaders.buildingCode')}</th>
                    <th className="border px-3 py-2 text-left text-sm font-semibold text-gray-700">{t('tableHeaders.code')}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, idx) => (
                    <tr
                      key={idx}
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
                      <td className="border px-3 py-2 text-sm text-gray-600">{r.unitId || '—'}</td>
                      <td className="border px-3 py-2 text-sm text-gray-600">{r.buildingId || '—'}</td>
                      <td className="border px-3 py-2 text-sm text-gray-600">{r.buildingCode || '—'}</td>
                      <td className="border px-3 py-2 text-sm text-gray-600">{r.code || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}








