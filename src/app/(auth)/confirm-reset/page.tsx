"use client";
import React, { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNotifications } from "@/src/hooks/useNotifications";
import { confirmPasswordReset } from "@/src/services/iam";
import LocaleSwitcher from "@/src/components/common/LocaleSwitcher";

export default function Page() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show } = useNotifications();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const otpParam = searchParams.get('otp');
    if (!emailParam || !otpParam) {
      show(t('confirmReset.errors.invalidInfo'), "error");
      router.push("/forgot-password");
      return;
    }
    setEmail(emailParam);
    setOtp(otpParam);
  }, [searchParams, router, show, t]);

  const validatePassword = (pwd: string): string => {
    if (!pwd.trim()) {
      return t('confirmReset.errors.passwordRequired');
    }
    if (pwd.length < 8) {
      return t('confirmReset.errors.passwordMinLength');
    }
    if (pwd.length > 100) {
      return t('confirmReset.errors.passwordMaxLength');
    }
    // Check for at least one special character
    const specialCharPattern = /[@$!%*?&]/;
    if (!specialCharPattern.test(pwd)) {
      return t('confirmReset.errors.passwordSpecialChar');
    }
    return "";
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email || !otp) {
      show(t('confirmReset.errors.invalidInfo'), "error");
      router.push("/forgot-password");
      return;
    }
    
    // Validate password
    const pwdError = validatePassword(password);
    if (pwdError) {
      setPasswordError(pwdError);
      return;
    }
    setPasswordError("");
    
    // Validate confirm password
    if (password !== confirmPassword) {
      setConfirmPasswordError(t('confirmReset.errors.passwordMismatch'));
      return;
    }
    setConfirmPasswordError("");
    
    setLoading(true);
    
    try {
      await confirmPasswordReset(email, otp, password);
      show(t('confirmReset.messages.resetSuccess'), "success");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (e: any) {
      let errorMessage = t('confirmReset.errors.genericError');
      
      if (e?.response?.status === 400) {
        errorMessage = e?.response?.data?.message || t('confirmReset.errors.invalidOtp');
      } else if (e?.code === 'ERR_NETWORK' || e?.message?.includes('Network')) {
        errorMessage = t('confirmReset.errors.networkError');
      }
      
      show(errorMessage, "error");
      if (errorMessage.includes("OTP") || errorMessage.includes("expired") || errorMessage.includes("hết hạn")) {
        setTimeout(() => {
          router.push("/forgot-password");
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!email || !otp) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4"><LocaleSwitcher/></div>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <div className="flex flex-col items-center select-none">
            <img src="/logo.svg" alt="Qhome Base Logo" className="h-28 w-24 mb-4" />
            <span className="text-3xl font-semibold tracking-tight text-slate-800">{t('confirmReset.title')}</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-8">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-slate-800">{t('confirmReset.heading')}</h1>
              <p className="text-sm text-slate-500 mt-1">
                {t('confirmReset.description', { email })}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                {t('confirmReset.newPasswordLabel')}
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password} 
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) {
                      setPasswordError("");
                    }
                  }}
                  placeholder={t('confirmReset.newPasswordPlaceholder')}
                  className={`w-full border-0 bg-[#E8E5DC] rounded-md px-4 py-2.5 pr-10 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    passwordError 
                      ? "focus:ring-red-500/30 ring-2 ring-red-500/30" 
                      : "focus:ring-green-500/30"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? 
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="Eye-Close-Fill--Streamline-Mingcute-Fill" height="24" width="24">
                      <g fill="none" fillRule="evenodd">
                        <path d="M24 0v24H0V0h24ZM12.593 23.258l-0.011 0.002 -0.071 0.035 -0.02 0.004 -0.014 -0.004 -0.071 -0.035c-0.01 -0.004 -0.019 -0.001 -0.024 0.005l-0.004 0.01 -0.017 0.428 0.005 0.02 0.01 0.013 0.104 0.074 0.015 0.004 0.012 -0.004 0.104 -0.074 0.012 -0.016 0.004 -0.017 -0.017 -0.427c-0.002 -0.01 -0.009 -0.017 -0.017 -0.018Zm0.265 -0.113 -0.013 0.002 -0.185 0.093 -0.01 0.01 -0.003 0.011 0.018 0.43 0.005 0.012 0.008 0.007 0.201 0.093c0.012 0.004 0.023 0 0.029 -0.008l0.004 -0.014 -0.034 -0.614c-0.003 -0.012 -0.01 -0.02 -0.02 -0.022Zm-0.715 0.002a0.023 0.023 0 0 0 -0.027 0.006l-0.006 0.014 -0.034 0.614c0 0.012 0.007 0.02 0.017 0.024l0.015 -0.002 0.201 -0.093 0.01 -0.008 0.004 -0.011 0.017 -0.43 -0.003 -0.012 -0.01 -0.01 -0.184 -0.092Z" strokeWidth="1"></path>
                        <path fill="currentColor" d="M2.5 9a1.5 1.5 0 0 1 2.945 -0.404c1.947 6.502 11.158 6.503 13.109 0.005a1.5 1.5 0 1 1 2.877 0.85 10.104 10.104 0 0 1 -1.623 3.236l0.96 0.96a1.5 1.5 0 1 1 -2.122 2.12l-1.01 -1.01a9.616 9.616 0 0 1 -1.67 0.915l0.243 0.906a1.5 1.5 0 0 1 -2.897 0.776l-0.251 -0.935c-0.705 0.073 -1.417 0.073 -2.122 0l-0.25 0.935a1.5 1.5 0 0 1 -2.898 -0.776l0.242 -0.907a9.61 9.61 0 0 1 -1.669 -0.914l-1.01 1.01a1.5 1.5 0 1 1 -2.122 -2.12l0.96 -0.96a10.102 10.102 0 0 1 -1.62 -3.23A1.5 1.5 0 0 1 2.5 9Z" strokeWidth="1"></path>
                      </g>
                    </svg>
                    : 
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="Eye-2-Fill--Streamline-Mingcute-Fill" height="24" width="24">
                      <g fill="none" fillRule="nonzero">
                        <path d="M24 0v24H0V0h24ZM12.593 23.258l-0.011 0.002 -0.071 0.035 -0.02 0.004 -0.014 -0.004 -0.071 -0.035c-0.01 -0.004 -0.019 -0.001 -0.024 0.005l-0.004 0.01 -0.017 0.428 0.005 0.02 0.01 0.013 0.104 0.074 0.015 0.004 0.012 -0.004 0.104 -0.074 0.012 -0.016 0.004 -0.017 -0.017 -0.427c-0.002 -0.01 -0.009 -0.017 -0.017 -0.018Zm0.265 -0.113 -0.013 0.002 -0.185 0.093 -0.01 0.01 -0.003 0.011 0.018 0.43 0.005 0.012 0.008 0.007 0.201 0.093c0.012 0.004 0.023 0 0.029 -0.008l0.004 -0.014 -0.034 -0.614c-0.003 -0.012 -0.01 -0.02 -0.02 -0.022Zm-0.715 0.002a0.023 0.023 0 0 0 -0.027 0.006l-0.006 0.014 -0.034 0.614c0 0.012 0.007 0.02 0.017 0.024l0.015 -0.002 0.201 -0.093 0.01 -0.008 0.004 -0.011 0.017 -0.43 -0.003 -0.012 -0.01 -0.01 -0.184 -0.092Z" strokeWidth="1"></path>
                        <path fill="currentColor" d="M12 5c3.679 0 8.162 2.417 9.73 5.901 0.146 0.328 0.27 0.71 0.27 1.099 0 0.388 -0.123 0.771 -0.27 1.099C20.161 16.583 15.678 19 12 19c-3.679 0 -8.162 -2.417 -9.73 -5.901C2.124 12.77 2 12.389 2 12c0 -0.388 0.123 -0.771 0.27 -1.099C3.839 7.417 8.322 5 12 5Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0 -8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0 -4Z" strokeWidth="1"></path>
                      </g>
                    </svg>
                  }
                </button>
              </div>
              {passwordError && (
                <p className="text-xs text-red-600 mt-1">{passwordError}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">{t('confirmReset.passwordHint')}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">
                {t('confirmReset.confirmPasswordLabel')}
              </label>
              <div className="relative">
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword} 
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmPasswordError) {
                      setConfirmPasswordError("");
                    }
                  }}
                  placeholder={t('confirmReset.confirmPasswordPlaceholder')}
                  className={`w-full border-0 bg-[#E8E5DC] rounded-md px-4 py-2.5 pr-10 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    confirmPasswordError 
                      ? "focus:ring-red-500/30 ring-2 ring-red-500/30" 
                      : "focus:ring-green-500/30"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showConfirmPassword ? 
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="Eye-Close-Fill--Streamline-Mingcute-Fill" height="24" width="24">
                      <g fill="none" fillRule="evenodd">
                        <path d="M24 0v24H0V0h24ZM12.593 23.258l-0.011 0.002 -0.071 0.035 -0.02 0.004 -0.014 -0.004 -0.071 -0.035c-0.01 -0.004 -0.019 -0.001 -0.024 0.005l-0.004 0.01 -0.017 0.428 0.005 0.02 0.01 0.013 0.104 0.074 0.015 0.004 0.012 -0.004 0.104 -0.074 0.012 -0.016 0.004 -0.017 -0.017 -0.427c-0.002 -0.01 -0.009 -0.017 -0.017 -0.018Zm0.265 -0.113 -0.013 0.002 -0.185 0.093 -0.01 0.01 -0.003 0.011 0.018 0.43 0.005 0.012 0.008 0.007 0.201 0.093c0.012 0.004 0.023 0 0.029 -0.008l0.004 -0.014 -0.034 -0.614c-0.003 -0.012 -0.01 -0.02 -0.02 -0.022Zm-0.715 0.002a0.023 0.023 0 0 0 -0.027 0.006l-0.006 0.014 -0.034 0.614c0 0.012 0.007 0.02 0.017 0.024l0.015 -0.002 0.201 -0.093 0.01 -0.008 0.004 -0.011 0.017 -0.43 -0.003 -0.012 -0.01 -0.01 -0.184 -0.092Z" strokeWidth="1"></path>
                        <path fill="currentColor" d="M2.5 9a1.5 1.5 0 0 1 2.945 -0.404c1.947 6.502 11.158 6.503 13.109 0.005a1.5 1.5 0 1 1 2.877 0.85 10.104 10.104 0 0 1 -1.623 3.236l0.96 0.96a1.5 1.5 0 1 1 -2.122 2.12l-1.01 -1.01a9.616 9.616 0 0 1 -1.67 0.915l0.243 0.906a1.5 1.5 0 0 1 -2.897 0.776l-0.251 -0.935c-0.705 0.073 -1.417 0.073 -2.122 0l-0.25 0.935a1.5 1.5 0 0 1 -2.898 -0.776l0.242 -0.907a9.61 9.61 0 0 1 -1.669 -0.914l-1.01 1.01a1.5 1.5 0 1 1 -2.122 -2.12l0.96 -0.96a10.102 10.102 0 0 1 -1.62 -3.23A1.5 1.5 0 0 1 2.5 9Z" strokeWidth="1"></path>
                      </g>
                    </svg>
                    : 
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="Eye-2-Fill--Streamline-Mingcute-Fill" height="24" width="24">
                      <g fill="none" fillRule="nonzero">
                        <path d="M24 0v24H0V0h24ZM12.593 23.258l-0.011 0.002 -0.071 0.035 -0.02 0.004 -0.014 -0.004 -0.071 -0.035c-0.01 -0.004 -0.019 -0.001 -0.024 0.005l-0.004 0.01 -0.017 0.428 0.005 0.02 0.01 0.013 0.104 0.074 0.015 0.004 0.012 -0.004 0.104 -0.074 0.012 -0.016 0.004 -0.017 -0.017 -0.427c-0.002 -0.01 -0.009 -0.017 -0.017 -0.018Zm0.265 -0.113 -0.013 0.002 -0.185 0.093 -0.01 0.01 -0.003 0.011 0.018 0.43 0.005 0.012 0.008 0.007 0.201 0.093c0.012 0.004 0.023 0 0.029 -0.008l0.004 -0.014 -0.034 -0.614c-0.003 -0.012 -0.01 -0.02 -0.02 -0.022Zm-0.715 0.002a0.023 0.023 0 0 0 -0.027 0.006l-0.006 0.014 -0.034 0.614c0 0.012 0.007 0.02 0.017 0.024l0.015 -0.002 0.201 -0.093 0.01 -0.008 0.004 -0.011 0.017 -0.43 -0.003 -0.012 -0.01 -0.01 -0.184 -0.092Z" strokeWidth="1"></path>
                        <path fill="currentColor" d="M12 5c3.679 0 8.162 2.417 9.73 5.901 0.146 0.328 0.27 0.71 0.27 1.099 0 0.388 -0.123 0.771 -0.27 1.099C20.161 16.583 15.678 19 12 19c-3.679 0 -8.162 -2.417 -9.73 -5.901C2.124 12.77 2 12.389 2 12c0 -0.388 0.123 -0.771 0.27 -1.099C3.839 7.417 8.322 5 12 5Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0 -8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0 -4Z" strokeWidth="1"></path>
                      </g>
                    </svg>
                  }
                </button>
              </div>
              {confirmPasswordError && (
                <p className="text-xs text-red-600 mt-1">{confirmPasswordError}</p>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-md px-4 py-2.5 text-sm font-medium bg-[#6B9B6E] text-white hover:bg-[#5d8660] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t('confirmReset.submitting') : t('confirmReset.submit')}
            </button>

            <div>
              <a 
                href="/login" 
                className="w-full inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors no-underline"
              >
                {t('confirmReset.backToLogin')}
              </a>
            </div>
          </form>
        </div>
        <div className="mt-6 text-center text-xs text-slate-500">
          {t('login.copyright', { year: new Date().getFullYear() })}
        </div>
      </div>
    </div>
  );
}

