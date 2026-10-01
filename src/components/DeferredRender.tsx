import { useEffect, useRef, useState, type ReactNode } from "react";

interface DeferredRenderProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
}

const DeferredRender = ({ children, fallback = null, rootMargin = "500px" }: DeferredRenderProps) => {
  const markerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, [rootMargin]);

  return <div ref={markerRef}>{visible ? children : fallback}</div>;
};

export default DeferredRender;