import { http } from "../http";
import { Building, BillingCycle, NotificationTemplate } from "@/src/types/domain";

const BASE = "/api";

export const CatalogApi = {
  buildings(tenantId: string) {
    return http<Building[]>(`${BASE}/buildings?tenantId=${tenantId}&active=true`);
  },
  billingCyclesOpen(tenantId: string) {
    return http<BillingCycle[]>(`${BASE}/billing-cycles?tenantId=${tenantId}&status=OPEN`);
  },
  feeTemplates(tenantId: string) {
    return http<NotificationTemplate[]>(`${BASE}/notification-templates?tenantId=${tenantId}&type=FEE`);
  }
};


