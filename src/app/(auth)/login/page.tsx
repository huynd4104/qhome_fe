import React from "react";
import { useTranslations } from 'next-intl';
import LoginForm from "@/src/components/auth/LoginForm";
import LocaleSwitcher from "@/src/components/common/LocaleSwitcher";

export default function Page() {
  const t = useTranslations('Auth.login');
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4"><LocaleSwitcher /></div>
      <div className="w-full max-w-md">

        <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-8">
          <LoginForm />
        </div>
        <div className="mt-6 text-center text-xs text-slate-500">
          {t('copyright', { year: new Date().getFullYear() })}
        </div>
      </div>
    </div>
  );
}
