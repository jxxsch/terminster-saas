import { Geist } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from '@/context/ThemeContext';

// Import messages directly instead of using getMessages (which requires locale param)
import messages from '@/messages/de.json';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="h-full">
      <body className={`${geistSans.variable} antialiased h-full`}>
        <NextIntlClientProvider messages={messages} locale="de">
          <ThemeProvider storageKey="dashboard-theme">
            <div className="dashboard-layout min-h-full bg-stone-50 text-black dark:bg-[#0f0f0f] dark:text-gray-100">
              {children}
            </div>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
