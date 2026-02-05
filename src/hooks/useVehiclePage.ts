import { useCallback, useEffect, useState } from 'react';
import { Vehicle, VehicleKind } from '@/src/types/vehicle';
import { Building } from '@/src/types/building';
import { Unit } from '@/src/types/unit';
import { getBuildings } from '@/src/services/base/buildingService';
import { getUnitsByBuilding } from '@/src/services/base/unitService';
import { fetchVehicleRegistrationRequests } from '@/src/services/card/vehicleRegistrationService';
import { VehicleRegistrationRequest } from '@/src/types/vehicleRegistration';
import { useAuth } from '../contexts/AuthContext';

export interface BuildingWithUnits extends Building {
  units?: UnitWithVehicles[];
  isExpanded?: boolean;
}

export interface UnitWithVehicles extends Unit {
  vehicles?: Vehicle[];
  isExpanded?: boolean;
}

export const useVehiclePage = (type: 'active' | 'pending') => {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<BuildingWithUnits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Load dữ liệu ban đầu
  useEffect(() => {
    const loadData = async () => {
      // if (!user) {
      //   setLoading(false);
      //   return;
      // }
      
      console.log("use");
      setLoading(true);
      setError(null);

      try {
        // Lấy danh sách buildings
        const buildingsData = await getBuildings();
        console.log("buildingsData", buildingsData);
        
        // Lấy danh sách vehicle registrations từ services-card-service
        // Chỉ lấy các đăng ký đã được approve (active vehicles)
        const registrationsData = type === 'active'
          ? await fetchVehicleRegistrationRequests({ status: 'APPROVED' })
          : await fetchVehicleRegistrationRequests({ status: 'PENDING' });
        console.log("registrationsData", registrationsData);

        // Map từ VehicleRegistrationRequest sang Vehicle format
        const vehiclesData: Vehicle[] = registrationsData
          .filter(reg => reg.unitId) // Chỉ lấy các đăng ký có unitId
          .map((reg: VehicleRegistrationRequest): Vehicle => {
            // Map vehicleType sang VehicleKind
            let kind: VehicleKind = VehicleKind.OTHER;
            if (reg.vehicleType === 'CAR') kind = VehicleKind.CAR;
            else if (reg.vehicleType === 'MOTORCYCLE' || reg.vehicleType === 'MOTORBIKE') kind = VehicleKind.MOTORCYCLE;
            else if (reg.vehicleType === 'BICYCLE') kind = VehicleKind.BICYCLE;

            return {
              id: reg.id,
              tenantId: '', // Không có trong registration
              residentId: reg.userId, // Dùng userId làm residentId tạm thời
              residentName: '', // Sẽ được load sau từ resident service
              unitId: reg.unitId!,
              unitCode: '', // Sẽ được map từ unit data
              plateNo: reg.licensePlate || '',
              kind: kind,
              color: reg.vehicleColor || '',
              active: reg.status === 'APPROVED',
              activatedAt: reg.approvedAt || undefined,
              registrationApprovedAt: reg.approvedAt || undefined,
              approvedBy: reg.approvedBy || undefined,
              createdAt: reg.createdAt,
              updatedAt: reg.updatedAt,
            };
          });

        // Nhóm vehicles theo unitId
        const vehiclesByUnit = vehiclesData.reduce((acc, vehicle) => {
          if (!vehicle.unitId) {
            console.warn('Vehicle missing unitId:', vehicle.id, vehicle.plateNo);
            return acc;
          }
          if (!acc[vehicle.unitId]) {
            acc[vehicle.unitId] = [];
          }
          acc[vehicle.unitId].push(vehicle);
          return acc;
        }, {} as Record<string, Vehicle[]>);

        const buildingsWithData: BuildingWithUnits[] = [];

        for (const building of buildingsData) {
          const units = await getUnitsByBuilding(building.id);
          
          // Map tất cả units (kể cả không có vehicles) và map unitCode vào vehicles nếu có
          const unitsWithVehicles = units.map(unit => ({
            ...unit,
            vehicles: (vehiclesByUnit[unit.id] || []).map(vehicle => ({
              ...vehicle,
              unitCode: unit.code, // Map unitCode vào vehicle
            })),
            isExpanded: false
          }));

          // Thêm tất cả buildings (kể cả không có units có vehicles)
          buildingsWithData.push({
            ...building,
            units: unitsWithVehicles,
            isExpanded: false
          });
        }

        setBuildings(buildingsWithData);
        console.log("buildingsWithData", buildingsWithData)
      } catch (err) {
        console.error('Error loading vehicle data:', err);
        setError('Failed to load vehicle data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [type]);

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

  // Toggle unit expansion
  const toggleUnit = useCallback((buildingId: string, unitId: string) => {
    setBuildings(prev => 
      prev.map(building => 
        building.id === buildingId
          ? {
              ...building,
              units: building.units?.map(unit =>
                unit.id === unitId
                  ? { ...unit, isExpanded: !unit.isExpanded }
                  : unit
              )
            }
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
      
      // Lấy danh sách vehicle registrations từ services-card-service
      const registrationsData = type === 'active'
        ? await fetchVehicleRegistrationRequests({ status: 'APPROVED' })
        : await fetchVehicleRegistrationRequests({ status: 'PENDING' });

      // Map từ VehicleRegistrationRequest sang Vehicle format
      const vehiclesData: Vehicle[] = registrationsData
        .filter(reg => reg.unitId)
        .map((reg: VehicleRegistrationRequest): Vehicle => {
          let kind: VehicleKind = VehicleKind.OTHER;
          if (reg.vehicleType === 'CAR') kind = VehicleKind.CAR;
          else if (reg.vehicleType === 'MOTORCYCLE' || reg.vehicleType === 'MOTORBIKE') kind = VehicleKind.MOTORCYCLE;
          else if (reg.vehicleType === 'BICYCLE') kind = VehicleKind.BICYCLE;

          return {
            id: reg.id,
            tenantId: '',
            residentId: reg.userId,
            residentName: '',
            unitId: reg.unitId!,
            unitCode: '',
            plateNo: reg.licensePlate || '',
            kind: kind,
            color: reg.vehicleColor || '',
            active: reg.status === 'APPROVED',
            activatedAt: reg.approvedAt || undefined,
            registrationApprovedAt: reg.approvedAt || undefined,
            approvedBy: reg.approvedBy || undefined,
            createdAt: reg.createdAt,
            updatedAt: reg.updatedAt,
          };
        });

      const vehiclesByUnit = vehiclesData.reduce((acc, vehicle) => {
        if (!vehicle.unitId) {
          console.warn('Vehicle missing unitId:', vehicle.id, vehicle.plateNo);
          return acc;
        }
        if (!acc[vehicle.unitId]) {
          acc[vehicle.unitId] = [];
        }
        acc[vehicle.unitId].push(vehicle);
        return acc;
      }, {} as Record<string, Vehicle[]>);

      const buildingsWithData: BuildingWithUnits[] = [];

      for (const building of buildingsData) {
        const units = await getUnitsByBuilding(building.id);
        
        // Map tất cả units (kể cả không có vehicles) và map unitCode vào vehicles nếu có
        const unitsWithVehicles = units.map(unit => ({
          ...unit,
          vehicles: (vehiclesByUnit[unit.id] || []).map(vehicle => ({
            ...vehicle,
            unitCode: unit.code,
          })),
          isExpanded: false
        }));

        // Thêm tất cả buildings (kể cả không có units có vehicles)
        buildingsWithData.push({
          ...building,
          units: unitsWithVehicles,
          isExpanded: false
        });
      }

      setBuildings(buildingsWithData);
    } catch (err) {
      console.error('Error refreshing vehicle data:', err);
      setError('Failed to refresh vehicle data');
    } finally {
      setLoading(false);
    }
  }, [type]);

  return {
    buildings,
    loading,
    error,
    toggleBuilding,
    toggleUnit,
    refresh
  };
};

