import axios from "@/src/lib/axios";

const CARD_SERVICE_BASE_URL =
  process.env.NEXT_PUBLIC_CARD_SERVICE_URL ||
  "http://localhost:8083";

const basePath = `${CARD_SERVICE_BASE_URL}/api/card-pricing`;

export interface CardPricingDto {
  id?: string;
  cardType: string; // VEHICLE, RESIDENT, ELEVATOR
  price: number;
  currency: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CreateCardPricingRequest {
  cardType: string;
  price: number;
  currency?: string;
  description?: string;
  isActive?: boolean;
}

export async function getAllCardPricing(): Promise<CardPricingDto[]> {
  const response = await axios.get(basePath, {
    withCredentials: true,
  });
  return response.data;
}

export async function getCardPricingByType(
  cardType: string
): Promise<CardPricingDto> {
  const response = await axios.get(`${basePath}/type/${cardType}`, {
    withCredentials: true,
  });
  return response.data;
}

export async function getActivePrice(
  cardType: string
): Promise<CardPricingDto> {
  const response = await axios.get(`${basePath}/type/${cardType}/price`, {
    withCredentials: true,
  });
  return response.data;
}

export async function createOrUpdateCardPricing(
  request: CreateCardPricingRequest
): Promise<CardPricingDto> {
  const response = await axios.post(basePath, request, {
    withCredentials: true,
  });
  return response.data;
}









































