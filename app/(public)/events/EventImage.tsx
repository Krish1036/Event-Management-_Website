'use client';

interface EventImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export default function EventImage({ src, alt, className }: EventImageProps) {
  if (!src) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
        <div className="text-purple-400 text-4xl">📅</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <img 
        src={src} 
        alt={alt}
        className={className}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            const fallback = parent.querySelector('.fallback-placeholder');
            if (fallback) {
              fallback.classList.remove('hidden');
            }
          }
        }}
      />
      <div className="fallback-placeholder absolute inset-0 w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center hidden">
        <div className="text-purple-400 text-4xl">📅</div>
      </div>
    </div>
  );
}
