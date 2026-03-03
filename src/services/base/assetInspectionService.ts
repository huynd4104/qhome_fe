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
  repairCost?: number;
  damageCost?: number;
  purchasePrice?: number;
}

export interface AssetInspection {
  id: string;
  contractId: string;
  unitId: string;
  unitCode?: string;
  inspectionDate: string;
  scheduledDate?: string;
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
  scheduledDate?: string;
}

export interface UpdateAssetInspectionItemRequest {
  conditionStatus?: string;
  notes?: string;
  checked?: boolean;
  damageCost?: number;
}

export interface AssignInspectorRequest {
  inspectorId: string;
  inspectorName: string;
}

// ==================== Helper ====================

function mapInspectionItems(inspection: AssetInspection): AssetInspection {
  if (inspection && inspection.items) {
    inspection.items = inspection.items.map(item => ({
      ...item,
      repairCost: item.damageCost !== undefined && item.damageCost !== null
        ? item.damageCost
        : item.repairCost,
    }));
  }
  return inspection;
}

function mapInspectionListItems(inspections: AssetInspection[]): AssetInspection[] {
  return inspections.map(mapInspectionItems);
}

// ==================== API Functions ====================

/**
 * GET /api/asset-inspections/contract/:contractId
 */
export async function getInspectionByContractId(contractId: string): Promise<AssetInspection | null> {
  try {
    const response = await axios.get<AssetInspection>(
      `${BASE_URL}/api/asset-inspections/contract/${contractId}`,
    );
    return mapInspectionItems(response.data);
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * POST /api/asset-inspections
 */
export async function createInspection(request: CreateAssetInspectionRequest): Promise<AssetInspection> {
  const response = await axios.post<AssetInspection>(
    `${BASE_URL}/api/asset-inspections`,
    request,
  );
  return response.data;
}

/**
 * PUT /api/asset-inspections/items/:itemId
 */
export async function updateInspectionItem(
  itemId: string,
  request: UpdateAssetInspectionItemRequest
): Promise<AssetInspectionItem> {
  const response = await axios.put<AssetInspectionItem>(
    `${BASE_URL}/api/asset-inspections/items/${itemId}`,
    request,
  );

  const mappedItem: AssetInspectionItem = {
    ...response.data,
    repairCost: response.data.damageCost !== undefined ? response.data.damageCost : response.data.repairCost,
  };

  return mappedItem;
}

/**
 * PUT /api/asset-inspections/:inspectionId/start
 */
export async function startInspection(inspectionId: string): Promise<AssetInspection> {
  const response = await axios.put<AssetInspection>(
    `${BASE_URL}/api/asset-inspections/${inspectionId}/start`,
  );
  return mapInspectionItems(response.data);
}

/**
 * PUT /api/asset-inspections/:inspectionId/complete
 */
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
  return mapInspectionItems(response.data);
}

/**
 * POST /api/asset-inspections/:inspectionId/recalculate-damage
 */
export async function recalculateDamageCost(inspectionId: string): Promise<AssetInspection> {
  const response = await axios.post<AssetInspection>(
    `${BASE_URL}/api/asset-inspections/${inspectionId}/recalculate-damage`,
  );
  return mapInspectionItems(response.data);
}

/**
 * POST /api/asset-inspections/:inspectionId/generate-invoice
 */
export async function generateInvoice(inspectionId: string): Promise<AssetInspection> {
  const response = await axios.post<AssetInspection>(
    `${BASE_URL}/api/asset-inspections/${inspectionId}/generate-invoice`,
  );
  return mapInspectionItems(response.data);
}

/**
 * PUT /api/asset-inspections/:inspectionId/assign-inspector
 */
export async function assignInspector(
  inspectionId: string,
  request: AssignInspectorRequest
): Promise<AssetInspection> {
  const response = await axios.put<AssetInspection>(
    `${BASE_URL}/api/asset-inspections/${inspectionId}/assign-inspector`,
    request,
  );
  return mapInspectionItems(response.data);
}

/**
 * GET /api/asset-inspections
 */
export async function getAllInspections(
  inspectorId?: string,
  status?: InspectionStatus
): Promise<AssetInspection[]> {
  const params: Record<string, string> = {};
  if (inspectorId) params.inspectorId = inspectorId;
  if (status) params.status = status;

  const response = await axios.get<AssetInspection[]>(
    `${BASE_URL}/api/asset-inspections`,
    { params }
  );
  return mapInspectionListItems(response.data);
}

/**
 * GET /api/asset-inspections/:inspectionId
 */
export async function getInspectionById(inspectionId: string): Promise<AssetInspection | null> {
  try {
    const response = await axios.get<AssetInspection>(
      `${BASE_URL}/api/asset-inspections/${inspectionId}`,
    );
    return mapInspectionItems(response.data);
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.response?.status === 500) {
      console.warn(`getInspectionById failed (${error?.response?.status}), falling back to contract-based lookup`);
      return null;
    }
    throw error;
  }
}

/**
 * GET /api/asset-inspections/technician/:technicianId
 */
export async function getInspectionsByTechnician(technicianId: string): Promise<AssetInspection[]> {
  const response = await axios.get<AssetInspection[]>(
    `${BASE_URL}/api/asset-inspections/technician/${technicianId}`,
  );
  return mapInspectionListItems(response.data);
}

/**
 * GET /api/asset-inspections/my-assignments
 */
export async function getMyAssignments(): Promise<AssetInspection[]> {
  const response = await axios.get<AssetInspection[]>(
    `${BASE_URL}/api/asset-inspections/my-assignments`,
  );
  return mapInspectionListItems(response.data);
}

/**
 * GET /api/asset-inspections/pending-approval
 */
export async function getPendingApprovalInspections(): Promise<AssetInspection[]> {
  const response = await axios.get<AssetInspection[]>(
    `${BASE_URL}/api/asset-inspections/pending-approval`,
  );
  return mapInspectionListItems(response.data);
}

/**
 * POST /api/asset-inspections/:inspectionId/approve
 */
export async function approveInspection(inspectionId: string): Promise<AssetInspection> {
  const response = await axios.post<AssetInspection>(
    `${BASE_URL}/api/asset-inspections/${inspectionId}/approve`,
  );
  return mapInspectionItems(response.data);
}

/**
 * POST /api/asset-inspections/:inspectionId/reject
 */
export async function rejectInspection(inspectionId: string, rejectionNotes?: string): Promise<AssetInspection> {
  const response = await axios.post<AssetInspection>(
    `${BASE_URL}/api/asset-inspections/${inspectionId}/reject`,
    rejectionNotes,
    {
      headers: {
        'Content-Type': 'text/plain',
      },
    }
  );
  return mapInspectionItems(response.data);
}

/**
 * PUT /api/asset-inspections/:inspectionId/scheduled-date
 */
export async function updateScheduledDate(inspectionId: string, scheduledDate: string): Promise<AssetInspection> {
  const response = await axios.put<AssetInspection>(
    `${BASE_URL}/api/asset-inspections/${inspectionId}/scheduled-date`,
    { scheduledDate },
  );
  return mapInspectionItems(response.data);
}
