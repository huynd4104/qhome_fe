"use client";
import React from "react";
import { useTranslations } from "next-intl";
import { Invoice, ServiceType, InvoiceStatus } from "@/src/types/invoice";
import { useNotifications } from "@/src/hooks/useNotifications";

type Props = {
  mode: "create" | "edit";
  initial?: Partial<Invoice>;
  lastElectricIndex?: number;
  lastWaterIndex?: number;
  onSubmit: (data: Partial<Invoice>) => Promise<void> | void;
  onClose: () => void;
};

const SVC: { labelKey: string; value: ServiceType }[] = [
  { labelKey: "electric", value: "Electricity" },
  { labelKey: "water", value: "Water" },
  { labelKey: "management", value: "Management" },
  { labelKey: "parking", value: "Parking" },
];

export default function InvoiceForm({
  mode,
  initial,
  lastElectricIndex = 0,
  lastWaterIndex = 0,
  onSubmit,
  onClose
}: Props) {
  const t = useTranslations("Accounting");
  const { show } = useNotifications();

  const [invoiceId, setInvoiceId] = React.useState(initial?.invoiceId ?? crypto.randomUUID());
  const [apartmentId, setApartmentId] = React.useState(initial?.apartmentId ?? "");
  const [period, setPeriod] = React.useState(initial?.period ?? "");
  const [serviceTypes, setServiceTypes] = React.useState<ServiceType[]>(initial?.serviceTypes ?? []);
  const [electricityIndex, setElectricityIndex] = React.useState<number | undefined>(initial?.electricityIndex);
  const [waterIndex, setWaterIndex] = React.useState<number | undefined>(initial?.waterIndex);
  const [managementFee, setManagementFee] = React.useState<number | undefined>(initial?.managementFee);
  const [parkingFee, setParkingFee] = React.useState<number | undefined>(initial?.parkingFee);
  const [status, setStatus] = React.useState<InvoiceStatus>(initial?.status ?? "Unpaid");
  const [note, setNote] = React.useState<string>(initial?.note ?? "");

  // auto sum
  const total =
    (managementFee ?? 0) +
    (parkingFee ?? 0) +
    (serviceTypes.includes("Electricity") ? Number(electricityIndex || 0) : 0) +
    (serviceTypes.includes("Water") ? Number(waterIndex || 0) : 0);

  const toggleSvc = (s: ServiceType) =>
    setServiceTypes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const validate = (): string | null => {
    if (!invoiceId) return t("validate.invoiceId");
    if (!apartmentId) return t("validate.apartmentId");
    if (!period) return t("validate.period");
    if (!serviceTypes.length) return t("validate.serviceTypes");
    if (serviceTypes.includes("Electricity") && (electricityIndex == null || electricityIndex < lastElectricIndex))
      return t("validate.electricityIndex", { value: lastElectricIndex });
    if (serviceTypes.includes("Water") && (waterIndex == null || waterIndex < lastWaterIndex))
      return t("validate.waterIndex", { value: lastWaterIndex });
    if ((managementFee ?? 0) < 0) return t("validate.managementFee");
    if ((parkingFee ?? 0) < 0) return t("validate.parkingFee");
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) return show(err, "error");
    const payload: Partial<Invoice> = {
      invoiceId, apartmentId, period, serviceTypes,
      electricityIndex, waterIndex, managementFee, parkingFee,
      totalAmount: total, status, note
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-600">{t("fields.invoiceId")}</label>
          <input className="input" value={invoiceId} onChange={e=>setInvoiceId(e.target.value)} required maxLength={36}/>
        </div>
        <div>
          <label className="text-xs text-slate-600">{t("fields.apartmentId")}</label>
          <input className="input" value={apartmentId} onChange={e=>setApartmentId(e.target.value)} required/>
        </div>
        <div>
          <label className="text-xs text-slate-600">{t("fields.period")}</label>
          <input className="input" value={period} onChange={e=>setPeriod(e.target.value)} placeholder="MM/YYYY" required/>
        </div>
        <div>
          <label className="text-xs text-slate-600">{t("fields.status")}</label>
          <select className="input" value={status} onChange={e=>setStatus(e.target.value as any)} required>
            <option>Unpaid</option><option>Paid</option><option>Cancelled</option>
          </select>
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-600 mb-1">{t("fields.serviceTypes")}</div>
        <div className="flex flex-wrap gap-2">
          {SVC.map(s=>(
            <button key={s.value} type="button" onClick={()=>toggleSvc(s.value)}
              className={`px-3 py-1 rounded-full border ${serviceTypes.includes(s.value) ? "bg-indigo-50 border-indigo-300 text-indigo-700":"bg-white border-slate-200 text-slate-600"}`}>
              {t(`services.${s.labelKey}`)}
            </button>
          ))}
        </div>
      </div>

      {serviceTypes.includes("Electricity") && (
        <div>
          <label className="text-xs text-slate-600">{t("fields.electricityIndex")}</label>
          <input className="input" type="number" step="0.01"
            value={electricityIndex ?? ""} onChange={e=>setElectricityIndex(e.target.value===""?undefined:Number(e.target.value))} required/>
          <div className="text-[11px] text-slate-400">{t("hints.minPrev",{value:lastElectricIndex})}</div>
        </div>
      )}
      {serviceTypes.includes("Water") && (
        <div>
          <label className="text-xs text-slate-600">{t("fields.waterIndex")}</label>
          <input className="input" type="number" step="0.01"
            value={waterIndex ?? ""} onChange={e=>setWaterIndex(e.target.value===""?undefined:Number(e.target.value))} required/>
          <div className="text-[11px] text-slate-400">{t("hints.minPrev",{value:lastWaterIndex})}</div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-600">{t("fields.managementFee")}</label>
          <input className="input" type="number" step="0.01"
            value={managementFee ?? ""} onChange={e=>setManagementFee(e.target.value===""?undefined:Number(e.target.value))}/>
        </div>
        <div>
          <label className="text-xs text-slate-600">{t("fields.parkingFee")}</label>
          <input className="input" type="number" step="0.01"
            value={parkingFee ?? ""} onChange={e=>setParkingFee(e.target.value===""?undefined:Number(e.target.value))}/>
        </div>
      </div>

      {mode==="edit" && (
        <div>
          <label className="text-xs text-slate-600">{t("fields.reason")}</label>
          <textarea className="input" value={note} onChange={e=>setNote(e.target.value)} required/>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-slate-700">{t("fields.total")}: <b>{total.toLocaleString()}</b></div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">{t("common.cancel")}</button>
          <button type="submit" className="btn-primary">{t("common.save")}</button>
        </div>
      </div>
    </form>
  );
}
