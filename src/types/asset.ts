/**
 * Loại phòng trong căn hộ - dùng để phân nhóm tài sản bàn giao
 */
export enum RoomType {
  BATHROOM = 'BATHROOM',       // Nhà Tắm/WC
  LIVING_ROOM = 'LIVING_ROOM', // Phòng Khách
  BEDROOM = 'BEDROOM',         // Phòng Ngủ
  KITCHEN = 'KITCHEN',         // Nhà Bếp
  HALLWAY = 'HALLWAY',         // Hành Lang
  OTHER = 'OTHER',             // Khác
}

/**
 * Loại thiết bị - không gắn với phòng cụ thể
 */
export enum AssetType {
  TOILET = 'TOILET',                       // Bồn cầu
  SINK = 'SINK',                           // Chậu rửa
  WATER_HEATER = 'WATER_HEATER',           // Bình nóng lạnh
  SHOWER_SYSTEM = 'SHOWER_SYSTEM',         // Hệ sen vòi
  FAUCET = 'FAUCET',                       // Vòi nước
  LIGHT = 'LIGHT',                         // Đèn
  DOOR = 'DOOR',                           // Cửa
  WINDOW = 'WINDOW',                       // Cửa sổ
  ELECTRICAL_SYSTEM = 'ELECTRICAL_SYSTEM', // Hệ thống điện
  AIR_CONDITIONER = 'AIR_CONDITIONER',     // Điều hòa
  INTERNET_SYSTEM = 'INTERNET_SYSTEM',     // Hệ thống Internet
  FAN = 'FAN',                             // Quạt
  ELECTRIC_STOVE = 'ELECTRIC_STOVE',       // Bếp điện
  OTHER = 'OTHER',                         // Khác
}

export interface Asset {
  id: string;
  unitId: string;
  buildingId?: string;
  buildingCode?: string;
  unitCode?: string;
  floor?: number;
  assetType: AssetType;
  roomType?: RoomType;
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
  deleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetRequest {
  unitId: string;
  assetType: AssetType;
  roomType?: RoomType;
  assetCode: string;
  name?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  description?: string;
  active?: boolean;
  installedAt?: string;
  warrantyUntil?: string;
}

export interface UpdateAssetRequest {
  assetCode?: string;
  roomType?: RoomType;
  name?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  description?: string;
  active?: boolean;
  installedAt?: string;
  warrantyUntil?: string;
}
