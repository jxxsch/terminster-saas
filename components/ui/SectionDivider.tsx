'use client';

interface SectionDividerProps {
  type: 'diagonal-left' | 'diagonal-right' | 'wave';
  fromColor: string;
  toColor: string;
}

export function SectionDivider({ type, fromColor, toColor }: SectionDividerProps) {
  if (type === 'diagonal-left') {
    return (
      <div className={`relative h-[50px] ${fromColor}`}>
        <svg
          className="absolute bottom-0 w-full h-[50px]"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <polygon points="1200 120 0 120 0 0" className={toColor.replace('bg-', 'fill-')} />
        </svg>
      </div>
    );
  }

  if (type === 'diagonal-right') {
    return (
      <div className={`relative h-[50px] ${fromColor}`}>
        <svg
          className="absolute bottom-0 w-full h-[50px]"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <polygon points="0 120 1200 120 1200 0" className={toColor.replace('bg-', 'fill-')} />
        </svg>
      </div>
    );
  }

  if (type === 'wave') {
    return (
      <div className={`relative h-[60px] ${fromColor}`}>
        <svg
          className="absolute bottom-0 w-full h-[60px]"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C57.1,118.92,156.63,69.08,321.39,56.44Z"
            className={toColor.replace('bg-', 'fill-')}
          />
        </svg>
      </div>
    );
  }

  return null;
}
