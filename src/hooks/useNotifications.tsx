"use client";
import React, {createContext, useContext, useState, useCallback, useMemo} from "react";
type Tone = "success"|"error"|"info";
type Noti = {id:number; message:string; tone:Tone};
const Ctx = createContext<{show:(m:string, tone?:Tone)=>void}|null>(null);

export function NotificationsProvider({children}:{children:React.ReactNode}) {
  const [items, set] = useState<Noti[]>([]);
  const show = useCallback((message:string, tone:Tone="info") => {
    const id = Date.now(); 
    set(v=>[...v, {id, message, tone}]);
    setTimeout(()=> set(v=>v.filter(i=>i.id!==id)), 3000);
  }, []);
  
  const contextValue = useMemo(() => ({show}), [show]);
  
  return (
    <Ctx.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {items.map(i=>(
          <div key={i.id} className={`px-3 py-2 rounded-xl text-sm shadow bg-white border ${
            i.tone==="success"?"border-emerald-300 text-emerald-700":
            i.tone==="error"?"border-rose-300 text-rose-700":
            "border-slate-200 text-slate-700"}`}>
            {i.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export function useNotifications(){
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("NotificationsProvider missing");
  return ctx;
}
