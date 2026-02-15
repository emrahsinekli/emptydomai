import React, { useState, useEffect } from 'react';
import type { APIKeys, AIProvider, ImageAIProvider } from '../types';
import { getModelsByProvider } from '../types';
import { useAPIKeys } from '../hooks/useAPIKeys';
import { useDefaultProviders } from '../hooks/useDefaultProviders';

interface SettingsTabProps {
  onLogout: () => void;
  onLogin: () => Promise<boolean>;
  isAuthLoading?: boolean;
  user?: {
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
    plan: string;
  } | null;
  onUpgrade?: (reason?: string) => void;
}

interface ProviderConfig {
  key: keyof APIKeys;
  name: string;
  placeholder: string;
  docsUrl: string;
  docsLabel: string;
}

// Text AI providers (for domain generation)
const TEXT_PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    key: 'openai',
    name: 'OpenAI',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    docsLabel: 'OpenAI Dashboard',
  },
  {
    key: 'anthropic',
    name: 'Anthropic (Claude)',
    placeholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    docsLabel: 'Anthropic Console',
  },
  {
    key: 'gemini',
    name: 'Google Gemini',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    docsLabel: 'Google AI Studio',
  },
  {
    key: 'groq',
    name: 'Groq',
    placeholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    docsLabel: 'Groq Console',
  },
];

// Image AI providers (for logo generation)
const IMAGE_PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    key: 'stability',
    name: 'Stability AI',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.stability.ai/account/keys',
    docsLabel: 'Stability AI',
  },
  {
    key: 'replicate',
    name: 'Replicate',
    placeholder: 'r8_...',
    docsUrl: 'https://replicate.com/account/api-tokens',
    docsLabel: 'Replicate Dashboard',
  },
  {
    key: 'leonardo',
    name: 'Leonardo AI',
    placeholder: '...',
    docsUrl: 'https://leonardo.ai/settings/api-keys',
    docsLabel: 'Leonardo AI',
  },
  {
    key: 'fal',
    name: 'Fal.ai',
    placeholder: 'fal_...',
    docsUrl: 'https://fal.ai/dashboard/keys',
    docsLabel: 'Fal.ai Dashboard',
  },
  {
    key: 'together',
    name: 'Together AI',
    placeholder: '...',
    docsUrl: 'https://api.together.xyz/settings/api-keys',
    docsLabel: 'Together AI',
  },
];

export const SettingsTab: React.FC<SettingsTabProps> = ({ onLogout, onLogin, isAuthLoading, user, onUpgrade }) => {

  // Use shared API keys hook
  const { apiKeys, saveAPIKey, configuredProviders } = useAPIKeys();

  // Use default providers hook
  const {
    domainProvider,
    domainModel,
    logoProvider,
    setDomainProvider,
    setDomainModel,
    setLogoProvider,
  } = useDefaultProviders();

  // Local state for editing (to show unsaved values)
  const [editingKeys, setEditingKeys] = useState<APIKeys>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    provider?: string;
  } | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    textAI: true,
    imageAI: false,
    defaults: true,
  });

  // Sync editing keys with actual keys
  useEffect(() => {
    setEditingKeys(apiKeys);
  }, [apiKeys]);

  const toggleSection = (section: 'textAI' | 'imageAI' | 'defaults') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSaveAPIKey = async (provider: keyof APIKeys) => {
    const value = editingKeys[provider] || '';

    setIsSaving(provider);
    try {
      const result = await saveAPIKey(provider, value);
      if (result.success) {
        setSaveMessage({ type: 'success', text: 'API key saved', provider });
      } else {
        setSaveMessage({ type: 'error', text: result.error || 'Failed to save', provider });
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save API key', provider });
    } finally {
      setIsSaving(null);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const getConfiguredCount = () => {
    return configuredProviders.length;
  };

  // Get available models for selected domain provider
  const availableModels = getModelsByProvider(domainProvider);

  // Check if selected logo provider has API key configured
  const hasLogoProviderKey = () => {
    if (logoProvider === 'openai') return !!apiKeys.openai;
    if (logoProvider === 'gemini') return !!apiKeys.gemini;
    if (logoProvider === 'stability') return !!apiKeys.stability;
    if (logoProvider === 'replicate') return !!apiKeys.replicate;
    if (logoProvider === 'leonardo') return !!apiKeys.leonardo;
    if (logoProvider === 'fal') return !!apiKeys.fal;
    if (logoProvider === 'together') return !!apiKeys.together;
    return false;
  };

  // Render API key input section
  const renderAPIKeyInput = (config: ProviderConfig) => (
    <div key={config.key}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {config.name}
        {apiKeys[config.key] && (
          <span className="ml-2 text-xs text-green-600">✓ Configured</span>
        )}
      </label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type={showKeys[config.key] ? 'text' : 'password'}
            value={editingKeys[config.key] || ''}
            onChange={(e) =>
              setEditingKeys((prev) => ({ ...prev, [config.key]: e.target.value }))
            }
            placeholder={config.placeholder}
            className="input-field pr-10"
          />
          <button
            type="button"
            onClick={() => toggleShowKey(config.key)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showKeys[config.key] ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
        <button
          onClick={() => handleSaveAPIKey(config.key)}
          disabled={isSaving === config.key}
          className="btn-primary px-3"
        >
          {isSaving === config.key ? '...' : 'Save'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Get your API key from{' '}
        <a href={config.docsUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
          {config.docsLabel}
        </a>
      </p>
      {saveMessage && saveMessage.provider === config.key && (
        <div className={`mt-1 p-2 rounded text-sm ${saveMessage.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {saveMessage.text}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* User Profile */}
      {user ? (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-600 font-medium">
                  {(user.displayName || user.email)?.[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{user.displayName || 'User'}</p>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </div>
            <span className="chip text-xs">
              {user.plan === 'lifetime' ? 'Lifetime' : 'Free'}
            </span>
          </div>
          {/* Upgrade Button for Free Users */}
          {user.plan !== 'lifetime' && (
            <button
              onClick={() => onUpgrade?.()}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg text-sm font-medium hover:from-primary-700 hover:to-primary-800 transition-all shadow-md hover:shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
              Upgrade to Lifetime
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">Not signed in</p>
              <p className="text-xs text-gray-500">Sign in to sync your data and unlock features</p>
            </div>
            <button
              onClick={onLogin}
              disabled={isAuthLoading}
              className="btn-primary px-3 py-1.5 text-sm"
            >
              {isAuthLoading ? '...' : 'Sign In'}
            </button>
          </div>
        </div>
      )}

      {/* AI Settings - Locked for Free Users */}
      {user?.plan !== 'lifetime' ? (
        <div className="p-4 border-b border-gray-200">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <h3 className="font-medium text-gray-900">AI Features</h3>
              <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">LIFETIME</span>
            </div>
            <p className="text-xs text-gray-500 mb-1">Upgrade to use your own AI API keys:</p>
            <ul className="text-xs text-gray-500 space-y-0.5 mb-3 ml-3">
              <li>AI domain name generation (OpenAI, Claude, Gemini, Groq)</li>
              <li>AI logo generation (DALL-E, Stable Diffusion, Flux)</li>
            </ul>
            <button
              onClick={() => onUpgrade?.('Upgrade to use AI-powered domain generation and logo creation with your own API keys.')}
              className="w-full py-2 text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-sm"
            >
              Unlock AI Features — $29
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Default AI Providers Section */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => toggleSection('defaults')}
              className="w-full flex items-center justify-between mb-3"
            >
              <h3 className="font-medium text-gray-900">Default AI Providers</h3>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`w-4 h-4 transition-transform ${expandedSections.defaults ? 'rotate-180' : ''}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {expandedSections.defaults && (
              <div className="space-y-4">
                {/* Domain Generation Provider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain Generation AI
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Used to generate domain name suggestions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={domainProvider}
                      onChange={(e) => setDomainProvider(e.target.value as AIProvider)}
                      className="input-field text-sm"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="gemini">Gemini</option>
                      <option value="groq">Groq</option>
                    </select>
                    <select
                      value={domainModel}
                      onChange={(e) => setDomainModel(e.target.value)}
                      className="input-field text-sm"
                    >
                      {availableModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!apiKeys[domainProvider] && (
                    <p className="text-xs text-amber-600 mt-1">
                      API key not configured for {domainProvider}
                    </p>
                  )}
                </div>

                {/* Logo Generation Provider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo Generation AI
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Used to generate logo images</p>
                  <select
                    value={logoProvider}
                    onChange={(e) => setLogoProvider(e.target.value as ImageAIProvider)}
                    className="input-field text-sm"
                  >
                    <option value="openai">OpenAI DALL-E</option>
                    <option value="gemini">Google Imagen 3</option>
                    <option value="stability">Stability AI (Stable Diffusion)</option>
                    <option value="replicate">Replicate (Flux)</option>
                    <option value="leonardo">Leonardo AI</option>
                    <option value="fal">Fal.ai (Fast Flux)</option>
                    <option value="together">Together AI</option>
                  </select>
                  {!hasLogoProviderKey() && (
                    <p className="text-xs text-amber-600 mt-1">
                      API key not configured for {logoProvider === 'openai' ? 'OpenAI' : logoProvider}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Text AI API Keys Section */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => toggleSection('textAI')}
              className="w-full flex items-center justify-between mb-3"
            >
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900">Text AI Keys</h3>
                <span className="text-xs text-gray-500">
                  {getConfiguredCount()}/{TEXT_PROVIDER_CONFIGS.length}
                </span>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`w-4 h-4 transition-transform ${expandedSections.textAI ? 'rotate-180' : ''}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {expandedSections.textAI && (
              <div className="space-y-4">
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 inline mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Keys stored locally, never sent to servers.
                </div>
                {TEXT_PROVIDER_CONFIGS.map(renderAPIKeyInput)}
              </div>
            )}
          </div>

          {/* Image AI API Keys Section */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => toggleSection('imageAI')}
              className="w-full flex items-center justify-between mb-3"
            >
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900">Image AI Keys</h3>
                <span className="text-xs text-gray-500">(Logo Generation)</span>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`w-4 h-4 transition-transform ${expandedSections.imageAI ? 'rotate-180' : ''}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {expandedSections.imageAI && (
              <div className="space-y-4">
                <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-700">
                  Configure additional image AI providers. OpenAI DALL-E uses the same key as text AI.
                </div>
                {IMAGE_PROVIDER_CONFIGS.map(renderAPIKeyInput)}
              </div>
            )}
          </div>
        </>
      )}

      {/* About Section */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900 mb-3">About</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>EmptyDomai</strong> v1.3.0</p>
          <p>AI-powered domain name generator</p>
          <p className="text-xs text-gray-400">
            Generate smart domain names, check availability in real-time, and save your favorites.
          </p>
        </div>
      </div>

      {/* Logout Button - only show when signed in */}
      {user && (
        <div className="p-4">
          <button
            onClick={onLogout}
            className="w-full btn-secondary flex items-center justify-center gap-2 text-red-600 hover:bg-red-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
