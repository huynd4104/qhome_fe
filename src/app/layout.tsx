import "./globals.css";
import { cookies } from "next/headers";
import Providers from "./providers";
import Navbar from "@/src/components/layout/Navbar";

async function getMessages(locale: string) {
  const data = (await import(`../../messages/${locale}.json`)).default;
  return data as Record<string, string>;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const currentLocale = cookieStore.get("locale")?.value || "vi";
  const messages = await getMessages(currentLocale);

  return (
    <html lang={currentLocale}>
      <body>
        <Providers initialLocale={currentLocale} initialMessages={messages}>
          <Navbar />
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
