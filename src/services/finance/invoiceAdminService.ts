import axios from '@/src/lib/axios';

const BASE_URL = process.env.NEXT_PUBLIC_FINANCE_BASE_URL || 'http://localhost:8085';

export interface InvoiceDto {
  id: string;
  code: string;
  issuedAt: string;
  dueDate: string;
  status: 'DRAFT' | 'PUBLISHED' | 'PAID' | 'VOID' | 'UNPAID';
  currency: string;
  billToName: string;
  billToAddress: string;
  billToContact: string;
  payerUnitId: string;
  payerResidentId: string;
  cycleId: string | null;
  totalAmount: number;
  lines: InvoiceLineDto[];
  paymentGateway: string | null;
  vnpTransactionRef: string | null;
  vnpTransactionNo: string | null;
  vnpBankCode: string | null;
  vnpCardType: string | null;
  vnpResponseCode: string | null;
  paidAt: string | null;
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
  externalRefType: string | null;
  externalRefId: string | null;
}

export interface GetAllInvoicesParams {
  serviceCode?: string;
  status?: string;
  unitId?: string;
  buildingId?: string;
  startDate?: string;
  endDate?: string;
}

export async function getAllInvoicesForAdmin(params: GetAllInvoicesParams = {}): Promise<InvoiceDto[]> {
  const queryParams = new URLSearchParams();
  
  if (params.serviceCode) queryParams.append('serviceCode', params.serviceCode);
  if (params.status) queryParams.append('status', params.status);
  if (params.unitId) queryParams.append('unitId', params.unitId);
  if (params.buildingId) queryParams.append('buildingId', params.buildingId);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  
  const response = await axios.get<InvoiceDto[]>(
    `${BASE_URL}/api/invoices/admin/all?${queryParams.toString()}`,
    { withCredentials: true }
  );
  return response.data;
}

export async function getInvoiceById(invoiceId: string): Promise<InvoiceDto> {
  const response = await axios.get<InvoiceDto>(
    `${BASE_URL}/api/invoices/${invoiceId}`,
    { withCredentials: true }
  );
  return response.data;
}

export interface UpdateInvoiceStatusRequest {
  status: 'DRAFT' | 'PUBLISHED' | 'PAID' | 'VOID' | 'UNPAID';
}

export async function updateInvoiceStatus(invoiceId: string, status: 'DRAFT' | 'PUBLISHED' | 'PAID' | 'VOID' | 'UNPAID'): Promise<InvoiceDto> {
  const response = await axios.put<InvoiceDto>(
    `${BASE_URL}/api/invoices/${invoiceId}/status`,
    { status },
    { withCredentials: true }
  );
  return response.data;
}

