/**
 * useThreads Hook
 * 
 * React hook for managing chat thread history.
 */

import { useState, useCallback, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface ChatThread {
  id: string;
  title: string;
  projectId?: string;
  status: 'active' | 'completed' | 'abandoned';
  phase: string;
  messageCount: number;
  lastActivityAt: Date;
  createdAt: Date;
}

export interface UseThreadsOptions {
  /** API base URL */
  baseUrl?: string;
  /** Resource ID for filtering threads */
  resourceId?: string;
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Called on errors */
  onError?: (error: Error) => void;
}

export interface UseThreadsReturn {
  /** List of threads */
  threads: ChatThread[];
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Fetch/refresh threads */
  fetchThreads: () => Promise<void>;
  /** Delete a thread */
  deleteThread: (threadId: string) => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

export function useThreads(options: UseThreadsOptions = {}): UseThreadsReturn {
  const {
    baseUrl = '/api/chat',
    resourceId = 'anonymous',
    autoFetch = true,
    onError,
  } = options;

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch all threads.
   */
  const fetchThreads = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${baseUrl}/sessions?resourceId=${encodeURIComponent(resourceId)}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch threads: ${response.statusText}`);
      }

      const data = await response.json();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchedThreads: ChatThread[] = data.sessions.map((s: Record<string, any>) => ({
        id: s.id,
        title: s.title,
        projectId: s.projectId,
        status: s.status,
        phase: s.phase,
        messageCount: s.messageCount,
        lastActivityAt: new Date(s.lastActivityAt),
        createdAt: new Date(s.createdAt),
      }));

      // Sort by last activity (most recent first)
      fetchedThreads.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());

      setThreads(fetchedThreads);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch threads');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, resourceId, onError]);

  /**
   * Delete a thread.
   */
  const deleteThread = useCallback(async (threadId: string): Promise<void> => {
    try {
      const response = await fetch(`${baseUrl}/sessions/${threadId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete thread: ${response.statusText}`);
      }

      // Remove from local state
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete thread');
      setError(error);
      onError?.(error);
      throw error;
    }
  }, [baseUrl, onError]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchThreads();
    }
  }, [autoFetch, fetchThreads]);

  return {
    threads,
    isLoading,
    error,
    fetchThreads,
    deleteThread,
  };
}
