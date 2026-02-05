"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from 'next-intl';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/src/contexts/AuthContext";
import {
  fetchUserAccount,
  fetchUserProfile,
  fetchUserStatus,
  UserAccountInfo,
  UserProfileInfo,
  UserStatusInfo,
} from "@/src/services/iam/userService";
import { requestPasswordReset } from "@/src/services/iam/authService";
import { useNotifications } from "@/src/hooks/useNotifications";
import PopupComfirm from '@/src/components/common/PopupComfirm';

export default function ProfileViewPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const { show } = useNotifications();
  const t = useTranslations('ProfileView');
  const tAuth = useTranslations('Auth');
  const [profile, setProfile] = useState<UserProfileInfo | null>(null);
  const [account, setAccount] = useState<UserAccountInfo | null>(null);
  const [status, setStatus] = useState<UserStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowLogoutConfirm(true);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const validateEmail = (email: string): string => {
    if (!email.trim()) {
      return tAuth('forgotPassword.errors.emailRequired');
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return tAuth('forgotPassword.errors.emailInvalid');
    }
    return "";
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const error = validateEmail(forgotPasswordEmail);
    if (error) {
      setForgotPasswordError(error);
      return;
    }
    
    setForgotPasswordError("");
    setForgotPasswordLoading(true);
    
    try {
      await requestPasswordReset(forgotPasswordEmail);
      setForgotPasswordSuccess(true);
      show(tAuth('forgotPassword.messages.success'), "success");
      setTimeout(() => {
        router.push(`/verify-otp?email=${encodeURIComponent(forgotPasswordEmail)}`);
      }, 2000);
    } catch (e: any) {
      let errorMessage = tAuth('forgotPassword.errors.genericError');
      
      if (e?.response?.status === 429) {
        errorMessage = e?.response?.data?.message || tAuth('forgotPassword.errors.tooManyRequests');
      } else if (e?.response?.status === 400) {
        errorMessage = e?.response?.data?.message || tAuth('forgotPassword.errors.invalidEmail');
      } else if (e?.code === 'ERR_NETWORK' || e?.message?.includes('Network')) {
        errorMessage = tAuth('forgotPassword.errors.networkError');
      }
      
      setForgotPasswordError(errorMessage);
      show(errorMessage, "error");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleOpenForgotPassword = () => {
    setForgotPasswordEmail(account?.email || profile?.email || user?.email || "");
    setForgotPasswordError("");
    setForgotPasswordSuccess(false);
    setShowForgotPassword(true);
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail("");
    setForgotPasswordError("");
    setForgotPasswordSuccess(false);
  };

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!user?.userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [profileRes, accountRes, statusRes] = await Promise.all([
          fetchUserProfile(user.userId),
          fetchUserAccount(user.userId),
          fetchUserStatus(user.userId),
        ]);
        console.log("profileRes", profileRes);
        console.log("accountRes", accountRes);
        console.log("statusRes", statusRes);

        if (!active) return;

        setProfile(profileRes);
        setAccount(accountRes);
        setStatus(statusRes);
      } catch (err: any) {
        console.error("Failed to load profile", err);
        if (!active) return;
        const message =
          err?.response?.data?.message ||
          err?.message ||
          t('errors.loadFailed');
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [user?.userId]);

  const permissionsByService = useMemo(() => {
    if (!profile?.permissions?.length) return {};

    return profile.permissions.reduce<Record<string, string[]>>((acc, perm) => {
      const [service, code] = perm.split(".");
      const key = service || "khác";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(code || perm);
      return acc;
    }, {});
  }, [profile?.permissions]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600">{t('loading')}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-xl p-6 text-center space-y-3">
          <h1 className="text-lg font-semibold text-slate-800">
            {t('loginPrompt.title')}
          </h1>
          <p className="text-sm text-slate-500">
            {t('loginPrompt.message')}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
          >
            {t('loginPrompt.button')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-600 uppercase tracking-wide">
              {t('title')}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
                <h1 className="mt-2 text-2xl font-bold text-slate-800">
                {profile?.username || user.username || t('common.unknown')}
                </h1>
                <div className="mt-2 ml-2 flex flex-wrap gap-2">
                    {(profile?.roles?.length ? profile.roles : user.roles)?.map(
                      (role) => (
                        <span
                          key={role}
                          className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
                        >
                          {role}
                        </span>
                      )
                    ) || (
                      <span className="text-sm text-slate-500">
                        {t('roles.noRoles')}
                      </span>
                    )}
                  </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/profileEdit"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition"
            >
              {user?.roles?.find(role => role === "Resident") ? t('quickActions.editProfile') : t('quickActions.changePassword')}
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-5">
          <div className="md:col-span-3 space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">
                  {t('accountInfo.title')}
                </h2>
              </div>

              <dl className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <dt className="text-xs font-medium uppercase text-slate-500">
                    {t('accountInfo.username')}
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-800">
                    {account?.username || profile?.username || t('common.unknown')}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 overflow-auto">
                  <dt className="text-xs font-medium uppercase text-slate-500">
                    {t('accountInfo.email')}
                  </dt>
                  <dd className="mt-2 text-base font-semibold text-slate-800">
                    {account?.email || profile?.email || t('common.unknown')}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <aside className="col-span-2 md:grid-cols-1 space-y-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700">
                {t('quickActions.title')}
              </h3>
              <div className="mt-4 space-y-3">
                <Link
                  href="/profileEdit"
                  className="block rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition"
                >
                  {user?.roles?.find(role => role === "Resident") ? t('quickActions.editProfile') : t('quickActions.changePassword')}
                </Link>
                <button
                  onClick={handleOpenForgotPassword}
                  className="w-full text-left rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition"
                >
                  {tAuth('forgotPassword.title')}
                </button>
                {user?.roles?.find(role => role === "Resident") && (
                  <Link
                    href="/dashboard/buildings"
                    className="block rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700 transition"
                  >
                    {t('quickActions.viewUnitInfo')}
                  </Link>
                )}
                <Link
                  href=""
                  onClick={handleLogoutClick}
                  className="block rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition"
                >
                  {t('quickActions.logout')}
                </Link>
              </div>
            </div>
          </aside>
        </section>

        {/* Logout Confirm Popup */}
        <PopupComfirm
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
          popupTitle={t('logoutConfirm')}
          popupContext=""
          isDanger={false}
        />

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              {!forgotPasswordSuccess ? (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
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
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                      {tAuth('forgotPassword.heading')}
                    </h2>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {tAuth('forgotPassword.description')}
                    </p>
                  </div>

                  {/* Email Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 block">
                      {tAuth('forgotPassword.emailLabel')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg 
                          className={`h-5 w-5 transition-colors duration-200 ${
                            forgotPasswordError 
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
                        value={forgotPasswordEmail} 
                        onChange={(e) => {
                          setForgotPasswordEmail(e.target.value);
                          if (forgotPasswordError) {
                            setForgotPasswordError("");
                          }
                        }}
                        onFocus={() => setIsEmailFocused(true)}
                        onBlur={() => setIsEmailFocused(false)}
                        placeholder={tAuth('forgotPassword.emailPlaceholder')}
                        className={`w-full border-0 bg-[#E8E5DC] rounded-lg px-4 pl-10 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                          forgotPasswordError 
                            ? "focus:ring-red-500 ring-2 ring-red-500/30 bg-red-50" 
                            : isEmailFocused
                              ? "focus:ring-green-500 ring-2 ring-green-500/30 bg-green-50/50"
                              : "focus:ring-green-500/30"
                        }`}
                        disabled={forgotPasswordLoading}
                      />
                    </div>
                    {forgotPasswordError && (
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
                        <p className="text-xs text-red-600 leading-relaxed">{forgotPasswordError}</p>
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button 
                      type="submit" 
                      disabled={forgotPasswordLoading || !forgotPasswordEmail.trim()}
                      className="flex-1 rounded-lg px-4 py-3 text-sm font-semibold bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      {forgotPasswordLoading ? (
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
                          <span>{tAuth('forgotPassword.submitting')}</span>
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
                          <span>{tAuth('forgotPassword.submit')}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseForgotPassword}
                      className="px-4 py-3 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-200 text-sm font-medium"
                    >
                      Hủy
                    </button>
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
                    {tAuth('forgotPassword.messages.success')}
                  </h2>
                  <p className="text-sm text-slate-600 mb-6">
                    {tAuth('forgotPassword.messages.checkEmail', { email: forgotPasswordEmail })}
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
                    <span>{tAuth('forgotPassword.messages.redirecting')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

