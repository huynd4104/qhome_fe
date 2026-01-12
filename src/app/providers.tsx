"use client";
import React from "react";
import { NextIntlClientProvider } from "next-intl";
import { NotificationsProvider } from "@/src/hooks/useNotifications";
import { AuthProvider } from "@/src/contexts/AuthContext";

export const I18nRuntimeContext = React.createContext<{
  locale: string;
  setLocale: (l: string) => void;
} | null>(null);

export default function Providers({
  children,
  initialLocale,
  initialMessages
}: {
  children: React.ReactNode;
  initialLocale: string;
  initialMessages: Record<string, any>;
}) {
  const [locale, setLocale] = React.useState(initialLocale);
  const [messages, setMessages] = React.useState(initialMessages);

  const safeSetLocale = React.useCallback(async (next: string) => {
    if (next === locale) return;
    const mod = await import(`../../messages/${next}.json`);
    setLocale(next);
    setMessages(mod.default);
    document.cookie = `locale=${next}; path=/; max-age=31536000`;
    document.documentElement.lang = next;
  }, [locale]);

  return (
    <I18nRuntimeContext.Provider value={{ locale, setLocale: safeSetLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Ho_Chi_Minh">
        <AuthProvider>
          <NotificationsProvider>{children}</NotificationsProvider>
        </AuthProvider>
      </NextIntlClientProvider>
    </I18nRuntimeContext.Provider>
  );
}
