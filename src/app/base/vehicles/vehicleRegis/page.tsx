'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  approveVehicleRegistration,
  fetchVehicleRegistrationRequests,
  rejectVehicleRegistration,
} from '@/src/services/card/vehicleRegistrationService';
import { VehicleKind } from '@/src/types/vehicle';
import { VehicleRegistrationRequest } from '@/src/types/vehicleRegistration';
import PopupComfirm from '@/src/components/common/PopupComfirm';

const approveIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    height="16"
    width="16"
    aria-hidden="true"
  >
    <g fill="none" fillRule="evenodd">
      <path
        d="M16 0v16H0V0h16ZM8.396 15.505l-.008.001-.047.023-.013.003-.01-.003-.047-.024c-.007-.002-.013 0-.016.004l-.003.007-.011.285.003.013.007.009.07.049.01.003.008-.003.069-.049.008-.011.003-.011-.011-.285c-.002-.007-.006-.012-.011-.012Zm.176-.075-.009.001-.123.062-.007.007-.002.007.012.287.003.008.005.005.134.062c.008.003.015 0 .019-.005l.003-.009-.023-.409c-.002-.008-.007-.013-.013-.015Zm-.477.001a.015.015 0 0 0-.018.004l-.004.01-.023.409c0 .008.005.013.011.016l.01-.002.134-.062.007-.005.002-.007.012-.287-.002-.008-.007-.007-.123-.061Z"
        strokeWidth="0.6667"
      ></path>
      <path
        fill="currentColor"
        d="M12.997 2.089a.667.667 0 0 1 .9.206l.66 1.007a.667.667 0 0 1-.103.853l-.002.003-.009.008-.038.035-.15.144a55.9 55.9 0 0 0-2.413 2.49c-1.465 1.61-3.204 3.719-4.375 5.764-.327.571-1.125.694-1.598.201l-4.323-4.492a.667.667 0 0 1 .034-.957l1.307-1.179a.667.667 0 0 1 .89-.045l2.206 1.654c3.446-3.398 5.4-4.702 7.057-5.699Z"
        strokeWidth="0.6667"
      ></path>
    </g>
  </svg>
);

const rejectIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    height="16"
    width="16"
    aria-hidden="true"
  >
    <g fill="none" fillRule="evenodd">
      <path
        d="M16 0v16H0V0h16ZM8.395 15.505l-.007.001-.047.023-.014.003-.009-.003-.047-.023c-.007-.003-.013-.001-.016.003l-.003.007-.011.285.003.013.007.009.07.049.01.003.008-.003.069-.049.008-.01.003-.011-.011-.285c-.002-.007-.006-.012-.011-.012Zm.177-.075-.009.001-.123.062-.007.007-.002.007.012.287.003.008.005.005.134.062c.008.003.015 0 .019-.005l.003-.009-.023-.409c-.002-.008-.007-.013-.013-.015Zm-.477.001a.015.015 0 0 0-.018.004l-.004.01-.023.409c0 .008.005.013.011.016l.01-.002.134-.062.007-.005.003-.007.011-.287-.002-.008-.007-.007-.123-.061Z"
        strokeWidth="0.6667"
      ></path>
      <path
        fill="currentColor"
        d="m8 9.415 3.535 3.535a1 1 0 0 0 1.415-1.415L9.413 8l3.536-3.535a1 1 0 1 0-1.415-1.414L8 6.586 4.465 3.05a1 1 0 1 0-1.415 1.414L6.587 8l-3.536 3.536a1 1 0 1 0 1.415 1.413L8 9.415Z"
        strokeWidth="0.6667"
      ></path>
    </g>
  </svg>
);

const getTimestamp = (value?: string | null) => {
  if (!value) {
    return 0;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

export default function VehicleRegistrationPage() {
  const t = useTranslations('Vehicle');
  const router = useRouter();

  const [registrations, setRegistrations] = useState<VehicleRegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVehicleRegistrationRequests({ 
        status: statusFilter || undefined 
      });
      console.log('Loaded registrations:', data); // Debug log
      console.log('Status filter:', statusFilter); // Debug log
      console.log('CANCELLED registrations:', data.filter(r => r.status === 'CANCELLED')); // Debug log
      const sorted = [...data].sort(
        (a, b) =>
          getTimestamp(b.createdAt) - getTimestamp(a.createdAt),
      );
      setRegistrations(sorted);
    } catch (err: any) {
      console.error('Error loading registrations:', err); // Debug log
      const message =
        err?.response?.data?.message ??
        err?.message ??
        'Failed to load vehicle registrations';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadRegistrations();
  }, [loadRegistrations]);

  const statusConfig = useMemo<
    Partial<Record<string, { label: string; className: string }>>
  >(
    () => ({
      PENDING: {
        label: t('statusLabels.PENDING'),
        className: 'bg-amber-50 text-amber-700 border-amber-200',
      },
      READY_FOR_PAYMENT: {
        label: t('statusLabels.READY_FOR_PAYMENT'),
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      PAYMENT_PENDING: {
        label: t('statusLabels.PAYMENT_PENDING'),
        className: 'bg-purple-50 text-purple-700 border-purple-200',
      },
      APPROVED: {
        label: t('statusLabels.APPROVED'),
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      },
      COMPLETED: {
        label: t('statusLabels.COMPLETED'),
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      },
      REJECTED: {
        label: t('statusLabels.REJECTED'),
        className: 'bg-red-50 text-red-600 border-red-200',
      },
      CANCELLED: {
        label: t('statusLabels.CANCELED'),
        className: 'bg-slate-50 text-slate-600 border-slate-200',
      },
    }),
    [t],
  );

  const paymentStatusConfig = useMemo<
    Partial<Record<string, { label: string; className: string }>>
  >(
    () => ({
      UNPAID: {
        label: t('paymentStatusLabels.UNPAID'),
        className: 'bg-orange-50 text-orange-700 border-orange-200',
      },
      PAYMENT_APPROVAL: {
        label: t('paymentStatusLabels.PAYMENT_APPROVAL'),
        className: 'bg-purple-50 text-purple-700 border-purple-200',
      },
      PAYMENT_PENDING: {
        label: t('paymentStatusLabels.PAYMENT_PENDING'),
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      },
      PAID: {
        label: t('paymentStatusLabels.PAID'),
        className: 'bg-green-50 text-green-700 border-green-200',
      },
    }),
    [t],
  );

  const getVehicleKindLabel = useCallback(
    (kind?: string | null) => {
      switch (kind) {
        case VehicleKind.CAR:
          return t('car');
        case VehicleKind.MOTORCYCLE:
          return t('motorcycle');
        case VehicleKind.BICYCLE:
          return t('bicycle');
        case VehicleKind.OTHER:
          return t('other');
        default:
          return kind ?? '--';
      }
    },
    [t],
  );

  const handleNavigateToActive = () => {
    router.push('/base/vehicles/vehicleAll');
  };

  const handleRefresh = () => {
    void loadRegistrations();
  };

  const handleApprove = async (registration: VehicleRegistrationRequest) => {
    const noteInput =
      window.prompt(t('promptApprovalNote'), registration.adminNote ?? '') ?? '';
    const note = noteInput.trim();

    setProcessingId(registration.id);
    try {
      const updated = await approveVehicleRegistration(
        registration.id,
        note.length > 0 ? { note, issueMessage: '' } : undefined,
      );
      setRegistrations((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? t('error');
      setErrorMessage(message);
      setShowErrorPopup(true);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (registration: VehicleRegistrationRequest) => {
    const reasonInput =
      window.prompt(t('promptRejectionReason'), registration.rejectionReason ?? '') ?? '';
    const reason = reasonInput.trim();

    if (!reason) {
      return;
    }

    setProcessingId(registration.id);
    try {
      const updated = await rejectVehicleRegistration(registration.id, { note: reason });
      setRegistrations((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? t('error');
      setErrorMessage(message);
      setShowErrorPopup(true);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center px-[41px] py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary-2"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center px-[41px] py-12">
        <div className="text-center">
          <p className="mb-4 text-red-600">{error}</p>
          <button
            onClick={handleRefresh}
            className="rounded-md bg-primary-2 px-4 py-2 text-white transition-colors hover:bg-primary-3"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:col-span-1">
      <div className="max-w-screen overflow-x-auto">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-[#02542D]">
            {t('registrationList')}
          </h1>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-[#02542D] px-3 py-2 text-sm font-medium text-[#02542D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#02542D]"
            >
              <option value="">Tất cả</option>
              <option value="PENDING">{t('statusLabels.PENDING')}</option>
              <option value="READY_FOR_PAYMENT">{t('statusLabels.READY_FOR_PAYMENT')}</option>
              <option value="PAYMENT_PENDING">{t('statusLabels.PAYMENT_PENDING')}</option>
              <option value="APPROVED">{t('statusLabels.APPROVED')}</option>
              <option value="REJECTED">{t('statusLabels.REJECTED')}</option>
              <option value="CANCELLED">{t('statusLabels.CANCELED')}</option>
            </select>
            <button
              onClick={handleRefresh}
              className="rounded-md border border-[#02542D] px-4 py-2 text-sm font-medium text-[#02542D] transition-colors hover:bg-[#02542D] hover:text-white"
            >
              {t('refresh')}
            </button>
            <button
              onClick={handleNavigateToActive}
              className="rounded-md bg-[#02542D] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#024428]"
            >
              {t('showActiveVehicles')}
            </button>
          </div>
        </div>

        <div className="w-full rounded-xl bg-white p-6">
          {loading ? (
            <div className="py-12 text-center text-gray-500">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[#02542D]"></div>
              <p>{t('loading')}</p>
            </div>
          ) : registrations.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              {t('noRegistrations')}
            </div>
          ) : (
            <table className="w-full min-w-[720px] table-fixed">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-600">
                  <th className="px-4 py-3 font-semibold">{t('plateNo')}</th>
                  <th className="px-4 py-3 font-semibold">{t('vehicleKind')}</th>
                  <th className="px-4 py-3 font-semibold">{t('color')}</th>
                  <th className="px-4 py-3 font-semibold">{t('requestedBy')}</th>
                  <th className="px-4 py-3 font-semibold">{t('requestedAt')}</th>
                  <th className="px-4 py-3 font-semibold">{t('approvedBy')}</th>
                  <th className="px-4 py-3 font-semibold">{t('approvedAt')}</th>
                  <th className="px-4 py-3 font-semibold">{t('status')}</th>
                  <th className="px-4 py-3 font-semibold">{t('action')}</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {registrations.map((registration) => {
                  // Determine status: use status field, or infer from paymentStatus
                  let currentStatus = registration.status;
                  
                  // Normalize COMPLETED to APPROVED (legacy status)
                  if (currentStatus === 'COMPLETED') {
                    currentStatus = 'APPROVED';
                  }
                  
                  // Only infer status if it's missing or empty (preserve CANCELLED, REJECTED, etc.)
                  if (!currentStatus || currentStatus === '') {
                    // Infer status from paymentStatus if status is missing
                    if (registration.paymentStatus === 'PAYMENT_APPROVAL' || registration.paymentStatus === 'PAYMENT_PENDING') {
                      currentStatus = 'PAYMENT_PENDING';
                    } else if (registration.paymentStatus === 'UNPAID') {
                      currentStatus = 'READY_FOR_PAYMENT';
                    } else {
                      currentStatus = 'PENDING';
                    }
                  }
                  
                  const statusStyle =
                    statusConfig[currentStatus] ?? {
                      label: currentStatus,
                      className: 'bg-slate-50 text-slate-600 border-slate-200',
                    };
                  const isProcessing = processingId === registration.id;

                  return (
                    <tr
                      key={registration.id}
                      className="border-b border-gray-100 transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {registration.licensePlate ?? '--'}
                      </td>
                      <td className="px-4 py-3">
                        {getVehicleKindLabel(registration.vehicleType)}
                      </td>
                      <td className="px-4 py-3">{registration.vehicleColor ?? '--'}</td>
                      <td className="px-4 py-3">
                        {registration.apartmentNumber ?? registration.buildingName ?? '--'}
                      </td>
                      <td className="px-4 py-3">
                        {formatDateTime(registration.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {registration.approvedByName ?? registration.approvedBy ?? '--'}
                      </td>
                      <td className="px-4 py-3">
                        {formatDateTime(registration.approvedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <div
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyle.className}`}
                          >
                            {statusStyle.label}
                          </div>
                          {registration.paymentStatus && (
                            (() => {
                              const paymentStyle = paymentStatusConfig[registration.paymentStatus] ?? {
                                label: registration.paymentStatus,
                                className: 'bg-slate-50 text-slate-600 border-slate-200',
                              };
                              return (
                                <div
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${paymentStyle.className}`}
                                  title={`Trạng thái thanh toán: ${paymentStyle.label}`}
                                >
                                  💳 {paymentStyle.label}
                                </div>
                              );
                            })()
                          )}
                        </div>
                        {currentStatus === 'REJECTED' && registration.rejectionReason && (
                          <p className="mt-1 text-xs text-red-600">
                            {t('rejectionReason')}: {registration.rejectionReason}
                          </p>
                        )}
                        {currentStatus === 'APPROVED' && registration.adminNote && (
                          <p className="mt-1 text-xs text-emerald-600">
                            {t('approvalNote')}: {registration.adminNote}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(currentStatus === 'PENDING' || currentStatus === 'READY_FOR_PAYMENT' || currentStatus === 'PAYMENT_PENDING') ? (
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleApprove(registration)}
                              disabled={isProcessing}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                              title={t('approveVehicle')}
                            >
                              {isProcessing ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-r-transparent"></span>
                              ) : (
                                approveIcon
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(registration)}
                              disabled={isProcessing}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              title={t('rejectVehicle')}
                            >
                              {isProcessing ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-r-transparent"></span>
                              ) : (
                                rejectIcon
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
  );
}
