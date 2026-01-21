import type { Metadata } from "next";
import "./globals.css";

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
  return children;
}
