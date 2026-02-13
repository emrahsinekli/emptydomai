import React, { useState, useEffect, useRef } from 'react';
import { useFavorites } from '../hooks/useFavorites';
import { getRegistrarLinks } from '../types';
import { fetchWhoisInfo, type WhoisInfo, getDomainDropStatus } from '../services/whois';
import { getCachedDomainPricing, formatPrice, type PricingResult } from '../services/pricing';

interface FavoriteWithWhois {
  id: string;
  fullDomain: string;
  domain: string;
  tld: string;
  createdAt: Date;
  whois?: WhoisInfo;
  isLoadingWhois?: boolean;
  pricing?: PricingResult;
  isLoadingPricing?: boolean;
}

interface FavoritesTabProps {
  onUpgrade?: (reason?: string) => void;
}

export const FavoritesTab: React.FC<FavoritesTabProps> = ({ onUpgrade: _onUpgrade }) => {
  const { favorites, isLoading, error, removeFavorite, refresh } = useFavorites();
  const [favoritesWithWhois, setFavoritesWithWhois] = useState<FavoriteWithWhois[]>([]);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const hasAutoChecked = useRef(false);

  // Sync favorites with local state (preserve existing whois and pricing data)
  useEffect(() => {
    setFavoritesWithWhois(prev => {
      // Create maps of existing data
      const existingWhoisMap = new Map(prev.map(f => [f.fullDomain, f.whois]));
      const existingPricingMap = new Map(prev.map(f => [f.fullDomain, f.pricing]));

      return favorites.map(f => ({
        ...f,
        whois: existingWhoisMap.get(f.fullDomain),
        isLoadingWhois: false,
        pricing: existingPricingMap.get(f.fullDomain),
        isLoadingPricing: false,
      }));
    });
  }, [favorites]);

  const handleCopy = async (domain: string) => {
    await navigator.clipboard.writeText(domain);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  // Check WHOIS for a single domain
  const checkWhois = async (fullDomain: string) => {
    setFavoritesWithWhois(prev => prev.map(f =>
      f.fullDomain === fullDomain ? { ...f, isLoadingWhois: true } : f
    ));

    try {
      const whois = await fetchWhoisInfo(fullDomain);
      setFavoritesWithWhois(prev => prev.map(f =>
        f.fullDomain === fullDomain ? { ...f, whois, isLoadingWhois: false } : f
      ));
    } catch (error) {
      console.error('Failed to fetch WHOIS:', error);
      setFavoritesWithWhois(prev => prev.map(f =>
        f.fullDomain === fullDomain ? { ...f, isLoadingWhois: false } : f
      ));
    }
  };

  // Fetch pricing for a single domain
  const fetchPricing = async (domain: string, tld: string, fullDomain: string) => {
    setFavoritesWithWhois(prev => prev.map(f =>
      f.fullDomain === fullDomain ? { ...f, isLoadingPricing: true } : f
    ));

    try {
      const pricing = await getCachedDomainPricing(domain, tld);
      setFavoritesWithWhois(prev => prev.map(f =>
        f.fullDomain === fullDomain ? { ...f, pricing, isLoadingPricing: false } : f
      ));
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
      setFavoritesWithWhois(prev => prev.map(f =>
        f.fullDomain === fullDomain ? { ...f, isLoadingPricing: false } : f
      ));
    }
  };

  // Fetch pricing for available domains
  useEffect(() => {
    const fetchAllPricing = async () => {
      for (const favorite of favoritesWithWhois) {
        const isAvailable = !favorite.whois || favorite.whois?.error === 'Domain not registered';
        if (isAvailable && !favorite.pricing && !favorite.isLoadingPricing) {
          await fetchPricing(favorite.domain, favorite.tld, favorite.fullDomain);
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    };

    if (favoritesWithWhois.length > 0) {
      fetchAllPricing();
    }
  }, [favoritesWithWhois.length]);

  // Check all favorites (accepts optional list to check)
  const checkAllExpiry = async (domainsToCheck?: string[]) => {
    setIsCheckingAll(true);
    const domains = domainsToCheck || favoritesWithWhois.filter(f => !f.whois).map(f => f.fullDomain);

    for (const fullDomain of domains) {
      await checkWhois(fullDomain);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    setIsCheckingAll(false);
  };

  // Auto-check expiry when favorites tab opens (only once per session)
  useEffect(() => {
    if (!hasAutoChecked.current && favorites.length > 0 && !isLoading) {
      hasAutoChecked.current = true;
      // Check all domains immediately using favorites list
      const allDomains = favorites.map(f => f.fullDomain);
      checkAllExpiry(allDomains);
    }
  }, [favorites, isLoading]);

  // Get expiring soon domains
  const expiringSoon = favoritesWithWhois.filter(f =>
    f.whois?.isExpiringSoon || (f.whois?.daysUntilExpiry !== undefined && f.whois.daysUntilExpiry <= 90)
  );

  // Get available domains (previously taken but now available)
  const nowAvailable = favoritesWithWhois.filter(f =>
    f.whois?.error === 'Domain not registered'
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
          <button
            onClick={() => refresh()}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
          className="w-12 h-12 mb-3 text-gray-300"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
        <p className="text-sm">No favorites yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Star domains to save them here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => checkAllExpiry()}
            disabled={isCheckingAll}
            className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50 flex items-center gap-1"
            title="Check expiry dates for all favorites"
          >
            {isCheckingAll ? (
              <>
                <span className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Check Expiry
              </>
            )}
          </button>
          <button
            onClick={() => refresh()}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts Section */}
      {(expiringSoon.length > 0 || nowAvailable.length > 0) && (
        <div className="px-4 py-2 space-y-2 bg-gray-50 border-b border-gray-200">
          {nowAvailable.length > 0 && (
            <div className="p-2 bg-green-100 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 text-xs font-medium mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {nowAvailable.length} domain{nowAvailable.length > 1 ? 's' : ''} now available!
              </div>
              <div className="text-[10px] text-green-600">
                {nowAvailable.map(f => f.fullDomain).join(', ')}
              </div>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="p-2 bg-yellow-100 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-700 text-xs font-medium mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {expiringSoon.length} domain{expiringSoon.length > 1 ? 's' : ''} expiring soon
              </div>
              <div className="text-[10px] text-yellow-600">
                {expiringSoon.map(f => `${f.fullDomain} (${f.whois?.daysUntilExpiry}d)`).join(', ')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Favorites List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {favoritesWithWhois.map((favorite) => {
          const registrarLinks = getRegistrarLinks(favorite.fullDomain);
          const dropStatus = favorite.whois ? getDomainDropStatus(favorite.whois) : null;

          return (
            <div
              key={favorite.id}
              className={`card hover:border-primary-300 transition-colors ${
                dropStatus?.status === 'available' ? 'border-green-300 bg-green-50' :
                dropStatus?.status === 'expiring' ? 'border-yellow-300 bg-yellow-50' :
                dropStatus?.status === 'dropping' ? 'border-red-300 bg-red-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Star icon */}
                  <span className="flex-shrink-0 text-yellow-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>

                  {/* Domain */}
                  <div className="min-w-0">
                    <span className="font-medium text-gray-900">
                      {favorite.domain}
                    </span>
                    <span className="text-primary-600">{favorite.tld}</span>
                    {dropStatus && (
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                        dropStatus.status === 'available' ? 'bg-green-200 text-green-700' :
                        dropStatus.status === 'expiring' ? 'bg-yellow-200 text-yellow-700' :
                        dropStatus.status === 'dropping' ? 'bg-red-200 text-red-700' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {dropStatus.status === 'available' ? 'AVAILABLE!' :
                         dropStatus.status === 'expiring' ? `${favorite.whois?.daysUntilExpiry}d left` :
                         dropStatus.status === 'dropping' ? 'DROPPING' : 'Active'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Check WHOIS */}
                  {!favorite.whois && (
                    <button
                      onClick={() => checkWhois(favorite.fullDomain)}
                      disabled={favorite.isLoadingWhois}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-500 transition-colors"
                      title="Check WHOIS"
                    >
                      {favorite.isLoadingWhois ? (
                        <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin block" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Copy */}
                  <button
                    onClick={() => handleCopy(favorite.fullDomain)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    title="Copy domain"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                      />
                    </svg>
                  </button>

                  {/* Remove */}
                  <button
                    onClick={() => removeFavorite(favorite.fullDomain)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Remove from favorites"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* WHOIS Info */}
              {favorite.whois && !favorite.whois.error && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-500 grid grid-cols-2 gap-1">
                  {favorite.whois.expiryDate && (
                    <div>
                      <span className="text-gray-400">Expires:</span>{' '}
                      <span className={favorite.whois.isExpiringSoon ? 'text-red-600 font-medium' : ''}>
                        {favorite.whois.expiryDate}
                      </span>
                    </div>
                  )}
                  {favorite.whois.registrar && (
                    <div className="truncate">
                      <span className="text-gray-400">Registrar:</span>{' '}
                      {favorite.whois.registrar}
                    </div>
                  )}
                  {favorite.whois.age !== undefined && (
                    <div>
                      <span className="text-gray-400">Age:</span>{' '}
                      {favorite.whois.age} years
                    </div>
                  )}
                  {favorite.whois.daysUntilExpiry !== undefined && (
                    <div>
                      <span className="text-gray-400">Days left:</span>{' '}
                      <span className={favorite.whois.daysUntilExpiry <= 30 ? 'text-red-600 font-medium' : ''}>
                        {favorite.whois.daysUntilExpiry}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Available Notice */}
              {favorite.whois?.error === 'Domain not registered' && (
                <div className="mt-2 p-2 bg-green-100 rounded-lg text-xs text-green-700 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  This domain is now available for registration!
                </div>
              )}

              {/* Dynamic Pricing & Registrar Links - ONLY show for available domains or unknown status */}
              {(dropStatus?.status === 'available' || !favorite.whois || favorite.whois?.error === 'Domain not registered') && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  {favorite.isLoadingPricing ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                      Loading prices...
                    </div>
                  ) : favorite.pricing && favorite.pricing.registrars.length > 0 ? (
                    <div className="space-y-1.5">
                      {/* Cheapest price */}
                      {favorite.pricing.cheapest && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-green-600 font-medium">Best:</span>
                          <a
                            href={favorite.pricing.cheapest.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-green-700 hover:text-green-800"
                          >
                            {formatPrice(favorite.pricing.cheapest.price)}
                          </a>
                          <span className="text-[10px] text-gray-500">
                            @ {favorite.pricing.cheapest.registrar}
                            {favorite.pricing.cheapest.isLocal && (
                              <span className="ml-1 px-1 py-0.5 bg-blue-100 text-blue-600 rounded text-[8px]">LOCAL</span>
                            )}
                          </span>
                        </div>
                      )}
                      {/* Top 4 registrars */}
                      <div className="flex flex-wrap gap-1">
                        {favorite.pricing.registrars.slice(0, 4).map((reg, index) => (
                          <a
                            key={reg.registrar}
                            href={reg.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
                              index === 0
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : reg.isLocal
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={reg.registrar}
                          >
                            {formatPrice(reg.price)}
                            {reg.isLocal && index !== 0 && (
                              <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Fallback to static links
                    <div className="flex flex-wrap gap-1">
                      {registrarLinks.slice(0, 4).map((link) => (
                        <a
                          key={link.name}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-primary-100 hover:text-primary-700 transition-colors"
                        >
                          {link.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Date */}
              <p className="text-xs text-gray-400 mt-2">
                Added {formatDate(favorite.createdAt)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
