import axios from "@/src/lib/axios";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8081';

// Types for Reading Cycle
export type ReadingCycleStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';

export interface ReadingCycleDto {
  id: string;
  name: string;
  periodFrom: string; // ISO date string
  periodTo: string; // ISO date string
  status: ReadingCycleStatus;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  serviceId?: string;
  serviceCode?: string;
  serviceName?: string;
  // Keep these for backward compatibility
  fromDate?: string;
  toDate?: string;
}

export interface ReadingCycleUnassignedFloorDto {
  buildingId?: string;
  buildingCode?: string;
  buildingName?: string;
  floor: number | null;
  unitCodes: string[];
}

export interface ReadingCycleUnassignedInfoDto {
  cycleId: string;
  serviceId: string;
  totalUnassigned: number;
  floors: ReadingCycleUnassignedFloorDto[];
  message: string;
  missingMeterUnits?: UnitWithoutMeterDto[];
}

export interface ReadingCycleCreateReq {
  name: string;
  periodFrom: string;
  periodTo: string;
  description?: string;
  createdBy?: string;
  // Keep for backward compatibility
  fromDate?: string;
  toDate?: string;
  serviceId?: string;
}

export interface ReadingCycleUpdateReq {
  name?: string;
  periodFrom?: string;
  periodTo?: string;
  description?: string;
  // Keep for backward compatibility
  fromDate?: string;
  toDate?: string;
}

// Types for Meter
export interface MeterDto {
  id: string;
  unitId: string;
  buildingId?: string;
  buildingCode?: string;
  unitCode?: string;
  floor?: number;
  serviceId: string;
  serviceCode?: string;
  serviceName?: string;
  meterCode: string;
  active: boolean;
  installedAt?: string;
  removedAt?: string;
  lastReading?: number;
  lastReadingDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MeterCreateReq {
  unitId: string;
  serviceId: string;
  meterCode?: string;
  installedAt?: string;
}

export interface MeterFilterParams {
  buildingId?: string;
  serviceId?: string;
  unitId?: string;
  active?: boolean;
}

export async function getMeters(params?: MeterFilterParams): Promise<MeterDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meters`,
    {
      params,
      withCredentials: true,
    }
  );
  return response.data;
}

export interface MeterImportRowResult {
  rowNumber: number;
  success: boolean;
  message: string;
}

export interface MeterImportResponse {
  totalRows: number;
  successCount: number;
  errorCount: number;
  rows: MeterImportRowResult[];
}

// Types for Meter Reading
export interface MeterReadingDto {
  id: string;
  assignmentId?: string;
  cycleId?: string;
  meterId: string;
  meterCode?: string;
  unitId?: string;
  unitCode?: string;
  floor?: number;
  prevIndex?: number;
  currentIndex: number;
  consumption?: number;
  readingDate: string;
  note?: string;
  readerId?: string;
  photoFileId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MeterReadingCreateReq {
  assignmentId?: string;
  meterId: string;
  readingDate: string; // YYYY-MM-DD format (LocalDate)
  prevIndex: number; // Required by backend
  currIndex: number;
  cycleId?: string;
  note?: string;
  photoFileId?: string;
  readerId?: string;
}

export interface MeterReadingUpdateReq {
  readingDate?: string;
  prevIndex?: number;
  currIndex?: number;
  photoFileId?: string;
  note?: string;
}

// Types for Meter Reading Assignment
export interface MeterReadingAssignmentDto {
  id: string;
  cycleId: string;
  cycleName: string;
  buildingId?: string;
  buildingCode?: string;
  buildingName?: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  assignedTo: string;
  assignedToName?: string; // Username of assigned employee
  assignedBy: string;
  assignedAt: string;
  startDate: string;
  endDate: string;
  completedAt?: string;
  note?: string;
  floor?: number;
  floorFrom?: number;
  floorTo?: number;
  unitIds?: string[];
  progressPercentage?: number; // Progress percentage for this assignment
  createdAt: string;
  updatedAt?: string;
}

export interface MeterReadingAssignmentCreateReq {
  cycleId: string;
  buildingId?: string;
  serviceId: string;
  assignedTo: string;
  startDate?: string;
  endDate?: string;
  note?: string;
  floor?: number;
  unitIds?: string[];
}

export interface AssignmentProgressDto {
  totalMeters: number;
  readMeters: number;
  remainingMeters: number;
  progressPercentage: number;
}

// Types for Service
export interface ServiceDto {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  type: string;
  unit?: string;
  unitLabel?: string;
  billable: boolean;
  requiresMeter: boolean;
  active: boolean;
  description?: string;
  displayOrder?: number;
  createdAt: string;
  updatedAt?: string;
}

// Water Formula (stored as metadata or separate endpoint - assuming it's part of cycle config)
export interface WaterFormula {
  id: string;
  fromAmount: number;
  toAmount: number | null;
  price: number;
}

export interface WaterCycleConfig {
  cycleId: string;
  formula: WaterFormula[];
}

// Reading Cycle API
export async function getAllReadingCycles(): Promise<ReadingCycleDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/reading-cycles`,
    { withCredentials: true }
  );
  const data = response.data;
  // Map periodFrom/periodTo to fromDate/toDate for backward compatibility
  return data.map((cycle: any) => ({
    ...cycle,
    fromDate: cycle.periodFrom,
    toDate: cycle.periodTo,
  }));
}

export async function getReadingCycleById(cycleId: string): Promise<ReadingCycleDto> {
  const response = await axios.get(
    `${BASE_URL}/api/reading-cycles/${cycleId}`,
    { withCredentials: true }
  );
  const data = response.data;
  // Map periodFrom/periodTo to fromDate/toDate for backward compatibility
  return {
    ...data,
    fromDate: data.periodFrom,
    toDate: data.periodTo,
  };
}

export async function getCycleUnassignedInfo(cycleId: string, onlyWithOwner: boolean = true): Promise<ReadingCycleUnassignedInfoDto> {
  const response = await axios.get(
    `${BASE_URL}/api/reading-cycles/${cycleId}/unassigned`,
    { 
      params: { onlyWithOwner },
      withCredentials: true 
    }
  );
  return response.data;
}

export async function getReadingCyclesByStatus(status: ReadingCycleStatus): Promise<ReadingCycleDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/reading-cycles/status/${status}`,
    { withCredentials: true }
  );
  const data = response.data;
  // Map periodFrom/periodTo to fromDate/toDate for backward compatibility
  return data.map((cycle: any) => ({
    ...cycle,
    fromDate: cycle.periodFrom,
    toDate: cycle.periodTo,
  }));
}

export async function getReadingCyclesByPeriod(fromDate: string, toDate: string): Promise<ReadingCycleDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/reading-cycles/period`,
    { 
      params: { from: fromDate, to: toDate },
      withCredentials: true 
    }
  );
  const data = response.data;
  // Map periodFrom/periodTo to fromDate/toDate for backward compatibility
  return data.map((cycle: any) => ({
    ...cycle,
    fromDate: cycle.periodFrom,
    toDate: cycle.periodTo,
  }));
}

export async function createReadingCycle(req: ReadingCycleCreateReq): Promise<ReadingCycleDto> {
  // Map fromDate/toDate to periodFrom/periodTo if provided
  const requestBody = {
    name: req.name,
    periodFrom: req.periodFrom || req.fromDate,
    periodTo: req.periodTo || req.toDate,
    description: req.description,
    createdBy: req.createdBy,
  };
  
  const response = await axios.post(
    `${BASE_URL}/api/reading-cycles`,
    requestBody,
    { withCredentials: true }
  );
  const data = response.data;
  return {
    ...data,
    fromDate: data.periodFrom,
    toDate: data.periodTo,
  };
}

export async function updateReadingCycle(
  cycleId: string, 
  req: ReadingCycleUpdateReq
): Promise<ReadingCycleDto> {
  // Map fromDate/toDate to periodFrom/periodTo if provided
  const requestBody: any = {};
  if (req.name !== undefined) requestBody.name = req.name;
  if (req.periodFrom !== undefined) requestBody.periodFrom = req.periodFrom;
  else if (req.fromDate !== undefined) requestBody.periodFrom = req.fromDate;
  if (req.periodTo !== undefined) requestBody.periodTo = req.periodTo;
  else if (req.toDate !== undefined) requestBody.periodTo = req.toDate;
  if (req.description !== undefined) requestBody.description = req.description;
  
  const response = await axios.put(
    `${BASE_URL}/api/reading-cycles/${cycleId}`,
    requestBody,
    { withCredentials: true }
  );
  const data = response.data;
  // Map periodFrom/periodTo to fromDate/toDate for backward compatibility
  return {
    ...data,
    fromDate: data.periodFrom,
    toDate: data.periodTo,
  };
}

export async function changeReadingCycleStatus(
  cycleId: string, 
  status: ReadingCycleStatus
): Promise<ReadingCycleDto> {
  const response = await axios.patch(
    `${BASE_URL}/api/reading-cycles/${cycleId}/status`,
    null,
    { 
      params: { status },
      withCredentials: true 
    }
  );
  const data = response.data;
  // Map periodFrom/periodTo to fromDate/toDate for backward compatibility
  return {
    ...data,
    fromDate: data.periodFrom,
    toDate: data.periodTo,
  };
}

export async function deleteReadingCycle(cycleId: string): Promise<void> {
  await axios.delete(
    `${BASE_URL}/api/reading-cycles/${cycleId}`,
    { withCredentials: true }
  );
}

// Meter API
export async function getAllMeters(params?: {
  unitId?: string;
  serviceId?: string;
  buildingId?: string;
  active?: boolean;
}): Promise<MeterDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meters`,
    { 
      params,
      withCredentials: true 
    }
  );
  return response.data;
}

export async function getMeterById(meterId: string): Promise<MeterDto> {
  const response = await axios.get(
    `${BASE_URL}/api/meters/${meterId}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getMetersByUnit(unitId: string): Promise<MeterDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meters/unit/${unitId}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getMetersByService(serviceId: string): Promise<MeterDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meters/service/${serviceId}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getMetersByBuilding(buildingId: string): Promise<MeterDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meters/building/${buildingId}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function createMeter(req: MeterCreateReq): Promise<MeterDto> {
  const response = await axios.post(
    `${BASE_URL}/api/meters`,
    req,
    { withCredentials: true }
  );
  return response.data;
}

export async function downloadMeterImportTemplate(): Promise<Blob> {
  const response = await axios.get(
    `${BASE_URL}/api/meters/import/template`,
    { responseType: 'blob', withCredentials: true }
  );
  return response.data as Blob;
}

export async function importMeters(file: File): Promise<MeterImportResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axios.post(
    `${BASE_URL}/api/meters/import`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      withCredentials: true,
    }
  );
  return response.data;
}

export interface UnitWithoutMeterDto {
  unitId: string;
  unitCode: string;
  floor?: number;
  buildingId?: string;
  buildingCode?: string;
  buildingName?: string;
  serviceId: string;
  serviceCode?: string;
  serviceName?: string;
}

export async function getUnitsWithoutMeter(serviceId: string, buildingId?: string): Promise<UnitWithoutMeterDto[]> {
  const params: Record<string, string> = { serviceId };
  if (buildingId) {
    params.buildingId = buildingId;
  }
  const response = await axios.get(
    `${BASE_URL}/api/meters/missing`,
    {
      params,
      withCredentials: true,
    }
  );
  return response.data;
}

export async function createMissingMeters(serviceId: string, buildingId?: string): Promise<MeterDto[]> {
  const params: Record<string, string> = { serviceId };
  if (buildingId) {
    params.buildingId = buildingId;
  }
  const response = await axios.post(
    `${BASE_URL}/api/meters/missing`,
    null,
    {
      params,
      withCredentials: true,
    }
  );
  return response.data;
}

export async function exportMeters(buildingId?: string): Promise<Blob> {
  const params: Record<string, string> = {};
  if (buildingId) params.buildingId = buildingId;
  const response = await axios.get(
    `${BASE_URL}/api/meters/export`,
    { params, responseType: 'blob', withCredentials: true }
  );
  return response.data as Blob;
}

export async function updateMeter(meterId: string, req: Partial<MeterCreateReq>): Promise<MeterDto> {
  const response = await axios.put(
    `${BASE_URL}/api/meters/${meterId}`,
    req,
    { withCredentials: true }
  );
  return response.data;
}

export async function deactivateMeter(meterId: string): Promise<void> {
  await axios.patch(
    `${BASE_URL}/api/meters/${meterId}/deactivate`,
    null,
    { withCredentials: true }
  );
}

export async function deleteMeter(meterId: string): Promise<void> {
  await axios.delete(
    `${BASE_URL}/api/meters/${meterId}`,
    { withCredentials: true }
  );
}

// Meter Reading API
export async function createMeterReading(req: MeterReadingCreateReq): Promise<MeterReadingDto> {
  // Validate request
  if (!req || Object.keys(req).length === 0) {
    throw new Error("MeterReadingCreateReq is empty or undefined");
  }
  
  // assignmentId is optional - can use cycleId instead
  // if (!req.assignmentId && !req.cycleId) {
  //   throw new Error("Either assignmentId or cycleId is required");
  // }
  
  if (!req.meterId) {
    throw new Error("meterId is required");
  }
  
  if (!req.readingDate) {
    throw new Error("readingDate is required");
  }
  
  if (req.currIndex === undefined || req.currIndex === null) {
    throw new Error("currIndex is required");
  }
  
  // Remove undefined fields to avoid validation issues
  // Backend allows prevIndex to be null (will auto-calculate from previous reading)
  const cleanedReq: any = {
    meterId: req.meterId,
    readingDate: req.readingDate,
    currIndex: req.currIndex,
  };
  
  // Only include optional fields if they have values (not undefined)
  if (req.assignmentId !== undefined && req.assignmentId !== null) {
    cleanedReq.assignmentId = req.assignmentId;
  }
  if (req.cycleId !== undefined && req.cycleId !== null) {
    cleanedReq.cycleId = req.cycleId;
  }
  if (req.prevIndex !== undefined && req.prevIndex !== null) {
    cleanedReq.prevIndex = req.prevIndex;
  }
  // Note: prevIndex can be omitted - backend will auto-calculate from previous reading
  if (req.photoFileId !== undefined && req.photoFileId !== null) {
    cleanedReq.photoFileId = req.photoFileId;
  }
  if (req.note !== undefined && req.note !== null && req.note.trim() !== '') {
    cleanedReq.note = req.note;
  }
  if (req.readerId !== undefined && req.readerId !== null) {
    cleanedReq.readerId = req.readerId;
  }
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/meter-readings`,
      cleanedReq,
      { withCredentials: true }
    );
    return response.data;
  } catch (error: any) {
    // Log error details for debugging
    if (error.response) {
      console.error('❌ [createMeterReading] Failed:', {
        status: error.response.status,
        data: error.response.data,
        request: cleanedReq
      });
    }
    throw error;
  }
}

export async function getReadingsByAssignment(assignmentId: string): Promise<MeterReadingDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-readings/assignment/${assignmentId}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function exportMeterReadingsByCycle(cycleId: string): Promise<MeterReadingImportResponse> {
  const response = await axios.post(
    `${BASE_URL}/api/meter-readings/export/cycle/${cycleId}`,
    null,
    { withCredentials: true }
  );
  return response.data;
}

export async function updateMeterReading(
  readingId: string,
  req: MeterReadingUpdateReq
): Promise<MeterReadingDto> {
  const response = await axios.put(
    `${BASE_URL}/api/meter-readings/${readingId}`,
    req,
    { withCredentials: true }
  );
  return response.data;
}

export async function getMeterReadingsByCycleAndAssignmentAndUnit(
  cycleId: string,
  unitId: string,
  assignmentId?: string
): Promise<MeterReadingDto[]> {
  const params: any = { cycleId, unitId };
  if (assignmentId) {
    params.assignmentId = assignmentId;
  }
  const response = await axios.get(
    `${BASE_URL}/api/meter-readings`,
    { params, withCredentials: true }
  );
  return response.data;
}

// Meter Reading Assignment API
export async function createMeterReadingAssignment(
  req: MeterReadingAssignmentCreateReq
): Promise<MeterReadingAssignmentDto> {
  const response = await axios.post(
    `${BASE_URL}/api/meter-reading-assignments`,
    req,
    { withCredentials: true }
  );
  return response.data;
}

export async function getAssignmentById(assignmentId: string): Promise<MeterReadingAssignmentDto> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-assignments/${assignmentId}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getAssignmentsByCycle(cycleId: string): Promise<MeterReadingAssignmentDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-assignments/cycle/${cycleId}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getAssignmentsByStaff(staffId: string): Promise<MeterReadingAssignmentDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-assignments/staff/${staffId}`,
    { withCredentials: true }
  );
  return response.data;
}

export interface AssignmentProgressDto {
  totalMeters: number;
  readingsDone: number;
  readingsRemain: number;
  percent: number;
  completed: boolean;
  completedAt?: string;
}

export async function getActiveAssignmentsByStaff(staffId: string): Promise<MeterReadingAssignmentDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-assignments/staff/${staffId}/active`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getMyAssignments(): Promise<MeterReadingAssignmentDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-assignments/my-assignments`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getMyActiveAssignments(): Promise<MeterReadingAssignmentDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-assignments/my-assignments/active`,
    { withCredentials: true }
  );
  return response.data;
}

export async function completeAssignment(assignmentId: string): Promise<MeterReadingAssignmentDto> {
  const response = await axios.patch(
    `${BASE_URL}/api/meter-reading-assignments/${assignmentId}/complete`,
    null,
    { withCredentials: true }
  );
  return response.data;
}

export async function getMetersByAssignment(assignmentId: string): Promise<MeterDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-assignments/${assignmentId}/meters`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getAssignmentProgress(assignmentId: string): Promise<AssignmentProgressDto> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-assignments/${assignmentId}/progress`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getMetersByStaffAndCycle(staffId: string, cycleId: string): Promise<MeterDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-assignments/staff/${staffId}/cycle/${cycleId}/meters`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getMyMetersByCycle(cycleId: string): Promise<MeterDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-assignments/my-meters/cycle/${cycleId}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  await axios.delete(
    `${BASE_URL}/api/meter-reading-assignments/${assignmentId}`,
    { withCredentials: true }
  );
}

export const WATER_SERVICE_CODE = 'WATER';
export const ELECTRIC_SERVICE_CODE = 'ELECTRIC';

// Only allow water and electric services
export const ALLOWED_SERVICE_CODES = [WATER_SERVICE_CODE, ELECTRIC_SERVICE_CODE];

export async function getWaterServiceId(): Promise<string | null> {
  try {
    return null;
  } catch (error) {
    return null;
  }
}

// Meter Reading Session Types
export interface MeterReadingSessionDto {
  id: string;
  assignmentId: string;
  cycleId: string;
  buildingId: string;
  serviceId: string;
  readerId: string;
  startedAt: string;
  completedAt?: string;
  unitsRead: number;
  deviceInfo?: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MeterReadingSessionCreateReq {
  assignmentId: string;
  deviceInfo?: string;
}

// Meter Reading Export Types
export interface MeterReadingImportResponse {
  totalReadings: number;
  invoicesCreated: number;
  invoicesSkipped?: number;
  invoiceIds?: string[];
  errors?: string[];
  message: string;
}

// Meter Reading Session API
export async function startMeterReadingSession(
  req: MeterReadingSessionCreateReq
): Promise<MeterReadingSessionDto> {
  const response = await axios.post(
    `${BASE_URL}/api/meter-reading-sessions`,
    req,
    { withCredentials: true }
  );
  return response.data;
}

export async function completeMeterReadingSession(sessionId: string): Promise<MeterReadingSessionDto> {
  const response = await axios.patch(
    `${BASE_URL}/api/meter-reading-sessions/${sessionId}/complete`,
    null,
    { withCredentials: true }
  );
  return response.data;
}

export async function getSessionById(sessionId: string): Promise<MeterReadingSessionDto> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-sessions/${sessionId}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getSessionsByAssignment(assignmentId: string): Promise<MeterReadingSessionDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-sessions/assignment/${assignmentId}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getSessionsByStaff(staffId: string): Promise<MeterReadingSessionDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-sessions/staff/${staffId}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getMySessions(): Promise<MeterReadingSessionDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-sessions/my-sessions`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getMyActiveSession(): Promise<MeterReadingSessionDto | null> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-sessions/my-active-session`,
    { withCredentials: true }
  );
  return response.data || null;
}

export async function getCompletedSessionsByStaff(staffId: string): Promise<MeterReadingSessionDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/meter-reading-sessions/staff/${staffId}/completed`,
    { withCredentials: true }
  );
  return response.data;
}

// Meter Reading Export API
export async function exportReadingsByCycle(cycleId: string, unitId?: string): Promise<MeterReadingImportResponse> {
  const url = unitId 
    ? `${BASE_URL}/api/meter-readings/export/cycle/${cycleId}?unitId=${unitId}`
    : `${BASE_URL}/api/meter-readings/export/cycle/${cycleId}`;
  const response = await axios.post(
    url,
    null,
    { withCredentials: true }
  );
  return response.data;
}

// Service API
export async function getAllServices(): Promise<ServiceDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/services`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getActiveServices(): Promise<ServiceDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/services/active`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getServiceById(serviceId: string): Promise<ServiceDto> {
  const response = await axios.get(
    `${BASE_URL}/api/services/${serviceId}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getServiceByCode(code: string): Promise<ServiceDto> {
  const response = await axios.get(
    `${BASE_URL}/api/services/code/${code}`,
    { withCredentials: true }
  );
  return response.data;
}

