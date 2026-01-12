"use client";
import React, { useState } from "react";
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useNotifications } from "@/src/hooks/useNotifications";
import { requestPasswordReset } from "@/src/services/iam/authService";
import LocaleSwitcher from "@/src/components/common/LocaleSwitcher";

export default function Page() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const { show } = useNotifications();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email: string): string => {
    if (!email.trim()) {
      return t('forgotPassword.validation.emailRequired');
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return t('forgotPassword.validation.emailInvalid');
    }
    return "";
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate email
    const error = validateEmail(email);
    if (error) {
      setEmailError(error);
      return;
    }
    
    setEmailError("");
    setLoading(true);
    
    try {
      await requestPasswordReset(email);
      show(t('forgotPassword.messages.otpSent'), "success");
      setTimeout(() => {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
      }, 1000);
    } catch (e: any) {
      let errorMessage = t('forgotPassword.errors.general');
      
      if (e?.response?.status === 429) {
        errorMessage = e?.response?.data?.message || t('forgotPassword.errors.tooManyRequests');
      } else if (e?.response?.status === 400) {
        errorMessage = e?.response?.data?.message || t('forgotPassword.errors.invalidEmail');
      } else if (e?.code === 'ERR_NETWORK' || e?.message?.includes('Network')) {
        errorMessage = t('forgotPassword.errors.networkError');
      }
      
      setEmailError(errorMessage);
      show(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4"><LocaleSwitcher/></div>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <div className="flex flex-col items-center select-none">
            <img src="/logo.svg" alt={t('forgotPassword.logoAlt')} className="h-28 w-24 mb-4" />
            <span className="text-3xl font-semibold tracking-tight text-slate-800">{t('forgotPassword.title')}</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-slate-800">{t('forgotPassword.title')}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {t('forgotPassword.description')}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                {t('forgotPassword.emailLabel')}
              </label>
              <input 
                type="email"
                value={email} 
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) {
                    setEmailError("");
                  }
                }}
                placeholder={t('forgotPassword.emailPlaceholder')}
                className={`w-full border-0 bg-[#E8E5DC] rounded-md px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  emailError 
                    ? "focus:ring-red-500/30 ring-2 ring-red-500/30" 
                    : "focus:ring-green-500/30"
                }`}
              />
              {emailError && (
                <p className="text-xs text-red-600 mt-1">{emailError}</p>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-md px-4 py-2.5 text-sm font-medium bg-[#6B9B6E] text-white hover:bg-[#5d8660] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t('forgotPassword.buttons.processing') : t('forgotPassword.buttons.submit')}
            </button>

            <div>
              <a 
                href="/login" 
                className="w-full inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors no-underline"
              >
                {t('forgotPassword.backToLogin')}
              </a>
            </div>
          </form>
        </div>
        <div className="mt-6 text-center text-xs text-slate-500">
          {t('forgotPassword.copyright', { year: new Date().getFullYear() })}
        </div>
      </div>
    </div>
  );
}

