"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/src/hooks/useNotifications";
import { useAuth } from "@/src/contexts/AuthContext";
import { login } from "@/src/services/iam";
import { getRedirectPathByRole } from "@/src/utils/roleRedirect";
import Link from "next/link";

// SVG Icons
const MailIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

const LoaderIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const { show } = useNotifications();
  const { setUser } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      newErrors.username = "Email không được để trống";
    }

    if (!password) {
      newErrors.password = "Mật khẩu không được để trống";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await login({ username, password, remember });
      setUser(response.userInfo);

      const redirectPath = getRedirectPathByRole(response.userInfo.roles);
      show(t("Login.success"), "success");
      router.push(redirectPath);
    } catch (error: any) {
      let errorMessage = t("Login.error");

      if (error?.response?.status === 403) {
        errorMessage = t("Login.wrongCredentials");
      } else if (error?.response?.data) {
        errorMessage = error.response.data.message || error.response.data;
      } else if (error?.code === "ERR_NETWORK" || error?.message?.includes("Network")) {
        errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra kết nối.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      show(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field: "username" | "password") => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 md:p-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <img
              src="/logo.svg"
              alt="QHome Logo"
              className="w-24 h-24 object-contain"
            />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            {t("Login.title")}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Field */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 block">
              {t("Login.username")}
            </label>
            <div className="relative group">
              <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  clearError("username");
                }}
                placeholder="you@example.com"
                className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 rounded-xl text-slate-700 placeholder:text-slate-400 transition-all duration-200 outline-none ${errors.username
                  ? "border-red-300 focus:border-red-500 bg-red-50/50"
                  : "border-slate-200 focus:border-emerald-500 focus:bg-white"
                  }`}
              />
            </div>
            {errors.username && (
              <p className="text-sm text-red-500 font-medium">{errors.username}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">
                {t("Login.password")}
              </label>
              <Link
                href="/forgotpassword"
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors hover:underline underline-offset-2"
              >
                {t("Login.forgot")}
              </Link>
            </div>
            <div className="relative group">
              <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError("password");
                }}
                placeholder="••••••••"
                className={`w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 rounded-xl text-slate-700 placeholder:text-slate-400 transition-all duration-200 outline-none ${errors.password
                  ? "border-red-300 focus:border-red-500 bg-red-50/50"
                  : "border-slate-200 focus:border-emerald-500 focus:bg-white"
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOffIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500 font-medium">{errors.password}</p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-5 h-5 border-2 border-slate-300 rounded-md peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all duration-200" />
                <svg
                  className="absolute inset-0 w-5 h-5 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path
                    d="M4 10l4 4 8-8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors">
                {t("Login.remember")}
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading && <LoaderIcon className="w-5 h-5 animate-spin" />}
            {loading ? t("Login.loading") : t("Login.submit")}
          </button>
        </form>

      </div>
    </div>
  );
}