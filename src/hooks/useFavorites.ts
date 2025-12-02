import { useState, useEffect, useCallback } from 'react';
import type { Favorite } from '../types';

interface FavoritesState {
  favorites: Favorite[];
  isLoading: boolean;
  error: string | null;
  favoriteIds: Set<string>;
}

export function useFavorites() {
  const [state, setState] = useState<FavoritesState>({
    favorites: [],
    isLoading: true,
    error: null,
    favoriteIds: new Set(),
  });

  const loadFavorites = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await chrome.runtime.sendMessage({
        type: 'GET_FAVORITES',
      });

      if (response.success) {
        const favorites = response.data as Favorite[];
        const favoriteIds = new Set(favorites.map((f) => f.fullDomain));

        setState({
          favorites,
          isLoading: false,
          error: null,
          favoriteIds,
        });
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Failed to load favorites',
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const addFavorite = useCallback(async (domain: string, tld: string, searchId?: string) => {
    const fullDomain = `${domain}${tld}`;

    // Optimistic update
    setState((prev) => ({
      ...prev,
      favoriteIds: new Set([...prev.favoriteIds, fullDomain]),
    }));

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_FAVORITE',
        payload: { domain, tld, searchId },
      });

      if (!response.success) {
        // Revert on failure
        setState((prev) => {
          const newIds = new Set(prev.favoriteIds);
          newIds.delete(fullDomain);
          return { ...prev, favoriteIds: newIds };
        });
        return false;
      }

      // Reload to get full favorite data
      await loadFavorites();
      return true;
    } catch (error) {
      // Revert on error
      setState((prev) => {
        const newIds = new Set(prev.favoriteIds);
        newIds.delete(fullDomain);
        return { ...prev, favoriteIds: newIds };
      });
      return false;
    }
  }, [loadFavorites]);

  const removeFavorite = useCallback(async (fullDomain: string) => {
    // Optimistic update
    setState((prev) => {
      const newIds = new Set(prev.favoriteIds);
      newIds.delete(fullDomain);
      return {
        ...prev,
        favorites: prev.favorites.filter((f) => f.fullDomain !== fullDomain),
        favoriteIds: newIds,
      };
    });

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'REMOVE_FAVORITE',
        payload: { fullDomain },
      });

      if (!response.success) {
        // Reload on failure
        await loadFavorites();
        return false;
      }

      return true;
    } catch {
      // Reload on error
      await loadFavorites();
      return false;
    }
  }, [loadFavorites]);

  const isFavorite = useCallback((fullDomain: string) => {
    return state.favoriteIds.has(fullDomain);
  }, [state.favoriteIds]);

  const toggleFavorite = useCallback(async (domain: string, tld: string, searchId?: string) => {
    const fullDomain = `${domain}${tld}`;

    if (isFavorite(fullDomain)) {
      return removeFavorite(fullDomain);
    } else {
      return addFavorite(domain, tld, searchId);
    }
  }, [isFavorite, addFavorite, removeFavorite]);

  return {
    favorites: state.favorites,
    isLoading: state.isLoading,
    error: state.error,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    refresh: loadFavorites,
  };
}
