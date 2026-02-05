'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import {
  AccountCreationRequest,
  approveAccountRequest,
  fetchPendingAccountRequests,
} from '@/src/services/base/residentAccountService';
import PopupConfirm from '@/src/components/common/PopupComfirm';
import Pagination from '@/src/components/customer-interaction/Pagination';

const approveIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" id="Check-2-Fill--Streamline-Mingcute-Fill" height="16" width="16">
    <g fill="none" fillRule="evenodd">
      <path d="M16 0v16H0V0h16ZM8.395999999999999 15.505333333333333l-0.008 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023999999999999997c-0.006666666666666666 -0.002 -0.012666666666666666 0 -0.016 0.004l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.010666666666666666 -0.011999999999999999Zm0.176 -0.07533333333333334 -0.009333333333333332 0.0013333333333333333 -0.12266666666666666 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.005333333333333333 0.134 0.06133333333333333c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.002 -0.007333333333333332 0.011999999999999999 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
      <path fill="currentColor" d="M12.996666666666666 2.0886666666666667a0.6666666666666666 0.6666666666666666 0 0 1 0.9013333333333333 0.206l0.6599999999999999 1.0066666666666666a0.6666666666666666 0.6666666666666666 0 0 1 -0.10333333333333333 0.8526666666666666l-0.002 0.0026666666666666666 -0.009333333333333332 0.008666666666666666 -0.038 0.03533333333333333 -0.15 0.1433333333333333a55.906666666666666 55.906666666666666 0 0 0 -2.413333333333333 2.490666666666667c-1.4646666666666666 1.6106666666666665 -3.2039999999999997 3.7186666666666666 -4.374666666666666 5.764 -0.32666666666666666 0.5706666666666667 -1.1246666666666667 0.6933333333333334 -1.5979999999999999 0.20066666666666666l-4.323333333333333 -4.492a0.6666666666666666 0.6666666666666666 0 0 1 0.033999999999999996 -0.9573333333333333l1.3066666666666666 -1.1786666666666665A0.6666666666666666 0.6666666666666666 0 0 1 3.733333333333333 6.133333333333333l2.206 1.654c3.4459999999999997 -3.398 5.3999999999999995 -4.702 7.057333333333333 -5.698666666666666Z" strokeWidth="0.6667"></path>
    </g>
  </svg>
);

const rejectIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" id="Close-Fill--Streamline-Mingcute-Fill" height="16" width="16">
    <desc>
      Close Fill Streamline Icon: https://streamlinehq.com
    </desc>
    <g fill="none" fillRule="evenodd">
      <path d="M16 0v16H0V0h16ZM8.395333333333333 15.505333333333333l-0.007333333333333332 0.0013333333333333333 -0.047333333333333324 0.023333333333333334 -0.013333333333333332 0.0026666666666666666 -0.009333333333333332 -0.0026666666666666666 -0.047333333333333324 -0.023333333333333334c-0.006666666666666666 -0.0026666666666666666 -0.012666666666666666 -0.0006666666666666666 -0.016 0.003333333333333333l-0.0026666666666666666 0.006666666666666666 -0.011333333333333334 0.2853333333333333 0.003333333333333333 0.013333333333333332 0.006666666666666666 0.008666666666666666 0.06933333333333333 0.049333333333333326 0.009999999999999998 0.0026666666666666666 0.008 -0.0026666666666666666 0.06933333333333333 -0.049333333333333326 0.008 -0.010666666666666666 0.0026666666666666666 -0.011333333333333334 -0.011333333333333334 -0.2846666666666666c-0.0013333333333333333 -0.006666666666666666 -0.005999999999999999 -0.011333333333333334 -0.011333333333333334 -0.011999999999999999Zm0.17666666666666667 -0.07533333333333334 -0.008666666666666666 0.0013333333333333333 -0.12333333333333332 0.062 -0.006666666666666666 0.006666666666666666 -0.002 0.007333333333333332 0.011999999999999999 0.2866666666666666 0.003333333333333333 0.008 0.005333333333333333 0.004666666666666666 0.134 0.062c0.008 0.0026666666666666666 0.015333333333333332 0 0.019333333333333334 -0.005333333333333333l0.0026666666666666666 -0.009333333333333332 -0.02266666666666667 -0.4093333333333333c-0.002 -0.008 -0.006666666666666666 -0.013333333333333332 -0.013333333333333332 -0.014666666666666665Zm-0.4766666666666666 0.0013333333333333333a0.015333333333333332 0.015333333333333332 0 0 0 -0.018 0.004l-0.004 0.009333333333333332 -0.02266666666666667 0.4093333333333333c0 0.008 0.004666666666666666 0.013333333333333332 0.011333333333333334 0.016l0.009999999999999998 -0.0013333333333333333 0.134 -0.062 0.006666666666666666 -0.005333333333333333 0.0026666666666666666 -0.007333333333333332 0.011333333333333334 -0.2866666666666666 -0.002 -0.008 -0.006666666666666666 -0.006666666666666666 -0.12266666666666666 -0.06133333333333333Z" strokeWidth="0.6667"></path>
      <path fill="currentColor" d="m8 9.414666666666665 3.535333333333333 3.535333333333333a1 1 0 0 0 1.4146666666666665 -1.4146666666666665L9.413333333333332 8l3.536 -3.535333333333333a1 1 0 1 0 -1.4146666666666665 -1.414L8 6.585999999999999 4.464666666666666 3.0506666666666664a1 1 0 1 0 -1.4146666666666665 1.4133333333333333L6.586666666666667 8l-3.536 3.536a1 1 0 1 0 1.4146666666666665 1.4133333333333333L8 9.415333333333333Z" strokeWidth="0.6667"></path>
    </g>
  </svg>
);

const initialPageSize = 10;

export default function ResidentAccountApprovalPage() {
  const t = useTranslations('ResidentAccountApproval');
  const router = useRouter();
  const [requests, setRequests] = useState<AccountCreationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [pageNo, setPageNo] = useState<number>(0);
  const [pageSize] = useState<number>(initialPageSize);
  const [confirmPopup, setConfirmPopup] = useState<{
    isOpen: boolean;
    request: AccountCreationRequest | null;
    isApprove: boolean;
  }>({
    isOpen: false,
    request: null,
    isApprove: false,
  });

  const formatDateTime = useCallback(
    (value?: string | null) => {
      if (!value) return t('fallbacks.notUpdated');
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value ?? '';
      return date.toLocaleString();
    },
    [t],
  );

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPendingAccountRequests();
      setRequests(data);
      setPageNo(0);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || t('messages.loadError');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const updateProcessing = useCallback((requestId: string, value: boolean) => {
    setProcessingIds((prev) => {
      const next = new Set(prev);
      if (value) {
        next.add(requestId);
      } else {
        next.delete(requestId);
      }
      return next;
    });
  }, []);

  const removeRequest = useCallback((requestId: string) => {
    setRequests((prev) => prev.filter((item) => item.id !== requestId));
  }, []);

  const handleDecisionClick = useCallback(
    (request: AccountCreationRequest, approve: boolean) => {
      setConfirmPopup({
        isOpen: true,
        request,
        isApprove: approve,
      });
    },
    [],
  );

  const handleConfirmDecision = useCallback(
    async () => {
      if (!confirmPopup.request) return;

      const request = confirmPopup.request;
      const isApprove = confirmPopup.isApprove;

      setConfirmPopup({ isOpen: false, request: null, isApprove: false });
      updateProcessing(request.id, true);
      setSuccessMessage(null);
      setError(null);

      try {
        let payload: { approve: boolean; rejectionReason?: string };

        if (isApprove) {
          payload = { approve: true };
        } else {
          const defaultReason = t('prompt.defaultRejectionReason');
          const reason =
            window.prompt(t('prompt.message'), defaultReason) ?? defaultReason;
          const trimmedReason = reason.trim();
          if (!trimmedReason) {
            updateProcessing(request.id, false);
            return;
          }
          payload = { approve: false, rejectionReason: trimmedReason };
        }

        await approveAccountRequest(request.id, payload);
        removeRequest(request.id);
        setSuccessMessage(
          isApprove
            ? t('messages.approveSuccess', {
                name: request.residentName ?? t('fallbacks.unknownResidentName'),
              })
            : t('messages.rejectSuccess', {
                name: request.residentName ?? t('fallbacks.unknownResidentName'),
              }),
        );
      } catch (err: any) {
        const message =
          err?.response?.data?.message || err?.message || t('messages.actionError');
        setError(message);
      } finally {
        updateProcessing(request.id, false);
      }
    },
    [confirmPopup, removeRequest, t, updateProcessing],
  );

  // Apply pagination to requests
  const requestsToDisplay = useMemo(() => {
    const startIndex = pageNo * pageSize;
    const endIndex = startIndex + pageSize;
    return requests.slice(startIndex, endIndex);
  }, [requests, pageNo, pageSize]);

  const totalPages = useMemo(() => {
    return pageSize > 0 ? Math.ceil(requests.length / pageSize) : 0;
  }, [requests.length, pageSize]);

  const handlePageChange = useCallback((newPage: number) => {
    setPageNo(newPage);
  }, []);

  const pendingMessage = useMemo(() => {
    if (loading) {
      return t('states.loading');
    }
    if (requests.length === 0) {
      return t('states.empty');
    }
    return null;
  }, [loading, requests.length, t]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[#02542D]">{t('title')}</h1>
            <p className="text-sm text-slate-600">{t('description')}</p>
          </div>
        </header>

        {(successMessage || error) && (
          <div className="space-y-2">
            {successMessage && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-800">{t('pendingList.title')}</h2>
            <button
              type="button"
              onClick={() => void loadRequests()}
              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
              disabled={loading}
            >
              {t('buttons.refresh')}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('table.columns.resident')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('table.columns.contact')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('table.columns.unit')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('table.columns.proposedAccount')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('table.columns.submittedBy')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('table.columns.relation')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-slate-600">
                    {t('table.columns.time')}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold uppercase tracking-wide text-slate-600">
                    {t('table.columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pendingMessage ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                      {pendingMessage}
                    </td>
                  </tr>
                ) : (
                  requestsToDisplay.map((request) => {
                    const isProcessing = processingIds.has(request.id);
                    return (
                      <tr key={request.id} className="hover:bg-emerald-50/40">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {request.residentName || t('fallbacks.unknownResidentName')}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div className="flex flex-col">
                            <span>{request.residentPhone || '—'}</span>
                            <span className="text-xs text-slate-500">
                              {request.residentEmail || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div className="flex flex-col">
                            <span>{request.unitCode || t('fallbacks.unknownUnitCode')}</span>
                            <span className="text-xs text-slate-500">
                              {request.householdId || t('fallbacks.missingHouseholdId')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div className="flex flex-col">
                            <span>
                              {t('table.labels.username')}: {request.username || '—'}
                            </span>
                            <span className="text-xs text-slate-500">
                              {t('table.labels.email')}: {request.email || '—'}
                            </span>
                            <span className="text-xs text-slate-500">
                              {t('table.labels.autoGenerated')}: {request.autoGenerate ? t('table.values.yes') : t('table.values.no')}
                            </span>
                          </div>
                          {request.proofOfRelationImageUrl && (
                            <a
                              href={request.proofOfRelationImageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex text-xs text-emerald-600 hover:text-emerald-700"
                            >
                              {t('table.labels.viewProof')}
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div className="flex flex-col">
                            <span>{request.requestedByName || t('fallbacks.unknownRequester')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{request.relation || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDateTime(request.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleDecisionClick(request, true)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 text-emerald-600 transition hover:bg-emerald-50"
                              title={t('actions.approve')}
                              disabled={isProcessing}
                            >
                              {approveIcon}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDecisionClick(request, false)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 transition hover:bg-red-50"
                              title={t('actions.reject')}
                              disabled={isProcessing}
                            >
                              {rejectIcon}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 0 && (
            <Pagination
              currentPage={pageNo + 1}
              totalPages={totalPages}
              onPageChange={(page) => handlePageChange(page - 1)}
            />
          )}
        </div>

        {/* Confirm Popup */}
        {confirmPopup.isOpen && confirmPopup.request && (
          <PopupConfirm
            isOpen={confirmPopup.isOpen}
            onClose={() => setConfirmPopup({ isOpen: false, request: null, isApprove: false })}
            onConfirm={handleConfirmDecision}
            popupTitle={
              confirmPopup.isApprove
                ? t('actions.approve')
                : t('actions.reject')
            }
            popupContext={
              confirmPopup.isApprove
                ? t('confirmApproveMessage', { name: confirmPopup.request.residentName ?? t('fallbacks.unknownResidentName') })
                : t('confirmRejectMessage', { name: confirmPopup.request.residentName ?? t('fallbacks.unknownResidentName') })
            }
            isDanger={!confirmPopup.isApprove}
          />
        )}
      </div>
    </div>
  );
}
