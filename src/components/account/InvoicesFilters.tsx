"use client";
import React from "react";
import { Building, BillingCycle, NotificationTemplate } from "@/src/types/domain";

export default function InvoicesFilters({
  buildings, cycles, templates,
  value, onChange, onRefresh
}:{
  buildings: Building[]; cycles: BillingCycle[]; templates: NotificationTemplate[];
  value: { buildingIds: string[]; billingCycleId?: string; templateId?: string };
  onChange: (v: Partial<typeof value>) => void;
  onRefresh: () => void;
}){
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap gap-3 items-center">
      <select
        value={value.billingCycleId ?? ""}
        onChange={e=>onChange({ billingCycleId: e.target.value || undefined })}
        className="input !w-56"
        >
        <option value="">— Chọn kỳ thu (OPEN) —</option>
        {cycles.map(c=>(
          <option value={c.id} key={c.id}>{c.name}</option>
        ))}
      </select>

      <select
        multiple
        value={value.buildingIds}
        onChange={(e)=>{
          const ids = Array.from(e.target.selectedOptions).map(o=>o.value);
          onChange({ buildingIds: ids });
        }}
        className="input !w-56 h-10"
        >
        {buildings.map(b=>(
          <option value={b.id} key={b.id}>{b.code} — {b.name}</option>
        ))}
      </select>

      <select
        value={value.templateId ?? ""}
        onChange={e=>onChange({ templateId: e.target.value || undefined })}
        className="input !w-64"
        >
        <option value="">— Template thông báo phí —</option>
        {templates.map(t=><option key={t.id} value={t.id}>{t.titleTpl}</option>)}
      </select>

      <button onClick={onRefresh} className="btn-secondary">Tải dữ liệu</button>
    </div>
  );
}
