"use client";
import React from "react";
import { PreviewItem, NotificationChannel } from "@/src/types/domain";
import Modal from "@/src/components/common/Modal";

export default function NotifyPreviewDialog({
  open, onClose, items, onSend
}: {
  open: boolean;
  onClose: () => void;
  items: PreviewItem[];
  onSend: (channels: NotificationChannel[]) => void;
}) {
  const [email, setEmail] = React.useState(true);
  const [app, setApp] = React.useState(true);
  const [sms, setSms] = React.useState(false);

  const channels: NotificationChannel[] = [
  ...(email ? (["EMAIL"] as NotificationChannel[]) : []),
  ...(app ? (["APP"] as NotificationChannel[]) : []),
  ...(sms ? (["SMS"] as NotificationChannel[]) : []),
];


  return (
    <Modal open={open} onClose={onClose} title="Xem trước thông báo">
      <div className="max-h-[60vh] overflow-auto space-y-3">
        {items.map((it) => (
          <div key={it.invoiceId} className="border border-slate-200 rounded-xl p-3">
            <div className="font-medium">{it.title}</div>
            <div className="text-sm text-slate-600 whitespace-pre-wrap">{it.body}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Email
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={app} onChange={(e) => setApp(e.target.checked)} /> App
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} /> SMS
          </label>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary">Đóng</button>
          <button onClick={() => onSend(channels)} className="btn-primary">Gửi</button>
        </div>
      </div>
    </Modal>
  );
}
