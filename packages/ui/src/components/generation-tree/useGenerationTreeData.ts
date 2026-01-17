/**
 * Hook to wire Generation Tree to API data
 * 
 * Fetches generations from API and syncs to tree store.
 */

import { useEffect } from "react";
import { useGenerationsByPanel } from "../../api/hooks/useGenerations";
import { useGenerationTree } from "./store";
import { buildGenerationTree } from "./api-adapter";

interface UseGenerationTreeDataProps {
  panelId: string | null;
}

/**
 * Hook that wires API data to the generation tree store
 */
export function useGenerationTreeData({ panelId }: UseGenerationTreeDataProps) {
  const { data: generations, isLoading, error } = useGenerationsByPanel(panelId);
  const { loadTree, setActiveTree } = useGenerationTree();

  useEffect(() => {
    if (!panelId || !generations) return;

    // Convert API generations to tree nodes
    const nodes = buildGenerationTree(generations);
    
    // Load into store
    loadTree(panelId, nodes);
    setActiveTree(panelId);
  }, [panelId, generations, loadTree, setActiveTree]);

  return {
    isLoading,
    error,
    nodeCount: generations?.length || 0,
  };
}
