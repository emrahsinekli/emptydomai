import { useState, useEffect, useCallback } from 'react';
import type { APIKeys, AIProvider } from '../types';
import { getAPIKeys, saveAPIKeys as saveAPIKeysToStorage, validateAPIKeyFormat } from '../services/storage';

interface UseAPIKeysReturn {
  apiKeys: APIKeys;
  configuredProviders: AIProvider[];
  isLoading: boolean;
  saveAPIKey: (provider: keyof APIKeys, value: string) => Promise<{ success: boolean; error?: string }>;
  hasKey: (provider: keyof APIKeys) => boolean;
  refresh: () => Promise<void>;
}

// Storage key used for API keys
const STORAGE_KEY = 'emptydomai_api_keys';

export function useAPIKeys(): UseAPIKeysReturn {
  const [apiKeys, setApiKeys] = useState<APIKeys>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadAPIKeys = useCallback(async () => {
    try {
      const keys = await getAPIKeys();
      setApiKeys(keys);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadAPIKeys();
  }, [loadAPIKeys]);

  // Listen to storage changes to sync across components
  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes[STORAGE_KEY]) {
        const newKeys = changes[STORAGE_KEY].newValue || {};
        setApiKeys(newKeys);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const saveAPIKey = useCallback(async (provider: keyof APIKeys, value: string): Promise<{ success: boolean; error?: string }> => {
    if (value && !validateAPIKeyFormat(provider, value)) {
      return { success: false, error: `Invalid ${provider} API key format` };
    }

    try {
      await saveAPIKeysToStorage({ [provider]: value || undefined });
      // State will be updated via storage change listener
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to save API key' };
    }
  }, []);

  const hasKey = useCallback((provider: keyof APIKeys): boolean => {
    return !!apiKeys[provider] && apiKeys[provider]!.trim().length > 0;
  }, [apiKeys]);

  const configuredProviders: AIProvider[] = [];
  if (apiKeys.openai) configuredProviders.push('openai');
  if (apiKeys.anthropic) configuredProviders.push('anthropic');
  if (apiKeys.gemini) configuredProviders.push('gemini');
  if (apiKeys.groq) configuredProviders.push('groq');

  return {
    apiKeys,
    configuredProviders,
    isLoading,
    saveAPIKey,
    hasKey,
    refresh: loadAPIKeys,
  };
}
