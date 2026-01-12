"use client";
import React, {useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useNotifications} from "@/src/hooks/useNotifications";
import {useAuth} from "@/src/contexts/AuthContext";
import {login} from "@/src/services/iam";
import {getRedirectPathByRole} from "@/src/utils/roleRedirect";
import Link from "next/link";

export default function LoginForm(){
  const t = useTranslations();
  const router = useRouter();
  const {show} = useNotifications();
  const {setUser} = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Validate password
  const validatePassword = (pwd: string): string => {
    // if (pwd.length < 8) {
    //   return "Mật khẩu phải có ít nhất 8 ký tự";
    // }
    // if (!/[A-Z]/.test(pwd)) {
    //   return "Mật khẩu phải có ít nhất 1 chữ in hoa";
    // }
    // if (!/\d/.test(pwd)) {
    //   return "Mật khẩu phải có ít nhất 1 số";
    // }
    // if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
    //   return "Mật khẩu phải có ít nhất 1 ký tự đặc biệt";
    // }
    return "";
  };

  async function onSubmit(e: React.FormEvent){
    e.preventDefault();
    
    // Validate username
    let isValid = true;
    if (!username.trim()) {
      setEmailError("Email không được để trống");
      isValid = false;
    } else {
      setEmailError("");
    }

    // Validate password
    const pwdError = validatePassword(password);
    if (pwdError) {
      setPasswordError(pwdError);
      isValid = false;
    } else {
      setPasswordError("");
    }

    if (!isValid) {
      return;
    }
    
    setLoading(true);
    
    try { 
      const response = await login({username, password, remember});
      
      // Lưu thông tin user vào Context
      setUser(response.userInfo);
      
      // Xác định trang redirect dựa vào role
      const redirectPath = getRedirectPathByRole(response.userInfo.roles);
      
      // Hiện thông báo thành công
      show(t("Login.success"), "success");
      
      // Redirect sau 500ms
      // setTimeout(() => {
        router.push(redirectPath);
      // }, 500);
      
    } catch (e:any) {
      // Hiển thị message cho user
      let errorMessage = t("Login.error");
      
      if (e?.response?.status === 401) {
        errorMessage = e?.response?.data?.message || "Sai tài khoản hoặc mật khẩu";
      } else if (e?.response?.status === 400) {
        errorMessage = e?.response?.data?.message || "Thông tin đăng nhập không hợp lệ";
      } else if (e?.code === 'ERR_NETWORK' || e?.message?.includes('Network')) {
        errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.";
      }else{
        errorMessage = e?.message || errorMessage;
      }
      
      show(errorMessage, "error");
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">{t("Login.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("Login.subtitle")}</p>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1.5">
          {t("Login.username")}
        </label>
        <input 
          type="text"
          value={username} 
          onChange={(e) => {
            setUsername(e.target.value);
            if (emailError) {
              setEmailError("");
            }
          }}
          placeholder="you@example.com"
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

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-slate-700">{t("Login.password")}</label>
          <Link href="/forgotpassword" className="text-xs text-green-600 hover:text-green-700 hover:underline">{t("Login.forgot")}</Link>
        </div>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) {
              const error = validatePassword(e.target.value);
              setPasswordError(error);
            }
          }}
          placeholder="••••••••"
          className={`w-full border-0 bg-[#E8E5DC] rounded-md px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
            passwordError 
              ? "focus:ring-red-500/30 ring-2 ring-red-500/30" 
              : "focus:ring-green-500/30"
          }`}
        />
        {passwordError && (
          <p className="text-xs text-red-600 mt-1">{passwordError}</p>
        )}
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
        <input 
          type="checkbox" 
          checked={remember} 
          onChange={e=>setRemember(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500 cursor-pointer"
        />
        {t("Login.remember")}
      </label>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full rounded-md px-4 py-2.5 text-sm font-medium bg-[#6B9B6E] text-white hover:bg-[#5d8660] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? t("Login.loading") : t("Login.submit")}
      </button>

      {/* <div className="text-center text-xs text-slate-500 pt-2">{t("Login.contact_support")}</div> */}
    </form>
  );
};
