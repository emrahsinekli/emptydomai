import { useState, useEffect, useCallback, useRef } from 'react';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  });
  const planPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  // Listen for plan changes in storage (real-time sync after webhook updates Firestore)
  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes['emptydomai_user_plan']) {
        const newPlan = changes['emptydomai_user_plan'].newValue;
        if (newPlan && state.user) {
          setState(prev => prev.user ? {
            ...prev,
            user: { ...prev.user, plan: newPlan },
          } : prev);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [state.user]);

  // Start polling for plan updates (used after checkout)
  const startPlanPolling = useCallback(() => {
    if (planPollRef.current) return;
    let attempts = 0;
    planPollRef.current = setInterval(async () => {
      attempts++;
      // Poll for up to 5 minutes (every 10 seconds = 30 attempts)
      if (attempts > 30) {
        if (planPollRef.current) clearInterval(planPollRef.current);
        planPollRef.current = null;
        return;
      }
      // Re-fetch user data from background (which checks Firestore)
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_USER' });
        if (response.success && response.data?.plan === 'lifetime') {
          setState({ user: response.data, isLoading: false, error: null });
          if (planPollRef.current) clearInterval(planPollRef.current);
          planPollRef.current = null;
        }
      } catch { /* ignore */ }
    }, 10000);
  }, []);

  const stopPlanPolling = useCallback(() => {
    if (planPollRef.current) {
      clearInterval(planPollRef.current);
      planPollRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPlanPolling();
  }, [stopPlanPolling]);

  const loadUser = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await chrome.runtime.sendMessage({
        type: 'GET_USER',
      });

      if (response.success) {
        setState({
          user: response.data,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          user: null,
          isLoading: false,
          error: response.error || 'Failed to load user',
        });
      }
    } catch (error) {
      setState({
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const login = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await chrome.runtime.sendMessage({
        type: 'LOGIN',
      });

      if (response.success) {
        setState({
          user: response.data,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Login failed',
        }));
        return false;
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await chrome.runtime.sendMessage({
        type: 'LOGOUT',
      });

      if (response.success) {
        setState({
          user: null,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Logout failed',
        }));
        return false;
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      }));
      return false;
    }
  }, []);

  return {
    user: state.user,
    isLoading: state.isLoading,
    error: state.error,
    isAuthenticated: !!state.user,
    login,
    logout,
    refresh: loadUser,
    startPlanPolling,
    stopPlanPolling,
  };
}
