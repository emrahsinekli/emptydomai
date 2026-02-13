import type { APIKeys, UserSettings, Favorite, DefaultProviderSettings, MyDomain, DailyUsage } from '../types';
import { DEFAULT_PROVIDER_SETTINGS, FREE_LIMITS, PRO_LIMITS } from '../types';

// Storage keys
const STORAGE_KEYS = {
  API_KEYS: 'emptydomai_api_keys',
  USER_SETTINGS: 'emptydomai_user_settings',
  AUTH_TOKEN: 'emptydomai_auth_token',
  USER_DATA: 'emptydomai_user_data',
  FAVORITES: 'emptydomai_favorites',
  DEFAULT_PROVIDERS: 'emptydomai_default_providers',
  MY_DOMAINS: 'emptydomai_my_domains',
  DAILY_USAGE: 'emptydomai_daily_usage',
  USER_PLAN: 'emptydomai_user_plan',
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
    case 'groq':
      // Groq keys start with 'gsk_'
      return key.startsWith('gsk_') && key.length > 20;
    case 'domainApi':
      // Generic validation
      return key.length >= 10;
    default:
      return key.length > 0;
  }
};

// ============================================
// LOCAL FAVORITES MANAGEMENT (No Firebase)
// ============================================

// Get all favorites from local storage
export const getLocalFavorites = async (): Promise<Favorite[]> => {
  const favorites = await getFromStorage<Favorite[]>(STORAGE_KEYS.FAVORITES);
  return favorites || [];
};

// Add a favorite to local storage
export const addLocalFavorite = async (domain: string, tld: string): Promise<string> => {
  const favorites = await getLocalFavorites();
  const fullDomain = `${domain}${tld}`;

  // Check if already exists
  if (favorites.some(f => f.fullDomain === fullDomain)) {
    return fullDomain; // Already exists, return existing
  }

  const newFavorite: Favorite = {
    id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: 'local', // Local storage - no user needed
    domain,
    tld,
    fullDomain,
    createdAt: new Date(),
  };

  favorites.unshift(newFavorite); // Add to beginning
  await setToStorage(STORAGE_KEYS.FAVORITES, favorites);

  return newFavorite.id;
};

// Remove a favorite from local storage
export const removeLocalFavorite = async (fullDomain: string): Promise<void> => {
  const favorites = await getLocalFavorites();
  const filtered = favorites.filter(f => f.fullDomain !== fullDomain);
  await setToStorage(STORAGE_KEYS.FAVORITES, filtered);
};

// Check if a domain is favorited locally
export const isLocalFavorite = async (fullDomain: string): Promise<boolean> => {
  const favorites = await getLocalFavorites();
  return favorites.some(f => f.fullDomain === fullDomain);
};

// Clear all local favorites
export const clearLocalFavorites = async (): Promise<void> => {
  await removeFromStorage(STORAGE_KEYS.FAVORITES);
};

// ============================================
// DEFAULT PROVIDER SETTINGS
// ============================================

// Get default provider settings
export const getDefaultProviderSettings = async (): Promise<DefaultProviderSettings> => {
  const settings = await getFromStorage<DefaultProviderSettings>(STORAGE_KEYS.DEFAULT_PROVIDERS);
  return settings || DEFAULT_PROVIDER_SETTINGS;
};

// Save default provider settings
export const saveDefaultProviderSettings = async (settings: Partial<DefaultProviderSettings>): Promise<void> => {
  const existingSettings = await getDefaultProviderSettings();
  const updatedSettings = {
    ...existingSettings,
    ...settings,
    domainGeneration: {
      ...existingSettings.domainGeneration,
      ...(settings.domainGeneration || {}),
    },
    logoGeneration: {
      ...existingSettings.logoGeneration,
      ...(settings.logoGeneration || {}),
    },
  };
  await setToStorage(STORAGE_KEYS.DEFAULT_PROVIDERS, updatedSettings);
};

// ============================================
// MY DOMAINS MANAGEMENT
// ============================================

// Get all my domains from local storage
export const getMyDomains = async (): Promise<MyDomain[]> => {
  const domains = await getFromStorage<MyDomain[]>(STORAGE_KEYS.MY_DOMAINS);
  return domains || [];
};

// Get a single domain by ID
export const getMyDomainById = async (id: string): Promise<MyDomain | null> => {
  const domains = await getMyDomains();
  return domains.find(d => d.id === id) || null;
};

// Add a new domain
export const addMyDomain = async (domain: Omit<MyDomain, 'id' | 'createdAt' | 'updatedAt'>): Promise<MyDomain> => {
  const domains = await getMyDomains();
  const now = new Date().toISOString();

  const newDomain: MyDomain = {
    ...domain,
    id: `domain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
  };

  domains.unshift(newDomain); // Add to beginning
  await setToStorage(STORAGE_KEYS.MY_DOMAINS, domains);

  return newDomain;
};

// Update an existing domain
export const updateMyDomain = async (id: string, updates: Partial<Omit<MyDomain, 'id' | 'createdAt'>>): Promise<MyDomain | null> => {
  const domains = await getMyDomains();
  const index = domains.findIndex(d => d.id === id);

  if (index === -1) return null;

  const updatedDomain: MyDomain = {
    ...domains[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  domains[index] = updatedDomain;
  await setToStorage(STORAGE_KEYS.MY_DOMAINS, domains);

  return updatedDomain;
};

// Delete a domain
export const deleteMyDomain = async (id: string): Promise<boolean> => {
  const domains = await getMyDomains();
  const filtered = domains.filter(d => d.id !== id);

  if (filtered.length === domains.length) return false; // Nothing deleted

  await setToStorage(STORAGE_KEYS.MY_DOMAINS, filtered);
  return true;
};

// Clear all my domains
export const clearAllMyDomains = async (): Promise<void> => {
  await removeFromStorage(STORAGE_KEYS.MY_DOMAINS);
};

// Calculate days until expiry
export const getDaysUntilExpiry = (expiryDate: string): number => {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

// Get expiry status
export const getExpiryStatus = (expiryDate: string): {
  status: 'expired' | 'critical' | 'warning' | 'ok';
  label: string;
  color: string;
} => {
  const days = getDaysUntilExpiry(expiryDate);

  if (days < 0) {
    return { status: 'expired', label: `Expired ${Math.abs(days)} days ago`, color: 'text-red-600 bg-red-50' };
  }
  if (days === 0) {
    return { status: 'expired', label: 'Expires today!', color: 'text-red-600 bg-red-50' };
  }
  if (days <= 7) {
    return { status: 'critical', label: `${days} days left`, color: 'text-red-600 bg-red-50' };
  }
  if (days <= 30) {
    return { status: 'warning', label: `${days} days left`, color: 'text-yellow-600 bg-yellow-50' };
  }
  if (days <= 90) {
    return { status: 'ok', label: `${days} days left`, color: 'text-blue-600 bg-blue-50' };
  }

  return { status: 'ok', label: `${days} days left`, color: 'text-green-600 bg-green-50' };
};

// Get domains sorted by expiry (soonest first)
export const getMyDomainsSortedByExpiry = async (): Promise<MyDomain[]> => {
  const domains = await getMyDomains();
  return domains.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
};

// Get expiring soon domains (within 30 days)
export const getExpiringSoonDomains = async (): Promise<MyDomain[]> => {
  const domains = await getMyDomains();
  return domains.filter(d => getDaysUntilExpiry(d.expiryDate) <= 30);
};

// ============================================
// USER PLAN MANAGEMENT
// ============================================

export type UserPlan = 'free' | 'lifetime';

// Get user plan
export const getUserPlan = async (): Promise<UserPlan> => {
  const plan = await getFromStorage<UserPlan>(STORAGE_KEYS.USER_PLAN);
  return plan || 'free';
};

// Save user plan
export const saveUserPlan = async (plan: UserPlan): Promise<void> => {
  await setToStorage(STORAGE_KEYS.USER_PLAN, plan);
};

// Check if user is lifetime (paid user)
export const isProUser = async (): Promise<boolean> => {
  const plan = await getUserPlan();
  return plan === 'lifetime';
};

// Get usage limits based on plan
export const getUsageLimits = async () => {
  const isPro = await isProUser();
  return isPro ? PRO_LIMITS : FREE_LIMITS;
};

// ============================================
// DAILY USAGE TRACKING
// ============================================

const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
};

// Get daily usage (resets each day)
export const getDailyUsage = async (): Promise<DailyUsage> => {
  const usage = await getFromStorage<DailyUsage>(STORAGE_KEYS.DAILY_USAGE);
  const today = getTodayString();

  // Reset if it's a new day
  if (!usage || usage.date !== today) {
    const freshUsage: DailyUsage = { bulkChecks: 0, date: today };
    await setToStorage(STORAGE_KEYS.DAILY_USAGE, freshUsage);
    return freshUsage;
  }

  return usage;
};

// Increment bulk check count
export const incrementBulkChecks = async (count: number): Promise<void> => {
  const usage = await getDailyUsage();
  usage.bulkChecks += count;
  await setToStorage(STORAGE_KEYS.DAILY_USAGE, usage);
};

// Get remaining bulk checks for today
export const getRemainingBulkChecks = async (): Promise<number> => {
  const isPro = await isProUser();
  if (isPro) return Infinity;

  const usage = await getDailyUsage();
  return Math.max(0, FREE_LIMITS.maxBulkChecksPerDay - usage.bulkChecks);
};

// Check if user can do bulk check with given count
export const canDoBulkCheck = async (count: number): Promise<{ allowed: boolean; remaining: number }> => {
  const isPro = await isProUser();
  if (isPro) return { allowed: true, remaining: Infinity };

  const usage = await getDailyUsage();
  const remaining = Math.max(0, FREE_LIMITS.maxBulkChecksPerDay - usage.bulkChecks);
  return { allowed: count <= remaining, remaining };
};

// Check if user can add more favorites
export const canAddFavorite = async (): Promise<{ allowed: boolean; current: number; max: number }> => {
  const isPro = await isProUser();
  if (isPro) return { allowed: true, current: 0, max: Infinity };

  const favorites = await getLocalFavorites();
  return {
    allowed: favorites.length < FREE_LIMITS.maxFavorites,
    current: favorites.length,
    max: FREE_LIMITS.maxFavorites,
  };
};

// Check if user can add more my domains
export const canAddMyDomain = async (): Promise<{ allowed: boolean; current: number; max: number }> => {
  const isPro = await isProUser();
  if (isPro) return { allowed: true, current: 0, max: Infinity };

  const domains = await getMyDomains();
  return {
    allowed: domains.length < FREE_LIMITS.maxMyDomains,
    current: domains.length,
    max: FREE_LIMITS.maxMyDomains,
  };
};

// Export storage keys for external use (hooks)
export { STORAGE_KEYS };
