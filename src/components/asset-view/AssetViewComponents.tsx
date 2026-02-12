'use client';

import { useState, useEffect } from 'react';
import {
  ChevronRight,
  Home,
  Building as BuildingIcon,
  Layers,
  X,
  Package,
  Plus,
  Eye,
  Trash2,
  Power,
  PowerOff,
  Save,
  AlertTriangle,
  Upload,
  Download,
} from 'lucide-react';
import {
  Asset,
  AssetType,
  RoomType,
  CreateAssetRequest,
  UpdateAssetRequest,
} from '@/src/types/asset';
import {
  getAssetsByUnit,
  createAsset,
  updateAsset,
  deleteAsset,
  deactivateAsset,
  importAssets,
  downloadAssetTemplate,
} from '@/src/services/base/assetService';
import { getUnitsByFloor, type Unit } from '@/src/services/base/unitService';
import { type Building } from '@/src/services/base/buildingService';

// ==================== Constants ====================

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  [RoomType.BATHROOM]: 'Nhà tắm & Vệ sinh',
  [RoomType.LIVING_ROOM]: 'Phòng khách',
  [RoomType.BEDROOM]: 'Phòng ngủ',
  [RoomType.KITCHEN]: 'Nhà bếp',
  [RoomType.HALLWAY]: 'Hành lang',

};

const ROOM_TYPE_ICONS: Record<RoomType, string> = {
  [RoomType.BATHROOM]: '🚿',
  [RoomType.LIVING_ROOM]: '🛋️',
  [RoomType.BEDROOM]: '🛏️',
  [RoomType.KITCHEN]: '🍳',
  [RoomType.HALLWAY]: '🚪',

};

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  [AssetType.TOILET]: 'Bồn cầu',
  [AssetType.BATHROOM_SINK]: 'Chậu rửa nhà tắm',
  [AssetType.WATER_HEATER]: 'Bình nóng lạnh',
  [AssetType.SHOWER_SYSTEM]: 'Hệ sen vòi nhà tắm',
  [AssetType.BATHROOM_FAUCET]: 'Vòi chậu rửa',
  [AssetType.BATHROOM_LIGHT]: 'Đèn nhà tắm',
  [AssetType.BATHROOM_DOOR]: 'Cửa nhà tắm',
  [AssetType.BATHROOM_ELECTRICAL]: 'Hệ thống điện nhà vệ sinh',
  [AssetType.LIVING_ROOM_DOOR]: 'Cửa phòng khách',
  [AssetType.LIVING_ROOM_LIGHT]: 'Đèn phòng khách',
  [AssetType.AIR_CONDITIONER]: 'Điều hòa',
  [AssetType.INTERNET_SYSTEM]: 'Hệ thống mạng Internet',
  [AssetType.FAN]: 'Quạt',
  [AssetType.LIVING_ROOM_ELECTRICAL]: 'Hệ thống điện phòng khách',
  [AssetType.BEDROOM_ELECTRICAL]: 'Hệ thống điện phòng ngủ',
  [AssetType.BEDROOM_AIR_CONDITIONER]: 'Điều hòa phòng ngủ',
  [AssetType.BEDROOM_DOOR]: 'Cửa phòng ngủ',
  [AssetType.BEDROOM_WINDOW]: 'Cửa sổ phòng ngủ',
  [AssetType.KITCHEN_LIGHT]: 'Hệ thống đèn nhà bếp',
  [AssetType.KITCHEN_ELECTRICAL]: 'Hệ thống điện nhà bếp',
  [AssetType.ELECTRIC_STOVE]: 'Bếp điện',
  [AssetType.KITCHEN_DOOR]: 'Cửa bếp và logia',
  [AssetType.HALLWAY_LIGHT]: 'Hệ thống đèn hành lang',
  [AssetType.HALLWAY_ELECTRICAL]: 'Hệ thống điện hành lang',
  [AssetType.OTHER]: 'Khác',
};

const ASSET_TYPE_PREFIX: Record<AssetType, string> = {
  [AssetType.TOILET]: 'TLT',
  [AssetType.BATHROOM_SINK]: 'BSK',
  [AssetType.WATER_HEATER]: 'WH',
  [AssetType.SHOWER_SYSTEM]: 'SHW',
  [AssetType.BATHROOM_FAUCET]: 'BFC',
  [AssetType.BATHROOM_LIGHT]: 'BLT',
  [AssetType.BATHROOM_DOOR]: 'BDR',
  [AssetType.BATHROOM_ELECTRICAL]: 'BEL',
  [AssetType.LIVING_ROOM_DOOR]: 'LRD',
  [AssetType.LIVING_ROOM_LIGHT]: 'LRL',
  [AssetType.AIR_CONDITIONER]: 'AC',
  [AssetType.INTERNET_SYSTEM]: 'INT',
  [AssetType.FAN]: 'FAN',
  [AssetType.LIVING_ROOM_ELECTRICAL]: 'LRE',
  [AssetType.BEDROOM_ELECTRICAL]: 'BRE',
  [AssetType.BEDROOM_AIR_CONDITIONER]: 'BAC',
  [AssetType.BEDROOM_DOOR]: 'BRD',
  [AssetType.BEDROOM_WINDOW]: 'BRW',
  [AssetType.KITCHEN_LIGHT]: 'KLT',
  [AssetType.KITCHEN_ELECTRICAL]: 'KEL',
  [AssetType.ELECTRIC_STOVE]: 'EST',
  [AssetType.KITCHEN_DOOR]: 'KDR',
  [AssetType.HALLWAY_LIGHT]: 'HLT',
  [AssetType.HALLWAY_ELECTRICAL]: 'HEL',
  [AssetType.OTHER]: 'OTH',
};

const ASSET_TYPE_DEFAULT_PRICE: Record<AssetType, number> = {
  [AssetType.TOILET]: 3000000,
  [AssetType.BATHROOM_SINK]: 1500000,
  [AssetType.WATER_HEATER]: 3000000,
  [AssetType.SHOWER_SYSTEM]: 2000000,
  [AssetType.BATHROOM_FAUCET]: 500000,
  [AssetType.BATHROOM_LIGHT]: 300000,
  [AssetType.BATHROOM_DOOR]: 2000000,
  [AssetType.BATHROOM_ELECTRICAL]: 1000000,
  [AssetType.LIVING_ROOM_DOOR]: 3000000,
  [AssetType.LIVING_ROOM_LIGHT]: 500000,
  [AssetType.AIR_CONDITIONER]: 8000000,
  [AssetType.INTERNET_SYSTEM]: 1000000,
  [AssetType.FAN]: 500000,
  [AssetType.LIVING_ROOM_ELECTRICAL]: 1500000,
  [AssetType.BEDROOM_ELECTRICAL]: 1500000,
  [AssetType.BEDROOM_AIR_CONDITIONER]: 8000000,
  [AssetType.BEDROOM_DOOR]: 2500000,
  [AssetType.BEDROOM_WINDOW]: 1500000,
  [AssetType.KITCHEN_LIGHT]: 400000,
  [AssetType.KITCHEN_ELECTRICAL]: 1500000,
  [AssetType.ELECTRIC_STOVE]: 5000000,
  [AssetType.KITCHEN_DOOR]: 2000000,
  [AssetType.HALLWAY_LIGHT]: 300000,
  [AssetType.HALLWAY_ELECTRICAL]: 1000000,
  [AssetType.OTHER]: 1000000,
};

const ASSET_TYPE_TO_ROOM: Record<AssetType, RoomType> = {
  [AssetType.TOILET]: RoomType.BATHROOM,
  [AssetType.BATHROOM_SINK]: RoomType.BATHROOM,
  [AssetType.WATER_HEATER]: RoomType.BATHROOM,
  [AssetType.SHOWER_SYSTEM]: RoomType.BATHROOM,
  [AssetType.BATHROOM_FAUCET]: RoomType.BATHROOM,
  [AssetType.BATHROOM_LIGHT]: RoomType.BATHROOM,
  [AssetType.BATHROOM_DOOR]: RoomType.BATHROOM,
  [AssetType.BATHROOM_ELECTRICAL]: RoomType.BATHROOM,
  [AssetType.LIVING_ROOM_DOOR]: RoomType.LIVING_ROOM,
  [AssetType.LIVING_ROOM_LIGHT]: RoomType.LIVING_ROOM,
  [AssetType.AIR_CONDITIONER]: RoomType.LIVING_ROOM,
  [AssetType.INTERNET_SYSTEM]: RoomType.LIVING_ROOM,
  [AssetType.FAN]: RoomType.LIVING_ROOM,
  [AssetType.LIVING_ROOM_ELECTRICAL]: RoomType.LIVING_ROOM,
  [AssetType.BEDROOM_ELECTRICAL]: RoomType.BEDROOM,
  [AssetType.BEDROOM_AIR_CONDITIONER]: RoomType.BEDROOM,
  [AssetType.BEDROOM_DOOR]: RoomType.BEDROOM,
  [AssetType.BEDROOM_WINDOW]: RoomType.BEDROOM,
  [AssetType.KITCHEN_LIGHT]: RoomType.KITCHEN,
  [AssetType.KITCHEN_ELECTRICAL]: RoomType.KITCHEN,
  [AssetType.ELECTRIC_STOVE]: RoomType.KITCHEN,
  [AssetType.KITCHEN_DOOR]: RoomType.KITCHEN,
  [AssetType.HALLWAY_LIGHT]: RoomType.HALLWAY,
  [AssetType.HALLWAY_ELECTRICAL]: RoomType.HALLWAY,
  [AssetType.OTHER]: RoomType.LIVING_ROOM,
};

// ==================== Helpers ====================

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date: string | null | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('vi-VN');
};

const formatNumberWithDots = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseFormattedNumber = (value: string): number | null => {
  if (!value || value.trim() === '') return null;
  const cleaned = value.replace(/\./g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
};

// ==================== ExpandableRow ====================

interface ExpandableRowProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  level?: number;
}

const ExpandableRow = ({ title, subtitle, isExpanded, onToggle, children, icon, actions, level = 0 }: ExpandableRowProps) => (
  <div className={`border border-slate-200 rounded-lg mb-2 overflow-hidden shadow-sm bg-white ${level > 0 ? 'ml-0' : ''}`}>
    <div
      className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </div>
        {icon && <div className="text-emerald-600">{icon}</div>}
        <div>
          <div className="font-semibold text-slate-800">{title}</div>
          {subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}
        </div>
      </div>
      <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
        {actions}
      </div>
    </div>
    {isExpanded && (
      <div className="p-4 border-t border-slate-200 bg-slate-50/50 pl-8">
        {children}
      </div>
    )}
  </div>
);

// ==================== BuildingRow ====================

export const BuildingRow = ({ building }: { building: Building }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const floors = Array.from({ length: building.floorsMax || 0 }, (_, i) => i + 1);

  return (
    <ExpandableRow
      title={building.name}
      subtitle={`Mã: ${building.code} • ${building.floorsMax} tầng • ${building.totalApartmentsAll} căn hộ`}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      icon={<BuildingIcon className="w-5 h-5" />}
    >
      {floors.length === 0 ? (
        <div className="text-center py-4 text-slate-500">Không có tầng nào</div>
      ) : (
        <div className="space-y-2">
          {floors.map(floor => (
            <FloorRow key={floor} floor={floor} buildingId={building.id} buildingCode={building.code} />
          ))}
        </div>
      )}
    </ExpandableRow>
  );
};

// ==================== FloorRow ====================

const FloorRow = ({ floor, buildingId, buildingCode }: { floor: number; buildingId: string; buildingCode: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleToggle = async () => {
    if (!isExpanded && !loaded) {
      setLoading(true);
      try {
        const data = await getUnitsByFloor(buildingId, floor);
        setUnits(data.sort((a, b) => a.code.localeCompare(b.code)));
        setLoaded(true);
      } catch (error) {
        console.error('Failed to load units', error);
      } finally {
        setLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <ExpandableRow
      title={`Tầng ${floor}`}
      subtitle={loaded ? `${units.length} căn hộ` : undefined}
      isExpanded={isExpanded}
      onToggle={handleToggle}
      icon={<Layers className="w-5 h-5" />}
      level={1}
    >
      {loading ? (
        <div className="text-center py-4 text-slate-500">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {units.map(unit => (
            <UnitCard key={unit.id} unit={unit} buildingId={buildingId} buildingCode={buildingCode} />
          ))}
          {units.length === 0 && !loading && (
            <div className="col-span-full text-center py-4 text-slate-500">Không có căn hộ nào</div>
          )}
        </div>
      )}
    </ExpandableRow>
  );
};

// ==================== UnitCard ====================

const UnitCard = ({ unit, buildingId, buildingCode }: { unit: Unit; buildingId: string; buildingCode: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className="border border-slate-200 rounded-lg p-3 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer bg-white group"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-slate-700 group-hover:text-emerald-700">{unit.code}</div>
          <Home className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Package className="w-3.5 h-3.5" />
          <span>{unit.name || 'Xem thiết bị'}</span>
        </div>
      </div>
      {isOpen && (
        <AssetModal
          unit={unit}
          buildingId={buildingId}
          buildingCode={buildingCode}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

// ==================== AssetModal ====================

const AssetModal = ({
  unit,
  buildingId,
  buildingCode,
  onClose,
}: {
  unit: Unit;
  buildingId: string;
  buildingCode: string;
  onClose: () => void;
}) => {
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteAsset, setPendingDeleteAsset] = useState<Asset | null>(null);

  // Group assets by roomType on the client side so inactive assets remain visible
  const groupedAssets: Record<string, Asset[]> = {};
  for (const asset of allAssets) {
    const key = asset.roomType || 'null';
    if (!groupedAssets[key]) groupedAssets[key] = [];
    groupedAssets[key].push(asset);
  }

  const loadAssets = async () => {
    setLoading(true);
    try {
      const all = await getAssetsByUnit(unit.id);
      setAllAssets(all);
    } catch (error) {
      console.error('Failed to load assets', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [unit.id]);

  const handleCreate = () => {
    setEditingAsset(null);
    setShowForm(true);
  };

  const handleViewDetail = (asset: Asset) => {
    setViewingAsset(asset);
  };

  const handleDeleteClick = (asset: Asset) => {
    setPendingDeleteAsset(asset);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteAsset) return;
    try {
      await deleteAsset(pendingDeleteAsset.id);
      setShowDeleteConfirm(false);
      setPendingDeleteAsset(null);
      await loadAssets();
    } catch (error) {
      console.error('Failed to delete asset', error);
      alert('Không thể xóa thiết bị');
    }
  };

  const handleToggleStatus = async (asset: Asset) => {
    try {
      if (asset.active) {
        await deactivateAsset(asset.id);
        setAllAssets(prev => prev.map(a => a.id === asset.id ? { ...a, active: false } : a));
      } else {
        await updateAsset(asset.id, { active: true });
        setAllAssets(prev => prev.map(a => a.id === asset.id ? { ...a, active: true } : a));
      }
    } catch (error) {
      console.error('Failed to toggle asset status', error);
      alert('Không thể thay đổi trạng thái thiết bị');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAsset(null);
    loadAssets();
  };

  const totalAssets = allAssets.length;
  const activeAssets = allAssets.filter(a => a.active).length;

  const roomOrder: RoomType[] = [
    RoomType.LIVING_ROOM,
    RoomType.BEDROOM,
    RoomType.BATHROOM,
    RoomType.KITCHEN,
    RoomType.HALLWAY,

  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Căn hộ {unit.code}
            </h3>
            <p className="text-sm text-slate-500">
              {totalAssets} thiết bị • {activeAssets} đang hoạt động
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              Thêm
            </button>
            <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 flex-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : totalAssets === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>Chưa có thiết bị nào trong căn hộ này</p>
              <button
                type="button"
                onClick={handleCreate}
                className="mt-3 inline-flex items-center gap-1.5 text-emerald-600 font-semibold hover:text-emerald-700"
              >
                <Plus className="w-4 h-4" />
                Thêm thiết bị đầu tiên
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {roomOrder.map(roomType => {
                const assets = groupedAssets[roomType];
                if (!assets || assets.length === 0) return null;

                return (
                  <RoomSection
                    key={roomType}
                    roomType={roomType}
                    assets={assets}
                    onViewDetail={handleViewDetail}
                    onDelete={handleDeleteClick}
                    onToggleStatus={handleToggleStatus}
                  />
                );
              })}

              {/* Thiết bị không thuộc phòng nào */}
              {groupedAssets['null'] && groupedAssets['null'].length > 0 && (
                <RoomSection
                  roomType={null}
                  assets={groupedAssets['null']}
                  onViewDetail={handleViewDetail}
                  onDelete={handleDeleteClick}
                  onToggleStatus={handleToggleStatus}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && pendingDeleteAsset && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h4 className="font-bold text-slate-800">Xác nhận xóa</h4>
            </div>
            <p className="text-slate-600 mb-4">
              Bạn có chắc chắn muốn xóa thiết bị <strong>{pendingDeleteAsset.name || pendingDeleteAsset.assetCode}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setPendingDeleteAsset(null); }}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <AssetFormModal
          unitId={unit.id}
          unitCode={unit.code}
          buildingCode={buildingCode}
          existingAssets={allAssets}
          editingAsset={null}
          onClose={() => { setShowForm(false); }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* View detail modal */}
      {viewingAsset && (
        <AssetDetailModal
          asset={viewingAsset}
          onClose={() => setViewingAsset(null)}
        />
      )}
    </div>
  );
};

// ==================== RoomSection ====================

const RoomSection = ({
  roomType,
  assets,
  onViewDetail,
  onDelete,
  onToggleStatus,
}: {
  roomType: RoomType | null;
  assets: Asset[];
  onViewDetail: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onToggleStatus: (asset: Asset) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const activeCount = assets.filter(a => a.active).length;
  const label = roomType ? ROOM_TYPE_LABELS[roomType] : 'Khác';
  const icon = roomType ? ROOM_TYPE_ICONS[roomType] : '📦';

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-slate-700">{label}</span>
          <span className="text-sm text-slate-500">
            ({assets.length} thiết bị • {activeCount} hoạt động)
          </span>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
        />
      </div>

      {isExpanded && (
        <div className="divide-y divide-slate-100">
          {assets.map(asset => (
            <AssetRow
              key={asset.id}
              asset={asset}
              onViewDetail={onViewDetail}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== AssetRow ====================

const AssetRow = ({
  asset,
  onViewDetail,
  onDelete,
  onToggleStatus,
}: {
  asset: Asset;
  onViewDetail: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onToggleStatus: (asset: Asset) => void;
}) => {
  return (
    <div className={`flex items-center justify-between p-3 hover:bg-slate-50 transition-colors ${!asset.active ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800 truncate">
            {asset.name || ASSET_TYPE_LABELS[asset.assetType] || asset.assetCode}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${asset.active
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500'
            }`}>
            {asset.active ? 'Hoạt động' : 'Ngừng'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
          <span>Mã: {asset.assetCode}</span>
          <span>Loại: {ASSET_TYPE_LABELS[asset.assetType]}</span>
          {asset.purchasePrice != null && (
            <span>Giá: {formatCurrency(asset.purchasePrice)}</span>
          )}
          {asset.installedAt && (
            <span>Lắp đặt: {formatDate(asset.installedAt)}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => onViewDetail(asset)}
          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          title="Xem chi tiết"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onToggleStatus(asset)}
          className={`p-1.5 rounded-md transition-colors ${asset.active
            ? 'text-amber-600 hover:bg-amber-50'
            : 'text-emerald-600 hover:bg-emerald-50'
            }`}
          title={asset.active ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
        >
          {asset.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={() => onDelete(asset)}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="Xóa"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ==================== AssetDetailModal ====================

const AssetDetailModal = ({
  asset,
  onClose,
}: {
  asset: Asset;
  onClose: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={e => e.stopPropagation()}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h4 className="font-bold text-slate-800">Chi tiết thiết bị</h4>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Detail body */}
        <div className="overflow-y-auto p-4 flex-1 space-y-3">
          <DetailRow label="Loại phòng" value={asset.roomType ? ROOM_TYPE_LABELS[asset.roomType] : '-'} />
          <DetailRow label="Loại thiết bị" value={ASSET_TYPE_LABELS[asset.assetType] || asset.assetType} />
          <DetailRow label="Mã thiết bị" value={asset.assetCode} />
          <DetailRow label="Tên thiết bị" value={asset.name || '-'} />
          <DetailRow label="Ngày lắp đặt" value={formatDate(asset.installedAt)} />
          <DetailRow label="Giá mua" value={asset.purchasePrice != null ? formatCurrency(asset.purchasePrice) : '-'} />
          <DetailRow
            label="Trạng thái"
            value={
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${asset.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {asset.active ? 'Hoạt động' : 'Ngừng hoạt động'}
              </span>
            }
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-b-0">
    <span className="text-sm font-medium text-slate-500 w-32 flex-shrink-0">{label}</span>
    <span className="text-sm text-slate-800">{value}</span>
  </div>
);

// ==================== AssetFormModal ====================

interface AssetFormState {
  assetType: AssetType;
  roomType: RoomType;
  assetCode: string;
  name: string;
  active: boolean;
  installedAt: string;
  purchasePrice: number | null;
}

const AssetFormModal = ({
  unitId,
  unitCode,
  buildingCode,
  existingAssets,
  editingAsset,
  onClose,
  onSuccess,
}: {
  unitId: string;
  unitCode: string;
  buildingCode: string;
  existingAssets: Asset[];
  editingAsset: Asset | null;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const isCreateMode = !editingAsset;
  const today = new Date().toISOString().split('T')[0];

  const initialAssetType = editingAsset?.assetType || AssetType.AIR_CONDITIONER;
  const initialRoomType = editingAsset?.roomType || ASSET_TYPE_TO_ROOM[initialAssetType] || RoomType.LIVING_ROOM;

  const [form, setForm] = useState<AssetFormState>({
    assetType: initialAssetType,
    roomType: initialRoomType,
    assetCode: editingAsset?.assetCode || '',
    name: editingAsset?.name || ASSET_TYPE_LABELS[initialAssetType],
    active: editingAsset?.active ?? true,
    installedAt: editingAsset?.installedAt ? editingAsset.installedAt.split('T')[0] : today,
    purchasePrice: editingAsset?.purchasePrice ?? ASSET_TYPE_DEFAULT_PRICE[initialAssetType],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate code for create mode
  useEffect(() => {
    if (isCreateMode) {
      const prefix = ASSET_TYPE_PREFIX[form.assetType];
      const existingOfType = existingAssets.filter(
        a => a.assetType === form.assetType &&
          a.assetCode.startsWith(`${prefix}-${unitCode}-`)
      );

      let nextNumber = 1;
      if (existingOfType.length > 0) {
        const numbers = existingOfType
          .map(a => {
            const match = a.assetCode.match(/-(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter(n => n > 0);
        if (numbers.length > 0) {
          nextNumber = Math.max(...numbers) + 1;
        }
      }

      const numberStr = nextNumber.toString().padStart(3, '0');
      const generatedCode = `${prefix}-${unitCode}-${numberStr}`;

      setForm(prev => ({
        ...prev,
        assetCode: generatedCode,
        name: ASSET_TYPE_LABELS[form.assetType],
        roomType: ASSET_TYPE_TO_ROOM[form.assetType] || RoomType.LIVING_ROOM,
        purchasePrice: ASSET_TYPE_DEFAULT_PRICE[form.assetType],
      }));
    }
  }, [form.assetType, isCreateMode, unitCode]);

  const handleSave = async () => {
    if (!form.assetCode.trim()) {
      setError('Mã thiết bị không được để trống');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isCreateMode) {
        // Check for duplicate active asset
        if (form.active) {
          const existingActive = existingAssets.find(
            a => a.assetType === form.assetType && a.active
          );
          if (existingActive) {
            setError(`Đã có "${ASSET_TYPE_LABELS[form.assetType]}" đang hoạt động. Vui lòng vô hiệu hóa trước.`);
            setSaving(false);
            return;
          }
        }

        // Check for inactive asset to reactivate
        const existingInactive = existingAssets.find(
          a => a.assetType === form.assetType && !a.active
        );

        if (existingInactive && form.active) {
          // Reactivate existing inactive asset
          const payload: UpdateAssetRequest = {
            active: true,
            assetCode: form.assetCode.trim(),
            name: form.name.trim() || undefined,
            roomType: form.roomType,
            installedAt: form.installedAt || undefined,
            purchasePrice: form.purchasePrice ?? undefined,
          };
          await updateAsset(existingInactive.id, payload);
        } else {
          const payload: CreateAssetRequest = {
            unitId,
            assetType: form.assetType,
            roomType: form.roomType,
            assetCode: form.assetCode.trim(),
            name: form.name.trim() || undefined,
            active: form.active,
            installedAt: form.installedAt || undefined,
            purchasePrice: form.purchasePrice ?? undefined,
          };
          await createAsset(payload);
        }
      } else {
        // Update
        if (form.active && editingAsset) {
          const existingActive = existingAssets.find(
            a => a.assetType === editingAsset.assetType && a.active && a.id !== editingAsset.id
          );
          if (existingActive) {
            setError(`Đã có "${ASSET_TYPE_LABELS[editingAsset.assetType]}" đang hoạt động. Vui lòng vô hiệu hóa trước.`);
            setSaving(false);
            return;
          }
        }

        const payload: UpdateAssetRequest = {
          assetCode: form.assetCode.trim(),
          roomType: form.roomType,
          name: form.name.trim() || undefined,
          active: form.active,
          installedAt: form.installedAt || undefined,
          purchasePrice: form.purchasePrice ?? undefined,
        };
        await updateAsset(editingAsset!.id, payload);
      }
      onSuccess();
    } catch (err: any) {
      console.error('Failed to save asset:', err);
      let msg = err?.response?.data?.message || err?.message || 'Không thể lưu thiết bị';
      if (msg.includes('uq_asset_code')) {
        msg = 'Mã thiết bị đã tồn tại. Vui lòng chọn mã khác.';
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Group asset types by room for easier selection
  const assetTypesByRoom: Record<string, AssetType[]> = {};
  for (const [assetType, roomType] of Object.entries(ASSET_TYPE_TO_ROOM)) {
    const key = roomType as string;
    if (!assetTypesByRoom[key]) assetTypesByRoom[key] = [];
    assetTypesByRoom[key].push(assetType as AssetType);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
      <form className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onSubmit={e => e.preventDefault()} onMouseDown={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h4 className="font-bold text-slate-800">
            {isCreateMode ? 'Thêm thiết bị mới' : 'Sửa thiết bị'}
          </h4>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form body */}
        <div className="overflow-y-auto p-4 flex-1 space-y-4">
          {/* Apartment info (read-only) */}
          <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
            Căn hộ: <strong>{unitCode}</strong> • Tòa: <strong>{buildingCode}</strong>
          </div>

          {/* Room Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Loại phòng</label>
            <select
              value={form.roomType}
              onChange={e => {
                const newRoomType = e.target.value as RoomType;
                setForm(prev => {
                  // Auto-select first asset type of the new room type
                  const availableTypes = assetTypesByRoom[newRoomType] || [];
                  const newAssetType = availableTypes.length > 0 ? availableTypes[0] : prev.assetType;
                  return { ...prev, roomType: newRoomType, assetType: newAssetType };
                });
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              {Object.entries(ROOM_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Asset Type - filtered by selected Room Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Loại thiết bị</label>
            <select
              value={form.assetType}
              onChange={e => setForm(prev => ({ ...prev, assetType: e.target.value as AssetType }))}
              disabled={!isCreateMode}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {(assetTypesByRoom[form.roomType] || []).map(at => (
                <option key={at} value={at}>
                  {ASSET_TYPE_LABELS[at]}
                </option>
              ))}
            </select>
          </div>

          {/* Asset Code */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mã thiết bị</label>
            <input
              type="text"
              value={form.assetCode}
              onChange={e => setForm(prev => ({ ...prev, assetCode: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="VD: AC-A101-001"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên thiết bị</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Tên thiết bị"
            />
          </div>

          {/* Installed At */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày lắp đặt</label>
            <input
              type="date"
              value={form.installedAt}
              onChange={e => setForm(prev => ({ ...prev, installedAt: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Purchase Price */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Giá mua (VNĐ)</label>
            <input
              type="text"
              value={formatNumberWithDots(form.purchasePrice)}
              onChange={e => setForm(prev => ({ ...prev, purchasePrice: parseFormattedNumber(e.target.value) }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="VD: 8.000.000"
            />
          </div>



          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onClose()}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : isCreateMode ? 'Tạo' : 'Cập nhật'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ==================== AssetImportModal ====================

export const AssetImportModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const response = await importAssets(file);
      if (response.status === 200) {
        onSuccess();
        onClose();
        window.location.reload();
      } else if (response.status === 400 && response.data && response.data.byteLength > 0) {
        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'import_errors.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setError('Có lỗi khi import. File báo lỗi đã được tải xuống, vui lòng kiểm tra.');
      } else {
        setError('Import thất bại. Vui lòng thử lại.');
      }
    } catch (err: any) {
      console.error('Upload failed', err);
      setError(err.message || 'Import thất bại. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadAssetTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'asset_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Template download failed', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-800">Import thiết bị</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="space-y-4">
          <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center bg-slate-50">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <label className="block">
              <span className="sr-only">Chọn file</span>
              <input type="file" onChange={handleFileChange} accept=".xlsx, .xls" className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-emerald-50 file:text-emerald-700
                hover:file:bg-emerald-100
              "/>
            </label>
            {file && <p className="mt-2 text-sm text-emerald-600 font-medium">{file.name}</p>}
          </div>

          <div className="text-sm text-slate-500">
            <p>Tải file mẫu để điền dữ liệu thiết bị cần import:</p>
            <button onClick={handleDownloadTemplate} className="text-emerald-600 hover:underline font-medium flex items-center gap-1 mt-1">
              <Download className="w-3 h-3" /> Tải template
            </button>
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? 'Đang import...' : 'Bắt đầu import'}
          </button>
        </div>
      </div>
    </div>
  );
};
