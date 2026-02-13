'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { fetchHouseholdsByUnit, fetchAllHouseholdMembersByHousehold, type HouseholdDto, type HouseholdMemberDto } from '@/src/services/base/householdService';
import { fetchContractsByUnit, fetchContractDetail, type ContractSummary, type ContractDetail } from '@/src/services/base/contractService';
import { getUnit } from '@/src/services/base/unitService';
import {
  ArrowLeft,
  Calendar,
  FileText,
  Users,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  History
} from 'lucide-react';

interface TimelineItem {
  id: string;
  type: 'contract' | 'household';
  startDate: string;
  endDate: string | null;
  title: string;
  subtitle: string;
  status: string;
  data: ContractSummary | HouseholdDto;
  members?: HouseholdMemberDto[];
}

export default function UnitHistoryPage() {
  const t = useTranslations('Unit');
  const router = useRouter();
  const params = useParams();
  const unitId = params.id as string;

  const [unitCode, setUnitCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [households, setHouseholds] = useState<HouseholdDto[]>([]);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [householdMembers, setHouseholdMembers] = useState<Map<string, HouseholdMemberDto[]>>(new Map());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [contractDetails, setContractDetails] = useState<Map<string, ContractDetail | null>>(new Map());
  const [loadingContractDetails, setLoadingContractDetails] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!unitId) return;
    loadData();
  }, [unitId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load unit info
      const unit = await getUnit(unitId);
      setUnitCode(unit.code || '');

      // Load households and contracts in parallel
      const [householdsData, contractsData] = await Promise.all([
        fetchHouseholdsByUnit(unitId),
        fetchContractsByUnit(unitId),
      ]);

      setHouseholds(householdsData);
      setContracts(contractsData);
      console.log(`Loaded ${householdsData.length} households and ${contractsData.length} contracts for unit ${unitId}`);

      // Load members for each household (including inactive members for history)
      const membersMap = new Map<string, HouseholdMemberDto[]>();
      await Promise.all(
        householdsData.map(async (household) => {
          try {
            const members = await fetchAllHouseholdMembersByHousehold(household.id);
            membersMap.set(household.id, members);
          } catch (err: any) {
            console.error(`Failed to load members for household ${household.id}:`, err);
            membersMap.set(household.id, []);
          }
        })
      );
      setHouseholdMembers(membersMap);
    } catch (err: any) {
      console.error('Failed to load unit history:', err);
      setError(err?.response?.data?.message || err?.message || 'Không thể tải lịch sử');
    } finally {
      setLoading(false);
    }
  };

  // Create timeline items - only contracts (households are shown in ContractDetails component)
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // Sort contracts by startDate (newest first)
    const sortedContracts = [...contracts].sort((a, b) => {
      const dateA = new Date(a.startDate || '').getTime();
      const dateB = new Date(b.startDate || '').getTime();
      return dateB - dateA;
    });

    // Add only contracts (all households are shown in ContractDetails component when contract is expanded)
    sortedContracts.forEach((contract) => {
      items.push({
        id: `contract-${contract.id}`,
        type: 'contract',
        startDate: contract.startDate || '',
        endDate: contract.endDate,
        title: `Hợp đồng ${contract.contractNumber || contract.id.substring(0, 8)}`,
        subtitle: contract.contractType === 'RENTAL' ? 'Thuê' : contract.contractType === 'PURCHASE' ? 'Mua' : contract.contractType || 'Không xác định',
        status: contract.status || 'UNKNOWN',
        data: contract,
      });
    });

    return items;
  }, [contracts]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Đang diễn ra';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const toggleExpand = async (id: string, type: 'contract' | 'household', contractId?: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
        // Load contract detail if expanding a contract and not already loaded
        if (type === 'contract' && contractId && !contractDetails.has(contractId) && !loadingContractDetails.has(contractId)) {
          loadContractDetail(contractId);
        }
      }
      return newSet;
    });
  };

  const loadContractDetail = async (contractId: string) => {
    setLoadingContractDetails((prev) => new Set(prev).add(contractId));
    try {
      const detail = await fetchContractDetail(contractId);
      setContractDetails((prev) => {
        const newMap = new Map(prev);
        newMap.set(contractId, detail);
        return newMap;
      });
    } catch (err) {
      console.error(`Failed to load contract detail ${contractId}:`, err);
      setContractDetails((prev) => {
        const newMap = new Map(prev);
        newMap.set(contractId, null);
        return newMap;
      });
    } finally {
      setLoadingContractDetails((prev) => {
        const newSet = new Set(prev);
        newSet.delete(contractId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes('active') || normalized.includes('đang hoạt động')) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {status}
        </span>
      );
    }
    if (normalized.includes('completed') || normalized.includes('đã kết thúc')) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {status}
        </span>
      );
    }
    if (normalized.includes('pending')) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-sm font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
          <AlertCircle className="h-3.5 w-3.5" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
        <HelpCircle className="h-3.5 w-3.5" />
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="text-slate-500 font-medium">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 text-red-500 font-medium">
        Lỗi: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans">
      {/* Back Button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="group flex items-center gap-2 rounded-lg py-2 pl-2 pr-4 text-slate-500 transition-all hover:bg-white hover:text-emerald-700 hover:shadow-sm"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition-colors group-hover:ring-emerald-200">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          </div>
          <span className="font-semibold">{t('return')}</span>
        </button>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Main Card */}
        <div className="relative z-10 overflow-visible rounded-3xl border border-white/50 bg-white/80 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
          <div className="border-b border-slate-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <History className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Lịch sử căn hộ {unitCode}
                </h1>
                <p className="text-sm text-slate-500">Xem toàn bộ lịch sử hợp đồng và hộ gia đình</p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {timelineItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                  <History className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">Chưa có lịch sử cho căn hộ này</p>
              </div>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {timelineItems.map((item, index) => (
                  <div key={item.id} className="relative flex items-start group">
                    {/* Timeline Connector */}
                    <div className="absolute left-0 top-0 ml-5 -translate-x-1/2 md:hidden">
                      <div className={`w-3 h-3 rounded-full border-2 border-white ring-4 ring-white ${item.type === 'contract' ? 'bg-blue-500' : 'bg-emerald-500'
                        }`} />
                    </div>

                    <div className="ml-12 md:ml-0 md:w-full">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-emerald-200">
                        <div
                          className="cursor-pointer"
                          onClick={() => toggleExpand(
                            item.id,
                            item.type,
                            item.type === 'contract' ? (item.data as ContractSummary).id : undefined
                          )}
                        >
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-3 mb-2">
                                <div className={`p-1.5 rounded-lg ${item.type === 'contract' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                                  }`}>
                                  {item.type === 'contract' ? <FileText className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                                </div>
                                <h3 className="text-base font-semibold text-slate-900">
                                  {item.title}
                                </h3>
                                {getStatusBadge(item.status)}
                              </div>

                              <p className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
                                {item.subtitle}
                              </p>

                              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 bg-slate-50 rounded-lg px-3 py-2 w-fit">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                  <span>Từ: <span className="text-slate-700">{formatDate(item.startDate)}</span></span>
                                </div>
                                <div className="w-px h-3 bg-slate-200" />
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  <span>Đến: <span className="text-slate-700">{formatDate(item.endDate)}</span></span>
                                </div>
                              </div>
                            </div>

                            <div className="self-start">
                              <div className={`p-2 rounded-full transition-colors ${expandedItems.has(item.id) ? 'bg-slate-100 text-slate-600' : 'text-slate-400 group-hover:bg-slate-50 group-hover:text-slate-500'}`}>
                                {expandedItems.has(item.id) ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded content */}
                        {expandedItems.has(item.id) && (
                          <div className="mt-5 pt-5 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                            {item.type === 'contract' && (
                              <ContractDetails
                                contract={item.data as ContractSummary}
                                contractDetail={contractDetails.get((item.data as ContractSummary).id)}
                                loading={loadingContractDetails.has((item.data as ContractSummary).id)}
                                households={households.filter(h => h.contractId === (item.data as ContractSummary).id)}
                                householdMembers={householdMembers}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractDetails({
  contract,
  contractDetail,
  loading,
  households,
  householdMembers
}: {
  contract: ContractSummary;
  contractDetail?: ContractDetail | null;
  loading?: boolean;
  households: HouseholdDto[];
  householdMembers: Map<string, HouseholdMemberDto[]>;
}) {
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
        Đang tải chi tiết hợp đồng...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm bg-slate-50/50 p-4 rounded-xl border border-slate-100">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Số hợp đồng</span>
          <div className="font-medium text-slate-900">{contract.contractNumber || '-'}</div>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loại hợp đồng</span>
          <div className="font-medium text-slate-900">
            {contract.contractType === 'RENTAL' ? 'Thuê' : contract.contractType === 'PURCHASE' ? 'Mua' : contract.contractType || '-'}
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</span>
          <div className="font-medium text-slate-900">{contract.status || '-'}</div>
        </div>
        {contractDetail && (
          <>
            {contractDetail.monthlyRent && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tiền thuê/tháng</span>
                <div className="font-bold text-emerald-600">{formatCurrency(contractDetail.monthlyRent)}</div>
              </div>
            )}
            {contractDetail.totalRent && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng tiền thuê</span>
                <div className="font-bold text-emerald-600">{formatCurrency(contractDetail.totalRent)}</div>
              </div>
            )}
            {contractDetail.purchasePrice && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Giá mua</span>
                <div className="font-bold text-emerald-600">{formatCurrency(contractDetail.purchasePrice)}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Households and Members */}
      {households.length > 0 && (
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
            <Users className="h-4 w-4 text-emerald-500" />
            Hộ gia đình ({households.length})
          </h4>
          {households.map((household) => {
            const members = householdMembers.get(household.id) || [];
            return (
              <div key={household.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-50/50 p-4 border-b border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Loại hộ</span>
                      <span className="font-medium text-slate-900">
                        {household.kind === 'OWNER' ? 'Chủ sở hữu' : household.kind === 'TENANT' ? 'Người thuê' : 'Dịch vụ'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Chủ hộ</span>
                      <span className="font-medium text-slate-900">{household.primaryResidentName || '-'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Ngày bắt đầu</span>
                      <span className="font-medium text-slate-900">{formatDate(household.startDate)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Ngày kết thúc</span>
                      <span className="font-medium text-slate-900">{formatDate(household.endDate)}</span>
                    </div>
                  </div>
                </div>

                {/* Members list */}
                {members.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Quan hệ</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày vào</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày rời</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vai trò</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {members.map((member) => (
                          <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">
                              {member.residentName || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {member.relation || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {formatDate(member.joinedAt)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {formatDate(member.leftAt)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {member.isPrimary ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                  Chủ hộ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                                  Thành viên
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-slate-500 italic bg-gray-50/30">
                    Chưa có thông tin thành viên
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
