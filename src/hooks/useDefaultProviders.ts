import { useState, useEffect, useCallback } from 'react';
import type { DefaultProviderSettings, AIProvider, ImageAIProvider } from '../types';
import { DEFAULT_PROVIDER_SETTINGS } from '../types';
import { getDefaultProviderSettings, saveDefaultProviderSettings, STORAGE_KEYS } from '../services/storage';

interface UseDefaultProvidersReturn {
  settings: DefaultProviderSettings;
  isLoading: boolean;
  // Domain generation
  domainProvider: AIProvider;
  domainModel: string;
  setDomainProvider: (provider: AIProvider) => Promise<void>;
  setDomainModel: (model: string) => Promise<void>;
  // Logo generation
  logoProvider: ImageAIProvider;
  setLogoProvider: (provider: ImageAIProvider) => Promise<void>;
  // Refresh
  refresh: () => Promise<void>;
}

export function useDefaultProviders(): UseDefaultProvidersReturn {
  const [settings, setSettings] = useState<DefaultProviderSettings>(DEFAULT_PROVIDER_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const loaded = await getDefaultProviderSettings();
      setSettings(loaded);
    } catch (error) {
      console.error('Failed to load default provider settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Listen to storage changes for real-time sync
  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes[STORAGE_KEYS.DEFAULT_PROVIDERS]) {
        const newSettings = changes[STORAGE_KEYS.DEFAULT_PROVIDERS].newValue;
        if (newSettings) {
          setSettings(newSettings);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const setDomainProvider = useCallback(async (provider: AIProvider) => {
    const newSettings = {
      ...settings,
      domainGeneration: {
        ...settings.domainGeneration,
        provider,
      },
    };
    setSettings(newSettings);
    await saveDefaultProviderSettings(newSettings);
  }, [settings]);

  const setDomainModel = useCallback(async (model: string) => {
    const newSettings = {
      ...settings,
      domainGeneration: {
        ...settings.domainGeneration,
        model,
      },
    };
    setSettings(newSettings);
    await saveDefaultProviderSettings(newSettings);
  }, [settings]);

  const setLogoProvider = useCallback(async (provider: ImageAIProvider) => {
    const newSettings = {
      ...settings,
      logoGeneration: {
        provider,
      },
    };
    setSettings(newSettings);
    await saveDefaultProviderSettings(newSettings);
  }, [settings]);

  return {
    settings,
    isLoading,
    domainProvider: settings.domainGeneration.provider,
    domainModel: settings.domainGeneration.model,
    setDomainProvider,
    setDomainModel,
    logoProvider: settings.logoGeneration.provider,
    setLogoProvider,
    refresh: loadSettings,
  };
}
