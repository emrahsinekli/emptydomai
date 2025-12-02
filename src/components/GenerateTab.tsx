import React, { useState, useEffect } from 'react';
import type { SearchParams, DomainStyle, DomainLength } from '../types';
import {
  AVAILABLE_TLDS,
  DOMAIN_STYLE_OPTIONS,
  LANGUAGE_OPTIONS,
  DEFAULT_USER_SETTINGS,
} from '../types';
import { DomainCard } from './DomainCard';
import { useDomainGenerator } from '../hooks/useDomainGenerator';
import { useFavorites } from '../hooks/useFavorites';

export const GenerateTab: React.FC = () => {
  const [keywords, setKeywords] = useState('');
  const [selectedTlds, setSelectedTlds] = useState<string[]>(
    DEFAULT_USER_SETTINGS.defaultTlds
  );
  const [style, setStyle] = useState<DomainStyle>(
    DEFAULT_USER_SETTINGS.defaultStyle
  );
  const [length, setLength] = useState<DomainLength>(
    DEFAULT_USER_SETTINGS.defaultLength
  );
  const [language, setLanguage] = useState(
    DEFAULT_USER_SETTINGS.defaultLanguage
  );
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    results,
    isGenerating,
    isChecking,
    error,
    progress,
    generateDomains,
    isLoading,
  } = useDomainGenerator();

  const { isFavorite, toggleFavorite } = useFavorites();

  // Check for pending context generation (from context menu)
  useEffect(() => {
    chrome.storage.local.get(['pendingContextGeneration'], (result) => {
      if (result.pendingContextGeneration) {
        const { text, timestamp } = result.pendingContextGeneration;

        // Only use if less than 5 minutes old
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setKeywords(text);
          chrome.action.setBadgeText({ text: '' });
        }

        // Clear pending generation
        chrome.storage.local.remove(['pendingContextGeneration']);
      }
    });
  }, []);

  const handleGenerate = async () => {
    if (!keywords.trim()) return;

    const params: SearchParams = {
      inputType: 'keyword',
      inputText: keywords.trim(),
      tlds: selectedTlds,
      style,
      length,
      language,
      maxSuggestions: 20,
    };

    await generateDomains(params);
  };

  const handleTldToggle = (tld: string) => {
    setSelectedTlds((prev) =>
      prev.includes(tld) ? prev.filter((t) => t !== tld) : [...prev, tld]
    );
  };

  const availableCount = results.filter((r) => r.status === 'available').length;
  const checkedCount = results.filter(
    (r) => r.status === 'available' || r.status === 'taken'
  ).length;

  return (
    <div className="flex flex-col h-full">
      {/* Input Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="space-y-3">
          {/* Keywords input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keywords / Brand Ideas
            </label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., AI image generation, music streaming, SaaS analytics..."
              className="input-field resize-none"
              rows={2}
            />
          </div>

          {/* TLD Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              TLDs
            </label>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_TLDS.slice(0, 8).map((tld) => (
                <button
                  key={tld}
                  onClick={() => handleTldToggle(tld)}
                  className={`chip cursor-pointer ${
                    selectedTlds.includes(tld) ? 'selected' : ''
                  }`}
                >
                  {tld}
                </button>
              ))}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="chip cursor-pointer text-primary-600"
              >
                {showAdvanced ? 'Less' : 'More...'}
              </button>
            </div>

            {/* Additional TLDs */}
            {showAdvanced && (
              <div className="flex flex-wrap gap-1 mt-2">
                {AVAILABLE_TLDS.slice(8).map((tld) => (
                  <button
                    key={tld}
                    onClick={() => handleTldToggle(tld)}
                    className={`chip cursor-pointer ${
                      selectedTlds.includes(tld) ? 'selected' : ''
                    }`}
                  >
                    {tld}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-3 pt-2 border-t border-gray-100">
              {/* Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Style
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value as DomainStyle)}
                  className="input-field"
                >
                  {DOMAIN_STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Length */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Length
                </label>
                <div className="flex gap-2">
                  {(['short', 'medium', 'long'] as DomainLength[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLength(l)}
                      className={`chip cursor-pointer flex-1 justify-center ${
                        length === l ? 'selected' : ''
                      }`}
                    >
                      {l.charAt(0).toUpperCase() + l.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="input-field"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={
              !keywords.trim() || selectedTlds.length === 0 || isLoading
            }
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : isChecking ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Checking ({progress.current}/{progress.total})...
              </>
            ) : (
              <>
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
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                  />
                </svg>
                Generate Domains
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Results Section */}
      {results.length > 0 && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Results Header */}
          <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {isChecking ? (
                <span>
                  Checking... {progress.current}/{progress.total}
                </span>
              ) : (
                <span>
                  {availableCount} available / {checkedCount} checked
                </span>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyAvailable}
                onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-600">Show only available</span>
            </label>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {results.map((result, index) => (
              <DomainCard
                key={`${result.fullDomain}-${index}`}
                result={result}
                isFavorite={isFavorite(result.fullDomain)}
                onToggleFavorite={() =>
                  toggleFavorite(result.domain, result.tld)
                }
                showOnlyAvailable={showOnlyAvailable}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && !isLoading && !error && (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-500">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
              className="w-12 h-12 mx-auto mb-3 text-gray-300"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
              />
            </svg>
            <p className="text-sm">
              Enter keywords and click Generate to find available domains
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
