export interface CardRegistration {
  id: string;
  userId: string | null;
  unitId: string | null;
  requestType: string | null;
  residentId: string | null;
  fullName: string | null;
  apartmentNumber: string | null;
  buildingName: string | null;
  citizenId: string | null;
  phoneNumber: string | null;
  note: string | null;
  status: string;
  paymentStatus: string;
  paymentAmount: number | null;
  paymentDate: string | null;
  paymentGateway: string | null;
  vnpayTransactionRef: string | null;
  adminNote: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CardRegistrationFilter {
  status?: string;
  paymentStatus?: string;
}

export interface CardRegistrationDecisionPayload {
  decision: "APPROVE" | "REJECT";
  note?: string;
  issueMessage?: string;
}









