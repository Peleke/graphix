/**
 * useThreads Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useThreads } from '../useThreads';

describe('useThreads', () => {
  const mockThreads = [
    {
      id: 'thread-1',
      title: 'Test thread',
      status: 'active',
      phase: 'greeting',
      messageCount: 3,
      lastActivityAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessions: mockThreads }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches threads on mount when autoFetch is true', async () => {
    const { result } = renderHook(() => useThreads({ autoFetch: true }));

    await waitFor(() => {
      expect(result.current.threads).toHaveLength(1);
    });

    expect(result.current.threads[0].id).toBe('thread-1');
  });

  it('does not fetch on mount when autoFetch is false', async () => {
    const { result } = renderHook(() => useThreads({ autoFetch: false }));

    // Give it time to potentially fetch
    await new Promise((r) => setTimeout(r, 50));

    expect(result.current.threads).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles fetch errors', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    } as Response);

    const onError = vi.fn();
    const { result } = renderHook(() => useThreads({ autoFetch: true, onError }));

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(onError).toHaveBeenCalled();
  });

  it('deletes a thread', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: mockThreads }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deleted: true }),
      } as Response);

    const { result } = renderHook(() => useThreads({ autoFetch: true }));

    await waitFor(() => {
      expect(result.current.threads).toHaveLength(1);
    });

    await act(async () => {
      await result.current.deleteThread('thread-1');
    });

    expect(result.current.threads).toHaveLength(0);
  });

  it('encodes resourceId in URL', async () => {
    renderHook(() => useThreads({ autoFetch: true, resourceId: 'user with spaces' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('resourceId=user%20with%20spaces')
      );
    });
  });
});
