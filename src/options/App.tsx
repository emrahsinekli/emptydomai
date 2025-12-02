import React, { useState, useEffect } from 'react';
import type { APIKeys, UserSettings } from '../types';
import {
  getAPIKeys,
  saveAPIKeys,
  getUserSettings,
  saveUserSettings,
  validateAPIKeyFormat,
} from '../services/storage';
import {
  AVAILABLE_TLDS,
  DOMAIN_STYLE_OPTIONS,
  LANGUAGE_OPTIONS,
  DEFAULT_USER_SETTINGS,
} from '../types';
import type { DomainStyle, DomainLength } from '../types';

export const App: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKeys>({});
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const keys = await getAPIKeys();
    setApiKeys(keys);

    const userSettings = await getUserSettings();
    if (userSettings) {
      setSettings(userSettings);
    }
  };

  const handleSaveAPIKey = async () => {
    if (apiKeys.openai && !validateAPIKeyFormat('openai', apiKeys.openai)) {
      setMessage({ type: 'error', text: 'Invalid OpenAI API key format' });
      return;
    }

    setIsSaving(true);
    try {
      await saveAPIKeys(apiKeys);
      setMessage({ type: 'success', text: 'API key saved successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save API key' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await saveUserSettings(settings);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleTldToggle = (tld: string) => {
    setSettings((prev) => ({
      ...prev,
      defaultTlds: prev.defaultTlds.includes(tld)
        ? prev.defaultTlds.filter((t) => t !== tld)
        : [...prev.defaultTlds, tld],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6 text-white"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">EmptyDomai Settings</h1>
              <p className="text-gray-600">Configure your AI domain generator</p>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* API Keys Section */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">API Keys</h2>

          {/* Privacy notice */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 inline mr-1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            Your API keys are stored securely in your browser's local storage and are
            never sent to our servers.
          </div>

          <div className="space-y-4">
            {/* OpenAI API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OpenAI API Key
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showOpenAI ? 'text' : 'password'}
                    value={apiKeys.openai || ''}
                    onChange={(e) =>
                      setApiKeys((prev) => ({ ...prev, openai: e.target.value }))
                    }
                    placeholder="sk-..."
                    className="input-field pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenAI(!showOpenAI)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showOpenAI ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Get your API key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline"
                >
                  OpenAI Dashboard
                </a>
              </p>
            </div>

            <button
              onClick={handleSaveAPIKey}
              disabled={isSaving}
              className="btn-primary"
            >
              {isSaving ? 'Saving...' : 'Save API Key'}
            </button>
          </div>
        </div>

        {/* Default Settings Section */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Default Settings
          </h2>

          <div className="space-y-6">
            {/* Default TLDs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default TLDs
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TLDS.map((tld) => (
                  <button
                    key={tld}
                    onClick={() => handleTldToggle(tld)}
                    className={`chip cursor-pointer ${
                      settings.defaultTlds.includes(tld) ? 'selected' : ''
                    }`}
                  >
                    {tld}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Style
              </label>
              <select
                value={settings.defaultStyle}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    defaultStyle: e.target.value as DomainStyle,
                  }))
                }
                className="input-field"
              >
                {DOMAIN_STYLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Default Length */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Length
              </label>
              <div className="flex gap-2">
                {(['short', 'medium', 'long'] as DomainLength[]).map((l) => (
                  <button
                    key={l}
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, defaultLength: l }))
                    }
                    className={`chip cursor-pointer flex-1 justify-center ${
                      settings.defaultLength === l ? 'selected' : ''
                    }`}
                  >
                    {l.charAt(0).toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Language
              </label>
              <select
                value={settings.defaultLanguage}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    defaultLanguage: e.target.value,
                  }))
                }
                className="input-field"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Max Suggestions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Suggestions per Search
              </label>
              <input
                type="number"
                min={5}
                max={50}
                value={settings.maxSuggestions}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    maxSuggestions: Math.min(50, Math.max(5, parseInt(e.target.value) || 20)),
                  }))
                }
                className="input-field w-32"
              />
              <p className="text-xs text-gray-500 mt-1">
                Number of domain suggestions to generate (5-50)
              </p>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="btn-primary"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* About Section */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">About</h2>

          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>EmptyDomai</strong> v1.0.0
            </p>
            <p>AI-powered domain name generator Chrome extension.</p>
            <p className="text-xs text-gray-400 mt-4">
              Generate smart domain names with AI, check availability in real-time,
              and save your favorites. Your API keys are stored locally and never
              sent to our servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
