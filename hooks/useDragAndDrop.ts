import { useState, useCallback } from 'react';

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

interface DragState {
  isDragging: boolean;
  draggedItem: string | null;
  dropZone: string | null;
}

interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const useDragAndDrop = () => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    dropZone: null,
  });

  const startDrag = useCallback((itemId: string) => {
    setDragState({
      isDragging: true,
      draggedItem: itemId,
      dropZone: null,
    });
  }, []);

  const endDrag = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedItem: null,
      dropZone: null,
    });
  }, []);

  const onLayoutChange = useCallback((layout: Layout[]) => {
    // Update layout in store
    // This will be called by ReactGridLayout
  }, []);

  const handleDrop = useCallback((layout: Layout[], item: Layout, e: Event) => {
    // Handle drop logic
    endDrag();
  }, [endDrag]);

  const detectCollision = useCallback((draggedItem: GridItem, items: GridItem[]): boolean => {
    return items.some(item => {
      if (item.i === draggedItem.i) return false;
      return !(
        draggedItem.x + draggedItem.w <= item.x ||
        item.x + item.w <= draggedItem.x ||
        draggedItem.y + draggedItem.h <= item.y ||
        item.y + item.h <= draggedItem.y
      );
    });
  }, []);

  const snapToGrid = useCallback((x: number, y: number, gridSize: number = 1): { x: number; y: number } => {
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  }, []);

  return {
    dragState,
    startDrag,
    endDrag,
    onLayoutChange,
    handleDrop,
    detectCollision,
    snapToGrid,
  };
};