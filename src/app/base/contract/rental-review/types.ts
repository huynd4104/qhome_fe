import { ContractSummary } from '@/src/services/base/contractService';

export interface RentalContractWithUnit extends ContractSummary {
  unitCode?: string;
  unitName?: string;
  buildingCode?: string;
  buildingName?: string;
  monthlyRent?: number | null;
}














