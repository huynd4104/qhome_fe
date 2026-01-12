import axios from '@/src/lib/axios';

const BASE_URL = process.env.NEXT_PUBLIC_FINANCE_BASE_URL || 'http://localhost:8085';

export interface PricingTierDto {
  id: string;
  serviceCode: string;
  tierOrder: number;
  minQuantity: number | null;
  maxQuantity: number | null;
  unitPrice: number | null;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  active: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePricingTierRequest {
  serviceCode: string;
  tierOrder: number;
  minQuantity: number | null;
  maxQuantity?: number | null;
  unitPrice: number | null;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  active?: boolean;
  description?: string;
}

export interface UpdatePricingTierRequest {
  tierOrder?: number;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  unitPrice?: number | null;
  effectiveFrom?: string;
  effectiveUntil?: string | null;
  active?: boolean;
  description?: string;
}

const withCredentials = { withCredentials: true } as const;

export async function getPricingTiersByService(serviceCode: string): Promise<PricingTierDto[]> {
  if (!serviceCode) {
    return [];
  }

  const response = await axios.get(
    `${BASE_URL}/api/pricing-tiers/service/${serviceCode}`,
    withCredentials
  );

  return response.data as PricingTierDto[];
}

export async function createPricingTier(
  payload: CreatePricingTierRequest,
  createdBy?: string
): Promise<PricingTierDto> {
  const response = await axios.post(
    `${BASE_URL}/api/pricing-tiers`,
    payload,
    {
      ...withCredentials,
      params: createdBy ? { createdBy } : undefined,
    }
  );

  return response.data as PricingTierDto;
}

export async function updatePricingTier(
  id: string,
  payload: UpdatePricingTierRequest,
  updatedBy?: string
): Promise<PricingTierDto> {
  const response = await axios.put(
    `${BASE_URL}/api/pricing-tiers/${id}`,
    payload,
    {
      ...withCredentials,
      params: updatedBy ? { updatedBy } : undefined,
    }
  );

  return response.data as PricingTierDto;
}

export async function deletePricingTier(id: string): Promise<void> {
  await axios.delete(`${BASE_URL}/api/pricing-tiers/${id}`, withCredentials);
}

export async function getActivePricingTiersByService(
  serviceCode: string,
  date: string
): Promise<PricingTierDto[]> {
  const response = await axios.get(
    `${BASE_URL}/api/pricing-tiers/service/${serviceCode}/active`,
    {
      ...withCredentials,
      params: { date },
    }
  );

  return response.data as PricingTierDto[];
}
