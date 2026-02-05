"use client";
import React from "react";

export default function Modal({
  open, title, children, onClose
}:{open:boolean; title:string; children:React.ReactNode; onClose:()=>void}){
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose}/>
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">{title}</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
