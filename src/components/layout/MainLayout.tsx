'use client';
import React from "react";
import Sidebar from "@/src/components/layout/Sidebar";
import Topbar from "@/src/components/layout/Topbar";
import ProtectedRoute from "@/src/components/auth/ProtectedRoute";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        {/* Sidebar trái */}
        <Sidebar />
        {/* Nội dung + Topbar */}
        <div className="flex-1 flex flex-col md:ml-64 min-w-0">
          <Topbar />
          <main className="p-4 md:p-6">
            <div className="max-w-[1280px] mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
