import React, { useState, useCallback, useMemo } from 'react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { WidgetWrapper } from './WidgetWrapper';
import { WidgetPalette } from './WidgetPalette';
import { SignalsWidget } from './SignalsWidget';
import { PerformanceMetricsWidget } from './PerformanceMetricsWidget';
import { MiniLiveMonitor } from './MiniLiveMonitor';
import { useUIStateStore } from '../lib/stores/uiStateStore';
import { useDragAndDrop } from '../hooks/useDragAndDrop';
import { useResponsiveGrid } from '../hooks/useResponsiveGrid';
import { LayoutManager } from '../lib/utils/layoutManager';
import { ChartWidget } from './ChartWidget';
import HeatmapView from './HeatmapView';
import { MiniChart } from './MiniChart';

interface Layout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
}

const ReactGridLayout = WidthProvider(Responsive);

const widgetComponents = {
  signals: React.memo(SignalsWidget),
  charts: React.memo(ChartWidget),
  performance: React.memo(PerformanceMetricsWidget),
  heatmap: React.memo(HeatmapView),
  miniChart: React.memo(MiniChart),
  miniLiveMonitor: React.memo(MiniLiveMonitor),
};

interface CustomDashboardProps {
  className?: string;
}

export const CustomDashboard: React.FC<CustomDashboardProps> = ({ className = '' }) => {
  const {
    dashboardLayout,
    updateDashboardLayout,
    addWidget,
    removeWidget,
  } = useUIStateStore();

  const { getResponsiveProps } = useResponsiveGrid();
  const { onLayoutChange, handleDrop } = useDragAndDrop();

  const [showPalette, setShowPalette] = useState(false);

  const handleLayoutChange = useCallback((layout: Layout[]) => {
    const newLayout = LayoutManager.gridToLayout(layout, dashboardLayout);
    updateDashboardLayout(newLayout);
  }, [dashboardLayout, updateDashboardLayout]);

  const handleAddWidget = useCallback((type: string) => {
    const newWidget = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 0, y: 0, w: 4, h: 3 },
      visible: true,
    };
    addWidget(newWidget);
  }, [addWidget]);

  const handleRemoveWidget = useCallback((widgetId: string) => {
    removeWidget(widgetId);
  }, [removeWidget]);

  const renderWidget = useCallback((widget: any) => {
    const Component = widgetComponents[widget.type as keyof typeof widgetComponents] as React.ComponentType<any>;
    if (!Component) return null;

    // Provide default props for components that need them
    const defaultProps = widget.type === 'charts' ? { symbol: 'EURUSD' } : {};

    return (
      <div key={widget.id}>
        <WidgetWrapper
          id={widget.id}
          title={`${widget.type.charAt(0).toUpperCase() + widget.type.slice(1)} Widget`}
          onRemove={() => handleRemoveWidget(widget.id)}
        >
          <Component id={widget.id} config={widget.config} {...defaultProps} />
        </WidgetWrapper>
      </div>
    );
  }, [handleRemoveWidget]);

  const gridLayout = useMemo(() => LayoutManager.layoutToGrid(dashboardLayout), [dashboardLayout]);

  return (
    <div className={`flex h-full ${className}`}>
      {showPalette && (
        <div className="w-64 mr-4">
          <WidgetPalette onAddWidget={handleAddWidget} />
        </div>
      )}
      <div className="flex-1">
        <div className="mb-4">
          <button
            onClick={() => setShowPalette(!showPalette)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded"
          >
            {showPalette ? 'Hide Palette' : 'Show Palette'}
          </button>
        </div>
        <ReactGridLayout
          {...getResponsiveProps()}
          layouts={{ lg: gridLayout, md: gridLayout, sm: gridLayout, xs: gridLayout, xxs: gridLayout }}
          onLayoutChange={handleLayoutChange}
          onDrop={handleDrop}
          isDroppable={true}
          droppingItem={{ i: 'new', w: 4, h: 3 }}
          draggableHandle=".drag-handle"
        >
          {dashboardLayout.widgets
            .filter(widget => widget.visible)
            .map(renderWidget)}
        </ReactGridLayout>
      </div>
    </div>
  );
};