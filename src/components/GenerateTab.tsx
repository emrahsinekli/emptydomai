import React, { useState, useEffect, useRef } from 'react';
import type {
  SearchParams,
  DomainStyle,
  DomainLength,
  AdvancedDomainSettings,
  IndustryNiche,
} from '../types';
import {
  GENERIC_TLDS,
  COUNTRY_TLDS,
  DOMAIN_STYLE_OPTIONS,
  LANGUAGE_OPTIONS,
  DEFAULT_USER_SETTINGS,
  INDUSTRY_OPTIONS,
  detectLanguage,
  COUNTRY_CONFIGS,
} from '../types';
import { DomainCard } from './DomainCard';
import { useDomainGenerator } from '../hooks/useDomainGenerator';
import { useFavorites } from '../hooks/useFavorites';
import { useAPIKeys } from '../hooks/useAPIKeys';
import { useDefaultProviders } from '../hooks/useDefaultProviders';
import { getRemainingBulkChecks, isProUser } from '../services/storage';

type InputMode = 'ai' | 'bulk';

interface GenerateTabProps {
  onUpgrade?: (reason?: string) => void;
}

export const GenerateTab: React.FC<GenerateTabProps> = ({ onUpgrade }) => {
  const [inputMode, setInputMode] = useState<InputMode>('ai');
  const [bulkInput, setBulkInput] = useState('');
  const [remainingBulkChecks, setRemainingBulkChecks] = useState<number>(30);
  const [isPro, setIsPro] = useState(false);
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
  const [showMoreTlds, setShowMoreTlds] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSettings, setShowSettings] = useState(true); // Hide settings after generate
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Use shared API keys hook for real-time sync
  const { apiKeys } = useAPIKeys();

  // Use default providers from settings
  const { domainProvider, domainModel } = useDefaultProviders();

  // Advanced domain settings
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedDomainSettings>({});

  // Track generated domains for retry
  const [generatedDomains, setGeneratedDomains] = useState<string[]>([]);

  // Industry selection
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryNiche>('general');

  // Detected language from input
  const [detectedLanguage, setDetectedLanguage] = useState<string>('english');
  const [suggestedTlds, setSuggestedTlds] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    results,
    isGenerating,
    isChecking,
    isAnalyzing,
    error,
    warning,
    progress,
    generateDomains,
    checkBulkDomains,
    fetchBrandAnalysis,
    dismissError,
    dismissWarning,
    isLoading,
  } = useDomainGenerator();

  // Load remaining bulk checks and pro status
  useEffect(() => {
    const loadLimits = async () => {
      const remaining = await getRemainingBulkChecks();
      setRemainingBulkChecks(remaining);
      const pro = await isProUser();
      setIsPro(pro);
    };
    loadLimits();
  }, [results]); // Refresh after results change

  const { isFavorite, toggleFavorite } = useFavorites();

  // Check if domain provider has API key
  const hasDomainProviderKey = apiKeys[domainProvider];

  // Detect language from keywords and suggest TLDs
  useEffect(() => {
    if (keywords.trim().length > 3) {
      const detected = detectLanguage(keywords);
      setDetectedLanguage(detected);

      // Get country config for detected language
      const countryConfig = COUNTRY_CONFIGS.find(c => c.language === detected);
      if (countryConfig && detected !== 'english') {
        // Suggest country-specific TLDs
        const newSuggestions = countryConfig.tlds.filter(tld => !selectedTlds.includes(tld));
        setSuggestedTlds(newSuggestions.slice(0, 3));
      } else {
        setSuggestedTlds([]);
      }
    } else {
      setDetectedLanguage('english');
      setSuggestedTlds([]);
    }
  }, [keywords, selectedTlds]);

  // Check for pending context generation
  useEffect(() => {
    chrome.storage.local.get(['pendingContextGeneration'], (result) => {
      if (result.pendingContextGeneration) {
        const { text, timestamp } = result.pendingContextGeneration;
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setKeywords(text);
          chrome.action.setBadgeText({ text: '' });
        }
        chrome.storage.local.remove(['pendingContextGeneration']);
      }
    });
  }, []);

  // Track generated domains from results and scroll to top
  useEffect(() => {
    if (results.length > 0) {
      const domains = results.map((r) => r.domain);
      setGeneratedDomains((prev) => [...new Set([...prev, ...domains])]);
      // Scroll to top when results change
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    }
  }, [results]);

  const handleGenerate = async (appendMode = false) => {
    if (!keywords.trim()) return;

    // Hide settings panel when generating to show more results
    setShowSettings(false);
    setShowAdvanced(false);

    const params: SearchParams = {
      inputType: 'keyword',
      inputText: keywords.trim(),
      tlds: selectedTlds,
      style,
      length,
      language,
      maxSuggestions: 20,
      provider: domainProvider,
      model: domainModel,
      advanced: Object.keys(advancedSettings).length > 0 ? advancedSettings : undefined,
      excludeDomains: appendMode ? generatedDomains : undefined,
      industry: selectedIndustry !== 'general' ? selectedIndustry : undefined,
    };

    // Pass appendMode to generateDomains - true means add to existing results
    await generateDomains(params, appendMode);
  };

  const handleBulkCheck = async () => {
    const raw = bulkInput.trim();
    if (!raw || selectedTlds.length === 0) return;

    const allKnownTlds = [...GENERIC_TLDS, ...COUNTRY_TLDS];

    // Parse input entries
    const entries = raw
      .split(/[,\n]+/)
      .map((d) => d.trim().toLowerCase().replace(/\s+/g, ''))
      .filter((d) => d.length > 0);

    // Build domain+tld pairs, detecting existing TLDs
    const pairs: Array<{ domain: string; tld: string }> = [];
    const seen = new Set<string>();

    for (const entry of entries) {
      // Check if entry already has a known TLD (match longest first)
      const matchedTld = allKnownTlds
        .filter(tld => entry.endsWith(tld))
        .sort((a, b) => b.length - a.length)[0];

      if (matchedTld) {
        // Domain already has a TLD - use it directly
        const domainPart = entry.substring(0, entry.length - matchedTld.length);
        if (domainPart.length > 0) {
          const key = `${domainPart}${matchedTld}`;
          if (!seen.has(key)) {
            seen.add(key);
            pairs.push({ domain: domainPart, tld: matchedTld });
          }
        }
      } else {
        // No TLD found - combine with all selected TLDs
        for (const tld of selectedTlds) {
          const key = `${entry}${tld}`;
          if (!seen.has(key)) {
            seen.add(key);
            pairs.push({ domain: entry, tld });
          }
        }
      }
    }

    if (pairs.length === 0) return;

    setShowSettings(false);
    setShowAdvanced(false);
    const result = await checkBulkDomains(pairs);
    if (result === 'limit_reached') {
      onUpgrade?.('You\'ve used all 30 free bulk checks for today. Upgrade to Lifetime for unlimited daily checks!');
    }
  };

  const handleAnalyzeBrands = async () => {
    if (results.length === 0) return;
    await fetchBrandAnalysis(keywords, domainProvider, domainModel);
  };

  const handleMore = () => {
    // Append mode: keep existing results and add new ones
    handleGenerate(true);
  };

  const handleTldToggle = (tld: string) => {
    setSelectedTlds((prev) =>
      prev.includes(tld) ? prev.filter((t) => t !== tld) : [...prev, tld]
    );
  };

  const updateAdvancedSetting = <K extends keyof AdvancedDomainSettings>(
    key: K,
    value: AdvancedDomainSettings[K]
  ) => {
    setAdvancedSettings((prev) => {
      if (value === undefined || value === '' || value === false) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  };

  const availableCount = results.filter((r) => r.status === 'available').length;
  const checkedCount = results.filter(
    (r) => r.status === 'available' || r.status === 'taken'
  ).length;

  // Get provider display name
  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'openai': return 'OpenAI';
      case 'anthropic': return 'Anthropic';
      case 'gemini': return 'Gemini';
      case 'groq': return 'Groq';
      default: return provider;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">How to Use EmptyDomai</h2>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* AI Generate */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">1</span>
                  AI Domain Generation
                </h3>
                <div className="ml-10 space-y-2 text-sm text-gray-700">
                  <p><strong>Step 1:</strong> Add your AI provider API key in <strong>Settings</strong> tab (OpenAI, Anthropic, Gemini, or Groq)</p>
                  <p><strong>Step 2:</strong> Enter your business idea or keywords (e.g., "AI image generation")</p>
                  <p><strong>Step 3:</strong> Select TLDs (.com, .ai, .io, etc.)</p>
                  <p><strong>Step 4:</strong> Click <strong>"Generate"</strong> to get AI-suggested domain names</p>
                  <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded">💡 Tip: Use Advanced Options to refine results (length, style, industry)</p>
                </div>
              </div>

              {/* Bulk Check */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">2</span>
                  Bulk Domain Check
                </h3>
                <div className="ml-10 space-y-2 text-sm text-gray-700">
                  <p><strong>Step 1:</strong> Switch to <strong>"Bulk Check"</strong> mode (toggle at top)</p>
                  <p><strong>Step 2:</strong> Paste domain names separated by commas or new lines</p>
                  <p><strong>Step 3:</strong> Select TLDs to check</p>
                  <p><strong>Step 4:</strong> Click <strong>"Check Availability"</strong></p>
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">⚠️ Free Plan: 30 bulk checks/day • Lifetime: Unlimited</p>
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">3</span>
                  Key Features
                </h3>
                <div className="ml-10 space-y-3">
                  <div className="flex gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">Favorites</p>
                      <p className="text-sm text-gray-600">Save domains to Favorites tab (Free: 3 max, Lifetime: Unlimited)</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">My Domains</p>
                      <p className="text-sm text-gray-600">Track owned domains with expiry dates (Free: 3 max, Lifetime: Unlimited)</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">Brand Analysis</p>
                      <p className="text-sm text-gray-600">Get AI-powered insights for available domains</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Tips */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Tips</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="text-primary-600">•</span>
                    <span>Use "More" button to generate additional suggestions</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary-600">•</span>
                    <span>Filter by "Available only" to hide taken domains</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary-600">•</span>
                    <span>Click domain cards to see registration links</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary-600">•</span>
                    <span>Upgrade to Lifetime in Settings for unlimited access</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR - Fixed Header */}
      <div className="flex-none px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-gray-700">
              {results.length > 0 ? (
                isChecking ? (
                  <span>Checking... {progress.current}/{progress.total}</span>
                ) : (
                  <span>{availableCount} available / {checkedCount} checked</span>
                )
              ) : (
                <span>Domain Generator</span>
              )}
            </div>
            {/* Help Button */}
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="How to use"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-500 hover:text-primary-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </button>
          </div>
          {results.length > 0 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyAvailable}
                onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-600">Available only</span>
            </label>
          )}
        </div>
      </div>

      {/* MIDDLE - Scrollable Results (this is the ONLY scrollable area) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        {/* Warning Message (dismissable) */}
        {warning && (
          <div className="mx-4 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-start gap-2">
            <span className="flex-1">{warning}</span>
            <button
              onClick={dismissWarning}
              className="flex-none text-amber-400 hover:text-amber-600 p-0.5"
              title="Dismiss"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Error Message (dismissable) */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-start gap-2">
            <span className="flex-1">{error}</span>
            <button
              onClick={dismissError}
              className="flex-none text-red-400 hover:text-red-600 p-0.5"
              title="Dismiss"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Results List */}
        {results.length > 0 && (
          <div className="p-4 space-y-2">
            {results.map((result, index) => (
              <DomainCard
                key={`${result.fullDomain}-${index}`}
                result={result}
                isFavorite={isFavorite(result.fullDomain)}
                onToggleFavorite={async () => {
                  const res = await toggleFavorite(result.domain, result.tld);
                  if (res === 'limit_reached') {
                    onUpgrade?.('You\'ve reached the free plan limit of 3 favorites. Upgrade to save unlimited favorites!');
                  }
                }}
                showOnlyAvailable={showOnlyAvailable}
                businessIdea={keywords}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {results.length === 0 && !isLoading && !error && (
          <div className="h-full flex items-center justify-center p-8 text-center text-gray-400">
            <p className="text-sm">Enter keywords below and generate domains</p>
          </div>
        )}
      </div>

      {/* BOTTOM BAR - Fixed Footer (NEVER scrolls with content) */}
      <div className="flex-none border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto">
          {/* Settings Toggle Button - Show when settings are hidden */}
          {!showSettings && results.length > 0 && (
            <button
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
              Show Options
            </button>
          )}

          {/* Collapsible Settings Section */}
          {showSettings && (
            <>
              {/* Hide Settings Button - Show when results exist */}
              {results.length > 0 && (
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full flex items-center justify-center gap-2 py-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-3 h-3"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                  Hide Options
                </button>
              )}

              {/* Input Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setInputMode('ai')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    inputMode === 'ai'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  AI Generate
                </button>
                <button
                  onClick={() => setInputMode('bulk')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    inputMode === 'bulk'
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Bulk Check
                </button>
              </div>

              {inputMode === 'ai' ? (
                <>
                  {/* Keywords input */}
                  <textarea
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="e.g., AI image generation, music streaming..."
                    className="input-field resize-none text-sm"
                    rows={2}
                  />
                </>
              ) : (
                <>
                  {/* Bulk domain input */}
                  <textarea
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    placeholder={"Enter domains separated by commas or new lines:\nexample, mybrand, coolsite, techstart"}
                    className="input-field resize-none text-sm"
                    rows={3}
                  />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {bulkInput.trim() ? `${bulkInput.split(/[,\n]+/).filter(d => d.trim()).length} domains` : 'No domains entered'}
                    </span>
                    {!isPro && (
                      <span className={remainingBulkChecks <= 5 ? 'text-amber-600' : ''}>
                        {remainingBulkChecks} checks left today
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* Language Detection Indicator - AI mode only */}
              {inputMode === 'ai' && detectedLanguage !== 'english' && keywords.trim().length > 3 && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-blue-700 text-xs">
                    Detected: <strong>{detectedLanguage.charAt(0).toUpperCase() + detectedLanguage.slice(1)}</strong>
                  </span>
                  {suggestedTlds.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-blue-600 text-xs">Add:</span>
                      {suggestedTlds.map((tld) => (
                        <button
                          key={tld}
                          onClick={() => setSelectedTlds(prev => [...prev, tld])}
                          className="chip cursor-pointer text-xs bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          +{tld}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TLD Selection */}
              <div className="flex flex-wrap gap-1">
                {GENERIC_TLDS.slice(0, 6).map((tld) => (
                  <button
                    key={tld}
                    onClick={() => handleTldToggle(tld)}
                    className={`chip cursor-pointer text-xs ${selectedTlds.includes(tld) ? 'selected' : ''}`}
                  >
                    {tld}
                  </button>
                ))}
                <button
                  onClick={() => setShowMoreTlds(!showMoreTlds)}
                  className="chip cursor-pointer text-xs text-primary-600"
                >
                  {showMoreTlds ? 'Less' : '+More'}
                </button>
              </div>

              {showMoreTlds && (
                <div className="space-y-2">
                  {/* More generic TLDs */}
                  <div className="flex flex-wrap gap-1">
                    {GENERIC_TLDS.slice(6).map((tld) => (
                      <button
                        key={tld}
                        onClick={() => handleTldToggle(tld)}
                        className={`chip cursor-pointer text-xs ${selectedTlds.includes(tld) ? 'selected' : ''}`}
                      >
                        {tld}
                      </button>
                    ))}
                  </div>
                  {/* Country TLDs */}
                  <div className="pt-1 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Country TLDs:</p>
                    <div className="flex flex-wrap gap-1">
                      {COUNTRY_TLDS.map((tld) => (
                        <button
                          key={tld}
                          onClick={() => handleTldToggle(tld)}
                          className={`chip cursor-pointer text-xs ${selectedTlds.includes(tld) ? 'selected' : ''}`}
                        >
                          {tld}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Current AI Provider Info - AI mode only */}
              {inputMode === 'ai' && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                  <span className="text-gray-500">
                    Using: <span className="font-medium text-gray-700">{getProviderName(domainProvider)}</span>
                    {domainModel && <span className="text-gray-400 ml-1">({domainModel})</span>}
                  </span>
                  <span className="text-gray-400">Change in Settings</span>
                </div>
              )}

              {/* Advanced Toggle - AI mode only */}
              {inputMode === 'ai' && (
                <>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    Advanced Options
                  </button>

                  {/* Advanced Options */}
                  {showAdvanced && (
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      {/* Industry Selection */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Industry / Niche</label>
                        <select
                          value={selectedIndustry}
                          onChange={(e) => setSelectedIndustry(e.target.value as IndustryNiche)}
                          className="input-field text-xs py-1 w-full"
                        >
                          {INDUSTRY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={style}
                          onChange={(e) => setStyle(e.target.value as DomainStyle)}
                          className="input-field text-xs py-1"
                        >
                          {DOMAIN_STYLE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="input-field text-xs py-1"
                        >
                          {LANGUAGE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-1">
                        {(['short', 'medium', 'long'] as DomainLength[]).map((l) => (
                          <button
                            key={l}
                            onClick={() => setLength(l)}
                            className={`chip cursor-pointer flex-1 justify-center text-xs ${length === l ? 'selected' : ''}`}
                          >
                            {l === 'short' ? 'Short' : l === 'medium' ? 'Medium' : 'Long'}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min="2"
                          max="63"
                          value={advancedSettings.minLength || ''}
                          onChange={(e) => updateAdvancedSetting('minLength', e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="Min length"
                          className="input-field text-xs py-1"
                        />
                        <input
                          type="number"
                          min="2"
                          max="63"
                          value={advancedSettings.maxLength || ''}
                          onChange={(e) => updateAdvancedSetting('maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="Max length"
                          className="input-field text-xs py-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={advancedSettings.mustInclude || ''}
                          onChange={(e) => updateAdvancedSetting('mustInclude', e.target.value || undefined)}
                          placeholder="Must include"
                          className="input-field text-xs py-1"
                        />
                        <input
                          type="text"
                          value={advancedSettings.mustNotInclude || ''}
                          onChange={(e) => updateAdvancedSetting('mustNotInclude', e.target.value || undefined)}
                          placeholder="Must NOT include"
                          className="input-field text-xs py-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={advancedSettings.startsWith || ''}
                          onChange={(e) => updateAdvancedSetting('startsWith', e.target.value || undefined)}
                          placeholder="Starts with"
                          className="input-field text-xs py-1"
                        />
                        <input
                          type="text"
                          value={advancedSettings.endsWith || ''}
                          onChange={(e) => updateAdvancedSetting('endsWith', e.target.value || undefined)}
                          placeholder="Ends with"
                          className="input-field text-xs py-1"
                        />
                      </div>

                      <div className="flex gap-4">
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={advancedSettings.noNumbers || false}
                            onChange={(e) => updateAdvancedSetting('noNumbers', e.target.checked || undefined)}
                            className="rounded border-gray-300 text-primary-600"
                          />
                          <span className="text-gray-600">No numbers</span>
                        </label>
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={advancedSettings.noHyphens || false}
                            onChange={(e) => updateAdvancedSetting('noHyphens', e.target.checked || undefined)}
                            className="rounded border-gray-300 text-primary-600"
                          />
                          <span className="text-gray-600">No hyphens</span>
                        </label>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Generate / Bulk Check Buttons */}
          <div className="flex gap-2 pt-1">
            {inputMode === 'ai' ? (
              <button
                onClick={() => handleGenerate(false)}
                disabled={!keywords.trim() || selectedTlds.length === 0 || isLoading || isAnalyzing || !hasDomainProviderKey}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-2"
              >
                {isGenerating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : isChecking ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Checking ({progress.current}/{progress.total})
                  </>
                ) : (
                  'Generate'
                )}
              </button>
            ) : (
              <button
                onClick={handleBulkCheck}
                disabled={!bulkInput.trim() || selectedTlds.length === 0 || isLoading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-2"
              >
                {isChecking ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Checking ({progress.current}/{progress.total})
                  </>
                ) : (
                  'Check Availability'
                )}
              </button>
            )}

            {results.length > 0 && !isLoading && (
              <>
                {inputMode === 'ai' && (
                  <button
                    onClick={handleMore}
                    disabled={isLoading || isAnalyzing}
                    className="btn-secondary px-3 py-2"
                    title="Generate more domains and add to the list"
                  >
                    More
                  </button>
                )}
                <button
                  onClick={handleAnalyzeBrands}
                  disabled={isLoading || isAnalyzing || results.filter(r => r.status === 'available').length === 0}
                  className="btn-secondary px-3 py-2 flex items-center gap-1"
                  title="Get AI brand analysis for available domains"
                >
                  {isAnalyzing ? (
                    <>
                      <span className="w-3 h-3 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                      </svg>
                      Analyze
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
