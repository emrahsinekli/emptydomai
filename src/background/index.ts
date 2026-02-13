import type {
  ExtensionMessage,
  ExtensionResponse,
  SearchParams,
  DomainResult,
  User,
  BrandAnalysis,
  AIProvider,
  SocialMediaAvailability,
} from '../types';
import { generateDomains, generateDomainsFromContent, generateBrandAnalysis } from '../services/ai';
import { checkSocialMediaAvailability } from '../services/social';
import { checkBrandAwareness, type BrandAwarenessResult } from '../services/brandAwareness';
import { checkDomainsAvailability } from '../services/domain';
import {
  signInWithGoogle,
  signOut,
  getCurrentUser,
  createUserDocument,
  getUserDocument,
  getSearchHistory,
  getUserPlanFromFirestore,
  initializeFirebase,
} from '../services/firebase';
import {
  getAPIKeys,
  saveUserData,
  getUserData,
  clearUserData,
  getLocalFavorites,
  addLocalFavorite,
  removeLocalFavorite,
  saveUserPlan,
} from '../services/storage';
import { DEFAULT_USER_SETTINGS as defaultSettings } from '../types';

// Function to extract page content (injected via scripting API)
function extractPageContent(): string {
  const parts: string[] = [];

  // Get title
  const title = document.title;
  if (title) {
    parts.push(`Title: ${title}`);
  }

  // Get meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    const content = metaDescription.getAttribute('content');
    if (content) {
      parts.push(`Description: ${content}`);
    }
  }

  // Get meta keywords
  const metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metaKeywords) {
    const content = metaKeywords.getAttribute('content');
    if (content) {
      parts.push(`Keywords: ${content}`);
    }
  }

  // Get headings
  const headings = document.querySelectorAll('h1, h2');
  const headingTexts: string[] = [];
  headings.forEach((h) => {
    const text = h.textContent?.trim();
    if (text && text.length < 200) {
      headingTexts.push(text);
    }
  });
  if (headingTexts.length > 0) {
    parts.push(`Headings: ${headingTexts.slice(0, 5).join(', ')}`);
  }

  // Get main content
  const selectors = ['main', 'article', '[role="main"]', '.content', '#content'];
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.length > 50) {
        parts.push(`Content: ${text.substring(0, 1500)}`);
        break;
      }
    }
  }

  return parts.join('\n\n');
}

// Initialize Firebase
initializeFirebase();

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Context menu setup
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for text selection
  chrome.contextMenus.create({
    id: 'generate-domains-selection',
    title: 'Generate Domains with EmptyDomai',
    contexts: ['selection'],
  });

  // Create context menu for page
  chrome.contextMenus.create({
    id: 'generate-domains-page',
    title: 'Generate Domains from Page Content',
    contexts: ['page'],
  });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'generate-domains-selection' && info.selectionText) {
    // Store the selected text for the popup to use
    await chrome.storage.local.set({
      pendingContextGeneration: {
        type: 'selection',
        text: info.selectionText,
        timestamp: Date.now(),
      },
    });

    // Open the popup (this will trigger generation)
    // Note: We can't directly open popup, so we'll use a notification or badge
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#0ea5e9' });
  }

  if (info.menuItemId === 'generate-domains-page' && tab?.id) {
    // Get page content via scripting API (no content script needed)
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPageContent,
      });

      const content = results?.[0]?.result;
      if (content) {
        await chrome.storage.local.set({
          pendingContextGeneration: {
            type: 'page',
            text: content,
            timestamp: Date.now(),
          },
        });

        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#0ea5e9' });
      }
    } catch (error) {
      console.error('Failed to get page content:', error);
    }
  }
});

// Message handler
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse) => void
  ) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error.message || 'Unknown error occurred',
        });
      });

    return true; // Keep the message channel open for async response
  }
);

// Main message handler
async function handleMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  switch (message.type) {
    case 'GENERATE_DOMAINS':
      return handleGenerateDomains(message.payload as GenerateDomainsPayload);

    case 'CHECK_AVAILABILITY':
      return handleCheckAvailability(message.payload as CheckAvailabilityPayload);

    case 'LOGIN':
      return handleLogin();

    case 'LOGOUT':
      return handleLogout();

    case 'GET_USER':
      return handleGetUser();

    case 'SAVE_FAVORITE':
      return handleSaveFavorite(message.payload as SaveFavoritePayload);

    case 'REMOVE_FAVORITE':
      return handleRemoveFavorite(message.payload as RemoveFavoritePayload);

    case 'GET_FAVORITES':
      return handleGetFavorites();

    case 'GET_HISTORY':
      return handleGetHistory(message.payload as GetHistoryPayload);

    case 'GET_BRAND_ANALYSIS':
      return handleGetBrandAnalysis(message.payload as GetBrandAnalysisPayload);

    case 'CHECK_SOCIAL_MEDIA':
      return handleCheckSocialMedia(message.payload as CheckSocialMediaPayload);

    case 'SCRAPE_PRICES':
      return handleScrapePrices(message.payload as ScrapePricesPayload);

    case 'CHECK_BRAND_AWARENESS':
      return handleCheckBrandAwareness(message.payload as CheckBrandAwarenessPayload);

    case 'SEARCH_PLAY_STORE':
      return handleSearchPlayStore(message.payload as SearchPlayStorePayload);

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

// Payload types
interface GenerateDomainsPayload {
  params: SearchParams;
  provider?: 'openai' | 'anthropic' | 'gemini' | 'groq';
  model?: string;
}

interface CheckAvailabilityPayload {
  domains: string[];
  tlds: string[];
}

interface SaveFavoritePayload {
  domain: string;
  tld: string;
  searchId?: string;
}

interface RemoveFavoritePayload {
  fullDomain: string;
}

interface GetHistoryPayload {
  limit?: number;
}

interface GetBrandAnalysisPayload {
  domains: string[];
  businessIdea: string;
  provider?: AIProvider;
  model?: string;
}

interface CheckSocialMediaPayload {
  username: string;
}

interface ScrapePricesPayload {
  domain: string;
  tld: string;
  countryCode: string;
  registrars: Array<{
    name: string;
    url: string;
    isLocal: boolean;
    canScrape: boolean;
    method: 'GET' | 'POST';
    apiEndpoint: string | null;
    formData: Record<string, string> | null;
  }>;
}

interface CheckBrandAwarenessPayload {
  keyword: string;
}

interface SearchPlayStorePayload {
  keyword: string;
}

// Handler implementations
async function handleGenerateDomains(
  payload: GenerateDomainsPayload
): Promise<ExtensionResponse<DomainResult[]>> {
  try {
    const { params, provider = 'openai', model } = payload;

    // Check if API key is available
    const apiKeys = await getAPIKeys();
    if (!apiKeys[provider]) {
      return {
        success: false,
        error: `${provider} API key not configured. Please add your API key in settings.`,
      };
    }

    // Generate domain suggestions
    let domains: string[];
    if (params.inputType === 'content') {
      domains = await generateDomainsFromContent(params.inputText, provider, model);
    } else {
      domains = await generateDomains(params, provider, model);
    }

    if (domains.length === 0) {
      return {
        success: false,
        error: 'No domain suggestions generated. Try different keywords.',
      };
    }

    // Check availability for all domains
    const results: DomainResult[] = [];

    for (const domain of domains) {
      for (const tld of params.tlds) {
        results.push({
          domain,
          tld,
          fullDomain: `${domain}${tld}`,
          status: 'checking',
        });
      }
    }

    // Return initial results (checking status)
    // Availability will be checked incrementally
    return { success: true, data: results };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate domains',
    };
  }
}

async function handleCheckAvailability(
  payload: CheckAvailabilityPayload
): Promise<ExtensionResponse<DomainResult[]>> {
  try {
    const { domains, tlds } = payload;

    const results = await checkDomainsAvailability(domains, tlds);

    return { success: true, data: results };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check availability',
    };
  }
}

async function handleLogin(): Promise<ExtensionResponse<User>> {
  try {
    // Use Chrome identity API for Google sign-in (MV3 Promise API)
    let token: string;
    try {
      const result = await chrome.identity.getAuthToken({ interactive: true });
      // MV3 returns { token: string }, older versions return string directly
      token = typeof result === 'string' ? result : (result as any).token;
    } catch (e) {
      // Fallback: callback-based API
      token = await new Promise<string>((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (t) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (t) {
            resolve(typeof t === 'string' ? t : (t as any).token);
          } else {
            reject(new Error('No token received'));
          }
        });
      });
    }

    if (!token) {
      throw new Error('No token received from Google');
    }

    console.log('Got auth token, signing in to Firebase...');

    // Sign in to Firebase with the token
    const firebaseUser = await signInWithGoogle(token);

    console.log('Firebase sign-in successful:', firebaseUser.uid);

    // Create or get user document
    const user = await createUserDocument(firebaseUser, defaultSettings);

    // Sync plan from Firestore to local storage
    const firestorePlan = await getUserPlanFromFirestore(firebaseUser.uid);
    user.plan = firestorePlan;
    await saveUserPlan(firestorePlan);

    // Cache user data locally
    await saveUserData(user);

    return { success: true, data: user };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    };
  }
}

async function handleLogout(): Promise<ExtensionResponse> {
  try {
    // Sign out from Firebase
    await signOut();

    // Remove cached Chrome identity token
    try {
      const result = await chrome.identity.getAuthToken({ interactive: false });
      const cachedToken = typeof result === 'string' ? result : (result as any)?.token;
      if (cachedToken) {
        await chrome.identity.removeCachedAuthToken({ token: cachedToken });
      }
    } catch {
      // Token already cleared or not available, ignore
    }

    // Clear local user data
    await clearUserData();

    // Clear badge
    chrome.action.setBadgeText({ text: '' });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed',
    };
  }
}

async function handleGetUser(): Promise<ExtensionResponse<User | null>> {
  try {
    // Check Firebase auth state
    const firebaseUser = getCurrentUser();
    if (!firebaseUser) {
      // Not logged in, check local cache
      const cachedUser = await getUserData<User>();
      return { success: true, data: cachedUser || null };
    }

    // Get user document from Firestore
    const user = await getUserDocument(firebaseUser.uid);

    if (user) {
      // Sync plan from Firestore (webhook may have updated it)
      const firestorePlan = await getUserPlanFromFirestore(firebaseUser.uid);
      user.plan = firestorePlan;
      await saveUserPlan(firestorePlan);
      await saveUserData(user);
    }

    return { success: true, data: user };
  } catch (error) {
    // Fallback to local cache on error
    const cachedUser = await getUserData<User>();
    if (cachedUser) {
      return { success: true, data: cachedUser };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user',
    };
  }
}

// Helper function to get user from cache or Firebase
async function getAuthenticatedUser(): Promise<User | null> {
  // First try local cache
  const cachedUser = await getUserData<User>();
  if (cachedUser) {
    return cachedUser;
  }

  // Fall back to Firebase auth
  const firebaseUser = getCurrentUser();
  if (firebaseUser) {
    // Get user document and cache it
    const user = await getUserDocument(firebaseUser.uid);
    if (user) {
      await saveUserData(user);
      return user;
    }
  }

  return null;
}

async function handleSaveFavorite(
  payload: SaveFavoritePayload
): Promise<ExtensionResponse<string>> {
  try {
    // Save to LOCAL storage only - no Firebase
    const favoriteId = await addLocalFavorite(payload.domain, payload.tld);
    return { success: true, data: favoriteId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save favorite',
    };
  }
}

async function handleRemoveFavorite(
  payload: RemoveFavoritePayload
): Promise<ExtensionResponse> {
  try {
    // Remove from LOCAL storage only - no Firebase
    await removeLocalFavorite(payload.fullDomain);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove favorite',
    };
  }
}

async function handleGetFavorites(): Promise<ExtensionResponse> {
  try {
    // Get from LOCAL storage only - no Firebase
    const favorites = await getLocalFavorites();
    return { success: true, data: favorites };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get favorites',
    };
  }
}

async function handleGetHistory(
  payload?: GetHistoryPayload
): Promise<ExtensionResponse> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      // Return empty array instead of error for better UX
      return { success: true, data: [] };
    }

    const history = await getSearchHistory(user.uid, payload?.limit || 20);

    return { success: true, data: history };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get history',
    };
  }
}

async function handleGetBrandAnalysis(
  payload: GetBrandAnalysisPayload
): Promise<ExtensionResponse<Record<string, BrandAnalysis>>> {
  try {
    const { domains, businessIdea, provider = 'openai', model } = payload;

    // Check if API key is available
    const apiKeys = await getAPIKeys();
    if (!apiKeys[provider]) {
      return {
        success: false,
        error: `${provider} API key not configured.`,
      };
    }

    const analysisMap = await generateBrandAnalysis(domains, businessIdea, provider, model);

    // Convert Map to object for JSON serialization
    const analysisObject: Record<string, BrandAnalysis> = {};
    analysisMap.forEach((value, key) => {
      analysisObject[key] = value;
    });

    return { success: true, data: analysisObject };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get brand analysis',
    };
  }
}

async function handleCheckSocialMedia(
  payload: CheckSocialMediaPayload
): Promise<ExtensionResponse<SocialMediaAvailability>> {
  try {
    const { username } = payload;
    const availability = await checkSocialMediaAvailability(username);
    return { success: true, data: availability };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check social media',
    };
  }
}

// Price scraping handler
async function handleScrapePrices(
  payload: ScrapePricesPayload
): Promise<ExtensionResponse> {
  try {
    const { domain, tld, registrars } = payload;
    const results: Array<{
      registrar: string;
      price: number | null;
      currency: string;
      url: string;
      isLocal: boolean;
      canScrape: boolean;
      error?: string;
    }> = [];

    // Scrape each registrar in parallel (with limit)
    const scrapePromises = registrars.map(async (reg) => {
      // If registrar doesn't support scraping, just return link
      if (!reg.canScrape) {
        return {
          registrar: reg.name,
          price: null,
          currency: 'USD',
          url: reg.url,
          isLocal: reg.isLocal,
          canScrape: false,
          // No error - just can't scrape
        };
      }

      try {
        const price = await scrapeRegistrarPrice(
          reg.name,
          reg.url,
          domain,
          tld,
          reg.method,
          reg.apiEndpoint,
          reg.formData
        );
        return {
          registrar: reg.name,
          price: price.price,
          currency: price.currency,
          url: reg.url,
          isLocal: reg.isLocal,
          canScrape: true,
        };
      } catch (error) {
        return {
          registrar: reg.name,
          price: null,
          currency: 'USD',
          url: reg.url,
          isLocal: reg.isLocal,
          canScrape: true,
          error: 'Failed to fetch',
        };
      }
    });

    const scrapedResults = await Promise.all(scrapePromises);
    results.push(...scrapedResults);

    return { success: true, data: results };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scrape prices',
    };
  }
}

// Scrape price from a single registrar
async function scrapeRegistrarPrice(
  registrar: string,
  url: string,
  _domain: string,
  _tld: string,
  method: 'GET' | 'POST' = 'GET',
  apiEndpoint: string | null = null,
  formData: Record<string, string> | null = null
): Promise<{ price: number | null; currency: string }> {
  try {
    let response: Response;

    if (method === 'POST' && apiEndpoint && formData) {
      // Use POST request with form data
      const body = new URLSearchParams(formData);
      response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': new URL(apiEndpoint).origin,
          'Referer': url,
        },
        body: body.toString(),
      });
    } else {
      // Use GET request
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    console.log(`[Price Scraper] ${registrar} response length: ${html.length}`);

    // Parse price based on registrar
    return parseRegistrarPrice(registrar, html, _tld);
  } catch (error) {
    console.error(`Failed to scrape ${registrar}:`, error);
    return { price: null, currency: 'USD' };
  }
}

// Parse price from HTML based on registrar
function parseRegistrarPrice(
  registrar: string,
  html: string,
  _tld: string
): { price: number | null; currency: string } {
  try {
    switch (registrar.toLowerCase()) {
      case 'namecheap': {
        // Look for price patterns like $9.98 or $12.98/yr
        const priceMatch = html.match(/\$(\d+\.?\d*)\s*(?:\/yr|\/year)?/i);
        if (priceMatch) {
          return { price: parseFloat(priceMatch[1]), currency: 'USD' };
        }
        // Alternative: look for data attributes
        const dataMatch = html.match(/data-price="(\d+\.?\d*)"/i);
        if (dataMatch) {
          return { price: parseFloat(dataMatch[1]), currency: 'USD' };
        }
        break;
      }

      case 'porkbun': {
        // Porkbun uses specific price elements
        const priceMatch = html.match(/\$(\d+\.?\d*)/);
        if (priceMatch) {
          return { price: parseFloat(priceMatch[1]), currency: 'USD' };
        }
        break;
      }

      case 'godaddy': {
        // GoDaddy uses various price formats
        const priceMatch = html.match(/(?:₺|TL|USD|\$)\s*(\d+[.,]?\d*)/i);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(',', '.'));
          const currency = html.includes('₺') || html.includes('TL') ? 'TRY' : 'USD';
          return { price, currency };
        }
        break;
      }

      case 'isimtescil':
      case 'İsimtescil': {
        // Turkish registrar - look for price patterns
        // Look for price in result area - typically format: "XX,XX ₺" or "XX.XX TL"
        // Try multiple patterns
        const patterns = [
          // Price with currency symbol after: "99,00 ₺" or "99.00 TL"
          /class="[^"]*price[^"]*"[^>]*>[\s\S]*?(\d+[.,]\d{2})\s*(?:₺|TL)/i,
          // Price in data attribute
          /data-price="(\d+\.?\d*)"/i,
          // Generic Turkish price pattern
          /(\d{1,3}(?:[.,]\d{2})?)\s*(?:₺|TL)/,
        ];
        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match) {
            return { price: parseFloat(match[1].replace(',', '.')), currency: 'TRY' };
          }
        }
        break;
      }

      case 'natro': {
        // Natro Turkish registrar - POST response HTML
        // Look for price patterns in result
        // Natro shows prices like "XX,XX ₺" or with class "pp-price-TRY"
        const patterns = [
          // Natro specific: pp-price-TRY class
          /class="pp-price-TRY"[^>]*>(\d+[.,]?\d*)/i,
          // Price span with ₺ symbol
          /class="price"[^>]*>[\s\S]*?(\d+[.,]\d{2})/i,
          // Domain result price - typically in table cells
          /<td[^>]*>(\d+[.,]\d{2})\s*(?:₺|TL)/i,
          // Generic price with TRY
          /(\d{1,3}(?:[.,]\d{2})?)\s*(?:₺|TL)/,
        ];
        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match) {
            return { price: parseFloat(match[1].replace(',', '.')), currency: 'TRY' };
          }
        }
        break;
      }

      case 'cloudflare': {
        // Cloudflare shows prices in a specific format
        const priceMatch = html.match(/\$(\d+\.?\d*)\s*per\s*year/i);
        if (priceMatch) {
          return { price: parseFloat(priceMatch[1]), currency: 'USD' };
        }
        break;
      }

      default: {
        // Generic price extraction - look for common patterns
        const usdMatch = html.match(/\$(\d+\.?\d*)/);
        if (usdMatch) {
          return { price: parseFloat(usdMatch[1]), currency: 'USD' };
        }
        const tryMatch = html.match(/(\d+[.,]?\d*)\s*(?:TL|₺)/i);
        if (tryMatch) {
          return { price: parseFloat(tryMatch[1].replace(',', '.')), currency: 'TRY' };
        }
        const eurMatch = html.match(/€(\d+[.,]?\d*)/);
        if (eurMatch) {
          return { price: parseFloat(eurMatch[1].replace(',', '.')), currency: 'EUR' };
        }
      }
    }
  } catch (error) {
    console.error(`Price parsing error for ${registrar}:`, error);
  }

  return { price: null, currency: 'USD' };
}

// Brand awareness handler - REAL data from public APIs
async function handleCheckBrandAwareness(
  payload: CheckBrandAwarenessPayload
): Promise<ExtensionResponse<BrandAwarenessResult>> {
  try {
    const { keyword } = payload;
    const result = await checkBrandAwareness(keyword);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check brand awareness',
    };
  }
}

// Play Store search handler - scrape Google Play
async function handleSearchPlayStore(
  payload: SearchPlayStorePayload
): Promise<ExtensionResponse> {
  try {
    const { keyword } = payload;
    const searchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(keyword)}&c=apps`;

    // Fetch Google Play search page
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Parse the HTML to find apps
    // Google Play uses data attributes and specific class patterns
    const apps: Array<{
      name: string;
      developer: string;
      icon: string;
      url: string;
      rating?: number;
      price: string;
    }> = [];

    // Look for app cards - Google Play structure varies, try multiple patterns
    const appLinkRegex = /href="\/store\/apps\/details\?id=([^"&]+)"/g;

    // Extract app IDs
    const appIds: string[] = [];
    let match;
    while ((match = appLinkRegex.exec(html)) !== null && appIds.length < 5) {
      if (!appIds.includes(match[1])) {
        appIds.push(match[1]);
      }
    }

    // Check for exact match in the HTML content
    const exactMatchRegex = new RegExp(`>\\s*${keyword}\\s*<`, 'i');
    const exactMatch = exactMatchRegex.test(html);

    // Count approximate results
    const count = appIds.length;
    const found = count > 0;

    return {
      success: true,
      data: {
        found,
        count,
        exactMatch,
        apps,
      },
    };
  } catch (error) {
    console.error('Play Store search failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search Play Store',
    };
  }
}

// Export for use in other modules
export { handleGenerateDomains, handleCheckAvailability };
