'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { fetchHouseholdsByUnit, fetchAllHouseholdMembersByHousehold, type HouseholdDto, type HouseholdMemberDto } from '@/src/services/base/householdService';
import { fetchContractsByUnit, fetchContractDetail, type ContractSummary, type ContractDetail } from '@/src/services/base/contractService';
import { getUnit } from '@/src/services/base/unitService';

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
            console.log(`Loaded ${members.length} members for household ${household.id}`, members);
            membersMap.set(household.id, members);
          } catch (err: any) {
            console.error(`Failed to load members for household ${household.id}:`, err);
            console.error('Error details:', err?.response?.data || err?.message);
            membersMap.set(household.id, []);
          }
        })
      );
      console.log('All members loaded:', membersMap);
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
    console.log('Creating timeline items:', { contracts: contracts.length, households: households.length, householdMembers: householdMembers.size });
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
  }, [contracts, households, householdMembers]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Đang diễn ra';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
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

  const getStatusBadgeClass = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes('active') || normalized.includes('đang hoạt động')) {
      return 'bg-green-100 text-green-800';
    }
    if (normalized.includes('completed') || normalized.includes('đã kết thúc')) {
      return 'bg-gray-100 text-gray-800';
    }
    if (normalized.includes('pending')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-blue-100 text-blue-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500">Lỗi: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Lịch sử căn hộ {unitCode}
            </h1>
            <p className="text-gray-600">Xem toàn bộ lịch sử hợp đồng và hộ gia đình</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            ← Quay lại
          </button>
        </div>

        {/* Timeline */}
        {timelineItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Chưa có lịch sử cho căn hộ này
          </div>
        ) : (
          <div className="space-y-4">
            {timelineItems.map((item, index) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleExpand(
                    item.id, 
                    item.type, 
                    item.type === 'contract' ? (item.data as ContractSummary).id : undefined
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-3 h-3 rounded-full ${
                          item.type === 'contract' ? 'bg-blue-500' : 'bg-green-500'
                        }`} />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 ml-6 mb-2">{item.subtitle}</p>
                      <div className="text-sm text-gray-500 ml-6">
                        <span className="font-medium">Từ:</span> {formatDate(item.startDate)}
                        {' - '}
                        <span className="font-medium">Đến:</span> {formatDate(item.endDate)}
                      </div>
                    </div>
                    <div className="ml-4">
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedItems.has(item.id) ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {expandedItems.has(item.id) && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
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
            ))}
          </div>
        )}
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
      <div className="text-sm text-gray-500">Đang tải chi tiết hợp đồng...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium text-gray-700">Số hợp đồng:</span>
          <span className="ml-2 text-gray-900">{contract.contractNumber || '-'}</span>
        </div>
        <div>
          <span className="font-medium text-gray-700">Loại hợp đồng:</span>
          <span className="ml-2 text-gray-900">
            {contract.contractType === 'RENTAL' ? 'Thuê' : contract.contractType === 'PURCHASE' ? 'Mua' : contract.contractType || '-'}
          </span>
        </div>
        <div>
          <span className="font-medium text-gray-700">Trạng thái:</span>
          <span className="ml-2 text-gray-900">{contract.status || '-'}</span>
        </div>
        {contractDetail && (
          <>
            {contractDetail.monthlyRent && (
              <div>
                <span className="font-medium text-gray-700">Tiền thuê/tháng:</span>
                <span className="ml-2 text-gray-900">{formatCurrency(contractDetail.monthlyRent)}</span>
              </div>
            )}
            {contractDetail.totalRent && (
              <div>
                <span className="font-medium text-gray-700">Tổng tiền thuê:</span>
                <span className="ml-2 text-gray-900">{formatCurrency(contractDetail.totalRent)}</span>
              </div>
            )}
            {contractDetail.purchasePrice && (
              <div>
                <span className="font-medium text-gray-700">Giá mua:</span>
                <span className="ml-2 text-gray-900">{formatCurrency(contractDetail.purchasePrice)}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Households and Members */}
      {households.length > 0 && (
        <div className="mt-6 space-y-4">
          <h4 className="font-medium text-gray-700 text-base">Hộ gia đình ({households.length})</h4>
          {households.map((household) => {
            const members = householdMembers.get(household.id) || [];
            return (
              <div key={household.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="font-medium text-gray-700">Loại hộ:</span>
                    <span className="ml-2 text-gray-900">
                      {household.kind === 'OWNER' ? 'Chủ sở hữu' : household.kind === 'TENANT' ? 'Người thuê' : 'Dịch vụ'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Chủ hộ:</span>
                    <span className="ml-2 text-gray-900">{household.primaryResidentName || '-'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Ngày bắt đầu:</span>
                    <span className="ml-2 text-gray-900">{formatDate(household.startDate)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Ngày kết thúc:</span>
                    <span className="ml-2 text-gray-900">{formatDate(household.endDate)}</span>
                  </div>
                </div>

                {/* Members list */}
                {members.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-700 mb-3 text-sm">Thành viên ({members.length})</h5>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Tên</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Quan hệ</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Ngày vào</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Ngày rời</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Vai trò</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {members.map((member) => (
                            <tr key={member.id}>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {member.residentName || '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {member.relation || '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {formatDate(member.joinedAt)}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {formatDate(member.leftAt)}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                {member.isPrimary ? (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                    Chủ hộ
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                    Thành viên
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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

function HouseholdDetails({ household, members }: { household: HouseholdDto; members: HouseholdMemberDto[] }) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="font-medium text-gray-700">Loại hộ:</span>
          <span className="ml-2 text-gray-900">
            {household.kind === 'OWNER' ? 'Chủ sở hữu' : household.kind === 'TENANT' ? 'Người thuê' : 'Dịch vụ'}
          </span>
        </div>
        <div>
          <span className="font-medium text-gray-700">Chủ hộ:</span>
          <span className="ml-2 text-gray-900">{household.primaryResidentName || '-'}</span>
        </div>
        {household.contractNumber && (
          <div>
            <span className="font-medium text-gray-700">Hợp đồng:</span>
            <span className="ml-2 text-gray-900">{household.contractNumber}</span>
          </div>
        )}
      </div>

      {/* Members list */}
      <div>
        <h4 className="font-medium text-gray-700 mb-3">Thành viên ({members.length})</h4>
        {members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Tên</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Quan hệ</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Ngày vào</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Ngày rời</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Vai trò</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {member.residentName || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {member.relation || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {formatDate(member.joinedAt)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {formatDate(member.leftAt)}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {member.isPrimary ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          Chủ hộ
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
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
          <div className="text-sm text-gray-500 italic">Không có thành viên nào</div>
        )}
      </div>
    </div>
  );
}

