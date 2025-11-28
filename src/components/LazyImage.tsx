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
 * Optimized lazy-loading image component with Supabase transforms
 * Automatically applies quality optimization and lazy loading
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
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Apply Supabase image optimization transforms for better performance
    let optimizedSrc = src;
    
    if (optimize && src.includes('supabase.co/storage')) {
      // Add quality and size transforms to Supabase Storage URLs
      const url = new URL(src);
      url.searchParams.set('quality', '70');
      url.searchParams.set('width', '1200'); // Max width for responsive images
      optimizedSrc = url.toString();
    }
    
    setImageSrc(optimizedSrc);
  }, [src, optimize]);

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
    <div className={cn('relative overflow-hidden', containerClassName)}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        ref={imgRef}
        src={isInView ? imageSrc : fallback}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          // Fallback to original src if optimized fails
          if (optimize && imageSrc !== src) {
            setImageSrc(src);
          } else if (fallback) {
            e.currentTarget.src = fallback;
          }
          setIsLoaded(true);
        }}
        loading="lazy"
        {...props}
      />
    </div>
  );
};
