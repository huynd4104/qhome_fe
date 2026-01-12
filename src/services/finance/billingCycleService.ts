import axios from '@/src/lib/axios';

const BASE_URL = process.env.NEXT_PUBLIC_FINANCE_BASE_URL || 'http://localhost:8085';

export interface BillingCycleDto {
  id: string;
  name: string;
  periodFrom: string;
  periodTo: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
  externalCycleId?: string | null;
  serviceId?: string | null;
  serviceCode?: string | null;
  serviceName?: string | null;
}

export async function loadBillingPeriod(year: number): Promise<BillingCycleDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/billing-cycles/loadPeriod`,
    {
      params: { year },
      withCredentials: true,
    }
  );
  return response.data as BillingCycleDto[];
}

export async function syncMissingBillingCycles(): Promise<BillingCycleDto[]> {
  const response = await axios.post(
    `${BASE_URL}/api/billing-cycles/sync-missing`,
    null,
    { withCredentials: true }
  );
  return response.data as BillingCycleDto[];
}

export interface MissingReadingCycleDto {
  id: string;
  name: string;
  periodFrom: string;
  periodTo: string;
  status: string;
  serviceCode?: string | null;
  serviceName?: string | null;
}

export async function loadMissingReadingCycles(): Promise<MissingReadingCycleDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/billing-cycles/missing`,
    { withCredentials: true }
  );
  return response.data as MissingReadingCycleDto[];
}

export interface BuildingInvoiceSummaryDto {
  buildingId: string | null;
  buildingCode?: string | null;
  buildingName?: string | null;
  status: string;
  totalAmount: number;
  invoiceCount: number;
}

export interface InvoiceLineDto {
  id: string;
  invoiceId: string;
  serviceDate: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  serviceCode: string;
  externalRefType?: string | null;
  externalRefId?: string | null;
}

export interface InvoiceDto {
  id: string;
  code: string;
  issuedAt: string;
  dueDate: string;
  status: string;
  currency: string;
  billToName: string;
  billToAddress: string;
  billToContact: string;
  payerUnitId?: string | null;
  payerResidentId?: string | null;
  cycleId: string;
  totalAmount: number;
  lines: InvoiceLineDto[];
  paymentGateway?: string | null;
  vnpTransactionRef?: string | null;
  vnpTransactionNo?: string | null;
  vnpBankCode?: string | null;
  vnpCardType?: string | null;
  vnpResponseCode?: string | null;
  paidAt?: string | null;
}

interface SummaryParams {
  serviceCode?: string;
  month?: string;
}

export async function loadBillingCycleBuildingSummary(
  cycleId: string,
  params?: SummaryParams
): Promise<BuildingInvoiceSummaryDto[]> {
  // Chỉ gửi params nếu có giá trị (không phải undefined)
  const queryParams: Record<string, string> = {};
  if (params?.serviceCode) {
    queryParams.serviceCode = params.serviceCode;
  }
  if (params?.month) {
    queryParams.month = params.month;
  }
  
  const response = await axios.get(
    `${BASE_URL}/api/billing-cycles/${cycleId}/buildings`,
    {
      params: queryParams,
      withCredentials: true,
    }
  );
  return response.data as BuildingInvoiceSummaryDto[];
}

export async function loadBuildingInvoices(
  cycleId: string,
  buildingId: string,
  params?: SummaryParams
): Promise<InvoiceDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/billing-cycles/${cycleId}/buildings/${buildingId}/invoices`,
    {
      params: {
        ...params,
      },
      withCredentials: true,
    }
  );
  return response.data as InvoiceDto[];
}

export async function exportBillingCycleToExcel(
  cycleId: string,
  params?: {
    serviceCode?: string;
    month?: string;
    buildingId?: string;
  }
): Promise<Blob> {
  const queryParams: Record<string, string> = {};
  if (params?.serviceCode) {
    queryParams.serviceCode = params.serviceCode;
  }
  if (params?.month) {
    queryParams.month = params.month;
  }
  if (params?.buildingId) {
    queryParams.buildingId = params.buildingId;
  }

  const response = await axios.get(
    `${BASE_URL}/api/billing-cycles/${cycleId}/export`,
    {
      params: queryParams,
      responseType: 'blob',
      withCredentials: true,
    }
  );
  return response.data as Blob;
}

export async function getMissingServicesInCycle(
  cycleId: string,
  serviceCode?: string
): Promise<string[]> {
  const params: Record<string, string> = {};
  if (serviceCode) {
    params.serviceCode = serviceCode;
  }
  
  const response = await axios.get(
    `${BASE_URL}/api/invoices/cycle/${cycleId}/missing-services`,
    {
      params,
      withCredentials: true,
    }
  );
  return response.data as string[];
}

