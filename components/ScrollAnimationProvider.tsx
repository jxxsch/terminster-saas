'use client';

import { useEffect } from 'react';
import { useScrollAnimations, useParallax } from '@/hooks/useScrollAnimations';

interface ScrollAnimationProviderProps {
  children: React.ReactNode;
  enableParallax?: boolean;
  options?: {
    threshold?: number;
    rootMargin?: string;
    once?: boolean;
  };
}

/**
 * Provider component that initializes scroll animations globally
 * Wrap your layout or page with this component to enable animations
 *
 * Usage:
 * ```tsx
 * <ScrollAnimationProvider>
 *   <YourContent />
 * </ScrollAnimationProvider>
 * ```
 *
 * Then use data attributes on elements:
 * ```tsx
 * <div data-animate="fade-up">Animates from bottom</div>
 * <div data-animate="slide-left" data-delay="200">Slides from right with delay</div>
 * <div data-stagger="fade-up">
 *   <div>Child 1</div>
 *   <div>Child 2</div>
 *   <div>Child 3</div>
 * </div>
 * ```
 *
 * Available animations:
 * - fade-up, fade-down, fade
 * - slide-left, slide-right
 * - scale-up, scale-down
 * - fade-up-scale
 * - rotate-in
 * - blur-in
 *
 * Modifiers:
 * - data-delay="100|200|300|400|500|600|700|800"
 * - data-duration="fast|normal|slow|slower"
 * - data-distance="sm|md|lg|xl"
 * - data-easing="ease-out|ease-in-out|spring|bounce"
 *
 * Stagger animations:
 * - data-stagger (default fade-up)
 * - data-stagger="fade-up|fade-down|slide-left|slide-right|scale"
 *
 * Parallax:
 * - data-parallax="slow|medium|fast"
 */
export function ScrollAnimationProvider({
  children,
  enableParallax = true,
  options = {},
}: ScrollAnimationProviderProps) {
  // Initialize scroll animations
  useScrollAnimations(options);

  // Initialize parallax if enabled
  if (enableParallax) {
    useParallax();
  }

  // Re-initialize on route changes (for Next.js)
  useEffect(() => {
    const handleRouteChange = () => {
      // Small delay to allow DOM to update
      setTimeout(() => {
        const elements = document.querySelectorAll('[data-animate], [data-stagger]');
        elements.forEach((el) => {
          // Reset visibility for fresh animations
          if (!el.classList.contains('is-visible')) {
            el.classList.remove('is-visible');
          }
        });
      }, 100);
    };

    // Listen for Next.js route changes if available
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handleRouteChange);
    }

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  return <>{children}</>;
}

export default ScrollAnimationProvider;
