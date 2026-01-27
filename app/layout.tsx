import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: '%s | Premium Barbershop',
    default: 'Premium Barbershop - Herrenkultur seit 2016'
  },
  description: "Premium Barbershop für professionelle Haar- und Bartpflege. Buchen Sie jetzt Ihren Termin online.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${geistSans.variable} antialiased bg-black text-white`}>
        {children}
      </body>
    </html>
  );
}
