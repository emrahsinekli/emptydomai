// User types
export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  plan: 'free' | 'lifetime';
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

export interface BrandAnalysis {
  slogan: string;
  description: string;
  sentiment: 'positive' | 'neutral' | 'professional' | 'playful' | 'luxury';
  targetAudience: string;
  industryFit: string[];
  brandScore: number; // 1-100
  memorability: number; // 1-10
  pronounceability: number; // 1-10
  uniqueness: number; // 1-10
}

export interface SocialMediaAvailability {
  instagram?: 'available' | 'taken' | 'unknown';
  twitter?: 'available' | 'taken' | 'unknown';
  tiktok?: 'available' | 'taken' | 'unknown';
  youtube?: 'available' | 'taken' | 'unknown';
  github?: 'available' | 'taken' | 'unknown';
  discord?: 'available' | 'taken' | 'unknown';
  facebook?: 'available' | 'taken' | 'unknown';
  linkedin?: 'available' | 'taken' | 'unknown';
}

export interface DomainValuation {
  estimatedValue: number;
  investmentScore: number; // 1-10
  factors: {
    length: number;
    keywords: number;
    tldValue: number;
    brandability: number;
  };
}

export interface DomainResult {
  domain: string;
  tld: string;
  fullDomain: string;
  status: DomainStatus;
  registrarLinks?: RegistrarLink[];
  brandAnalysis?: BrandAnalysis;
  socialMedia?: SocialMediaAvailability;
  valuation?: DomainValuation;
}

export interface RegistrarLink {
  name: string;
  url: string;
}

// Search types
export interface AdvancedDomainSettings {
  minLength?: number;
  maxLength?: number;
  mustInclude?: string;
  mustNotInclude?: string;
  startsWith?: string;
  endsWith?: string;
  noNumbers?: boolean;
  noHyphens?: boolean;
}

export interface SearchParams {
  inputType: SearchInputType;
  inputText: string;
  tlds: string[];
  style: DomainStyle;
  language: string;
  length: DomainLength;
  maxSuggestions: number;
  provider?: AIProvider;
  model?: string;
  advanced?: AdvancedDomainSettings;
  excludeDomains?: string[];
  industry?: IndustryNiche;
  includeBrandAnalysis?: boolean;
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

// My Domain types (user's purchased domains)
export interface MyDomain {
  id: string;
  domain: string; // Full domain name (e.g., example.com)
  registrar: string; // Where the domain was purchased (e.g., Namecheap, GoDaddy)
  purchaseDate: string; // ISO date string
  expiryDate: string; // ISO date string
  autoRenew: boolean;
  registrationEmail?: string; // Email used for registration
  registrationPhone?: string; // Phone used for registration
  domainEmail?: string; // Email address for this domain (e.g., contact@example.com)
  dnsProvider?: string; // DNS provider if different from registrar
  hostingProvider?: string; // Where the site is hosted
  sslProvider?: string; // SSL certificate provider
  notes?: string; // Any additional notes
  tags?: string[]; // Tags for organization
  createdAt: string; // When this record was added (ISO date string)
  updatedAt: string; // Last update time (ISO date string)
}

// Common domain registrars for dropdown
export const DOMAIN_REGISTRARS = [
  'Namecheap',
  'GoDaddy',
  'Porkbun',
  'Google Domains',
  'Cloudflare',
  'Name.com',
  'Dynadot',
  'Hover',
  'Gandi',
  'NameSilo',
  'Domain.com',
  'Network Solutions',
  'Bluehost',
  'HostGator',
  'Register.com',
  'Enom',
  'Epik',
  'Ionos',
  'OVH',
  'Other',
] as const;

// Common hosting providers
export const HOSTING_PROVIDERS = [
  'Vercel',
  'Netlify',
  'AWS',
  'Google Cloud',
  'Azure',
  'DigitalOcean',
  'Cloudflare Pages',
  'Heroku',
  'Railway',
  'Render',
  'Linode',
  'Vultr',
  'Hostinger',
  'Bluehost',
  'SiteGround',
  'Self-hosted',
  'Other',
] as const;

// Common DNS providers
export const DNS_PROVIDERS = [
  'Cloudflare',
  'Same as Registrar',
  'AWS Route 53',
  'Google Cloud DNS',
  'Azure DNS',
  'DigitalOcean',
  'DNSimple',
  'NS1',
  'Other',
] as const;

// AI Provider types
export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'groq';

// Image AI Provider types (for logo generation)
export type ImageAIProvider = 'openai' | 'stability' | 'replicate' | 'leonardo' | 'fal' | 'together' | 'gemini';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
}

export interface ImageAIModel {
  id: string;
  name: string;
  provider: ImageAIProvider;
}

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
  groq?: string;
  domainApi?: string;
  stability?: string; // Stability AI (Stable Diffusion)
  replicate?: string; // Replicate
  leonardo?: string; // Leonardo AI
  fal?: string; // Fal.ai (Flux, etc.)
  together?: string; // Together AI
}

// Default provider settings
export interface DefaultProviderSettings {
  domainGeneration: {
    provider: AIProvider;
    model: string;
  };
  logoGeneration: {
    provider: ImageAIProvider;
  };
}

// Available AI Models
export const AI_MODELS: AIModel[] = [
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
  // Anthropic
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
  // Gemini
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini' },
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'gemini' },
  // Groq
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'groq' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'groq' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq' },
];

// Get models by provider
export const getModelsByProvider = (provider: AIProvider): AIModel[] => {
  return AI_MODELS.filter(m => m.provider === provider);
};

// Available Image AI Models (for logo generation)
export const IMAGE_AI_MODELS: ImageAIModel[] = [
  // OpenAI DALL-E
  { id: 'dall-e-3', name: 'DALL-E 3', provider: 'openai' },
  { id: 'dall-e-2', name: 'DALL-E 2', provider: 'openai' },
  // Google Gemini Imagen
  { id: 'imagen-3', name: 'Imagen 3', provider: 'gemini' },
  // Stability AI
  { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL', provider: 'stability' },
  { id: 'stable-diffusion-3', name: 'Stable Diffusion 3', provider: 'stability' },
  // Replicate (Flux, etc.)
  { id: 'flux-schnell', name: 'Flux Schnell', provider: 'replicate' },
  { id: 'flux-pro', name: 'Flux Pro', provider: 'replicate' },
  { id: 'sdxl', name: 'SDXL (Replicate)', provider: 'replicate' },
  // Leonardo AI
  { id: 'leonardo-diffusion-xl', name: 'Leonardo Diffusion XL', provider: 'leonardo' },
  { id: 'leonardo-lightning-xl', name: 'Leonardo Lightning XL', provider: 'leonardo' },
  // Fal.ai (Fast Flux)
  { id: 'fal-flux-schnell', name: 'Flux Schnell (Fal)', provider: 'fal' },
  { id: 'fal-flux-dev', name: 'Flux Dev (Fal)', provider: 'fal' },
  // Together AI
  { id: 'together-flux-schnell', name: 'Flux Schnell (Together)', provider: 'together' },
  { id: 'together-sdxl', name: 'SDXL Turbo (Together)', provider: 'together' },
];

// Get image models by provider
export const getImageModelsByProvider = (provider: ImageAIProvider): ImageAIModel[] => {
  return IMAGE_AI_MODELS.filter(m => m.provider === provider);
};

// Image AI Provider configurations
export interface ImageAIProviderConfig {
  id: ImageAIProvider;
  name: string;
  apiKeyField: keyof APIKeys;
  docsUrl: string;
  docsLabel: string;
  placeholder: string;
}

export const IMAGE_AI_PROVIDERS: ImageAIProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI DALL-E',
    apiKeyField: 'openai',
    docsUrl: 'https://platform.openai.com/api-keys',
    docsLabel: 'OpenAI Dashboard',
    placeholder: 'sk-...',
  },
  {
    id: 'stability',
    name: 'Stability AI',
    apiKeyField: 'stability',
    docsUrl: 'https://platform.stability.ai/account/keys',
    docsLabel: 'Stability AI',
    placeholder: 'sk-...',
  },
  {
    id: 'replicate',
    name: 'Replicate',
    apiKeyField: 'replicate',
    docsUrl: 'https://replicate.com/account/api-tokens',
    docsLabel: 'Replicate Dashboard',
    placeholder: 'r8_...',
  },
  {
    id: 'leonardo',
    name: 'Leonardo AI',
    apiKeyField: 'leonardo',
    docsUrl: 'https://leonardo.ai/settings/api-keys',
    docsLabel: 'Leonardo AI',
    placeholder: '...',
  },
  {
    id: 'fal',
    name: 'Fal.ai',
    apiKeyField: 'fal',
    docsUrl: 'https://fal.ai/dashboard/keys',
    docsLabel: 'Fal.ai Dashboard',
    placeholder: 'fal_...',
  },
  {
    id: 'together',
    name: 'Together AI',
    apiKeyField: 'together',
    docsUrl: 'https://api.together.xyz/settings/api-keys',
    docsLabel: 'Together AI',
    placeholder: '...',
  },
  {
    id: 'gemini',
    name: 'Google Imagen',
    apiKeyField: 'gemini',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    docsLabel: 'Google AI Studio',
    placeholder: 'AIza...',
  },
];

// Default provider settings constants
export const DEFAULT_PROVIDER_SETTINGS: DefaultProviderSettings = {
  domainGeneration: {
    provider: 'openai',
    model: 'gpt-4o-mini',
  },
  logoGeneration: {
    provider: 'openai',
  },
};

// Usage limits for free users
export interface UsageLimits {
  maxBulkChecksPerDay: number;
  maxFavorites: number;
  maxMyDomains: number;
}

export const FREE_LIMITS: UsageLimits = {
  maxBulkChecksPerDay: 30,
  maxFavorites: 3,
  maxMyDomains: 3,
};

export const PRO_LIMITS: UsageLimits = {
  maxBulkChecksPerDay: Infinity,
  maxFavorites: Infinity,
  maxMyDomains: Infinity,
};

// Daily usage tracking
export interface DailyUsage {
  bulkChecks: number;
  date: string; // YYYY-MM-DD
}

// Search input type now includes 'bulk'
export type SearchInputType = 'keyword' | 'content' | 'url' | 'bulk';

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
  | 'GET_USER'
  | 'GET_BRAND_ANALYSIS'
  | 'CHECK_SOCIAL_MEDIA'
  | 'SCRAPE_PRICES'
  | 'CHECK_BRAND_AWARENESS'
  | 'SEARCH_PLAY_STORE'
  | 'CHECK_BULK_DOMAINS';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

export interface ExtensionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Generic TLDs (always shown first)
export const GENERIC_TLDS = [
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

// Popular country-specific TLDs
export const COUNTRY_TLDS = [
  // Turkey
  '.com.tr', '.tr',
  // Germany
  '.de',
  // France
  '.fr',
  // UK
  '.uk', '.co.uk',
  // Spain
  '.es',
  // Italy
  '.it',
  // Netherlands
  '.nl',
  // Brazil
  '.com.br', '.br',
  // Russia
  '.ru',
  // Japan
  '.jp', '.co.jp',
  // South Korea
  '.kr', '.co.kr',
  // China
  '.cn', '.com.cn',
  // India
  '.in', '.co.in',
  // Australia
  '.au', '.com.au',
  // Canada
  '.ca',
  // Mexico
  '.mx', '.com.mx',
  // Poland
  '.pl',
  // Sweden
  '.se',
  // UAE
  '.ae',
  // Saudi Arabia
  '.sa',
];

// Combined list - generic TLDs first
export const AVAILABLE_TLDS = [...GENERIC_TLDS];

// Get TLDs for a specific language/country
export const getTLDsForLanguage = (language: string): string[] => {
  const countryConfig = COUNTRY_CONFIGS.find(c => c.language === language);
  if (countryConfig) {
    // Return country TLDs first, then generic
    return [...countryConfig.tlds, ...GENERIC_TLDS.slice(0, 6)];
  }
  return GENERIC_TLDS;
};

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

// Industry/Niche categories for better domain generation
export type IndustryNiche =
  | 'ai-tech'
  | 'ecommerce'
  | 'finance'
  | 'health'
  | 'education'
  | 'gaming'
  | 'travel'
  | 'food'
  | 'fashion'
  | 'real-estate'
  | 'marketing'
  | 'saas'
  | 'crypto'
  | 'social'
  | 'media'
  | 'general';

export const INDUSTRY_OPTIONS: { value: IndustryNiche; label: string; keywords: string[] }[] = [
  { value: 'general', label: 'General', keywords: [] },
  { value: 'ai-tech', label: 'AI & Tech', keywords: ['ai', 'tech', 'digital', 'smart', 'auto', 'bot', 'neural', 'data'] },
  { value: 'ecommerce', label: 'E-Commerce', keywords: ['shop', 'store', 'buy', 'sell', 'market', 'cart', 'deal'] },
  { value: 'finance', label: 'Finance & Fintech', keywords: ['pay', 'coin', 'fund', 'bank', 'wealth', 'invest', 'trade'] },
  { value: 'health', label: 'Health & Wellness', keywords: ['health', 'care', 'fit', 'med', 'vita', 'well', 'heal'] },
  { value: 'education', label: 'Education', keywords: ['learn', 'edu', 'study', 'course', 'skill', 'teach', 'tutor'] },
  { value: 'gaming', label: 'Gaming', keywords: ['game', 'play', 'quest', 'arena', 'pixel', 'level', 'guild'] },
  { value: 'travel', label: 'Travel', keywords: ['trip', 'travel', 'tour', 'fly', 'stay', 'book', 'wander'] },
  { value: 'food', label: 'Food & Delivery', keywords: ['eat', 'food', 'chef', 'dish', 'bite', 'taste', 'meal'] },
  { value: 'fashion', label: 'Fashion & Beauty', keywords: ['style', 'trend', 'wear', 'look', 'glam', 'chic', 'luxe'] },
  { value: 'real-estate', label: 'Real Estate', keywords: ['home', 'house', 'prop', 'nest', 'space', 'land', 'estate'] },
  { value: 'marketing', label: 'Marketing', keywords: ['brand', 'ads', 'lead', 'grow', 'reach', 'boost', 'viral'] },
  { value: 'saas', label: 'SaaS', keywords: ['hub', 'flow', 'sync', 'desk', 'stack', 'base', 'cloud'] },
  { value: 'crypto', label: 'Crypto & Web3', keywords: ['chain', 'token', 'nft', 'meta', 'defi', 'dao', 'web3'] },
  { value: 'social', label: 'Social & Community', keywords: ['social', 'connect', 'chat', 'meet', 'link', 'circle', 'tribe'] },
  { value: 'media', label: 'Media & Content', keywords: ['media', 'cast', 'stream', 'tube', 'video', 'pod', 'story'] },
];

// Country/Language configuration with localized TLDs
export interface CountryConfig {
  code: string;
  name: string;
  language: string;
  tlds: string[];
  keywords: string[]; // Common words in that language for domain generation
}

export const COUNTRY_CONFIGS: CountryConfig[] = [
  {
    code: 'TR',
    name: 'Türkiye',
    language: 'turkish',
    tlds: ['.com.tr', '.tr', '.net.tr', '.org.tr', '.web.tr', '.gen.tr'],
    keywords: ['taksi', 'istanbul', 'ankara', 'türk', 'yemek', 'sağlık', 'eğitim', 'market', 'hizmet', 'online']
  },
  {
    code: 'DE',
    name: 'Germany',
    language: 'german',
    tlds: ['.de', '.com.de'],
    keywords: ['auto', 'haus', 'gut', 'schnell', 'stark', 'grün', 'digital']
  },
  {
    code: 'FR',
    name: 'France',
    language: 'french',
    tlds: ['.fr', '.com.fr'],
    keywords: ['bon', 'beau', 'vie', 'jour', 'paris', 'mode', 'chic']
  },
  {
    code: 'ES',
    name: 'Spain',
    language: 'spanish',
    tlds: ['.es', '.com.es'],
    keywords: ['bueno', 'vida', 'sol', 'casa', 'mundo', 'nuevo', 'mejor']
  },
  {
    code: 'IT',
    name: 'Italy',
    language: 'italian',
    tlds: ['.it', '.com.it'],
    keywords: ['bella', 'vita', 'casa', 'sole', 'dolce', 'nuovo', 'roma']
  },
  {
    code: 'NL',
    name: 'Netherlands',
    language: 'dutch',
    tlds: ['.nl', '.com.nl'],
    keywords: ['goed', 'nieuw', 'groen', 'huis', 'amsterdam', 'water']
  },
  {
    code: 'PT',
    name: 'Portugal',
    language: 'portuguese',
    tlds: ['.pt', '.com.pt'],
    keywords: ['bom', 'novo', 'vida', 'sol', 'mar', 'casa', 'porto']
  },
  {
    code: 'BR',
    name: 'Brazil',
    language: 'portuguese',
    tlds: ['.com.br', '.br', '.net.br', '.org.br'],
    keywords: ['bom', 'novo', 'vida', 'sol', 'brasil', 'rio', 'verde']
  },
  {
    code: 'RU',
    name: 'Russia',
    language: 'russian',
    tlds: ['.ru', '.com.ru', '.su'],
    keywords: ['новый', 'хорошо', 'мир', 'дом', 'москва']
  },
  {
    code: 'JP',
    name: 'Japan',
    language: 'japanese',
    tlds: ['.jp', '.co.jp', '.ne.jp'],
    keywords: ['tokyo', 'nihon', 'kawa', 'yama', 'sora', 'hana']
  },
  {
    code: 'KR',
    name: 'South Korea',
    language: 'korean',
    tlds: ['.kr', '.co.kr', '.ne.kr'],
    keywords: ['seoul', 'hanguk', 'sarang', 'nara', 'hana']
  },
  {
    code: 'CN',
    name: 'China',
    language: 'chinese',
    tlds: ['.cn', '.com.cn', '.net.cn'],
    keywords: ['zhong', 'hua', 'xin', 'da', 'mei', 'hao']
  },
  {
    code: 'IN',
    name: 'India',
    language: 'hindi',
    tlds: ['.in', '.co.in', '.net.in'],
    keywords: ['desi', 'bharat', 'india', 'namaste', 'seva', 'dukan']
  },
  {
    code: 'AE',
    name: 'UAE',
    language: 'arabic',
    tlds: ['.ae', '.com.ae'],
    keywords: ['dubai', 'arab', 'khalij', 'emarat', 'souq']
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    language: 'arabic',
    tlds: ['.sa', '.com.sa'],
    keywords: ['saudi', 'arab', 'riyadh', 'souq', 'mamlaka']
  },
  {
    code: 'PL',
    name: 'Poland',
    language: 'polish',
    tlds: ['.pl', '.com.pl'],
    keywords: ['dobry', 'nowy', 'polska', 'dom', 'sklep']
  },
  {
    code: 'SE',
    name: 'Sweden',
    language: 'swedish',
    tlds: ['.se', '.com.se'],
    keywords: ['bra', 'ny', 'svensk', 'hem', 'grön']
  },
  {
    code: 'NO',
    name: 'Norway',
    language: 'norwegian',
    tlds: ['.no', '.com.no'],
    keywords: ['god', 'ny', 'norsk', 'hjem', 'fjord']
  },
  {
    code: 'DK',
    name: 'Denmark',
    language: 'danish',
    tlds: ['.dk', '.com.dk'],
    keywords: ['god', 'ny', 'dansk', 'hjem', 'grøn']
  },
  {
    code: 'FI',
    name: 'Finland',
    language: 'finnish',
    tlds: ['.fi', '.com.fi'],
    keywords: ['hyvä', 'uusi', 'suomi', 'koti', 'vihreä']
  },
  {
    code: 'GR',
    name: 'Greece',
    language: 'greek',
    tlds: ['.gr', '.com.gr'],
    keywords: ['kalo', 'neo', 'ellas', 'athina', 'thalassa']
  },
  {
    code: 'CZ',
    name: 'Czech Republic',
    language: 'czech',
    tlds: ['.cz', '.com.cz'],
    keywords: ['dobry', 'novy', 'praha', 'cesky', 'domov']
  },
  {
    code: 'AT',
    name: 'Austria',
    language: 'german',
    tlds: ['.at', '.co.at'],
    keywords: ['gut', 'neu', 'wien', 'österreich', 'alpen']
  },
  {
    code: 'CH',
    name: 'Switzerland',
    language: 'german',
    tlds: ['.ch', '.com.ch'],
    keywords: ['gut', 'neu', 'swiss', 'zürich', 'alpen']
  },
  {
    code: 'BE',
    name: 'Belgium',
    language: 'dutch',
    tlds: ['.be', '.com.be'],
    keywords: ['goed', 'nieuw', 'belgie', 'brussel']
  },
  {
    code: 'MX',
    name: 'Mexico',
    language: 'spanish',
    tlds: ['.mx', '.com.mx'],
    keywords: ['bueno', 'nuevo', 'mexico', 'vida', 'sol']
  },
  {
    code: 'AR',
    name: 'Argentina',
    language: 'spanish',
    tlds: ['.ar', '.com.ar'],
    keywords: ['bueno', 'nuevo', 'buenos', 'aires', 'vida']
  },
  {
    code: 'CL',
    name: 'Chile',
    language: 'spanish',
    tlds: ['.cl', '.com.cl'],
    keywords: ['bueno', 'nuevo', 'chile', 'santiago', 'sur']
  },
  {
    code: 'CO',
    name: 'Colombia',
    language: 'spanish',
    tlds: ['.co', '.com.co'],
    keywords: ['bueno', 'nuevo', 'colombia', 'bogota', 'cafe']
  },
  {
    code: 'AU',
    name: 'Australia',
    language: 'english',
    tlds: ['.au', '.com.au', '.net.au'],
    keywords: ['aussie', 'oz', 'down', 'under', 'mate']
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    language: 'english',
    tlds: ['.nz', '.co.nz', '.net.nz'],
    keywords: ['kiwi', 'aotearoa', 'nz', 'pure']
  },
  {
    code: 'CA',
    name: 'Canada',
    language: 'english',
    tlds: ['.ca', '.com.ca'],
    keywords: ['canada', 'maple', 'north', 'true']
  },
  {
    code: 'UK',
    name: 'United Kingdom',
    language: 'english',
    tlds: ['.uk', '.co.uk', '.org.uk'],
    keywords: ['brit', 'london', 'royal', 'united']
  },
  {
    code: 'IE',
    name: 'Ireland',
    language: 'english',
    tlds: ['.ie', '.com.ie'],
    keywords: ['irish', 'dublin', 'green', 'celtic']
  },
  {
    code: 'SG',
    name: 'Singapore',
    language: 'english',
    tlds: ['.sg', '.com.sg'],
    keywords: ['singapore', 'asia', 'smart', 'hub']
  },
  {
    code: 'HK',
    name: 'Hong Kong',
    language: 'chinese',
    tlds: ['.hk', '.com.hk'],
    keywords: ['hong', 'kong', 'asia', 'east']
  },
  {
    code: 'IL',
    name: 'Israel',
    language: 'hebrew',
    tlds: ['.il', '.co.il'],
    keywords: ['israel', 'telaviv', 'tech', 'startup']
  },
  {
    code: 'ZA',
    name: 'South Africa',
    language: 'english',
    tlds: ['.za', '.co.za'],
    keywords: ['africa', 'south', 'cape', 'rainbow']
  },
  {
    code: 'EG',
    name: 'Egypt',
    language: 'arabic',
    tlds: ['.eg', '.com.eg'],
    keywords: ['misr', 'cairo', 'nile', 'pharaoh']
  },
  {
    code: 'NG',
    name: 'Nigeria',
    language: 'english',
    tlds: ['.ng', '.com.ng'],
    keywords: ['naija', 'lagos', 'africa', 'giant']
  },
  {
    code: 'KE',
    name: 'Kenya',
    language: 'english',
    tlds: ['.ke', '.co.ke'],
    keywords: ['kenya', 'nairobi', 'safari', 'africa']
  },
  {
    code: 'TH',
    name: 'Thailand',
    language: 'thai',
    tlds: ['.th', '.co.th'],
    keywords: ['thai', 'bangkok', 'siam', 'sawadee']
  },
  {
    code: 'VN',
    name: 'Vietnam',
    language: 'vietnamese',
    tlds: ['.vn', '.com.vn'],
    keywords: ['viet', 'hanoi', 'saigon', 'pho']
  },
  {
    code: 'ID',
    name: 'Indonesia',
    language: 'indonesian',
    tlds: ['.id', '.co.id'],
    keywords: ['indo', 'jakarta', 'bali', 'nusantara']
  },
  {
    code: 'MY',
    name: 'Malaysia',
    language: 'malay',
    tlds: ['.my', '.com.my'],
    keywords: ['malaysia', 'kuala', 'lumpur', 'boleh']
  },
  {
    code: 'PH',
    name: 'Philippines',
    language: 'filipino',
    tlds: ['.ph', '.com.ph'],
    keywords: ['pinoy', 'manila', 'pilipinas', 'kabayan']
  },
  {
    code: 'PK',
    name: 'Pakistan',
    language: 'urdu',
    tlds: ['.pk', '.com.pk'],
    keywords: ['pakistan', 'karachi', 'lahore', 'desi']
  },
  {
    code: 'BD',
    name: 'Bangladesh',
    language: 'bengali',
    tlds: ['.bd', '.com.bd'],
    keywords: ['bangladesh', 'dhaka', 'bangla', 'desh']
  },
  {
    code: 'UA',
    name: 'Ukraine',
    language: 'ukrainian',
    tlds: ['.ua', '.com.ua'],
    keywords: ['ukraina', 'kyiv', 'slava', 'nova']
  },
  {
    code: 'RO',
    name: 'Romania',
    language: 'romanian',
    tlds: ['.ro', '.com.ro'],
    keywords: ['romania', 'bucuresti', 'bun', 'nou']
  },
  {
    code: 'HU',
    name: 'Hungary',
    language: 'hungarian',
    tlds: ['.hu', '.com.hu'],
    keywords: ['magyar', 'budapest', 'jo', 'uj']
  },
];

// Language options - auto-detect from input
export const LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'english', label: 'English' },
  { value: 'turkish', label: 'Türkçe' },
  { value: 'german', label: 'Deutsch' },
  { value: 'french', label: 'Français' },
  { value: 'spanish', label: 'Español' },
  { value: 'italian', label: 'Italiano' },
  { value: 'portuguese', label: 'Português' },
  { value: 'dutch', label: 'Nederlands' },
  { value: 'russian', label: 'Русский' },
  { value: 'arabic', label: 'العربية' },
  { value: 'chinese', label: '中文' },
  { value: 'japanese', label: '日本語' },
  { value: 'korean', label: '한국어' },
  { value: 'global', label: 'Global / Mix' },
];

// Get country config by language
export const getCountryByLanguage = (language: string): CountryConfig | undefined => {
  return COUNTRY_CONFIGS.find(c => c.language === language);
};

// Get all country TLDs
export const getAllCountryTLDs = (): string[] => {
  const tlds = new Set<string>();
  COUNTRY_CONFIGS.forEach(c => c.tlds.forEach(t => tlds.add(t)));
  return Array.from(tlds);
};

// Detect language from text (basic detection)
export const detectLanguage = (text: string): string => {
  const lowerText = text.toLowerCase();

  // Turkish characters/words
  if (/[şğüöçıİ]/.test(text) || /\b(için|ile|bir|ve|bu|da|de|mi|mı|mu|mü|taksi|türk|istanbul|ankara)\b/i.test(lowerText)) {
    return 'turkish';
  }

  // German
  if (/[äöüß]/.test(text) || /\b(und|ist|das|die|der|für|mit|ich|sie|ein)\b/i.test(lowerText)) {
    return 'german';
  }

  // French
  if (/[éèêëàâùûôîïç]/.test(text) || /\b(pour|avec|dans|est|les|des|une|que|qui|sur)\b/i.test(lowerText)) {
    return 'french';
  }

  // Spanish
  if (/[áéíóúñ¿¡]/.test(text) || /\b(para|con|por|los|las|una|que|del|como|más)\b/i.test(lowerText)) {
    return 'spanish';
  }

  // Portuguese
  if (/[ãõáéíóúâêôç]/.test(text) || /\b(para|com|por|uma|que|como|mais|sobre|também)\b/i.test(lowerText)) {
    return 'portuguese';
  }

  // Italian
  if (/\b(per|con|che|sono|della|nella|questo|quello|come|anche)\b/i.test(lowerText)) {
    return 'italian';
  }

  // Russian (Cyrillic)
  if (/[а-яА-ЯёЁ]/.test(text)) {
    return 'russian';
  }

  // Arabic
  if (/[\u0600-\u06FF]/.test(text)) {
    return 'arabic';
  }

  // Chinese
  if (/[\u4e00-\u9fff]/.test(text)) {
    return 'chinese';
  }

  // Japanese (Hiragana/Katakana)
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
    return 'japanese';
  }

  // Korean
  if (/[\uac00-\ud7af\u1100-\u11ff]/.test(text)) {
    return 'korean';
  }

  // Dutch
  if (/\b(en|het|van|een|voor|met|zijn|niet|aan|ook)\b/i.test(lowerText) && /\b(ij|oe|ui|aa|ee|oo)\b/i.test(lowerText)) {
    return 'dutch';
  }

  return 'english';
};

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
