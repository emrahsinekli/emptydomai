// App Store & Play Store Search Service - REAL DATA
// Uses official iTunes Search API and Play Store web search

export interface AppStoreResult {
  name: string;
  developer: string;
  icon: string;
  url: string;
  rating?: number;
  reviews?: number;
  price: string;
}

export interface AppSearchResults {
  keyword: string;
  ios: {
    found: boolean;
    count: number;
    exactMatch: boolean;
    apps: AppStoreResult[];
    searchUrl: string;
    error?: string;
  };
  android: {
    found: boolean;
    count: number;
    exactMatch: boolean;
    apps: AppStoreResult[];
    searchUrl: string;
    error?: string;
  };
  fetchedAt: Date;
  isLoading: boolean;
}

// iTunes Search API - FREE, NO API KEY
async function searchAppStore(keyword: string): Promise<AppSearchResults['ios']> {
  const searchUrl = `https://apps.apple.com/search?term=${encodeURIComponent(keyword)}`;

  try {
    // iTunes Search API is public and free
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(keyword)}&entity=software&limit=5&country=us`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const results = data.results || [];

    // Check for exact match (case-insensitive)
    const lowerKeyword = keyword.toLowerCase();
    const exactMatch = results.some((app: any) =>
      app.trackName?.toLowerCase() === lowerKeyword ||
      app.trackName?.toLowerCase().replace(/[^a-z0-9]/g, '') === lowerKeyword.replace(/[^a-z0-9]/g, '')
    );

    const apps: AppStoreResult[] = results.slice(0, 3).map((app: any) => ({
      name: app.trackName || 'Unknown',
      developer: app.artistName || 'Unknown',
      icon: app.artworkUrl60 || app.artworkUrl100 || '',
      url: app.trackViewUrl || searchUrl,
      rating: app.averageUserRating,
      reviews: app.userRatingCount,
      price: app.formattedPrice || (app.price === 0 ? 'Free' : `$${app.price}`),
    }));

    return {
      found: results.length > 0,
      count: data.resultCount || 0,
      exactMatch,
      apps,
      searchUrl,
    };
  } catch (error) {
    console.error('App Store search failed:', error);
    return {
      found: false,
      count: 0,
      exactMatch: false,
      apps: [],
      searchUrl,
      error: 'Failed to fetch',
    };
  }
}

// Google Play Store - No official API, use web search link
// We can try to scrape via a proxy or just provide the link
async function searchPlayStore(keyword: string): Promise<AppSearchResults['android']> {
  const searchUrl = `https://play.google.com/store/search?q=${encodeURIComponent(keyword)}&c=apps`;

  try {
    // Try using a CORS proxy or direct fetch (may fail due to CORS)
    // Google Play doesn't have a public API, so we'll try alternative approaches

    // Option 1: Try SerpAPI-like service (if available)
    // Option 2: Try parsing Google Play directly (usually blocked)
    // Option 3: Use a public API that aggregates app data

    // For now, we'll use a simple heuristic based on the keyword
    // and provide the search URL for manual verification

    // Try fetching via background script to avoid CORS
    const response = await chrome.runtime.sendMessage({
      type: 'SEARCH_PLAY_STORE',
      payload: { keyword },
    });

    if (response && response.success && response.data) {
      return {
        ...response.data,
        searchUrl,
      };
    }

    // Fallback: Return link-only result
    return {
      found: false,
      count: 0,
      exactMatch: false,
      apps: [],
      searchUrl,
      error: 'Check manually',
    };
  } catch (error) {
    console.error('Play Store search failed:', error);
    return {
      found: false,
      count: 0,
      exactMatch: false,
      apps: [],
      searchUrl,
      error: 'Check manually',
    };
  }
}

// Alternative: Use 42matters or similar API (requires key)
// For now, we'll implement a simpler approach

// Main search function
export async function searchAppStores(keyword: string): Promise<AppSearchResults> {
  const cleanKeyword = keyword.toLowerCase().trim();

  // Run both searches in parallel
  const [iosResult, androidResult] = await Promise.all([
    searchAppStore(cleanKeyword),
    searchPlayStore(cleanKeyword),
  ]);

  return {
    keyword: cleanKeyword,
    ios: iosResult,
    android: androidResult,
    fetchedAt: new Date(),
    isLoading: false,
  };
}

// Get availability status text
export function getAppAvailabilityStatus(results: AppSearchResults): {
  status: 'available' | 'taken' | 'similar' | 'unknown';
  message: string;
  color: string;
} {
  const iosExact = results.ios.exactMatch;
  const androidExact = results.android.exactMatch;
  const iosFound = results.ios.found;
  const androidFound = results.android.found;

  if (iosExact || androidExact) {
    return {
      status: 'taken',
      message: `Exact match found on ${iosExact ? 'App Store' : ''}${iosExact && androidExact ? ' & ' : ''}${androidExact ? 'Play Store' : ''}`,
      color: 'text-red-600',
    };
  }

  if (iosFound || androidFound) {
    return {
      status: 'similar',
      message: `Similar apps found (${results.ios.count + results.android.count} total)`,
      color: 'text-yellow-600',
    };
  }

  if (results.ios.error && results.android.error) {
    return {
      status: 'unknown',
      message: 'Could not check - verify manually',
      color: 'text-gray-500',
    };
  }

  return {
    status: 'available',
    message: 'No apps found with this name',
    color: 'text-green-600',
  };
}

// Format app count for display
export function formatAppCount(count: number): string {
  if (count === 0) return '0';
  if (count >= 100) return '100+';
  return count.toString();
}
