'use client';

import { useRef, useState, ChangeEvent } from 'react';
import { extractCCCDInfo, CCCDInfo } from '@/src/utils/cccdOCR';

interface CCCDUploadProps {
  onExtract: (info: CCCDInfo) => void;
  disabled?: boolean;
}

export default function CCCDUpload({ onExtract, disabled = false }: CCCDUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<CCCDInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh hợp lệ.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Kích thước file không được vượt quá 10MB.');
      return;
    }

    setError(null);
    setPreview(URL.createObjectURL(file));
    await processImage(file);
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const info = await extractCCCDInfo(file);
      setExtractedInfo(info);
      onExtract(info);
    } catch (err: any) {
      console.error('OCR Error:', err);
      setError(
        err?.message || 'Không thể đọc thông tin từ ảnh. Vui lòng thử lại với ảnh rõ nét hơn.'
      );
      setExtractedInfo(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleClear = () => {
    setPreview(null);
    setError(null);
    setExtractedInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">
          Quét ảnh căn cước công dân (CCCD)
        </label>
        {preview && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-red-600 hover:text-red-700"
          >
            Xóa ảnh
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isProcessing}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isProcessing}
        />

        <button
          type="button"
          onClick={handleUploadClick}
          disabled={disabled || isProcessing}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          Tải ảnh từ thiết bị
        </button>

        <button
          type="button"
          onClick={handleCameraClick}
          disabled={disabled || isProcessing}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Chụp ảnh
        </button>
      </div>

      {isProcessing && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Đang xử lý ảnh và đọc thông tin...</span>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {preview && !isProcessing && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-slate-600">Ảnh đã chọn:</p>
          <div className="relative mx-auto max-h-64 max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white">
            <img
              src={preview}
              alt="CCCD preview"
              className="h-auto w-full object-contain"
              style={{ maxHeight: '256px' }}
            />
          </div>
        </div>
      )}

      {extractedInfo && !isProcessing && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="mb-2 text-xs font-semibold text-emerald-800">
            Thông tin đã đọc được:
          </p>
          <div className="space-y-1.5 text-xs text-emerald-700">
            {extractedInfo.fullName ? (
              <p>
                <span className="font-medium">Họ và tên:</span> {extractedInfo.fullName}
              </p>
            ) : (
              <p className="text-emerald-600">⚠ Họ và tên: Không đọc được</p>
            )}
            {extractedInfo.nationalId ? (
              <p>
                <span className="font-medium">Số CCCD:</span> {extractedInfo.nationalId}
              </p>
            ) : (
              <p className="text-emerald-600">⚠ Số CCCD: Không đọc được</p>
            )}
            {extractedInfo.dob ? (
              <p>
                <span className="font-medium">Ngày sinh:</span>{' '}
                {new Date(extractedInfo.dob).toLocaleDateString('vi-VN')}
              </p>
            ) : (
              <p className="text-emerald-600">⚠ Ngày sinh: Không đọc được</p>
            )}
          </div>
          <p className="mt-2 text-xs text-emerald-600">
            Thông tin đã được tự động điền vào form. Vui lòng kiểm tra và chỉnh sửa nếu cần.
          </p>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Hệ thống sẽ tự động đọc và điền 3 thông tin: Họ và tên, Số CCCD, Ngày sinh. Vui lòng đảm
        bảo ảnh rõ nét, đủ ánh sáng.
      </p>
    </div>
  );
}

