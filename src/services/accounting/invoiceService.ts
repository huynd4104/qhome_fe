import { http, PageResp } from "../http";
import {
  InvoiceRow, Invoice, InvoiceLine, NotificationChannel, PreviewItem, InvoiceNotification
} from "@/src/types/domain";

const BASE = "/api";

export const InvoiceApi = {
  list(params: {
    tenantId: string; billingCycleId: string;
    buildingIds?: string[]; status?: "PUBLISHED";
    page?: number; size?: number; sort?: string;
  }) {
    const q = new URLSearchParams({
      tenantId: params.tenantId,
      billingCycleId: params.billingCycleId,
      ...(params.buildingIds?.length ? { buildingIds: params.buildingIds.join(",") } : {}),
      ...(params.status ? { status: params.status } : {}),
      page: String(params.page ?? 0),
      size: String(params.size ?? 20),
      sort: params.sort ?? "unitCode,asc"
    });
    return http<PageResp<InvoiceRow>>(`${BASE}/invoices?${q.toString()}`);
  },

  get(id: string) {
    return http<{ invoice: Invoice; lines: InvoiceLine[] }>(`${BASE}/invoices/${id}`);
  },

  toggleNotify(id: string, enabled: boolean) {
    return http<void>(`${BASE}/invoices/${id}/notify-toggle`, {
      method: "PATCH",
      body: JSON.stringify({ enabled })
    });
  },

  preview(invoiceIds: string[], templateId: string, overrides?: Record<string, string>) {
    return http<{ items: PreviewItem[] }>(`${BASE}/fee-notifications/preview`, {
      method: "POST",
      body: JSON.stringify({ invoiceIds, templateId, overrides })
    });
  },

  send(invoiceIds: string[], templateId: string, channels: NotificationChannel[], dryRun = false) {
    return http<{ accepted: string[]; rejected: { invoiceId: string; reason: string }[] }>(
      `${BASE}/fee-notifications/send`,
      { method: "POST", body: JSON.stringify({ invoiceIds, templateId, channels, dryRun }) }
    );
  },

  history(invoiceId: string) {
    return http<InvoiceNotification[]>(`${BASE}/invoice-notifications?invoiceId=${invoiceId}`);
  }
};


