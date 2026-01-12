import axios from "@/src/lib/axios";
import { CardRegistration } from "@/src/types/cardRegistration";

const CARD_SERVICE_BASE_URL =
  process.env.NEXT_PUBLIC_CARD_SERVICE_URL ||
  "http://localhost:8083";

const basePath = `${CARD_SERVICE_BASE_URL}/api/card-registrations`;

export interface CardRegistrationQueryResponse {
  data: CardRegistration[];
  total: number;
}

export async function fetchCardRegistrations(
  residentId?: string,
  unitId?: string
): Promise<CardRegistrationQueryResponse> {
  const params: Record<string, string> = {};
  if (residentId) params.residentId = residentId;
  if (unitId) params.unitId = unitId;

  const response = await axios.get(basePath, {
    params,
    withCredentials: true,
  });
  return response.data;
}

export interface ApprovedCardQueryResponse {
  data: CardRegistrationSummaryDto[];
  total: number;
}

export interface CardRegistrationSummaryDto {
  id: string;
  cardType: string;
  userId: string | null;
  residentId: string | null;
  unitId: string | null;
  requestType: string | null;
  status: string;
  paymentStatus: string;
  paymentAmount: number | null;
  paymentDate: string | null;
  createdAt: string;
  updatedAt: string | null;
  displayName: string;
  reference: string | null;
  apartmentNumber: string | null;
  buildingName: string | null;
  note: string | null;
  approvedAt: string | null;
}

export async function fetchApprovedCards(
  buildingId?: string,
  unitId?: string
): Promise<ApprovedCardQueryResponse> {
  const params: Record<string, string> = {};
  if (buildingId) params.buildingId = buildingId;
  if (unitId) params.unitId = unitId;

  const response = await axios.get(`${basePath}/admin/approved`, {
    params,
    withCredentials: true,
  });
  return response.data;
}

