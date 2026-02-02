'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Product, getProducts, productCategories } from '@/lib/supabase';
import { ProductCarousel } from '@/components/ui/ProductCarousel';

type CategoryKey = 'bart' | 'haare' | 'rasur';

const CATEGORIES: CategoryKey[] = ['bart', 'haare', 'rasur'];

export function Products() {
  const [isVisible, setIsVisible] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const sectionRef = useRef<HTMLElement>(null);
  const t = useTranslations('products');

  // Produkte aus Supabase laden
  useEffect(() => {
    async function loadProducts() {
      const data = await getProducts();
      setProducts(data);
    }
    loadProducts();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Produkte nach Kategorie gruppieren
  const productsByCategory = CATEGORIES.reduce((acc, category) => {
    acc[category] = products.filter(p => p.category === category);
    return acc;
  }, {} as Record<CategoryKey, Product[]>);

  return (
    <section ref={sectionRef} id="products" className="relative py-16 md:py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">

        {/* Badge */}
        <div className={`flex items-center justify-center gap-4 mb-6 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="h-px w-12 bg-gold/30" />
          <span className="text-sm font-light tracking-[0.3em] text-gold uppercase">{t('badge')}</span>
          <div className="h-px w-12 bg-gold/30" />
        </div>

        {/* Header */}
        <h2 className={`text-3xl md:text-4xl lg:text-5xl font-light text-gray-900 tracking-wide mb-12 text-center transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {t('headline')}
        </h2>

        {/* Floating Container mit 3 Carousels */}
        <div className={`bg-gray-50 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {CATEGORIES.map((category) => (
              <ProductCarousel
                key={`${category}-${productsByCategory[category].length}`}
                products={productsByCategory[category]}
                categoryTitle={productCategories[category]}
                fullWidth={true}
                autoplay={true}
                autoplayDelay={{ bart: 8000, haare: 11000, rasur: 9500 }[category]}
                pauseOnHover={true}
                loop={true}
              />
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className={`mt-12 text-center transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="inline-flex items-center gap-2 px-5 py-3 bg-gray-50 border border-gray-200 rounded-full">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span className="text-gray-600 text-sm">{t('availableInStore')}</span>
          </div>
        </div>

      </div>
    </section>
  );
}
