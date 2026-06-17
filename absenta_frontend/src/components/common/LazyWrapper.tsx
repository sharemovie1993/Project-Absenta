import React, { Suspense, lazy, type ComponentType } from 'react';
import { Loader } from '../ui/Loader';

interface LazyWrapperProps {
  fallback?: React.ReactNode;
  error?: React.ReactNode;
}

/**
 * Wrapper untuk lazy loading komponen dengan loading state
 */
export function LazyWrapper({ 
  fallback = <Loader />, 
  error = <div>Error loading component</div>,
  children 
}: LazyWrapperProps & { children: React.ReactNode }) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}

/**
 * HOC untuk membuat komponen lazy-loaded
 */
export function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn);
  
  return (props: P) => (
    <LazyWrapper fallback={fallback}>
      <LazyComponent {...props} />
    </LazyWrapper>
  );
}

/**
 * Komponen untuk lazy loading dengan intersection observer
 */
interface LazyLoadProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  className?: string;
}

export function LazyLoad({ 
  children, 
  fallback = <Loader />, 
  rootMargin = '50px',
  threshold = 0.1,
  className 
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold, hasLoaded]);

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : fallback}
    </div>
  );
}
