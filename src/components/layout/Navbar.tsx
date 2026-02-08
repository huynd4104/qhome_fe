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
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="w-full px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3 select-none">
          <img src="/logo.svg" alt="QHome Logo" className="h-10 w-10" />
          <span className="text-lg sm:text-xl font-bold tracking-tight">QHome PMS</span>
        </div>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          {user && (
            <span
              title={user}
              className="text-sm text-slate-700 max-w-[180px] truncate"
            >
              {user}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
