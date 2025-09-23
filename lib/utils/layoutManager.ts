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

export interface DashboardLayout {
  widgets: Array<{
    id: string;
    type: string;
    position: { x: number; y: number; w: number; h: number };
    visible: boolean;
    config?: any;
  }>;
  columns: number;
  rowHeight: number;
}

export class LayoutManager {
  private static readonly STORAGE_KEY = 'dashboard-layouts';

  static saveLayout(name: string, layout: DashboardLayout): void {
    const layouts = this.getAllLayouts();
    layouts[name] = layout;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(layouts));
  }

  static loadLayout(name: string): DashboardLayout | null {
    const layouts = this.getAllLayouts();
    return layouts[name] || null;
  }

  static getAllLayouts(): Record<string, DashboardLayout> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load layouts from localStorage:', error);
      return {};
    }
  }

  static deleteLayout(name: string): void {
    const layouts = this.getAllLayouts();
    delete layouts[name];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(layouts));
  }

  static exportLayout(layout: DashboardLayout): string {
    return JSON.stringify(layout, null, 2);
  }

  static importLayout(jsonString: string): DashboardLayout | null {
    try {
      const layout = JSON.parse(jsonString);
      return this.validateLayout(layout) ? layout : null;
    } catch (error) {
      console.error('Failed to import layout:', error);
      return null;
    }
  }

  static validateLayout(layout: any): layout is DashboardLayout {
    return (
      layout &&
      Array.isArray(layout.widgets) &&
      typeof layout.columns === 'number' &&
      typeof layout.rowHeight === 'number' &&
      layout.widgets.every((widget: any) =>
        widget.id &&
        widget.type &&
        widget.position &&
        typeof widget.position.x === 'number' &&
        typeof widget.position.y === 'number' &&
        typeof widget.position.w === 'number' &&
        typeof widget.position.h === 'number' &&
        typeof widget.visible === 'boolean'
      )
    );
  }

  static transformLayout(layout: DashboardLayout, transformation: LayoutTransformation): DashboardLayout {
    const transformedWidgets = layout.widgets.map(widget => ({
      ...widget,
      position: {
        ...widget.position,
        x: transformation.scale ? widget.position.x * transformation.scale : widget.position.x,
        y: transformation.scale ? widget.position.y * transformation.scale : widget.position.y,
        w: transformation.scale ? Math.max(1, Math.round(widget.position.w * transformation.scale)) : widget.position.w,
        h: transformation.scale ? Math.max(1, Math.round(widget.position.h * transformation.scale)) : widget.position.h,
      },
    }));

    return {
      ...layout,
      widgets: transformedWidgets,
      columns: transformation.scale ? Math.max(1, Math.round(layout.columns * transformation.scale)) : layout.columns,
      rowHeight: transformation.scale ? layout.rowHeight * transformation.scale : layout.rowHeight,
    };
  }

  static compactLayout(layout: DashboardLayout): DashboardLayout {
    // Sort widgets by y, then x
    const sortedWidgets = [...layout.widgets].sort((a, b) => {
      if (a.position.y !== b.position.y) return a.position.y - b.position.y;
      return a.position.x - b.position.x;
    });

    const compactedWidgets = [];
    const occupiedPositions = new Set<string>();

    for (const widget of sortedWidgets) {
      let newY = widget.position.y;
      let found = false;

      // Try to move widget up if space is available
      while (newY > 0 && !found) {
        newY--;
        const canPlace = this.canPlaceWidget(widget, newY, occupiedPositions, layout.columns);
        if (canPlace) {
          found = true;
        }
      }

      if (!found) newY = widget.position.y; // Revert if no space found

      compactedWidgets.push({
        ...widget,
        position: { ...widget.position, y: newY },
      });

      // Mark positions as occupied
      for (let y = newY; y < newY + widget.position.h; y++) {
        for (let x = widget.position.x; x < widget.position.x + widget.position.w; x++) {
          occupiedPositions.add(`${x}-${y}`);
        }
      }
    }

    return { ...layout, widgets: compactedWidgets };
  }

  private static canPlaceWidget(widget: any, newY: number, occupiedPositions: Set<string>, columns: number): boolean {
    for (let y = newY; y < newY + widget.position.h; y++) {
      for (let x = widget.position.x; x < widget.position.x + widget.position.w; x++) {
        if (x >= columns || occupiedPositions.has(`${x}-${y}`)) {
          return false;
        }
      }
    }
    return true;
  }

  static layoutToGrid(layout: DashboardLayout): Layout[] {
    return layout.widgets.map(widget => ({
      i: widget.id,
      x: widget.position.x,
      y: widget.position.y,
      w: widget.position.w,
      h: widget.position.h,
    }));
  }

  static gridToLayout(grid: Layout[], layout: DashboardLayout): DashboardLayout {
    const updatedWidgets = layout.widgets.map(widget => {
      const gridItem = grid.find(item => item.i === widget.id);
      if (gridItem) {
        return {
          ...widget,
          position: {
            x: gridItem.x,
            y: gridItem.y,
            w: gridItem.w,
            h: gridItem.h,
          },
        };
      }
      return widget;
    });

    return { ...layout, widgets: updatedWidgets };
  }
}

export interface LayoutTransformation {
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}