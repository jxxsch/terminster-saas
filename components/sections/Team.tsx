'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useBooking } from '@/context/BookingContext';
import { getTeam, TeamMember } from '@/lib/supabase';
import { useTranslations, useLocale } from 'next-intl';
import { useSectionSettings } from '@/hooks/useSiteSettings';

export function Team() {
  const [isVisible, setIsVisible] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const sectionRef = useRef<HTMLElement>(null);
  const { openBooking } = useBooking();
  const t = useTranslations('team');
  const locale = useLocale();
  const { title, subtitle } = useSectionSettings('team');

  // Use i18n for non-German locales, DB values only for German
  const sectionTitle = locale === 'de' ? (title || t('headline')) : t('headline');
  const sectionBadge = locale === 'de' ? (subtitle || t('badge')) : t('badge');

  // Team-Daten aus Supabase laden (Single Source of Truth)
  useEffect(() => {
    async function loadTeam() {
      const teamData = await getTeam();
      setTeam(teamData);
    }
    loadTeam();
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

  return (
    <section ref={sectionRef} id="team" className="relative py-16 md:py-20 bg-stone-50 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">

        {/* Badge - Zentriert */}
        <div className={`flex items-center justify-center gap-4 mb-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="h-px w-12 bg-gold/30" />
          <span className="text-sm font-light tracking-[0.3em] text-gold uppercase text-center">{sectionBadge}</span>
          <div className="h-px w-12 bg-gold/30" />
        </div>

        {/* Header - Zentriert */}
        <h2 className={`text-3xl md:text-4xl lg:text-5xl font-light text-black tracking-wide mb-16 text-center transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {sectionTitle}
        </h2>

        {/* Team Grid - Staggered Animation */}
        <div
          className={`grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0 is-visible' : 'opacity-0 translate-y-4'}`}
          data-stagger="fade-up"
        >

          {team.map((member) => (
            <div key={member.id} className="group">
              <div className="rounded-3xl overflow-hidden shadow-lg card-interactive">
                <div className="aspect-[3/4] bg-gray-100 overflow-hidden relative">
                  {member.image && (
                    <Image src={member.image} alt="" fill className="object-cover pointer-events-none" style={{ filter: 'blur(8px)', transform: 'scale(1.1)' }} aria-hidden="true" />
                  )}
                  <Image src={member.image || '/team/placeholder.jpg'} alt={member.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-contain group-hover:brightness-75 transition-all duration-300" style={{ transform: (() => { const m = (member.image_position_portrait || member.image_position || '50% 50%').match(/(-?\d+)%\s+(-?\d+)%/); const x = m ? parseInt(m[1]) : 50; const y = m ? parseInt(m[2]) : 50; const s = member.image_scale_portrait || member.image_scale || 1; return `scale(${s}) translate(${(50 - x) * 0.5}%, ${(50 - y) * 0.5}%)`; })() }} />
                </div>
                <div className="bg-white p-4 text-center">
                  <h3 className="text-sm font-extralight text-black tracking-[0.2em] uppercase mb-0 group-hover:mb-3 transition-all duration-300 border-b border-gold/50 pb-1 inline-block">{member.name}</h3>
                  <div className="h-0 group-hover:h-10 overflow-hidden transition-all duration-300">
                    <button onClick={() => openBooking(member.id)} className="inline-flex items-center justify-center px-5 py-2 bg-gold text-black text-[10px] font-light tracking-[0.15em] uppercase hover:bg-black hover:text-white transition-all btn-interactive">{t('bookButton')}</button>
                  </div>
                </div>
              </div>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}
