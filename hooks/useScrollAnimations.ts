'use client';

import { useEffect, useRef, useCallback } from 'react';

interface ScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

/**
 * Hook to initialize scroll animations using IntersectionObserver
 * Detects elements with data-animate and data-stagger attributes
 * and adds 'is-visible' class when they enter the viewport
 */
export function useScrollAnimations(options: ScrollAnimationOptions = {}) {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    once = true,
  } = options;

  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      // If reduced motion is preferred, make all elements visible immediately
      const elements = document.querySelectorAll('[data-animate], [data-stagger]');
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Create IntersectionObserver
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');

            // Unobserve if animation should only happen once
            if (once && observerRef.current) {
              observerRef.current.unobserve(entry.target);
            }
          } else if (!once) {
            // Remove class if animation should repeat
            entry.target.classList.remove('is-visible');
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    // Observe all animated elements
    const elements = document.querySelectorAll('[data-animate], [data-stagger]');
    elements.forEach((el) => {
      if (observerRef.current) {
        observerRef.current.observe(el);
      }
    });

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, once]);
}

/**
 * Hook for parallax scrolling effects
 * Applies transform based on scroll position to elements with data-parallax
 */
export function useParallax() {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) return;

    // Check if mobile (disable parallax on mobile)
    const isMobile = window.innerWidth < 768;
    if (isMobile) return;

    const handleScroll = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const elements = document.querySelectorAll('[data-parallax]');

        elements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          const speed = parseFloat(
            getComputedStyle(htmlEl).getPropertyValue('--parallax-speed') || '0.5'
          );
          const rect = htmlEl.getBoundingClientRect();
          const elementTop = rect.top + scrollY;
          const elementCenter = elementTop + rect.height / 2;
          const viewportCenter = scrollY + window.innerHeight / 2;
          const distance = viewportCenter - elementCenter;
          const offset = distance * speed * 0.1;

          htmlEl.style.transform = `translateY(${offset}px)`;
        });
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);
}

/**
 * Hook to observe a single element ref
 * Useful for programmatic animation control
 */
export function useInView(
  options: ScrollAnimationOptions = {}
): [React.RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null);
  const isVisibleRef = useRef(false);

  const {
    threshold = 0.1,
    rootMargin = '0px',
    once = true,
  } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      isVisibleRef.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          isVisibleRef.current = true;
          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          isVisibleRef.current = false;
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, once]);

  return [ref, isVisibleRef.current];
}

/**
 * Utility to manually trigger animation on an element
 */
export function triggerAnimation(element: HTMLElement | null) {
  if (element) {
    element.classList.add('is-visible');
  }
}

/**
 * Utility to reset animation on an element
 */
export function resetAnimation(element: HTMLElement | null) {
  if (element) {
    element.classList.remove('is-visible');
    // Force reflow to restart animation
    void element.offsetWidth;
  }
}
