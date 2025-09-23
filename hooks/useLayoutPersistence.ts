import { useCallback } from 'react';
import { useUIStateStore } from '../lib/stores/uiStateStore';

export const useLayoutPersistence = () => {
  const {
    layoutVersions,
    currentLayoutName,
    saveLayout,
    loadLayout,
    undoLayoutChange,
    redoLayoutChange,
    resetLayout,
    history,
    historyIndex,
  } = useUIStateStore();

  const saveCurrentLayout = useCallback((name: string) => {
    saveLayout(name);
  }, [saveLayout]);

  const loadSavedLayout = useCallback((name: string) => {
    loadLayout(name);
  }, [loadLayout]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => {
    if (canUndo) {
      undoLayoutChange();
    }
  }, [canUndo, undoLayoutChange]);

  const redo = useCallback(() => {
    if (canRedo) {
      redoLayoutChange();
    }
  }, [canRedo, redoLayoutChange]);

  const resetToDefault = useCallback(() => {
    resetLayout();
  }, [resetLayout]);

  const getLayoutNames = useCallback(() => {
    return Object.keys(layoutVersions);
  }, [layoutVersions]);

  const isCurrentModified = useCallback(() => {
    // Check if current layout differs from saved
    const saved = layoutVersions[currentLayoutName];
    if (!saved) return true;
    // Compare widgets positions, etc.
    return false; // Implement comparison logic
  }, [layoutVersions, currentLayoutName]);

  return {
    layoutVersions,
    currentLayoutName,
    saveCurrentLayout,
    loadSavedLayout,
    undo,
    redo,
    resetToDefault,
    canUndo,
    canRedo,
    getLayoutNames,
    isCurrentModified,
  };
};