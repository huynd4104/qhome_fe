import React from "react";
export function Card({children}:{children:React.ReactNode}){
  return <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">{children}</div>;
}
export function StatCard({title, value, sub}:{title:string; value:string; sub?:string}){
  return (
    <Card>
      <div className="text-slate-500 text-sm">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </Card>
  );
}
