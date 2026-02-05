"use client";
import React from "react";
import {useTranslations} from "next-intl";
import { I18nRuntimeContext } from "../../app/providers";

export default function LocaleSwitcher(){
  const t = useTranslations("Common");
  const i18n = React.useContext(I18nRuntimeContext);
  if (!i18n) throw new Error("I18nRuntimeContext missing");
  const { locale, setLocale } = i18n;

  return (
    <label className="text-xs text-slate-600 inline-flex items-center gap-2">
      <span className="hidden sm:inline">{t("language")}</span>
      <select value={locale} onChange={(e)=>setLocale(e.target.value)} className="border rounded-md px-2 py-1">
        <option value="vi">VI</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}
