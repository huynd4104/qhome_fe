/**
 * Loại phòng trong căn hộ - dùng để phân nhóm tài sản bàn giao
 */
export enum RoomType {
  BATHROOM = 'BATHROOM',       // Nhà Tắm và Vệ sinh
  LIVING_ROOM = 'LIVING_ROOM', // Phòng khách
  BEDROOM = 'BEDROOM',         // Phòng ngủ
  KITCHEN = 'KITCHEN',         // Nhà bếp
  HALLWAY = 'HALLWAY',         // Hành lang
}

/**
 * Loại thiết bị bàn giao trong căn hộ - theo danh mục hợp đồng
 */
export enum AssetType {
  // ========== Thiết bị nhà Tắm và Vệ sinh ==========
  TOILET = 'TOILET',                         // Bồn cầu
  BATHROOM_SINK = 'BATHROOM_SINK',           // Chậu rửa nhà tắm
  WATER_HEATER = 'WATER_HEATER',             // Bình nóng lạnh
  SHOWER_SYSTEM = 'SHOWER_SYSTEM',           // Hệ sen vòi nhà tắm
  BATHROOM_FAUCET = 'BATHROOM_FAUCET',       // Vòi chậu rửa
  BATHROOM_LIGHT = 'BATHROOM_LIGHT',         // Đèn nhà tắm
  BATHROOM_DOOR = 'BATHROOM_DOOR',           // Cửa nhà tắm
  BATHROOM_ELECTRICAL = 'BATHROOM_ELECTRICAL', // Hệ thống điện nhà vệ sinh

  // ========== Thiết bị phòng khách ==========
  LIVING_ROOM_DOOR = 'LIVING_ROOM_DOOR',     // Cửa phòng khách
  LIVING_ROOM_LIGHT = 'LIVING_ROOM_LIGHT',   // Đèn phòng khách
  AIR_CONDITIONER = 'AIR_CONDITIONER',       // Điều hòa
  INTERNET_SYSTEM = 'INTERNET_SYSTEM',       // Hệ thống mạng Internet
  FAN = 'FAN',                               // Quạt
  LIVING_ROOM_ELECTRICAL = 'LIVING_ROOM_ELECTRICAL', // Hệ thống điện phòng khách

  // ========== Thiết bị phòng ngủ ==========
  BEDROOM_ELECTRICAL = 'BEDROOM_ELECTRICAL', // Hệ thống điện phòng ngủ
  BEDROOM_AIR_CONDITIONER = 'BEDROOM_AIR_CONDITIONER', // Điều hòa phòng ngủ
  BEDROOM_DOOR = 'BEDROOM_DOOR',             // Cửa phòng ngủ
  BEDROOM_WINDOW = 'BEDROOM_WINDOW',         // Cửa sổ phòng ngủ

  // ========== Thiết bị nhà bếp ==========
  KITCHEN_LIGHT = 'KITCHEN_LIGHT',           // Hệ thống đèn nhà bếp
  KITCHEN_ELECTRICAL = 'KITCHEN_ELECTRICAL', // Hệ thống điện nhà bếp
  ELECTRIC_STOVE = 'ELECTRIC_STOVE',         // Bếp điện
  KITCHEN_DOOR = 'KITCHEN_DOOR',             // Cửa bếp và logia

  // ========== Thiết bị hành lang ==========
  HALLWAY_LIGHT = 'HALLWAY_LIGHT',           // Hệ thống đèn hành lang
  HALLWAY_ELECTRICAL = 'HALLWAY_ELECTRICAL', // Hệ thống điện hành lang

  // ========== Khác ==========
  OTHER = 'OTHER',                           // Khác
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
