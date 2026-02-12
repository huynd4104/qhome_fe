import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { importStaffAccounts, downloadStaffImportTemplate, StaffImportRowResult } from '@/src/services/iam/userService';

interface StaffImportModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const StaffImportModal: React.FC<StaffImportModalProps> = ({ onClose, onSuccess }) => {
    const t = useTranslations('StaffAccount');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setSuccessMessage(null);
        }
    };

    const generateErrorFile = (rows: StaffImportRowResult[]) => {
        const errorRows = rows.filter(row => !row.success);
        if (errorRows.length === 0) return;

        // Map rows strictly to match the template columns + Error Message
        const data = errorRows.map(row => ({
            username: row.username,
            email: row.email,
            password: row.password || '',
            role: row.roles.join(', '),
            active: row.active,
            fullName: row.fullName || '',
            phone: row.phone || '',
            nationalId: row.nationalId || '',
            address: row.address || '',
            error: row.message
        }));

        const worksheet = XLSX.utils.json_to_sheet(data, { header: ["username", "email", "password", "role", "active", "fullName", "phone", "nationalId", "address", "error"] });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Errors");
        XLSX.writeFile(workbook, "staff_import_errors.xlsx");
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await importStaffAccounts(file);

            if (response.failureCount === 0) {
                setSuccessMessage(t('importSuccess', { count: response.successCount }));
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 1500);
            } else {
                setError(t('importPartialSuccess', { success: response.successCount, failure: response.failureCount }));
                generateErrorFile(response.rows);
            }
        } catch (err: any) {
            console.error("Upload failed", err);
            setError(err.message || t('uploadFailed'));
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const blob = await downloadStaffImportTemplate();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'staff_import_template.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Template download failed", error);
            setError(t('downloadTemplateFailed'));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-800">{t('importStaff')}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-500 hover:text-slate-700" /></button>
                </div>

                <div className="space-y-4">
                    <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <label className="block cursor-pointer">
                            <span className="sr-only">{t('chooseFile')}</span>
                            <input type="file" onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" />
                            <span className="text-sm text-emerald-600 font-semibold hover:text-emerald-700">
                                {file ? file.name : t('clickToUpload')}
                            </span>
                        </label>
                        {!file && <p className="text-xs text-slate-500 mt-1">{t('supportedFormats')}</p>}
                    </div>

                    <div className="text-sm text-slate-500 flex justify-between items-center">
                        <span>{t('needTemplate')}</span>
                        <button
                            onClick={handleDownloadTemplate}
                            className="text-emerald-600 hover:text-emerald-700 hover:underline font-medium flex items-center gap-1"
                        >
                            <Download className="w-4 h-4" /> {t('downloadTemplate')}
                        </button>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-md text-sm flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 px-4 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className="flex-1 py-2 px-4 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {uploading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {uploading ? t('uploading') : t('import')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
