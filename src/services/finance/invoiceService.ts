/**
 * Finance Service - Invoice Management
 * Tương ứng với finance-service backend
 */
import { http, PageResp } from "../http";
import {
  InvoiceRow, Invoice, InvoiceLine, NotificationChannel, PreviewItem, InvoiceNotification
} from "@/src/types/domain";

const BASE = "/api";

export const InvoiceApi = {
  /**
   * Lấy danh sách invoices
   * GET /api/invoices
   */
  list(params: {
    tenantId: string; 
    billingCycleId: string;
    buildingIds?: string[]; 
    status?: "PUBLISHED";
    page?: number; 
    size?: number; 
    sort?: string;
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

  /**
   * Lấy chi tiết invoice
   * GET /api/invoices/:id
   */
  get(id: string) {
    return http<{ invoice: Invoice; lines: InvoiceLine[] }>(`${BASE}/invoices/${id}`);
  },

  /**
   * Bật/tắt notification cho invoice
   * PATCH /api/invoices/:id/notify-toggle
   */
  toggleNotify(id: string, enabled: boolean) {
    return http<void>(`${BASE}/invoices/${id}/notify-toggle`, {
      method: "PATCH",
      body: JSON.stringify({ enabled })
    });
  },

  /**
   * Preview notification trước khi gửi
   * POST /api/fee-notifications/preview
   */
  preview(invoiceIds: string[], templateId: string, overrides?: Record<string, string>) {
    return http<{ items: PreviewItem[] }>(`${BASE}/fee-notifications/preview`, {
      method: "POST",
      body: JSON.stringify({ invoiceIds, templateId, overrides })
    });
  },

  /**
   * Gửi notification cho invoices
   * POST /api/fee-notifications/send
   */
  send(invoiceIds: string[], templateId: string, channels: NotificationChannel[], dryRun = false) {
    return http<{ accepted: string[]; rejected: { invoiceId: string; reason: string }[] }>(
      `${BASE}/fee-notifications/send`,
      { method: "POST", body: JSON.stringify({ invoiceIds, templateId, channels, dryRun }) }
    );
  },

  /**
   * Lấy lịch sử notification của invoice
   * GET /api/invoice-notifications?invoiceId=xxx
   */
  history(invoiceId: string) {
    return http<InvoiceNotification[]>(`${BASE}/invoice-notifications?invoiceId=${invoiceId}`);
  }
};

