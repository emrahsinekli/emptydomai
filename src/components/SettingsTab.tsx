import React, { useState, useEffect } from 'react';
import type { APIKeys } from '../types';
import {
  getAPIKeys,
  saveAPIKeys,
  validateAPIKeyFormat,
} from '../services/storage';

interface SettingsTabProps {
  onLogout: () => void;
  user?: {
    email: string;
    displayName: string | null;
    photoURL: string | null;
    plan: string;
  } | null;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onLogout, user }) => {
  const [apiKeys, setApiKeys] = useState<APIKeys>({});
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Load API keys on mount
  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    const keys = await getAPIKeys();
    setApiKeys(keys);
  };

  const handleSaveAPIKey = async (provider: keyof APIKeys, value: string) => {
    if (value && !validateAPIKeyFormat(provider, value)) {
      setSaveMessage({
        type: 'error',
        text: `Invalid ${provider} API key format`,
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveAPIKeys({ [provider]: value || undefined });
      setApiKeys((prev) => ({ ...prev, [provider]: value || undefined }));
      setSaveMessage({ type: 'success', text: 'API key saved' });
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save API key' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* User Profile */}
      {user && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-600 font-medium">
                  {(user.displayName || user.email)?.[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {user.displayName || 'User'}
              </p>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </div>
            <span className="chip text-xs">
              {user.plan === 'free' ? 'Free' : 'Pro'}
            </span>
          </div>
        </div>
      )}

      {/* API Keys Section */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900 mb-3">API Keys</h3>

        <div className="space-y-4">
          {/* Privacy notice */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
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
            Your API keys are stored locally and never sent to our servers.
          </div>

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
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showOpenAI ? (
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
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
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
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <button
                onClick={() => handleSaveAPIKey('openai', apiKeys.openai || '')}
                disabled={isSaving}
                className="btn-primary px-3"
              >
                Save
              </button>
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

          {/* Save message */}
          {saveMessage && (
            <div
              className={`p-2 rounded text-sm ${
                saveMessage.type === 'success'
                  ? 'bg-green-50 text-green-600'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {saveMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* About Section */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium text-gray-900 mb-3">About</h3>

        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>EmptyDomai</strong> v1.0.0
          </p>
          <p>AI-powered domain name generator</p>
          <p className="text-xs text-gray-400">
            Generate smart domain names, check availability in real-time, and save
            your favorites.
          </p>
        </div>
      </div>

      {/* Logout Button */}
      <div className="p-4">
        <button
          onClick={onLogout}
          className="w-full btn-secondary flex items-center justify-center gap-2 text-red-600 hover:bg-red-50"
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
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
            />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
};
