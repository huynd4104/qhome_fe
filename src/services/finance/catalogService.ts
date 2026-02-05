/**
 * Finance Service - Catalog APIs
 * Tương ứng với finance-service backend
 */
import { http } from "../http";
import { Building, BillingCycle, NotificationTemplate } from "@/src/types/domain";

const BASE = "/api";

export const CatalogApi = {
  /**
   * Lấy danh sách buildings active
   * GET /api/buildings?tenantId=xxx&active=true
   */
  buildings(tenantId: string) {
    return http<Building[]>(`${BASE}/buildings?tenantId=${tenantId}&active=true`);
  },

  /**
   * Lấy billing cycles đang mở
   * GET /api/billing-cycles?tenantId=xxx&status=OPEN
   */
  billingCyclesOpen(tenantId: string) {
    return http<BillingCycle[]>(`${BASE}/billing-cycles?tenantId=${tenantId}&status=OPEN`);
  },

  /**
   * Lấy notification templates cho phí
   * GET /api/notification-templates?tenantId=xxx&type=FEE
   */
  feeTemplates(tenantId: string) {
    return http<NotificationTemplate[]>(`${BASE}/notification-templates?tenantId=${tenantId}&type=FEE`);
  }
};

