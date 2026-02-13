import { useState, useCallback } from 'react';
import type { DomainResult, SearchParams, DomainStatus, BrandAnalysis } from '../types';
import { checkDomainAvailability } from '../services/domain';
import { getRegistrarLinks } from '../types';
import { calculateDomainValuation } from '../services/ai';
import { canDoBulkCheck, incrementBulkChecks } from '../services/storage';

interface GeneratorState {
  results: DomainResult[];
  isGenerating: boolean;
  isChecking: boolean;
  isAnalyzing: boolean;
  error: string | null;
  warning: string | null;
  progress: {
    current: number;
    total: number;
  };
  brandAnalysisMap: Map<string, BrandAnalysis>;
}

export function useDomainGenerator() {
  const [state, setState] = useState<GeneratorState>({
    results: [],
    isGenerating: false,
    isChecking: false,
    isAnalyzing: false,
    error: null,
    warning: null,
    progress: { current: 0, total: 0 },
    brandAnalysisMap: new Map(),
  });

  const generateDomains = useCallback(async (params: SearchParams, appendMode: boolean = false) => {
    // If append mode, keep existing results; otherwise clear them
    setState((prev) => ({
      results: appendMode ? prev.results : [],
      isGenerating: true,
      isChecking: false,
      isAnalyzing: false,
      error: null,
      warning: null,
      progress: { current: 0, total: 0 },
      brandAnalysisMap: appendMode ? prev.brandAnalysisMap : new Map(),
    }));

    try {
      // Generate domains via background script
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_DOMAINS',
        payload: {
          params,
          provider: params.provider,
          model: params.model,
        },
      });

      if (!response.success) {
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: response.error || 'Failed to generate domains',
        }));
        return;
      }

      const newResults: DomainResult[] = response.data;

      // Set results - append to existing if in append mode
      setState((prev) => ({
        ...prev,
        results: appendMode ? [...prev.results, ...newResults] : newResults,
        isGenerating: false,
        isChecking: true,
        progress: { current: 0, total: newResults.length },
      }));

      // Check availability for each NEW domain only
      const checkedNewResults = [...newResults];

      for (let i = 0; i < checkedNewResults.length; i++) {
        const result = checkedNewResults[i];

        try {
          const status = await checkDomainAvailability(result.domain, result.tld);
          // Calculate domain valuation
          const valuation = calculateDomainValuation(result.domain, result.tld);

          checkedNewResults[i] = {
            ...result,
            status,
            registrarLinks: getRegistrarLinks(result.fullDomain),
            valuation: {
              estimatedValue: valuation.estimatedValue,
              investmentScore: valuation.investmentScore,
              factors: valuation.factors,
            },
          };
        } catch {
          checkedNewResults[i] = {
            ...result,
            status: 'error' as DomainStatus,
          };
        }

        // Update state incrementally - keep existing results and update new ones
        setState((prev) => {
          if (appendMode) {
            // In append mode: keep old results + update new results being checked
            const existingCount = prev.results.length - newResults.length;
            const existingResults = prev.results.slice(0, existingCount);
            return {
              ...prev,
              results: [...existingResults, ...checkedNewResults],
              progress: { current: i + 1, total: checkedNewResults.length },
            };
          } else {
            // Normal mode: just update the results
            return {
              ...prev,
              results: [...checkedNewResults],
              progress: { current: i + 1, total: checkedNewResults.length },
            };
          }
        });

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
      isAnalyzing: false,
      error: null,
      warning: null,
      progress: { current: 0, total: 0 },
      brandAnalysisMap: new Map(),
    });
  }, []);

  // Function to fetch brand analysis for available domains
  const fetchBrandAnalysis = useCallback(async (businessIdea: string, provider?: string, model?: string) => {
    const availableDomains = state.results
      .filter(r => r.status === 'available')
      .map(r => r.domain)
      .slice(0, 10); // Limit to 10 domains to save API calls

    if (availableDomains.length === 0) return;

    setState(prev => ({ ...prev, isAnalyzing: true }));

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_BRAND_ANALYSIS',
        payload: {
          domains: availableDomains,
          businessIdea,
          provider,
          model,
        },
      });

      if (response.success && response.data) {
        const analysisMap = new Map<string, BrandAnalysis>(
          Object.entries(response.data as Record<string, BrandAnalysis>)
        );

        // Update results with brand analysis
        setState(prev => {
          const updatedResults = prev.results.map(result => {
            const analysis = analysisMap.get(result.domain.toLowerCase());
            if (analysis) {
              return { ...result, brandAnalysis: analysis };
            }
            return result;
          });

          return {
            ...prev,
            results: updatedResults,
            brandAnalysisMap: analysisMap,
            isAnalyzing: false,
          };
        });
      } else {
        setState(prev => ({ ...prev, isAnalyzing: false }));
      }
    } catch {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  }, [state.results]);

  // Bulk check: accepts pre-built domain+tld pairs
  // Returns 'limit_reached' if daily limit is hit with 0 remaining
  const checkBulkDomains = useCallback(async (pairs: Array<{ domain: string; tld: string }>): Promise<void | 'limit_reached'> => {
    // Check daily limit
    const totalChecks = pairs.length;
    const limitCheck = await canDoBulkCheck(totalChecks);

    let actualPairs = pairs;
    let warning: string | null = null;

    if (!limitCheck.allowed) {
      // If zero remaining, signal limit reached for upgrade prompt
      if (limitCheck.remaining === 0) {
        return 'limit_reached';
      }

      // Truncate to fit within remaining limit
      const skippedCount = pairs.length - limitCheck.remaining;
      actualPairs = pairs.slice(0, limitCheck.remaining);
      warning = `First ${actualPairs.length} checks processed, ${skippedCount} skipped (daily limit). Upgrade to Lifetime for unlimited.`;
    }

    setState({
      results: [],
      isGenerating: false,
      isChecking: true,
      isAnalyzing: false,
      error: null,
      warning,
      progress: { current: 0, total: actualPairs.length },
      brandAnalysisMap: new Map(),
    });

    const allResults: DomainResult[] = actualPairs.map(({ domain, tld }) => ({
      domain,
      tld,
      fullDomain: `${domain}${tld}`,
      status: 'checking' as DomainStatus,
    }));

    // Set initial results
    setState((prev) => ({
      ...prev,
      results: [...allResults],
    }));

    // Check availability for each
    for (let i = 0; i < allResults.length; i++) {
      const result = allResults[i];

      try {
        const status = await checkDomainAvailability(result.domain, result.tld);
        const valuation = calculateDomainValuation(result.domain, result.tld);

        allResults[i] = {
          ...result,
          status,
          registrarLinks: getRegistrarLinks(result.fullDomain),
          valuation: {
            estimatedValue: valuation.estimatedValue,
            investmentScore: valuation.investmentScore,
            factors: valuation.factors,
          },
        };
      } catch {
        allResults[i] = {
          ...result,
          status: 'error' as DomainStatus,
        };
      }

      setState((prev) => ({
        ...prev,
        results: [...allResults],
        progress: { current: i + 1, total: allResults.length },
      }));

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Track usage
    await incrementBulkChecks(actualPairs.length);

    setState((prev) => ({
      ...prev,
      isChecking: false,
    }));
  }, []);

  const dismissError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const dismissWarning = useCallback(() => {
    setState((prev) => ({ ...prev, warning: null }));
  }, []);

  return {
    results: state.results,
    isGenerating: state.isGenerating,
    isChecking: state.isChecking,
    isAnalyzing: state.isAnalyzing,
    error: state.error,
    warning: state.warning,
    progress: state.progress,
    generateDomains,
    checkBulkDomains,
    recheckAvailability,
    clearResults,
    fetchBrandAnalysis,
    dismissError,
    dismissWarning,
    brandAnalysisMap: state.brandAnalysisMap,
    isLoading: state.isGenerating || state.isChecking,
  };
}
