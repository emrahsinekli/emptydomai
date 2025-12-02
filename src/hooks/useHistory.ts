import { useState, useEffect, useCallback } from 'react';
import type { SearchRecord } from '../types';

interface HistoryState {
  history: SearchRecord[];
  isLoading: boolean;
  error: string | null;
}

export function useHistory() {
  const [state, setState] = useState<HistoryState>({
    history: [],
    isLoading: true,
    error: null,
  });

  const loadHistory = useCallback(async (limit: number = 20) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await chrome.runtime.sendMessage({
        type: 'GET_HISTORY',
        payload: { limit },
      });

      if (response.success) {
        setState({
          history: response.data as SearchRecord[],
          isLoading: false,
          error: null,
        });
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Failed to load history',
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history: state.history,
    isLoading: state.isLoading,
    error: state.error,
    refresh: loadHistory,
  };
}
