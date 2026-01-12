import axios from "@/src/lib/axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

export enum InspectionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface AssetInspectionItem {
  id: string;
  assetId: string;
  assetCode?: string;
  assetName?: string;
  assetType?: string;
  conditionStatus?: string;
  notes?: string;
  checked: boolean;
  checkedAt?: string;
  checkedBy?: string;
  repairCost?: number; // Frontend uses repairCost for display
  damageCost?: number; // Backend returns damageCost - map this to repairCost
  purchasePrice?: number;
}

export interface AssetInspection {
  id: string;
  contractId: string;
  unitId: string;
  unitCode?: string;
  inspectionDate: string;
  status: InspectionStatus;
  inspectorName?: string;
  inspectorId?: string;
  inspectorNotes?: string;
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
  items: AssetInspectionItem[];
  totalDamageCost?: number;
  invoiceId?: string;
}

export interface CreateAssetInspectionRequest {
  contractId: string;
  unitId: string;
  inspectionDate: string;
  inspectorName?: string;
  inspectorId?: string;
  scheduledDate?: string;
}

export interface UpdateAssetInspectionItemRequest {
  conditionStatus?: string;
  notes?: string;
  checked?: boolean;
  checkedBy?: string;
  damageCost?: number; // Backend uses 'damageCost', not 'repairCost'
}

export async function getInspectionByContractId(contractId: string): Promise<AssetInspection | null> {
  try {
    const response = await axios.get<AssetInspection>(
      `${BASE_URL}/api/asset-inspections/contract/${contractId}`,
    );
    // Map damageCost from backend to repairCost for frontend compatibility
    // Backend uses damageCost as source of truth, so always use it if available
    if (response.data && response.data.items) {
      response.data.items = response.data.items.map(item => ({
        ...item,
        repairCost: item.damageCost !== undefined && item.damageCost !== null 
          ? item.damageCost 
          : (item.repairCost !== undefined && item.repairCost !== null ? item.repairCost : undefined)
      }));
    }
    console.log('📥 getInspectionByContractId: Mapped items:', response.data?.items?.map(item => ({
      id: item.id,
      assetName: item.assetName || item.assetCode,
      damageCost: item.damageCost,
      repairCost: item.repairCost
    })));
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;

    }
    throw error;
  }
}

export async function createInspection(request: CreateAssetInspectionRequest): Promise<AssetInspection> {
  const response = await axios.post<AssetInspection>(
    `${BASE_URL}/api/asset-inspections`,
    request,
  );
  return response.data;
}

export async function updateInspectionItem(
  itemId: string,
  request: UpdateAssetInspectionItemRequest
): Promise<AssetInspectionItem> {
  console.log('🌐 API: Updating inspection item:', {
    itemId,
    url: `${BASE_URL}/api/asset-inspections/items/${itemId}`,
    request: JSON.stringify(request, null, 2),
    requestKeys: Object.keys(request),
    hasConditionStatus: 'conditionStatus' in request,
    conditionStatusValue: (request as any).conditionStatus
  });
  
  const response = await axios.put<AssetInspectionItem>(
    `${BASE_URL}/api/asset-inspections/items/${itemId}`,
    request,
  );
  
  console.log('📥 API: Raw response from backend:', {
    status: response.status,
    data: JSON.stringify(response.data, null, 2),
    conditionStatusInResponse: response.data.conditionStatus,
    damageCostInResponse: response.data.damageCost
  });
  
  // Map damageCost from backend to repairCost for frontend compatibility
  const mappedItem: AssetInspectionItem = {
    ...response.data,
    repairCost: response.data.damageCost !== undefined ? response.data.damageCost : response.data.repairCost
  };
  
  console.log('✅ API: Mapped item after update:', {
    ...mappedItem,
    conditionStatus: mappedItem.conditionStatus,
    damageCost: mappedItem.damageCost,
    repairCost: mappedItem.repairCost
  });
  
  return mappedItem;
}

export async function startInspection(inspectionId: string): Promise<AssetInspection> {
  const response = await axios.put<AssetInspection>(
    `${BASE_URL}/api/asset-inspections/${inspectionId}/start`,
  );
  // Map damageCost from backend to repairCost for frontend compatibility
  if (response.data && response.data.items) {
    response.data.items = response.data.items.map(item => ({
      ...item,
      repairCost: item.damageCost !== undefined ? item.damageCost : item.repairCost
    }));
  }
  return response.data;
}

export async function completeInspection(
  inspectionId: string,
  inspectorNotes?: string
): Promise<AssetInspection> {
  const response = await axios.put<AssetInspection>(
    `${BASE_URL}/api/asset-inspections/${inspectionId}/complete`,
    inspectorNotes,
    {
      headers: {
        'Content-Type': 'text/plain',
      },
    }
  );
  // Map damageCost from backend to repairCost for frontend compatibility
  if (response.data && response.data.items) {
    response.data.items = response.data.items.map(item => ({
      ...item,
      repairCost: item.damageCost !== undefined ? item.damageCost : item.repairCost
    }));
  }
  return response.data;
}

export async function recalculateDamageCost(inspectionId: string): Promise<AssetInspection> {
  console.log('Calling recalculateDamageCost API for inspection:', inspectionId);
  try {
    const response = await axios.post<AssetInspection>(
      `${BASE_URL}/api/asset-inspections/${inspectionId}/recalculate-damage`,
    );
    // Map damageCost from backend to repairCost for frontend compatibility
    if (response.data && response.data.items) {
      response.data.items = response.data.items.map(item => ({
        ...item,
        repairCost: item.damageCost !== undefined ? item.damageCost : item.repairCost
      }));
    }
    console.log('RecalculateDamageCost API response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('RecalculateDamageCost API error:', error);
    console.error('Error response:', error?.response?.data);
    throw error;
  }
}

export async function generateInvoice(inspectionId: string): Promise<AssetInspection> {
  console.log('Calling generateInvoice API for inspection:', inspectionId);
  try {
    const response = await axios.post<AssetInspection>(
      `${BASE_URL}/api/asset-inspections/${inspectionId}/generate-invoice`,
    );
    // Map damageCost from backend to repairCost for frontend compatibility
    if (response.data && response.data.items) {
      response.data.items = response.data.items.map(item => ({
        ...item,
        repairCost: item.damageCost !== undefined ? item.damageCost : item.repairCost
      }));
    }
    console.log('GenerateInvoice API response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('GenerateInvoice API error:', error);
    console.error('Error response:', error?.response?.data);
    throw error;
  }
}

export interface AssignInspectorRequest {
  inspectorId: string;
  inspectorName: string;
}

export async function assignInspector(
  inspectionId: string,
  request: AssignInspectorRequest
): Promise<AssetInspection> {
  const response = await axios.put<AssetInspection>(
    `${BASE_URL}/api/asset-inspections/${inspectionId}/assign-inspector`,
    request,
  );
  // Map damageCost from backend to repairCost for frontend compatibility
  if (response.data && response.data.items) {
    response.data.items = response.data.items.map(item => ({
      ...item,
      repairCost: item.damageCost !== undefined ? item.damageCost : item.repairCost
    }));
  }
  return response.data;
}

export async function getAllInspections(
  inspectorId?: string,
  status?: InspectionStatus
): Promise<AssetInspection[]> {
  const params: Record<string, string> = {};
  if (inspectorId) {
    params.inspectorId = inspectorId;
  }
  if (status) {
    params.status = status;
  }
  
  const response = await axios.get<AssetInspection[]>(
    `${BASE_URL}/api/asset-inspections`,
    { params }
  );
  // Map damageCost from backend to repairCost for frontend compatibility
  return response.data.map(inspection => ({
    ...inspection,
    items: inspection.items?.map(item => ({
      ...item,
      repairCost: item.damageCost !== undefined ? item.damageCost : item.repairCost
    }))
  }));
}

export async function getInspectionById(inspectionId: string): Promise<AssetInspection | null> {
  try {
    const response = await axios.get<AssetInspection>(
      `${BASE_URL}/api/asset-inspections/${inspectionId}`,
    );
    // Map damageCost from backend to repairCost for frontend compatibility
    if (response.data && response.data.items) {
      response.data.items = response.data.items.map(item => ({
        ...item,
        repairCost: item.damageCost !== undefined ? item.damageCost : item.repairCost
      }));
    }
    return response.data;
  } catch (error: any) {
    // If endpoint doesn't exist or returns error, return null instead of throwing
    // This allows fallback to getInspectionByContractId
    if (error?.response?.status === 404 || error?.response?.status === 500) {
      console.warn(`getInspectionById failed (${error?.response?.status}), falling back to contract-based lookup`);
      return null;
    }
    throw error;
  }
}







