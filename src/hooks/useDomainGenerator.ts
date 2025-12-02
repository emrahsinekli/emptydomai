import { useState, useCallback } from 'react';
import type { DomainResult, SearchParams, DomainStatus } from '../types';
import { checkDomainAvailability } from '../services/domain';
import { getRegistrarLinks } from '../types';

interface GeneratorState {
  results: DomainResult[];
  isGenerating: boolean;
  isChecking: boolean;
  error: string | null;
  progress: {
    current: number;
    total: number;
  };
}

export function useDomainGenerator() {
  const [state, setState] = useState<GeneratorState>({
    results: [],
    isGenerating: false,
    isChecking: false,
    error: null,
    progress: { current: 0, total: 0 },
  });

  const generateDomains = useCallback(async (params: SearchParams) => {
    setState({
      results: [],
      isGenerating: true,
      isChecking: false,
      error: null,
      progress: { current: 0, total: 0 },
    });

    try {
      // Generate domains via background script
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_DOMAINS',
        payload: { params },
      });

      if (!response.success) {
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: response.error || 'Failed to generate domains',
        }));
        return;
      }

      const initialResults: DomainResult[] = response.data;

      // Set initial results with checking status
      setState((prev) => ({
        ...prev,
        results: initialResults,
        isGenerating: false,
        isChecking: true,
        progress: { current: 0, total: initialResults.length },
      }));

      // Check availability for each domain
      const checkedResults = [...initialResults];

      for (let i = 0; i < checkedResults.length; i++) {
        const result = checkedResults[i];

        try {
          const status = await checkDomainAvailability(result.domain, result.tld);
          checkedResults[i] = {
            ...result,
            status,
            registrarLinks: getRegistrarLinks(result.fullDomain),
          };
        } catch {
          checkedResults[i] = {
            ...result,
            status: 'error' as DomainStatus,
          };
        }

        // Update state incrementally
        setState((prev) => ({
          ...prev,
          results: [...checkedResults],
          progress: { current: i + 1, total: checkedResults.length },
        }));

        // Small delay to prevent overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      setState((prev) => ({
        ...prev,
        isChecking: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        isChecking: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  const recheckAvailability = useCallback(async (index: number) => {
    const result = state.results[index];
    if (!result) return;

    // Set to checking
    setState((prev) => {
      const newResults = [...prev.results];
      newResults[index] = { ...result, status: 'checking' };
      return { ...prev, results: newResults };
    });

    try {
      const status = await checkDomainAvailability(result.domain, result.tld);

      setState((prev) => {
        const newResults = [...prev.results];
        newResults[index] = { ...result, status };
        return { ...prev, results: newResults };
      });
    } catch {
      setState((prev) => {
        const newResults = [...prev.results];
        newResults[index] = { ...result, status: 'error' };
        return { ...prev, results: newResults };
      });
    }
  }, [state.results]);

  const clearResults = useCallback(() => {
    setState({
      results: [],
      isGenerating: false,
      isChecking: false,
      error: null,
      progress: { current: 0, total: 0 },
    });
  }, []);

  return {
    results: state.results,
    isGenerating: state.isGenerating,
    isChecking: state.isChecking,
    error: state.error,
    progress: state.progress,
    generateDomains,
    recheckAvailability,
    clearResults,
    isLoading: state.isGenerating || state.isChecking,
  };
}
