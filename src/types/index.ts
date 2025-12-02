// User types
export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  plan: 'free' | 'pro' | 'enterprise';
  settings: UserSettings;
}

export interface UserSettings {
  defaultTlds: string[];
  defaultLanguage: string;
  defaultStyle: DomainStyle;
  defaultLength: DomainLength;
  maxSuggestions: number;
}

// Domain types
export type DomainStyle =
  | 'brandable'
  | 'descriptive'
  | 'techy'
  | 'playful'
  | 'luxury'
  | 'minimal'
  | 'professional';

export type DomainLength = 'short' | 'medium' | 'long';

export type DomainStatus = 'available' | 'taken' | 'checking' | 'error';

export interface DomainResult {
  domain: string;
  tld: string;
  fullDomain: string;
  status: DomainStatus;
  registrarLinks?: RegistrarLink[];
}

export interface RegistrarLink {
  name: string;
  url: string;
}

// Search types
export type SearchInputType = 'keyword' | 'content' | 'url';

export interface SearchParams {
  inputType: SearchInputType;
  inputText: string;
  tlds: string[];
  style: DomainStyle;
  language: string;
  length: DomainLength;
  maxSuggestions: number;
}

export interface SearchRecord {
  id: string;
  userId: string;
  params: SearchParams;
  results: DomainResult[];
  createdAt: Date;
}

// Favorite types
export interface Favorite {
  id: string;
  userId: string;
  domain: string;
  tld: string;
  fullDomain: string;
  sourceSearchId?: string;
  notes?: string;
  createdAt: Date;
}

// AI Provider types
export type AIProvider = 'openai' | 'anthropic' | 'gemini';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

// API Keys storage
export interface APIKeys {
  openai?: string;
  anthropic?: string;
  gemini?: string;
  domainApi?: string;
}

// Message types for extension communication
export type MessageType =
  | 'GENERATE_DOMAINS'
  | 'CHECK_AVAILABILITY'
  | 'GET_SELECTED_TEXT'
  | 'SAVE_FAVORITE'
  | 'REMOVE_FAVORITE'
  | 'GET_FAVORITES'
  | 'GET_HISTORY'
  | 'LOGIN'
  | 'LOGOUT'
  | 'GET_USER';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

export interface ExtensionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Available TLDs
export const AVAILABLE_TLDS = [
  '.com',
  '.io',
  '.ai',
  '.co',
  '.net',
  '.org',
  '.app',
  '.dev',
  '.tech',
  '.xyz',
  '.me',
  '.info',
  '.biz',
  '.us',
  '.cc',
  '.so',
];

// Default settings
export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultTlds: ['.com', '.io', '.ai'],
  defaultLanguage: 'english',
  defaultStyle: 'brandable',
  defaultLength: 'short',
  maxSuggestions: 20,
};

// Domain style options with descriptions
export const DOMAIN_STYLE_OPTIONS: { value: DomainStyle; label: string; description: string }[] = [
  { value: 'brandable', label: 'Brandable', description: 'Unique, memorable names' },
  { value: 'descriptive', label: 'Descriptive', description: 'Clear, keyword-based names' },
  { value: 'techy', label: 'Techy', description: 'Modern, tech-focused names' },
  { value: 'playful', label: 'Playful', description: 'Fun, creative names' },
  { value: 'luxury', label: 'Luxury', description: 'Premium, elegant names' },
  { value: 'minimal', label: 'Minimal', description: 'Short, clean names' },
  { value: 'professional', label: 'Professional', description: 'Business-appropriate names' },
];

// Language options
export const LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English' },
  { value: 'turkish', label: 'Turkish' },
  { value: 'global', label: 'Global / Mix' },
];

// Registrar links generator
export const getRegistrarLinks = (domain: string): RegistrarLink[] => [
  {
    name: 'Namecheap',
    url: `https://www.namecheap.com/domains/registration/results/?domain=${domain}`,
  },
  {
    name: 'Porkbun',
    url: `https://porkbun.com/checkout/search?q=${domain}`,
  },
  {
    name: 'GoDaddy',
    url: `https://www.godaddy.com/domainsearch/find?domainToCheck=${domain}`,
  },
  {
    name: 'Google Domains',
    url: `https://domains.google.com/registrar/search?searchTerm=${domain}`,
  },
];
