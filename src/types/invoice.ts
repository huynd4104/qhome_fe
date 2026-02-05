export type ServiceType = "Electricity" | "Water" | "Management" | "Parking";
export type InvoiceStatus = "Unpaid" | "Paid" | "Cancelled";

export interface Invoice {
  invoiceId: string;
  apartmentId: string;
  period: string;           
  serviceTypes: ServiceType[];
  electricityIndex?: number; 
  waterIndex?: number;       
  managementFee?: number;
  parkingFee?: number;
  totalAmount: number;       
  status: InvoiceStatus;    
  createdBy: string;
  createdDate: string;       
  updatedBy?: string;
  updatedDate?: string;
  note?: string;            
}
