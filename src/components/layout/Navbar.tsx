"use client";
import React from "react";
import LocaleSwitcher from "@/src/components/common/LocaleSwitcher";

/*Hiển thị tên user (đọc từ localStorage sau khi login)*/
function useDisplayUser() {
  const [user, setUser] = React.useState<string | null>(null);
  React.useEffect(() => {
    // ví dụ key set sau khi login: localStorage.setItem("userName", emailOrName)
    const u = localStorage.getItem("userName");
    setUser(u);
  }, []);
  // rút gọn email -> trước @ 
  const short = React.useMemo(() => {
    if (!user) return null;
    return user.includes("@") ? user.split("@")[0] : user;
  }, [user]);
  return short;
}

export default function Navbar() {
  const user = useDisplayUser();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm transition-all duration-200">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 select-none cursor-pointer hover:opacity-90 transition-opacity">
          <img src="/logo.svg" alt="QHome Logo" className="h-9 w-9" />
          <span className="text-xl font-bold tracking-tight text-slate-900">QHome PMS</span>
        </div>
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          {user && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span
                title={user}
                className="text-sm font-medium text-slate-700 max-w-[150px] truncate"
              >
                {user}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
