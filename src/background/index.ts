import type {
  ExtensionMessage,
  ExtensionResponse,
  SearchParams,
  DomainResult,
  User,
} from '../types';
import { generateDomains, generateDomainsFromContent } from '../services/ai';
import { checkDomainsAvailability } from '../services/domain';
import {
  signInWithGoogle,
  signOut,
  getCurrentUser,
  createUserDocument,
  getUserDocument,
  getSearchHistory,
  addFavorite,
  removeFavoriteByDomain,
  getFavorites,
  initializeFirebase,
} from '../services/firebase';
import {
  getAPIKeys,
  saveUserData,
  getUserData,
  clearUserData,
} from '../services/storage';
import { DEFAULT_USER_SETTINGS } from '../types';

// Initialize Firebase
initializeFirebase();

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
    // Get page content via content script
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_PAGE_CONTENT',
      });

      if (response?.content) {
        await chrome.storage.local.set({
          pendingContextGeneration: {
            type: 'page',
            text: response.content,
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

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

// Payload types
interface GenerateDomainsPayload {
  params: SearchParams;
  provider?: 'openai' | 'anthropic' | 'gemini';
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

// Handler implementations
async function handleGenerateDomains(
  payload: GenerateDomainsPayload
): Promise<ExtensionResponse<DomainResult[]>> {
  try {
    const { params, provider = 'openai' } = payload;

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
      domains = await generateDomainsFromContent(params.inputText, provider);
    } else {
      domains = await generateDomains(params, provider);
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
    // Use Chrome identity API for Google sign-in
    const token = await new Promise<string>((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (token) {
          resolve(token);
        } else {
          reject(new Error('No token received'));
        }
      });
    });

    // Sign in to Firebase with the token
    const firebaseUser = await signInWithGoogle(token);

    // Create or get user document
    const user = await createUserDocument(firebaseUser, DEFAULT_USER_SETTINGS);

    // Cache user data locally
    await saveUserData(user);

    return { success: true, data: user };
  } catch (error) {
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
    await new Promise<void>((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (token) {
          chrome.identity.removeCachedAuthToken({ token }, () => {
            resolve();
          });
        } else {
          resolve();
        }
      });
    });

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
    // First check local cache
    const cachedUser = await getUserData<User>();
    if (cachedUser) {
      return { success: true, data: cachedUser };
    }

    // Check Firebase auth state
    const firebaseUser = getCurrentUser();
    if (!firebaseUser) {
      return { success: true, data: null };
    }

    // Get user document from Firestore
    const user = await getUserDocument(firebaseUser.uid);

    if (user) {
      await saveUserData(user);
    }

    return { success: true, data: user };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user',
    };
  }
}

async function handleSaveFavorite(
  payload: SaveFavoritePayload
): Promise<ExtensionResponse<string>> {
  try {
    const user = await getUserData<User>();
    if (!user) {
      return { success: false, error: 'Not logged in' };
    }

    const favoriteId = await addFavorite(
      user.uid,
      payload.domain,
      payload.tld,
      payload.searchId
    );

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
    const user = await getUserData<User>();
    if (!user) {
      return { success: false, error: 'Not logged in' };
    }

    await removeFavoriteByDomain(user.uid, payload.fullDomain);

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
    const user = await getUserData<User>();
    if (!user) {
      return { success: false, error: 'Not logged in' };
    }

    const favorites = await getFavorites(user.uid);

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
    const user = await getUserData<User>();
    if (!user) {
      return { success: false, error: 'Not logged in' };
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

// Export for use in other modules
export { handleGenerateDomains, handleCheckAvailability };
