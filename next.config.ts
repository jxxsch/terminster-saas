import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Webpack als Standard-Bundler konfigurieren
  webpack: (config) => {
    return config;
  },
  // Image Domains für externe Bilder (Supabase Storage + Unsplash)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'enzlztfklydstpqqwvgl.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
