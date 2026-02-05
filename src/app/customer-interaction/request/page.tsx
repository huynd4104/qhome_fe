'use client'
import {useTranslations} from 'next-intl';
import FilterForm from "../../../components/customer-interaction/FilterForm";
import Table from "../../../components/customer-interaction/Table";
import StatusTabs from "@/src/components/customer-interaction/StatusTabs";
import { useMemo, useState, useEffect } from 'react';
import { useRequests } from '@/src/hooks/useTableRequest';
import Pagination from '@/src/components/customer-interaction/Pagination';
import { getUnit } from '@/src/services/base/unitService';
import axios from '@/src/lib/axios';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';


export default function Home() {
  const t = useTranslations('customer-interaction.Request');
  const headers = [t('unitCode') || 'Mã căn hộ', t('requestTitle'), t('residentName'), t('dateCreated'), t('status'), t('action')];

  const {
      data,
      loading,
      error,
      filters,
      pageNo,
      totalPages,
      statusCounts,
      allRequestsList,
      handleFilterChange,
      handlePageChange,
      handleStatusChange,
      handleClear,
  } = useRequests();

  const [activeStatus, setActiveStatus] = useState<string>('');
  const PAGE_SIZE = 10;
  const [unitResidentMap, setUnitResidentMap] = useState<Map<string, { unitCode: string; residentName: string }>>(new Map());

  // Override handleClear to also reset activeStatus
  const handleClearWithStatus = () => {
    setActiveStatus('');
    handleClear();
  };

  // Fetch unit and resident info for all requests
  useEffect(() => {
    const fetchUnitAndResidentInfo = async () => {
      if (!allRequestsList || allRequestsList.length === 0) return;

      const newMap = new Map<string, { unitCode: string; residentName: string }>();
      const uniqueUnitIds = new Set<string>();
      const uniqueResidentIds = new Set<string>();

      // Collect unique IDs
      allRequestsList.forEach(item => {
        if (item.unitId) uniqueUnitIds.add(item.unitId);
        if (item.residentId) uniqueResidentIds.add(item.residentId);
      });

      // Fetch all units
      const unitPromises = Array.from(uniqueUnitIds).map(async (unitId) => {
        try {
          const unit = await getUnit(unitId);
          return { unitId, unitCode: unit.code || unit.name || 'N/A' };
        } catch (err) {
          console.error(`Failed to load unit ${unitId}:`, err);
          return { unitId, unitCode: 'N/A' };
        }
      });

      // Fetch all residents
      const residentPromises = Array.from(uniqueResidentIds).map(async (residentId) => {
        try {
          const response = await axios.get(`${BASE_URL}/api/residents/${residentId}`, {
            withCredentials: true
          });
          return { residentId, residentName: response.data.fullName || 'N/A' };
        } catch (err) {
          console.error(`Failed to load resident ${residentId}:`, err);
          return { residentId, residentName: 'N/A' };
        }
      });

      const [unitResults, residentResults] = await Promise.all([
        Promise.all(unitPromises),
        Promise.all(residentPromises)
      ]);

      // Create maps for quick lookup
      const unitMap = new Map(unitResults.map(r => [r.unitId, r.unitCode]));
      const residentMap = new Map(residentResults.map(r => [r.residentId, r.residentName]));

      // Build combined map - use request id as key for unique mapping
      allRequestsList.forEach(item => {
        newMap.set(item.id, {
          unitCode: item.unitId ? (unitMap.get(item.unitId) || 'N/A') : 'N/A',
          residentName: item.residentId ? (residentMap.get(item.residentId) || item.residentName || 'N/A') : (item.residentName || 'N/A')
        });
      });

      setUnitResidentMap(newMap);
    };

    fetchUnitAndResidentInfo();
  }, [allRequestsList]);

  // Filter data first, then sort, then paginate - all done in frontend
  const { filteredTableData, filteredTotalPages } = useMemo(() => {
    // Always use allRequestsList - all filtering is done in frontend
    const sourceData = allRequestsList || [];
    
    if (sourceData.length === 0) {
      return {
        filteredTableData: [],
        filteredTotalPages: 1
      };
    }
    
    let filtered = [...sourceData];
    
    // Filter by status
    if (activeStatus === '') {
      // Filter Done and Cancelled when showing "All" tab
      filtered = filtered.filter(item => item.status !== 'Done' && item.status !== 'Cancelled');
    } else if (activeStatus === 'New') {
      // Show both New and Pending for "New" tab
      filtered = filtered.filter(item => item.status === 'New' || item.status === 'Pending');
    } else {
      // Filter by specific status
      filtered = filtered.filter(item => item.status === activeStatus);
    }
    
    // Filter by date range (dateFrom and dateTo)
    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      dateFrom.setHours(0, 0, 0, 0);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate >= dateFrom;
      });
    }
    
    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt);
        return itemDate <= dateTo;
      });
    }
    
    // Apply search filter if search term exists
    if (filters.search && filters.search.trim() !== '') {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(item => 
        (item.title?.toLowerCase().includes(searchTerm) || 
         item.id?.toLowerCase().includes(searchTerm))
      );
    }
    
    // Sort by createdAt descending (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
    
    // Paginate
    const totalFiltered = filtered.length;
    const totalPagesAfterFilter = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
    const startIndex = pageNo * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const paginatedData = filtered.slice(startIndex, endIndex);
    
    return {
      filteredTableData: paginatedData,
      filteredTotalPages: totalPagesAfterFilter
    };
  }, [allRequestsList, activeStatus, filters.search, filters.dateFrom, filters.dateTo, pageNo]);

  const tableData = useMemo(() => {
    return filteredTableData.map(item => {
      const info = unitResidentMap.get(item.id) || { unitCode: 'Loading...', residentName: item.residentName || 'N/A' };
      
      return {
        id: item.id,
        unitCode: info.unitCode,
        residentName: info.residentName,
        title: item.title,
        status: item.status,
        createdAt: item.createdAt.slice(0, 10).replace(/-/g, '/'), // Format to YYYY/MM/DD
      };
    });
  }, [filteredTableData, unitResidentMap]);

  // Use filtered totalPages (always frontend pagination now)
  const displayTotalPages = filteredTotalPages;
  
  const tabData = useMemo(() => {
    const counts = statusCounts || {}; 
    
    // Calculate total manually to ensure it includes New, Pending, Processing, Done, and Cancelled
    const calculatedTotal = (counts.New || 0) + (counts.Pending || 0) + (counts.Processing || 0) + (counts.Done || 0) + (counts.Cancelled || 0);
    const totalCount = counts.total || calculatedTotal;
    
    return [
        { title: t('totalRequests'), count: totalCount, status: '' },
        { title: t('New'), count: counts.New || 0, status: 'New' },
        { title: t('Pending'), count: counts.Pending || 0, status: 'Pending' },
        { title: t('Processing'), count: counts.Processing || 0, status: 'Processing' },
        { title: t('Done'), count: counts.Done || 0, status: 'Done' },
        { title: t('Cancel'), count: counts.Cancelled || 0, status: 'Cancelled' },
    ];
  }, [statusCounts, t]);
  
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
    <div className="lg:col-span-1 space-y-6">
      <div className="max-w-screen overflow-x-hidden ">
          <h1 className="text-2xl font-semibold text-[#02542D] mb-4">{t('requestlist')}</h1>
          <div className="bg-white p-6 rounded-xl w-full">
              <FilterForm
                filters={filters}
                onFilterChange={handleFilterChange}
                onClear={handleClearWithStatus}
              ></FilterForm>
              <StatusTabs 
                  tabList={tabData}
                  type={t("requests")}
                  onStatusChange={(status) => {
                    setActiveStatus(status);
                    handleStatusChange(status);
                  }}
                  activeStatus={activeStatus}
              ></StatusTabs>
              <Table 
                  data={tableData} 
                  headers={headers}
              ></Table>
              {displayTotalPages > 1 && (
                  <Pagination
                      currentPage={pageNo + 1}
                      totalPages={displayTotalPages}
                      onPageChange={(newPage) => handlePageChange(newPage - 1)}
                  />
              )}
          </div>
      </div>
    </div>

  )

};
