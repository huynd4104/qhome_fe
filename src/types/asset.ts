export enum AssetType {
  AIR_CONDITIONER = 'AIR_CONDITIONER',
  KITCHEN = 'KITCHEN',
  WATER_HEATER = 'WATER_HEATER',
  FURNITURE = 'FURNITURE',
  OTHER = 'OTHER',
}

export interface Asset {
  id: string;
  unitId: string;
  buildingId?: string;
  buildingCode?: string;
  unitCode?: string;
  floor?: number;
  assetType: AssetType;
  assetCode: string;
  name?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  description?: string;
  active: boolean;
  installedAt?: string;
  removedAt?: string;
  warrantyUntil?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetRequest {
  unitId: string;
  assetType: AssetType;
  assetCode: string;
  name?: string;
  active?: boolean;
  installedAt?: string;
  purchasePrice?: number;
}

export interface UpdateAssetRequest {
  assetCode?: string;
  name?: string;
  active?: boolean;
  installedAt?: string;
  purchasePrice?: number;
}





