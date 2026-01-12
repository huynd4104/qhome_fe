import { useCallback, useEffect, useState } from 'react';
import { Building } from '@/src/types/building';
import { Unit } from '@/src/types/unit';
import { getBuildings } from '@/src/services/base/buildingService';
import { getUnitsByBuilding } from '@/src/services/base/unitService';

export interface BuildingWithUnits extends Building {
  units?: Unit[];
  isExpanded?: boolean;
}

const initialPageSize = 10;

export const useUnitPage = () => {
  const [buildings, setBuildings] = useState<BuildingWithUnits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageNo, setPageNo] = useState<number>(0);
  const [pageSize] = useState<number>(initialPageSize);

  // Load dữ liệu ban đầu
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Lấy danh sách buildings
        const buildingsData = await getBuildings();
        
        const buildingsWithData: BuildingWithUnits[] = [];

        for (const building of buildingsData) {
          const units = await getUnitsByBuilding(building.id);
          
          // Lấy tất cả units (bao gồm cả inactive)
          buildingsWithData.push({
            ...building,
            units: units,
            isExpanded: false
          });
        }

        setBuildings(buildingsWithData);
        setPageNo(0);
      } catch (err) {
        console.error('Error loading unit data:', err);
        setError('Failed to load unit data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Toggle building expansion
  const toggleBuilding = useCallback((buildingId: string) => {
    setBuildings(prev => 
      prev.map(building => 
        building.id === buildingId 
          ? { ...building, isExpanded: !building.isExpanded }
          : building
      )
    );
  }, []);

  // Refresh data
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const buildingsData = await getBuildings();
      
      const buildingsWithData: BuildingWithUnits[] = [];

      for (const building of buildingsData) {
        const units = await getUnitsByBuilding(building.id);
        
        // Lấy tất cả units (bao gồm cả inactive)
        buildingsWithData.push({
          ...building,
          units: units,
          isExpanded: false
        });
      }

      setBuildings(buildingsWithData);
      setPageNo(0);
    } catch (err) {
      console.error('Error refreshing unit data:', err);
      setError('Failed to refresh unit data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPageNo(newPage);
  }, []);

  return {
    buildings,
    loading,
    error,
    toggleBuilding,
    refresh,
    pageNo,
    pageSize,
    handlePageChange
  };
};

