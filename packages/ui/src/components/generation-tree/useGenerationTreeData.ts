/**
 * Hook to wire Generation Tree to API data
 * 
 * Fetches generations from API and syncs to tree store.
 */

import { useEffect } from "react";
import { useGenerationsByPanel } from "../../api/hooks/useGenerations";
import { useTreeActions } from "./store";
import { buildGenerationTree } from "./api-adapter";

interface UseGenerationTreeDataProps {
  panelId: string | null;
}

/**
 * Hook that wires API data to the generation tree store
 */
export function useGenerationTreeData({ panelId }: UseGenerationTreeDataProps) {
  const { data: generations, isLoading, error } = useGenerationsByPanel(panelId);
  const actions = useTreeActions();

  useEffect(() => {
    if (!panelId) return;
    
    // If no generations yet, initialize empty tree
    if (!generations || generations.length === 0) {
      // Don't create empty tree - let component handle empty state
      return;
    }

    try {
      // Convert API generations to tree nodes
      const nodes = buildGenerationTree(generations);
      
      // Load into store
      actions.loadTree(panelId, nodes);
      actions.setActiveTree(panelId);
    } catch (error) {
      console.error("Failed to build generation tree:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId, generations]);

  return {
    isLoading,
    error,
    nodeCount: generations?.length || 0,
  };
}
