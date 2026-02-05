export type ID = string;

export type Tenant = { id: ID; name: string; };

export type Building = { id: ID; tenantId: ID; code: string; name: string; active?: boolean; };

export type BillingCycleStatus = "OPEN" | "CLOSED";
export type BillingCycle = {
  id: ID; tenantId: ID; name: string;
  periodFrom: string; periodTo: string; status: BillingCycleStatus;
};

export type InvoiceStatus = "DRAFT" | "PUBLISHED" | "UNPAID" | "PAID" | "CANCELLED";
export type InvoiceRow = {
  id: ID; buildingCode: string; unitCode: string; residentName: string;
  month: number; year: number; totalAmount: number;
  notifyEnabled: boolean; notifyStatus?: "NONE"|"PARTIAL"|"SENT"|"FAILED";
};
export type Invoice = {
  id: ID; tenantId: ID; billingCycleId: ID; buildingId: ID; unitId: ID; residentId: ID;
  month: number; year: number; totalAmount: number; status: InvoiceStatus;
  buildingCode?: string; unitCode?: string; residentName?: string;
};
export type InvoiceLine = { id: ID; invoiceId: ID; serviceCode: string; description: string; qty: number; unitPrice: number; amount: number; };

export type NotificationChannel = "EMAIL" | "SMS" | "APP";
export type NotificationTemplateType = "FEE";
export type NotificationTemplate = {
  id: ID; tenantId: ID; type: NotificationTemplateType; titleTpl: string; bodyTpl: string;
};

export type InvoiceNotification = { id?:ID; invoiceId:ID; channel:NotificationChannel; sentAt?:string; status:"Sent"|"Failed"; errorMsg?:string; };

export type PreviewItem = { invoiceId: ID; title: string; body: string; };
