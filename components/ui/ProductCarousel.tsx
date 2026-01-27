'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import Image from 'next/image';
import { Product, formatProductPrice } from '@/lib/supabase';

export interface ProductCarouselProps {
  products: Product[];
  categoryTitle: string;
  baseWidth?: number;
  fullWidth?: boolean;
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  loop?: boolean;
}

const DRAG_BUFFER = 0;
const VELOCITY_THRESHOLD = 500;
const GAP = 12;
const SPRING_OPTIONS = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface CarouselItemProps {
  product: Product;
  index: number;
  itemWidth: number;
  trackItemOffset: number;
  x: ReturnType<typeof useMotionValue<number>>;
  transition: typeof SPRING_OPTIONS | { duration: number };
}

function CarouselItemComponent({ product, index, itemWidth, trackItemOffset, x, transition }: CarouselItemProps) {
  const range = [-(index + 1) * trackItemOffset, -index * trackItemOffset, -(index - 1) * trackItemOffset];
  const outputRange = [90, 0, -90];
  const rotateY = useTransform(x, range, outputRange, { clamp: false });

  return (
    <motion.div
      className="relative shrink-0 flex flex-col items-start justify-between bg-white border border-slate-100 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
      style={{
        width: itemWidth,
        height: '100%',
        rotateY: rotateY,
      }}
      transition={transition}
    >
      {/* Produktbild */}
      <div className="relative w-full aspect-square bg-slate-50">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 80vw, 250px"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}
      </div>

      {/* Produktinfo */}
      <div className="p-4 w-full">
        <h4 className="text-slate-900 font-medium text-sm leading-snug mb-1 line-clamp-2">
          {product.name}
        </h4>
        <p className="text-gold font-semibold text-base">
          {formatProductPrice(product.price)}
        </p>
      </div>
    </motion.div>
  );
}

export function ProductCarousel({
  products,
  categoryTitle,
  baseWidth = 280,
  fullWidth = false,
  autoplay = true,
  autoplayDelay = 4000,
  pauseOnHover = true,
  loop = true,
}: ProductCarouselProps) {
  const containerPadding = 16; // p-4 = 16px
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(baseWidth);

  // Breite dynamisch messen wenn fullWidth
  useEffect(() => {
    if (!fullWidth || !containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        // clientWidth = innere Breite inkl. Padding
        // Wir ziehen das Padding ab um die Content-Breite zu bekommen
        const innerWidth = containerRef.current.clientWidth - (containerPadding * 2);
        setContainerWidth(innerWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [fullWidth]);

  const effectiveWidth = fullWidth ? containerWidth : (baseWidth - containerPadding * 2);
  const itemWidth = effectiveWidth; // Bereits ohne Padding
  const trackItemOffset = itemWidth + GAP;

  const itemsForRender = useMemo(() => {
    if (!loop || products.length === 0) return products;
    if (products.length === 1) return products;
    return [products[products.length - 1], ...products, products[0]];
  }, [products, loop]);

  // Startposition berechnen
  const startPosition = loop && products.length > 1 ? 1 : 0;

  const [position, setPosition] = useState<number>(startPosition);
  const x = useMotionValue(-startPosition * trackItemOffset);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  useEffect(() => {
    if (pauseOnHover && containerRef.current) {
      const container = containerRef.current;
      const handleMouseEnter = () => setIsHovered(true);
      const handleMouseLeave = () => setIsHovered(false);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [pauseOnHover]);

  useEffect(() => {
    if (!autoplay || itemsForRender.length <= 1) return undefined;
    if (pauseOnHover && isHovered) return undefined;

    const timer = setInterval(() => {
      setPosition(prev => Math.min(prev + 1, itemsForRender.length - 1));
    }, autoplayDelay);

    return () => clearInterval(timer);
  }, [autoplay, autoplayDelay, isHovered, pauseOnHover, itemsForRender.length]);

  const effectiveTransition = isJumping ? { duration: 0 } : SPRING_OPTIONS;

  const handleAnimationStart = () => {
    setIsAnimating(true);
  };

  const handleAnimationComplete = () => {
    if (!loop || itemsForRender.length <= 1 || products.length <= 1) {
      setIsAnimating(false);
      return;
    }
    const lastCloneIndex = itemsForRender.length - 1;

    if (position === lastCloneIndex) {
      setIsJumping(true);
      const target = 1;
      setPosition(target);
      x.set(-target * trackItemOffset);
      requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
      return;
    }

    if (position === 0) {
      setIsJumping(true);
      const target = products.length;
      setPosition(target);
      x.set(-target * trackItemOffset);
      requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
      return;
    }

    setIsAnimating(false);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void => {
    const { offset, velocity } = info;
    const direction =
      offset.x < -DRAG_BUFFER || velocity.x < -VELOCITY_THRESHOLD
        ? 1
        : offset.x > DRAG_BUFFER || velocity.x > VELOCITY_THRESHOLD
          ? -1
          : 0;

    if (direction === 0) return;

    setPosition(prev => {
      const next = prev + direction;
      const max = itemsForRender.length - 1;
      return Math.max(0, Math.min(next, max));
    });
  };

  const dragProps = loop
    ? {}
    : {
        dragConstraints: {
          left: -trackItemOffset * Math.max(itemsForRender.length - 1, 0),
          right: 0
        }
      };

  const activeIndex =
    products.length === 0 ? 0 : loop ? (position - 1 + products.length) % products.length : Math.min(position, products.length - 1);

  if (products.length === 0) {
    return (
      <div className={`flex flex-col ${fullWidth ? 'w-full' : ''}`}>
        <h3 className="text-xs font-medium tracking-wider text-gray-500 uppercase mb-3 text-center">{categoryTitle}</h3>
        <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-slate-100">
          <p className="text-slate-400 text-sm">Keine Produkte</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${fullWidth ? 'w-full' : ''}`}>
      {/* Kategorie-Titel */}
      <h3 className="text-xs font-medium tracking-wider text-gray-500 uppercase mb-3 text-center">{categoryTitle}</h3>

      {/* Carousel Container */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-2xl bg-white shadow-sm p-4 ${fullWidth ? 'w-full' : ''}`}
        style={fullWidth ? undefined : { width: `${baseWidth}px` }}
      >
        <motion.div
          className="flex"
          drag={isAnimating ? false : 'x'}
          {...dragProps}
          style={{
            width: itemWidth,
            gap: `${GAP}px`,
            perspective: 1000,
            perspectiveOrigin: `${position * trackItemOffset + itemWidth / 2}px 50%`,
            x
          }}
          onDragEnd={handleDragEnd}
          animate={{ x: -(position * trackItemOffset) }}
          transition={effectiveTransition}
          onAnimationStart={handleAnimationStart}
          onAnimationComplete={handleAnimationComplete}
        >
          {itemsForRender.map((product, index) => (
            <CarouselItemComponent
              key={`${product.id}-${index}`}
              product={product}
              index={index}
              itemWidth={itemWidth}
              trackItemOffset={trackItemOffset}
              x={x}
              transition={effectiveTransition}
            />
          ))}
        </motion.div>

        {/* Dots */}
        {products.length > 1 && (
          <div className="flex w-full justify-center mt-4">
            <div className="flex gap-2">
              {products.map((_, index) => (
                <motion.button
                  key={index}
                  className={`h-2 w-2 rounded-full transition-colors duration-150 ${
                    activeIndex === index ? 'bg-gold' : 'bg-slate-300'
                  }`}
                  animate={{ scale: activeIndex === index ? 1.2 : 1 }}
                  onClick={() => setPosition(loop ? index + 1 : index)}
                  transition={{ duration: 0.15 }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
