'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Service {
  id: string;
  key: string;
  duration: number;
  price: string;
  image: string;
  position?: string;
  scale?: string;
  brightness?: string;
}

const SERVICES: Service[] = [
  { id: '1', key: 'haircut', duration: 30, price: '20 €', image: 'https://images.pexels.com/photos/3998415/pexels-photo-3998415.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { id: '2', key: 'shave', duration: 20, price: '15 €', image: '/services/shave.jpg', brightness: '110%' },
  { id: '3', key: 'combo', duration: 45, price: '35 €', image: '/services/combo.jpg' },
  { id: '4', key: 'eyebrows', duration: 10, price: '8 €', image: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&h=600&fit=crop' },
  { id: '5', key: 'clipper', duration: 15, price: '12 €', image: 'https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=600&h=600&fit=crop', brightness: '110%' },
  { id: '6', key: 'wash', duration: 5, price: '3 €', image: 'https://images.pexels.com/photos/7518730/pexels-photo-7518730.jpeg?auto=compress&cs=tinysrgb&w=800', position: '35% 100%', scale: '1.3' },
  { id: '7', key: 'complete', duration: 60, price: '40 €', image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&h=600&fit=crop' },
  { id: '8', key: 'kids', duration: 25, price: '15 €', image: 'https://images.unsplash.com/photo-1534297635766-a262cdcb8ee4?w=600&h=600&fit=crop' },
];

export function Services() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const t = useTranslations('services');

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

  return (
    <section ref={sectionRef} id="services" className="relative py-16 md:py-20 bg-white overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">

        {/* Badge - Zentriert wie bei About */}
        <div className={`flex items-center justify-center gap-4 mb-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="h-px w-12 bg-gold/30" />
          <span className="text-sm font-light tracking-[0.3em] text-gold uppercase">{t('badge')}</span>
          <div className="h-px w-12 bg-gold/30" />
        </div>

        {/* Header - Zentriert */}
        <h2 className={`text-3xl md:text-4xl lg:text-5xl font-light text-black tracking-wide mb-16 text-center transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {t('headline')}
        </h2>

        {/* Services Grid - Variante 9: Doppel Rahmen */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

          {SERVICES.map((service) => (
            <div key={service.id} className="group text-center">
              <div className="p-1.5 border-2 border-gold rounded-full max-w-[200px] mx-auto">
                <div className="aspect-square bg-gray-100 overflow-hidden relative rounded-full border-2 border-gold">
                  <Image src={service.image} alt={t(`items.${service.key}.name`)} fill className="object-cover" style={{ objectPosition: service.position || '50% 50%', transform: `scale(${service.scale || '1'})`, filter: `grayscale(100%) sepia(30%) contrast(110%) brightness(${service.brightness || '90%'})` }} />
                </div>
              </div>
              <h3 className="text-xs font-light text-black tracking-[0.15em] uppercase mb-0 mt-3">{t(`items.${service.key}.name`)}</h3>
              <p className="text-[10px] text-gray-500 font-light mb-2">{t(`items.${service.key}.description`)}</p>
              <span className="text-sm font-medium text-gold">{service.price}</span>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}
