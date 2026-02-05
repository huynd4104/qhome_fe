"use client";
import React from "react";
import { InvoiceRow } from "@/src/types/domain";

export default function InvoiceTable({
  rows, page, size, total, onPageChange,
  selected, onSelectChange,
  onView, onToggleNotify
}:{
  rows: InvoiceRow[]; page:number; size:number; total:number; onPageChange:(p:number)=>void;
  selected: Set<string>; onSelectChange:(ids:Set<string>)=>void;
  onView:(id:string)=>void;
  onToggleNotify:(id:string, enabled:boolean)=>void;
}){
  const totalPages = Math.max(1, Math.ceil(total/size));
  const toggleRow = (id: string, checked: boolean) => {
    const next = new Set(selected);
    checked ? next.add(id) : next.delete(id);
    onSelectChange(next);
  };

  const allChecked = rows.length>0 && rows.every(r=>selected.has(r.id));
  const toggleAll = (checked:boolean)=>{
    const next = new Set(selected);
    rows.forEach(r=> checked ? next.add(r.id) : next.delete(r.id));
    onSelectChange(next);
  };

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="p-3"><input type="checkbox" checked={allChecked} onChange={e=>toggleAll(e.target.checked)}/></th>
            <th className="p-3 text-left">Căn hộ</th>
            <th className="p-3 text-left">Cư dân</th>
            <th className="p-3 text-left">Kỳ</th>
            <th className="p-3 text-right">Tổng tiền</th>
            <th className="p-3 text-left">Notify</th>
            <th className="p-3 text-left">Trạng thái gửi</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id} className="border-t">
              <td className="p-3"><input type="checkbox" checked={selected.has(r.id)} onChange={e=>toggleRow(r.id, e.target.checked)}/></td>
              <td className="p-3">{r.buildingCode}-{r.unitCode}</td>
              <td className="p-3">{r.residentName}</td>
              <td className="p-3">{String(r.month).padStart(2,"0")}/{r.year}</td>
              <td className="p-3 text-right">{r.totalAmount.toLocaleString()}</td>
              <td className="p-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={r.notifyEnabled} onChange={e=>onToggleNotify(r.id, e.target.checked)}/>
                  <span>{r.notifyEnabled ? "Bật" : "Tắt"}</span>
                </label>
              </td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-xs border
                  ${r.notifyStatus==="SENT" ? "border-emerald-300 text-emerald-700" :
                    r.notifyStatus==="FAILED" ? "border-rose-300 text-rose-700" :
                    r.notifyStatus==="PARTIAL" ? "border-amber-300 text-amber-700" :
                    "border-slate-200 text-slate-500"}`}>
                  {r.notifyStatus ?? "NONE"}
                </span>
              </td>
              <td className="p-3 text-right">
                <button onClick={()=>onView(r.id)} className="btn-secondary">👁 Xem</button>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={8} className="p-6 text-center text-slate-500">Chưa có dữ liệu.</td></tr>
          )}
        </tbody>
      </table>

      {/* pagination */}
      <div className="flex items-center justify-between p-3 text-sm">
        <div>Trang {page+1}/{totalPages} • {total.toLocaleString()} bản ghi</div>
        <div className="flex gap-2">
          <button disabled={page<=0} onClick={()=>onPageChange(page-1)} className="btn-secondary disabled:opacity-50">← Trước</button>
          <button disabled={page>=totalPages-1} onClick={()=>onPageChange(page+1)} className="btn-secondary disabled:opacity-50">Sau →</button>
        </div>
      </div>
    </div>
  );
}
