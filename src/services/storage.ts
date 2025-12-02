import type { APIKeys, UserSettings } from '../types';

// Storage keys
const STORAGE_KEYS = {
  API_KEYS: 'emptydomai_api_keys',
  USER_SETTINGS: 'emptydomai_user_settings',
  AUTH_TOKEN: 'emptydomai_auth_token',
  USER_DATA: 'emptydomai_user_data',
} as const;

// Generic storage functions
const getFromStorage = async <T>(key: string): Promise<T | null> => {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] || null);
    });
  });
};

const setToStorage = async <T>(key: string, value: T): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => {
      resolve();
    });
  });
};

const removeFromStorage = async (key: string): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.remove([key], () => {
      resolve();
    });
  });
};

// API Keys management
// IMPORTANT: API keys are stored locally only, never sent to any server
export const saveAPIKeys = async (keys: Partial<APIKeys>): Promise<void> => {
  const existingKeys = await getAPIKeys();
  const updatedKeys = { ...existingKeys, ...keys };
  await setToStorage(STORAGE_KEYS.API_KEYS, updatedKeys);
};

export const getAPIKeys = async (): Promise<APIKeys> => {
  const keys = await getFromStorage<APIKeys>(STORAGE_KEYS.API_KEYS);
  return keys || {};
};

export const getAPIKey = async (provider: keyof APIKeys): Promise<string | undefined> => {
  const keys = await getAPIKeys();
  return keys[provider];
};

export const removeAPIKey = async (provider: keyof APIKeys): Promise<void> => {
  const keys = await getAPIKeys();
  delete keys[provider];
  await setToStorage(STORAGE_KEYS.API_KEYS, keys);
};

export const clearAllAPIKeys = async (): Promise<void> => {
  await removeFromStorage(STORAGE_KEYS.API_KEYS);
};

// User settings management (local cache)
export const saveUserSettings = async (settings: UserSettings): Promise<void> => {
  await setToStorage(STORAGE_KEYS.USER_SETTINGS, settings);
};

export const getUserSettings = async (): Promise<UserSettings | null> => {
  return getFromStorage<UserSettings>(STORAGE_KEYS.USER_SETTINGS);
};

// Auth token management
export const saveAuthToken = async (token: string): Promise<void> => {
  await setToStorage(STORAGE_KEYS.AUTH_TOKEN, token);
};

export const getAuthToken = async (): Promise<string | null> => {
  return getFromStorage<string>(STORAGE_KEYS.AUTH_TOKEN);
};

export const clearAuthToken = async (): Promise<void> => {
  await removeFromStorage(STORAGE_KEYS.AUTH_TOKEN);
};

// User data cache
export const saveUserData = async (userData: unknown): Promise<void> => {
  await setToStorage(STORAGE_KEYS.USER_DATA, userData);
};

export const getUserData = async <T>(): Promise<T | null> => {
  return getFromStorage<T>(STORAGE_KEYS.USER_DATA);
};

export const clearUserData = async (): Promise<void> => {
  await removeFromStorage(STORAGE_KEYS.USER_DATA);
};

// Clear all extension data
export const clearAllData = async (): Promise<void> => {
  await Promise.all([
    clearAllAPIKeys(),
    removeFromStorage(STORAGE_KEYS.USER_SETTINGS),
    clearAuthToken(),
    clearUserData(),
  ]);
};

// Check if API key exists
export const hasAPIKey = async (provider: keyof APIKeys): Promise<boolean> => {
  const key = await getAPIKey(provider);
  return !!key && key.trim().length > 0;
};

// Validate API key format (basic validation)
export const validateAPIKeyFormat = (provider: keyof APIKeys, key: string): boolean => {
  if (!key || key.trim().length === 0) return false;

  switch (provider) {
    case 'openai':
      // OpenAI keys start with 'sk-'
      return key.startsWith('sk-') && key.length > 20;
    case 'anthropic':
      // Anthropic keys start with 'sk-ant-'
      return key.startsWith('sk-ant-') && key.length > 20;
    case 'gemini':
      // Google API keys are typically 39 characters
      return key.length >= 30;
    case 'domainApi':
      // Generic validation
      return key.length >= 10;
    default:
      return key.length > 0;
  }
};
