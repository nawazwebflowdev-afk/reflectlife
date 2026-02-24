import { useState, useEffect, useRef } from 'react';
import { cn } from '@/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  containerClassName?: string;
  optimize?: boolean; // Enable Supabase image optimization
}

/**
 * Optimized lazy-loading image component with blur-up placeholder
 * Automatically applies quality optimization and progressive loading
 */
export const LazyImage = ({ 
  src, 
  alt, 
  className, 
  fallback,
  containerClassName,
  optimize = true,
  ...props 
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImageSrc(src);
  }, [src]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Load images 100px before they come into view
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className={cn('relative overflow-hidden bg-muted/30', containerClassName)}>
      {/* Blur placeholder - shows while loading */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-muted/30 to-muted/50 animate-pulse backdrop-blur-sm" />
      )}
      
      {/* Main image */}
      <img
        ref={imgRef}
        src={isInView ? imageSrc : (fallback || '')}
        alt={alt}
        className={cn(
          'transition-all duration-500 ease-out',
          isLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-sm',
          className
        )}
        onLoad={() => {
          setIsLoaded(true);
          setError(false);
        }}
        onError={(e) => {
          // Fallback to original src if optimized fails
          if (optimize && imageSrc !== src && !error) {
            setImageSrc(src);
            setError(false);
          } else if (fallback && !error) {
            e.currentTarget.src = fallback;
            setError(false);
          } else {
            setError(true);
          }
          setIsLoaded(true);
        }}
        loading="lazy"
        decoding="async"
        {...props}
      />
      
      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 text-muted-foreground text-sm">
          Failed to load
        </div>
      )}
    </div>
  );
};
