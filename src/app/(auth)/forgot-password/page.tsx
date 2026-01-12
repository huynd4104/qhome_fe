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
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);

  const validateEmail = (email: string): string => {
    if (!email.trim()) {
      return t('forgotPassword.errors.emailRequired');
    }
    // Ensure email contains exactly one @
    const atCount = (email.match(/@/g) || []).length;
    if (atCount !== 1) {
      return t('forgotPassword.errors.emailInvalid');
    }
    // Only accept emails ending with .com: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.com$/i;
    if (!emailPattern.test(email)) {
      return t('forgotPassword.errors.emailInvalid');
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
      setIsSubmitted(true);
      show(t('forgotPassword.messages.success'), "success");
      setTimeout(() => {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
      }, 2000);
    } catch (e: any) {
      let errorMessage = t('forgotPassword.errors.genericError');
      
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
      <div className="absolute top-4 right-4 z-10">
        <LocaleSwitcher/>
      </div>
      
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div className="flex flex-col items-center select-none">
            <div className="relative mb-4">
              <img 
                src="/logo.svg" 
                alt="Qhome Base Logo" 
                className="h-28 w-24 transition-transform duration-300 hover:scale-105" 
              />
            </div>
            <span className="text-3xl font-semibold tracking-tight text-slate-800">
              {t('forgotPassword.title')}
            </span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-8 transition-all duration-300 hover:shadow-2xl">
          {!isSubmitted ? (
            <form onSubmit={onSubmit} className="space-y-6">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <svg 
                    className="w-8 h-8 text-green-600" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" 
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">
                  {t('forgotPassword.heading')}
                </h1>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {t('forgotPassword.description')}
                </p>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  {t('forgotPassword.emailLabel')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg 
                      className={`h-5 w-5 transition-colors duration-200 ${
                        emailError 
                          ? "text-red-400" 
                          : isEmailFocused 
                            ? "text-green-500" 
                            : "text-slate-400"
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" 
                      />
                    </svg>
                  </div>
                  <input 
                    type="email"
                    value={email} 
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) {
                        setEmailError("");
                      }
                    }}
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                    placeholder={t('forgotPassword.emailPlaceholder')}
                    className={`w-full border-0 bg-[#E8E5DC] rounded-lg px-4 pl-10 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                      emailError 
                        ? "focus:ring-red-500 ring-2 ring-red-500/30 bg-red-50" 
                        : isEmailFocused
                          ? "focus:ring-green-500 ring-2 ring-green-500/30 bg-green-50/50"
                          : "focus:ring-green-500/30"
                    }`}
                    disabled={loading}
                  />
                </div>
                {emailError && (
                  <div className="flex items-start gap-2 mt-2 animate-slide-down">
                    <svg 
                      className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                    <p className="text-xs text-red-600 leading-relaxed">{emailError}</p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading || !email.trim()}
                className="w-full rounded-lg px-4 py-3 text-sm font-semibold bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg 
                      className="animate-spin h-5 w-5 text-white" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      ></circle>
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>{t('forgotPassword.submitting')}</span>
                  </>
                ) : (
                  <>
                    <svg 
                      className="w-5 h-5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
                      />
                    </svg>
                    <span>{t('forgotPassword.submit')}</span>
                  </>
                )}
              </button>

              {/* Back to Login */}
              <div className="text-center pt-2">
                <a 
                  href="/login" 
                  className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 hover:underline transition-colors duration-200"
                >
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                    />
                  </svg>
                  {t('forgotPassword.backToLogin')}
                </a>
              </div>
            </form>
          ) : (
            // Success State
            <div className="text-center py-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6 animate-scale-in">
                <svg 
                  className="w-10 h-10 text-green-600 animate-check" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                {t('forgotPassword.messages.success')}
              </h2>
              <p className="text-sm text-slate-600 mb-6">
                {t('forgotPassword.messages.checkEmail', { email })}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <svg 
                  className="animate-spin h-4 w-4" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  ></circle>
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>{t('forgotPassword.messages.redirecting')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Copyright */}
        <div className="mt-6 text-center text-xs text-slate-500">
          {t('login.copyright', { year: new Date().getFullYear() })}
        </div>
      </div>
    </div>
  );
}

