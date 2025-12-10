import React, { useState } from 'react';
import type { AppStoreResult, AppStoreSearchResult } from '../types';
import {
  searchAppStores,
  checkAppNameAvailability,
  getAppStoreSearchLinks,
  getSimilarityBadgeColor,
} from '../services/appStoreSearch';

export const AppSearchTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<AppStoreSearchResult | null>(null);
  const [availabilityCheck, setAvailabilityCheck] = useState<{
    isAvailable: boolean;
    iosMatch?: AppStoreResult;
    androidMatch?: AppStoreResult;
    similarApps: AppStoreResult[];
  } | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setResults(null);
    setAvailabilityCheck(null);

    try {
      // Perform both searches in parallel
      const [searchResults, availability] = await Promise.all([
        searchAppStores(searchQuery),
        checkAppNameAvailability(searchQuery),
      ]);

      setResults(searchResults);
      setAvailabilityCheck(availability);
    } catch (error) {
      console.error('App search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getAvailabilityStatus = () => {
    if (!availabilityCheck) return null;

    if (availabilityCheck.isAvailable) {
      return {
        status: 'available',
        title: 'App Name Available!',
        description: 'No exact match found in iOS App Store or Google Play.',
        className: 'bg-green-50 border-green-200 text-green-800',
        iconClass: 'text-green-500',
      };
    }

    return {
      status: 'taken',
      title: 'App Name Taken',
      description: 'An app with this exact or very similar name already exists.',
      className: 'bg-red-50 border-red-200 text-red-800',
      iconClass: 'text-red-500',
    };
  };

  const searchLinks = searchQuery ? getAppStoreSearchLinks(searchQuery) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">App Name Search</h2>
        <p className="text-sm text-gray-500 mb-3">
          Check if an app name is already taken on iOS App Store or Google Play
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter app name to search..."
            className="input-field flex-1"
            disabled={isSearching}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="btn-primary px-4 flex items-center gap-2"
          >
            {isSearching ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Search
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Availability Status */}
        {availabilityCheck && (
          <div
            className={`p-4 rounded-lg border ${getAvailabilityStatus()?.className}`}
          >
            <div className="flex items-start gap-3">
              {availabilityCheck.isAvailable ? (
                <svg
                  className={`w-6 h-6 ${getAvailabilityStatus()?.iconClass}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className={`w-6 h-6 ${getAvailabilityStatus()?.iconClass}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              <div>
                <h3 className="font-semibold">{getAvailabilityStatus()?.title}</h3>
                <p className="text-sm mt-1">{getAvailabilityStatus()?.description}</p>

                {/* Show matching apps */}
                {(availabilityCheck.iosMatch || availabilityCheck.androidMatch) && (
                  <div className="mt-3 space-y-2">
                    {availabilityCheck.iosMatch && (
                      <AppMatchCard app={availabilityCheck.iosMatch} />
                    )}
                    {availabilityCheck.androidMatch && (
                      <AppMatchCard app={availabilityCheck.androidMatch} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* iOS Results */}
        {results && results.iosApps.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <span className="font-medium text-gray-900">iOS App Store</span>
              <span className="text-sm text-gray-500">({results.iosApps.length} results)</span>
            </div>
            <div className="divide-y divide-gray-100">
              {results.iosApps.map((app) => (
                <AppResultRow key={app.id} app={app} />
              ))}
            </div>
          </div>
        )}

        {/* Android Results */}
        {results && results.androidApps.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.34l-.002-.012a5.67 5.67 0 0 0-.088-.508 6.12 6.12 0 0 0-1.138-2.49A6.3 6.3 0 0 0 14.5 10.6a6.1 6.1 0 0 0-2.5-.6 6.1 6.1 0 0 0-2.5.6 6.3 6.3 0 0 0-1.795 1.73 6.12 6.12 0 0 0-1.138 2.49 5.67 5.67 0 0 0-.088.508l-.002.012H17.523zM6.477 15.34l.004.048c.015.12.036.24.062.36H17.457c.026-.12.047-.24.062-.36l.004-.048H6.477zM16.5 7.5l1.55-2.69a.3.3 0 0 0-.11-.41.3.3 0 0 0-.41.11L15.96 7.2A7.01 7.01 0 0 0 12 6c-1.42 0-2.75.43-3.96 1.2L6.47 4.51a.3.3 0 0 0-.41-.11.3.3 0 0 0-.11.41L7.5 7.5A7.01 7.01 0 0 0 5 12.5v.5h14v-.5a7.01 7.01 0 0 0-2.5-5zM9 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm6 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM5 17.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-2z" />
              </svg>
              <span className="font-medium text-gray-900">Google Play</span>
              <span className="text-sm text-gray-500">({results.androidApps.length} results)</span>
            </div>
            <div className="divide-y divide-gray-100">
              {results.androidApps.map((app) => (
                <AppResultRow key={app.id} app={app} />
              ))}
            </div>
          </div>
        )}

        {/* Similar Apps Warning */}
        {availabilityCheck && availabilityCheck.similarApps.length > 0 && (
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
            <h4 className="font-medium text-yellow-800 flex items-center gap-2 mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Similar Apps Found
            </h4>
            <p className="text-sm text-yellow-700 mb-3">
              These apps have similar names that could cause confusion:
            </p>
            <div className="space-y-2">
              {availabilityCheck.similarApps.slice(0, 5).map((app) => (
                <AppResultRow key={app.id} app={app} compact />
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {results && results.iosApps.length === 0 && results.androidApps.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="font-medium">No apps found</p>
            <p className="text-sm">
              Try a different search term or check the stores manually
            </p>
          </div>
        )}

        {/* Manual Search Links */}
        {searchLinks && results && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Manual Search</h4>
            <p className="text-xs text-gray-500 mb-3">
              Click below to search directly on the app stores:
            </p>
            <div className="flex gap-2">
              <a
                href={searchLinks.ios}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2 px-3 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
              >
                Search App Store
              </a>
              <a
                href={searchLinks.android}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2 px-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
              >
                Search Play Store
              </a>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!results && !isSearching && (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-gray-500 font-medium mb-1">Check App Name Availability</h3>
            <p className="text-sm text-gray-400">
              Enter an app name above to see if it's already taken
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// App Match Card (for exact matches)
const AppMatchCard: React.FC<{ app: AppStoreResult }> = ({ app }) => {
  return (
    <a
      href={app.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
    >
      {app.icon ? (
        <img src={app.icon} alt={app.name} className="w-10 h-10 rounded-lg" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">{app.name}</span>
          <span className={`px-1.5 py-0.5 text-[10px] rounded border ${getSimilarityBadgeColor(app.similarity)}`}>
            {app.similarity}% match
          </span>
        </div>
        <div className="text-xs text-gray-500">{app.developer}</div>
      </div>
      <span className={`text-xs px-2 py-1 rounded ${
        app.platform === 'ios' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
      }`}>
        {app.platform === 'ios' ? 'iOS' : 'Android'}
      </span>
    </a>
  );
};

// App Result Row
const AppResultRow: React.FC<{ app: AppStoreResult; compact?: boolean }> = ({ app, compact = false }) => {
  const similarityColor = getSimilarityBadgeColor(app.similarity);

  return (
    <a
      href={app.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 hover:bg-gray-50 transition-colors ${compact ? 'p-2' : 'p-3'}`}
    >
      {/* App Icon */}
      {app.icon ? (
        <img
          src={app.icon}
          alt={app.name}
          className={`rounded-xl flex-shrink-0 ${compact ? 'w-10 h-10' : 'w-12 h-12'}`}
        />
      ) : (
        <div className={`rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 ${compact ? 'w-10 h-10' : 'w-12 h-12'}`}>
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      {/* App Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium text-gray-900 truncate ${compact ? 'text-sm' : ''}`}>
            {app.name}
          </span>
          <span className={`px-1.5 py-0.5 text-[10px] rounded border ${similarityColor}`}>
            {app.similarity}%
          </span>
        </div>
        <div className={`text-gray-500 truncate ${compact ? 'text-xs' : 'text-sm'}`}>
          {app.developer}
          {app.category && !compact && ` • ${app.category}`}
        </div>
        {!compact && app.rating !== undefined && (
          <div className="flex items-center gap-1 text-xs mt-0.5">
            <span className="text-yellow-500">
              {'★'.repeat(Math.round(app.rating))}
              {'☆'.repeat(5 - Math.round(app.rating))}
            </span>
            <span className="text-gray-400">{app.rating.toFixed(1)}</span>
            {app.ratingCount && (
              <span className="text-gray-400">({app.ratingCount.toLocaleString()})</span>
            )}
          </div>
        )}
      </div>

      {/* Price & Platform */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded ${
          app.platform === 'ios' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
        }`}>
          {app.platform === 'ios' ? 'iOS' : 'Android'}
        </span>
        {!compact && app.price && (
          <span className="text-xs text-gray-500">{app.price}</span>
        )}
      </div>
    </a>
  );
};
