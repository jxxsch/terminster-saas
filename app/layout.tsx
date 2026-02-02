import type { Metadata } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
      <body className={`${geistSans.variable} ${playfair.variable} antialiased bg-black text-white`}>
        {children}
      </body>
    </html>
  );
}
