/**
 * App Store Search Service
 * Searches iOS App Store and Google Play Store for similar app names
 */

import type { AppStoreResult, AppStoreSearchResult } from '../types';

// Calculate string similarity using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 100;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const containmentScore = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
    return Math.round(70 + containmentScore * 30);
  }

  // Levenshtein distance
  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = Math.round((1 - distance / maxLength) * 100);

  return Math.max(0, similarity);
}

// Check if app name is a good match (for filtering results)
function isRelevantMatch(query: string, appName: string): boolean {
  const similarity = calculateSimilarity(query, appName);
  return similarity >= 40; // 40% threshold for relevance
}

// Search iOS App Store using iTunes Search API
export async function searchIOSAppStore(query: string, limit = 10): Promise<AppStoreResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodedQuery}&entity=software&limit=${limit * 2}&country=us`
    );

    if (!response.ok) {
      console.error('iOS App Store search failed:', response.status);
      return [];
    }

    const data = await response.json();
    const results: AppStoreResult[] = [];

    for (const app of data.results || []) {
      const appName = app.trackName || app.trackCensoredName || '';

      if (!isRelevantMatch(query, appName)) continue;

      results.push({
        id: String(app.trackId),
        name: appName,
        platform: 'ios',
        developer: app.artistName || 'Unknown',
        developerUrl: app.artistViewUrl,
        icon: app.artworkUrl100 || app.artworkUrl60 || app.artworkUrl512 || '',
        rating: app.averageUserRating,
        ratingCount: app.userRatingCount,
        price: app.formattedPrice || (app.price === 0 ? 'Free' : `$${app.price}`),
        url: app.trackViewUrl,
        category: app.primaryGenreName,
        description: app.description?.substring(0, 200),
        similarity: calculateSimilarity(query, appName),
      });
    }

    // Sort by similarity score
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  } catch (error) {
    console.error('iOS App Store search error:', error);
    return [];
  }
}

// Search Google Play Store
// Note: Google Play doesn't have an official public API, so we use a search-based approach
export async function searchGooglePlayStore(query: string, limit = 10): Promise<AppStoreResult[]> {
  try {
    // We'll use an unofficial approach - Google Play has a search suggestions endpoint
    // For production, you might want to use a third-party API or web scraping service

    const encodedQuery = encodeURIComponent(query);

    // Try to fetch from a CORS-friendly endpoint or use background script
    // This is a simplified version - in production you'd want a proper backend
    const searchUrl = `https://play.google.com/store/search?q=${encodedQuery}&c=apps`;

    // Since direct fetch might be blocked by CORS, we'll construct results from available data
    // In a real implementation, this would go through a backend proxy

    // For now, we'll try an alternative approach using Google's autocomplete
    const autocompleteUrl = `https://market.android.com/suggest/SuggRequest?json=1&c=3&query=${encodedQuery}`;

    try {
      const response = await fetch(autocompleteUrl);
      if (response.ok) {
        const suggestions = await response.json();
        const results: AppStoreResult[] = [];

        for (const suggestion of suggestions || []) {
          if (suggestion.s) {
            const appName = suggestion.s;
            if (!isRelevantMatch(query, appName)) continue;

            results.push({
              id: `android-${encodeURIComponent(appName)}`,
              name: appName,
              platform: 'android',
              developer: 'View on Play Store',
              icon: '',
              price: 'View details',
              url: `https://play.google.com/store/search?q=${encodeURIComponent(appName)}&c=apps`,
              similarity: calculateSimilarity(query, appName),
            });
          }
        }

        return results.slice(0, limit);
      }
    } catch {
      // Autocomplete failed, continue with fallback
    }

    // Fallback: Return a link to search results
    // In production, you'd want to implement proper scraping or use a paid API
    return [{
      id: `android-search-${encodedQuery}`,
      name: `Search "${query}" on Google Play`,
      platform: 'android',
      developer: 'Click to search',
      icon: '',
      price: '',
      url: searchUrl,
      similarity: 100,
    }];

  } catch (error) {
    console.error('Google Play search error:', error);
    return [];
  }
}

// Alternative Google Play search using SerpAPI or similar (if API key available)
export async function searchGooglePlayWithAPI(
  query: string,
  _apiKey?: string,
  limit = 10
): Promise<AppStoreResult[]> {
  // This would use a service like SerpAPI, RapidAPI, or similar
  // For now, return empty and fall back to basic search

  // Example with a hypothetical API:
  // const response = await fetch(`https://api.example.com/play-store/search?q=${query}&key=${apiKey}`);

  return searchGooglePlayStore(query, limit);
}

// Main function to search both app stores
export async function searchAppStores(query: string): Promise<AppStoreSearchResult> {
  // Clean the query - remove TLD if present
  const cleanQuery = query
    .replace(/\.(com|io|ai|co|net|org|app|dev|tech|xyz|me)$/i, '')
    .trim();

  // Search both stores in parallel
  const [iosApps, androidApps] = await Promise.all([
    searchIOSAppStore(cleanQuery),
    searchGooglePlayStore(cleanQuery),
  ]);

  // Check for exact matches
  const hasExactMatch =
    iosApps.some((app) => app.similarity >= 95) ||
    androidApps.some((app) => app.similarity >= 95);

  // Check for similar apps (above 60% similarity)
  const hasSimilarApps =
    iosApps.some((app) => app.similarity >= 60) ||
    androidApps.some((app) => app.similarity >= 60);

  return {
    query: cleanQuery,
    iosApps,
    androidApps,
    hasExactMatch,
    hasSimilarApps,
  };
}

// Check if a specific app name is available (no exact match found)
export async function checkAppNameAvailability(
  appName: string
): Promise<{
  isAvailable: boolean;
  iosMatch?: AppStoreResult;
  androidMatch?: AppStoreResult;
  similarApps: AppStoreResult[];
}> {
  const results = await searchAppStores(appName);

  // Find exact or near-exact matches
  const iosExactMatch = results.iosApps.find((app) => app.similarity >= 90);
  const androidExactMatch = results.androidApps.find((app) => app.similarity >= 90);

  // Collect all similar apps
  const similarApps = [
    ...results.iosApps.filter((app) => app.similarity >= 50 && app.similarity < 90),
    ...results.androidApps.filter((app) => app.similarity >= 50 && app.similarity < 90),
  ].sort((a, b) => b.similarity - a.similarity);

  return {
    isAvailable: !iosExactMatch && !androidExactMatch,
    iosMatch: iosExactMatch,
    androidMatch: androidExactMatch,
    similarApps,
  };
}

// Get app store links for a name
export function getAppStoreSearchLinks(name: string): {
  ios: string;
  android: string;
} {
  const encodedName = encodeURIComponent(name);
  return {
    ios: `https://apps.apple.com/search?term=${encodedName}`,
    android: `https://play.google.com/store/search?q=${encodedName}&c=apps`,
  };
}

// Format app rating for display
export function formatAppRating(rating?: number, count?: number): string {
  if (!rating) return 'No ratings';
  const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  const countStr = count ? ` (${count.toLocaleString()})` : '';
  return `${stars} ${rating.toFixed(1)}${countStr}`;
}

// Get similarity badge color
export function getSimilarityBadgeColor(similarity: number): string {
  if (similarity >= 90) return 'bg-red-100 text-red-700 border-red-200';
  if (similarity >= 70) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (similarity >= 50) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
}

// Get warning level based on app store results
export function getAppNameWarningLevel(
  results: AppStoreSearchResult
): 'safe' | 'caution' | 'warning' | 'danger' {
  if (results.hasExactMatch) return 'danger';

  const highSimilarityApps = [
    ...results.iosApps.filter((app) => app.similarity >= 80),
    ...results.androidApps.filter((app) => app.similarity >= 80),
  ];

  if (highSimilarityApps.length > 0) return 'warning';

  if (results.hasSimilarApps) return 'caution';

  return 'safe';
}
