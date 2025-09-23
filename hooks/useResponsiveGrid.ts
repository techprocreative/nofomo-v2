import { useState, useEffect, useCallback } from 'react';

interface Breakpoint {
  lg: number;
  md: number;
  sm: number;
  xs: number;
  xxs: number;
  [key: string]: number;
}

interface ResponsiveLayout {
  breakpoints: Breakpoint;
  cols: Breakpoint;
  currentCols: number;
  currentBreakpoint: keyof Breakpoint;
}

const defaultBreakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const defaultCols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

export const useResponsiveGrid = (customBreakpoints?: Partial<Breakpoint>, customCols?: Partial<Breakpoint>) => {
  const [layout, setLayout] = useState<ResponsiveLayout>({
    breakpoints: { ...defaultBreakpoints, ...customBreakpoints },
    cols: { ...defaultCols, ...customCols },
    currentCols: 12,
    currentBreakpoint: 'lg',
  });

  const updateResponsiveLayout = useCallback(() => {
    const width = window.innerWidth;
    const { breakpoints, cols } = layout;

    let currentBreakpoint: keyof Breakpoint = 'xxs';
    let currentCols = cols.xxs;

    if (width >= breakpoints.lg) {
      currentBreakpoint = 'lg';
      currentCols = cols.lg;
    } else if (width >= breakpoints.md) {
      currentBreakpoint = 'md';
      currentCols = cols.md;
    } else if (width >= breakpoints.sm) {
      currentBreakpoint = 'sm';
      currentCols = cols.sm;
    } else if (width >= breakpoints.xs) {
      currentBreakpoint = 'xs';
      currentCols = cols.xs;
    }

    // Only update if values have changed to prevent unnecessary re-renders
    if (currentCols !== layout.currentCols || currentBreakpoint !== layout.currentBreakpoint) {
      setLayout(prev => ({
        ...prev,
        currentCols,
        currentBreakpoint,
      }));
    }
  }, [layout]);

  useEffect(() => {
    updateResponsiveLayout();
    window.addEventListener('resize', updateResponsiveLayout);
    return () => window.removeEventListener('resize', updateResponsiveLayout);
  }, [updateResponsiveLayout]);

  const getResponsiveProps = useCallback(() => {
    const containerPadding: [number, number] = [10, 10];
    const margin: [number, number] = [10, 10];
    return {
      breakpoints: layout.breakpoints,
      cols: layout.cols,
      className: 'layout',
      rowHeight: 80,
      isDraggable: true,
      isResizable: true,
      margin,
      containerPadding,
    };
  }, [layout]);

  const isMobile = layout.currentBreakpoint === 'xs' || layout.currentBreakpoint === 'xxs';
  const isTablet = layout.currentBreakpoint === 'sm';
  const isDesktop = layout.currentBreakpoint === 'md' || layout.currentBreakpoint === 'lg';

  return {
    ...layout,
    getResponsiveProps,
    isMobile,
    isTablet,
    isDesktop,
  };
};