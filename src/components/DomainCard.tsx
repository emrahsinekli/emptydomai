import React, { useState, useEffect } from 'react';
import type { DomainResult, SocialMediaAvailability } from '../types';
import { generateLogoVariants, downloadLogoAsZip, downloadSingleLogo, getSelectedLogoProviderName, type LogoVariant, type GeneratedLogos } from '../services/logo';
import { generateLandingPage, downloadLandingPage, previewLandingPage } from '../services/landing';
import { generateBusinessPlan, downloadBusinessPlanMarkdown, GeneratedBusinessPlan } from '../services/businessPlan';
import { fetchWhoisInfo, type WhoisInfo, getDomainDropStatus } from '../services/whois';
import { checkTrademark, type TrademarkCheckResult } from '../services/trademark';
import { getTrendsUrl } from '../services/trends';
import { detectUserCountry } from '../services/pricing';
import { scrapeRealPrices, formatScrapedPrice, type ScrapedPricingResult } from '../services/priceScraper';
import { formatCount, getScoreColor, getScoreBgColor, getScoreLabel, type BrandAwarenessResult } from '../services/brandAwareness';
import { searchAppStores, getAppAvailabilityStatus, type AppSearchResults } from '../services/appStore';

interface DomainCardProps {
  result: DomainResult;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  showOnlyAvailable?: boolean;
  businessIdea?: string; // User's original keywords/description for logo generation
}

const SocialIcon: React.FC<{ platform: string; status: 'available' | 'taken' | 'unknown' }> = ({ platform, status }) => {
  const icons: Record<string, string> = {
    instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0z',
    twitter: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    tiktok: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z',
    youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    github: 'M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z',
    discord: 'M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z',
    facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
    linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  };

  const statusColors = {
    available: 'text-green-500',
    taken: 'text-red-400',
    unknown: 'text-gray-400',
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`w-4 h-4 ${statusColors[status]}`}
    >
      <title>{`${platform}: ${status}`}</title>
      <path d={icons[platform] || icons.github} />
    </svg>
  );
};

export const DomainCard: React.FC<DomainCardProps> = ({
  result,
  isFavorite,
  onToggleFavorite,
  showOnlyAvailable = false,
  businessIdea,
}) => {
  const { domain, tld, fullDomain, status, registrarLinks, brandAnalysis, socialMedia } = result;
  const [showDetails, setShowDetails] = useState(false);
  const [localSocialMedia, setLocalSocialMedia] = useState<SocialMediaAvailability | null>(socialMedia || null);
  const [isCheckingSocial, setIsCheckingSocial] = useState(false);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [selectedLogoStyle, setSelectedLogoStyle] = useState<'minimal' | 'modern' | 'vintage' | 'playful' | 'luxury' | 'tech'>('modern');
  const [generatedLogos, setGeneratedLogos] = useState<GeneratedLogos | null>(null);
  const [selectedLogoVariant, setSelectedLogoVariant] = useState<LogoVariant | null>(null);
  const [isDownloadingLogo, setIsDownloadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const [isGeneratingLanding, setIsGeneratingLanding] = useState(false);
  const [generatedLandingHtml, setGeneratedLandingHtml] = useState<string | null>(null);

  const handleGenerateLogos = async () => {
    setIsGeneratingLogo(true);
    setGeneratedLogos(null);
    setSelectedLogoVariant(null);
    setLogoError(null);
    try {
      // Use businessIdea (user's original keywords) for better logo generation
      // Fall back to brandAnalysis description if available
      const description = businessIdea || brandAnalysis?.description;

      const logos = await generateLogoVariants({
        brandName: domain,
        style: selectedLogoStyle,
        industry: brandAnalysis?.industryFit?.[0],
        description: description,
      });
      setGeneratedLogos(logos);
      // Auto-select first variant
      if (logos.variants.length > 0) {
        setSelectedLogoVariant(logos.variants[0]);
      }
    } catch (error) {
      console.error('Failed to generate logos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Logo generation failed';
      // Show user-friendly error messages
      if (errorMessage.includes('API key')) {
        setLogoError('API key not configured. Go to Settings to add your API key.');
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        setLogoError('Rate limit exceeded. Please wait a moment and try again.');
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        setLogoError('Invalid API key. Please check your API key in Settings.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setLogoError('Network error. Please check your connection.');
      } else {
        setLogoError(errorMessage);
      }
    }
    setIsGeneratingLogo(false);
  };

  const handleDownloadLogoZip = async () => {
    if (!selectedLogoVariant) return;
    setIsDownloadingLogo(true);
    try {
      await downloadLogoAsZip(selectedLogoVariant, domain);
    } catch (error) {
      console.error('Failed to download logo:', error);
    }
    setIsDownloadingLogo(false);
  };

  const handleDownloadSingleLogo = () => {
    if (!selectedLogoVariant) return;
    downloadSingleLogo(selectedLogoVariant, domain);
  };

  const handleGenerateLanding = async () => {
    setIsGeneratingLanding(true);
    try {
      const result = await generateLandingPage({
        brandName: domain.charAt(0).toUpperCase() + domain.slice(1),
        domain: fullDomain,
        brandAnalysis,
        style: 'modern',
      });
      setGeneratedLandingHtml(result.html);
    } catch (error) {
      console.error('Failed to generate landing page:', error);
    }
    setIsGeneratingLanding(false);
  };

  const handleDownloadLanding = () => {
    if (generatedLandingHtml) {
      downloadLandingPage(generatedLandingHtml, domain);
    }
  };

  const handlePreviewLanding = () => {
    if (generatedLandingHtml) {
      previewLandingPage(generatedLandingHtml);
    }
  };

  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedBusinessPlan | null>(null);
  const [showPlanPreview, setShowPlanPreview] = useState(false);

  // States for WHOIS, Trademark
  const [whoisInfo, setWhoisInfo] = useState<WhoisInfo | null>(null);
  const [isLoadingWhois, setIsLoadingWhois] = useState(false);
  const [trademarkResult, setTrademarkResult] = useState<TrademarkCheckResult | null>(null);
  const [isCheckingTrademark, setIsCheckingTrademark] = useState(false);

  // Real-time scraped pricing state
  const [scrapedPricing, setScrapedPricing] = useState<ScrapedPricingResult | null>(null);
  const [isScrapingPrices, setIsScrapingPrices] = useState(false);

  // Brand awareness state - REAL data
  const [brandAwareness, setBrandAwareness] = useState<BrandAwarenessResult | null>(null);
  const [isCheckingAwareness, setIsCheckingAwareness] = useState(false);

  // Logo provider name for dynamic UI text
  const [logoProviderName, setLogoProviderName] = useState<string>('AI');

  // App Store search state
  const [appStoreResults, setAppStoreResults] = useState<AppSearchResults | null>(null);
  const [isSearchingApps, setIsSearchingApps] = useState(false);

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const plan = await generateBusinessPlan({
        brandName: domain.charAt(0).toUpperCase() + domain.slice(1),
        domain: fullDomain,
        brandAnalysis,
        businessIdea: brandAnalysis?.description || domain,
        industry: brandAnalysis?.industryFit?.[0],
      });
      setGeneratedPlan(plan);
    } catch (error) {
      console.error('Failed to generate business plan:', error);
    }
    setIsGeneratingPlan(false);
  };

  const handleDownloadPlan = () => {
    if (generatedPlan) {
      downloadBusinessPlanMarkdown(generatedPlan, domain);
    }
  };

  // WHOIS handler for taken domains
  const handleFetchWhois = async () => {
    if (whoisInfo || isLoadingWhois) return;
    setIsLoadingWhois(true);
    try {
      const info = await fetchWhoisInfo(fullDomain);
      setWhoisInfo(info);
    } catch (error) {
      console.error('Failed to fetch WHOIS:', error);
    }
    setIsLoadingWhois(false);
  };

  // Trademark check handler
  const handleCheckTrademark = () => {
    if (trademarkResult || isCheckingTrademark) return;
    setIsCheckingTrademark(true);
    try {
      const result = checkTrademark(domain);
      setTrademarkResult(result);
    } catch (error) {
      console.error('Failed to check trademark:', error);
    }
    setIsCheckingTrademark(false);
  };

  // Check social media when details are expanded
  useEffect(() => {
    if (showDetails && status === 'available' && !localSocialMedia && !isCheckingSocial) {
      setIsCheckingSocial(true);

      // Use try-catch for Chrome extension message passing
      const checkSocial = async () => {
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'CHECK_SOCIAL_MEDIA',
            payload: { username: domain },
          });

          if (response && response.success && response.data) {
            setLocalSocialMedia(response.data);
          }
        } catch (error) {
          console.error('Social media check failed:', error);
        } finally {
          setIsCheckingSocial(false);
        }
      };

      checkSocial();
    }
  }, [showDetails, status, domain, localSocialMedia, isCheckingSocial]);

  // Scrape real prices when Details is opened
  useEffect(() => {
    if (showDetails && status === 'available' && !scrapedPricing && !isScrapingPrices) {
      setIsScrapingPrices(true);
      (async () => {
        try {
          const country = await detectUserCountry();
          const result = await scrapeRealPrices(domain, tld, country.code);
          setScrapedPricing(result);
        } catch (error) {
          console.error('Failed to scrape real prices:', error);
        } finally {
          setIsScrapingPrices(false);
        }
      })();
    }
  }, [showDetails, status, domain, tld, scrapedPricing, isScrapingPrices]);

  // Fetch REAL brand awareness data when Details is opened
  useEffect(() => {
    if (showDetails && status === 'available' && !brandAwareness && !isCheckingAwareness) {
      setIsCheckingAwareness(true);
      (async () => {
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'CHECK_BRAND_AWARENESS',
            payload: { keyword: domain },
          });
          if (response && response.success && response.data) {
            setBrandAwareness(response.data);
          }
        } catch (error) {
          console.error('Failed to check brand awareness:', error);
        } finally {
          setIsCheckingAwareness(false);
        }
      })();
    }
  }, [showDetails, status, domain, brandAwareness, isCheckingAwareness]);

  // Get selected logo provider name when details are shown
  useEffect(() => {
    if (showDetails) {
      getSelectedLogoProviderName().then(setLogoProviderName);
    }
  }, [showDetails]);

  // Search App Stores when Details is opened
  useEffect(() => {
    if (showDetails && status === 'available' && !appStoreResults && !isSearchingApps) {
      setIsSearchingApps(true);
      (async () => {
        try {
          const results = await searchAppStores(domain);
          setAppStoreResults(results);
        } catch (error) {
          console.error('Failed to search app stores:', error);
        } finally {
          setIsSearchingApps(false);
        }
      })();
    }
  }, [showDetails, status, domain, appStoreResults, isSearchingApps]);

  // Hide taken domains if showOnlyAvailable is true
  if (showOnlyAvailable && status === 'taken') {
    return null;
  }

  const statusConfig = {
    available: {
      className: 'domain-available border',
      icon: '✓',
      label: 'Available',
    },
    taken: {
      className: 'domain-taken border',
      icon: '✗',
      label: 'Taken',
    },
    checking: {
      className: 'domain-checking border',
      icon: '...',
      label: 'Checking',
    },
    error: {
      className: 'bg-red-50 border border-red-200 text-red-600',
      icon: '!',
      label: 'Error',
    },
  };

  const config = statusConfig[status];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullDomain);
  };

  return (
    <div
      className={`rounded-lg p-3 transition-all duration-200 ${config.className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Status indicator */}
          <span
            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              status === 'available'
                ? 'bg-green-500 text-white'
                : status === 'taken'
                ? 'bg-gray-400 text-white'
                : status === 'checking'
                ? 'bg-yellow-500 text-white animate-pulse'
                : 'bg-red-500 text-white'
            }`}
          >
            {status === 'checking' ? (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              config.icon
            )}
          </span>

          {/* Domain name */}
          <div className="min-w-0 flex-1">
            <span className="font-medium text-gray-900 truncate block">
              {domain}
            </span>
            <span className="text-sm text-primary-600">{tld}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Favorite button */}
          <button
            onClick={onToggleFavorite}
            className={`p-1.5 rounded-lg transition-colors ${
              isFavorite
                ? 'text-yellow-500 hover:bg-yellow-50'
                : 'text-gray-400 hover:bg-gray-100 hover:text-yellow-500'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={2}
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopy}
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
        </div>
      </div>

      {/* Details section - Show for available domains */}
      {status === 'available' && (
        <div className="mt-2 pt-2 border-t border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600 font-medium">Available</span>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              {showDetails ? 'Hide' : 'Details'}
            </button>
          </div>

          {/* Expanded Details */}
          {showDetails && (
            <div className="mt-2 space-y-2">
              {/* Brand Analysis */}
              {brandAnalysis && (
                <div className="p-2 bg-blue-50 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-blue-700">Brand Score: {brandAnalysis.brandScore}/100</span>
                    <span className={`px-1.5 py-0.5 rounded text-white text-[10px] ${
                      brandAnalysis.sentiment === 'luxury' ? 'bg-purple-500' :
                      brandAnalysis.sentiment === 'playful' ? 'bg-pink-500' :
                      brandAnalysis.sentiment === 'professional' ? 'bg-blue-500' :
                      brandAnalysis.sentiment === 'positive' ? 'bg-green-500' : 'bg-gray-500'
                    }`}>
                      {brandAnalysis.sentiment}
                    </span>
                  </div>
                  {brandAnalysis.slogan && (
                    <div className="text-gray-600 italic">"{brandAnalysis.slogan}"</div>
                  )}
                  {brandAnalysis.description && (
                    <div className="text-gray-700">{brandAnalysis.description}</div>
                  )}
                  {brandAnalysis.targetAudience && (
                    <div className="text-gray-500">Target: {brandAnalysis.targetAudience}</div>
                  )}
                  {brandAnalysis.industryFit && brandAnalysis.industryFit.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {brandAnalysis.industryFit.map((industry) => (
                        <span key={industry} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">
                          {industry}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1 border-t border-blue-100">
                    <span>Memorability: {brandAnalysis.memorability}/10</span>
                    <span>Pronounce: {brandAnalysis.pronounceability}/10</span>
                    <span>Unique: {brandAnalysis.uniqueness}/10</span>
                  </div>
                </div>
              )}

              {/* Social Media Availability */}
              <div className="p-2 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-purple-700">Social Media Handles</span>
                  {isCheckingSocial && (
                    <span className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                {localSocialMedia ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(localSocialMedia).map(([platform, platformStatus]) => {
                      const socialUrls: Record<string, string> = {
                        instagram: `https://instagram.com/${domain}`,
                        twitter: `https://x.com/${domain}`,
                        tiktok: `https://tiktok.com/@${domain}`,
                        youtube: `https://youtube.com/@${domain}`,
                        github: `https://github.com/${domain}`,
                        discord: `https://discord.com`,
                        facebook: `https://facebook.com/${domain}`,
                        linkedin: `https://linkedin.com/company/${domain}`,
                      };
                      return (
                        <a
                          key={platform}
                          href={socialUrls[platform]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:opacity-75 transition-opacity cursor-pointer"
                          title={`@${domain} on ${platform} - ${platformStatus === 'available' ? 'Likely Available' : platformStatus === 'taken' ? 'Taken' : 'Check manually'}`}
                        >
                          <SocialIcon platform={platform} status={platformStatus} />
                          <span className="text-[10px] text-gray-500">{platform.slice(0, 2).toUpperCase()}</span>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">
                    {isCheckingSocial ? 'Checking availability...' : 'Loading...'}
                  </div>
                )}
                <div className="mt-1 text-[10px] text-gray-400">
                  <span className="text-green-500">●</span> Likely available
                  <span className="mx-1">|</span>
                  <span className="text-red-400">●</span> Taken
                  <span className="mx-1">|</span>
                  <span className="text-gray-400">●</span> Check manually
                </div>
              </div>

              {/* Logo Generator */}
              <div className="p-2 bg-orange-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-orange-700">AI Logo Generator</span>
                  {generatedLogos && (
                    <span className="text-[10px] text-orange-500">
                      {generatedLogos.variants.length} variants
                    </span>
                  )}
                </div>

                {/* Style Selection - only show when no logos generated */}
                {!generatedLogos && (
                  <>
                    <div className="flex gap-1 mb-2 flex-wrap">
                      {(['minimal', 'modern', 'vintage', 'playful', 'luxury', 'tech'] as const).map((style) => (
                        <button
                          key={style}
                          onClick={() => setSelectedLogoStyle(style)}
                          className={`px-2 py-0.5 text-[10px] rounded ${
                            selectedLogoStyle === style
                              ? 'bg-orange-500 text-white'
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleGenerateLogos}
                      disabled={isGeneratingLogo}
                      className="w-full py-1.5 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {isGeneratingLogo ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating with AI...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                          </svg>
                          Generate 3 Logo Variants
                        </>
                      )}
                    </button>
                  </>
                )}

                {/* Generated Logos Grid */}
                {generatedLogos && generatedLogos.variants.length > 0 && (
                  <div className="space-y-2">
                    {/* Logo Preview Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {generatedLogos.variants.map((variant, index) => (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedLogoVariant(variant)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            selectedLogoVariant?.id === variant.id
                              ? 'border-orange-500 ring-2 ring-orange-200'
                              : 'border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          <img
                            src={variant.imageUrl}
                            alt={`Logo variant ${index + 1}`}
                            className="w-full h-full object-cover bg-white"
                          />
                          {selectedLogoVariant?.id === variant.id && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-2.5 h-2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] text-center py-0.5">
                            #{index + 1}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Selected Variant Info */}
                    {selectedLogoVariant && (
                      <div className="text-[10px] text-gray-500 text-center">
                        Style: {selectedLogoVariant.style} | Colors: {selectedLogoVariant.colors.slice(0, 3).join(', ')}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={handleDownloadSingleLogo}
                        disabled={!selectedLogoVariant}
                        className="flex-1 py-1 bg-orange-100 text-orange-700 text-xs rounded hover:bg-orange-200 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Single
                      </button>
                      <button
                        onClick={handleDownloadLogoZip}
                        disabled={!selectedLogoVariant || isDownloadingLogo}
                        className="flex-1 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {isDownloadingLogo ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Preparing...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                            </svg>
                            All Sizes ZIP
                          </>
                        )}
                      </button>
                    </div>

                    {/* Regenerate Button */}
                    <button
                      onClick={() => {
                        setGeneratedLogos(null);
                        setSelectedLogoVariant(null);
                      }}
                      className="w-full py-1 text-orange-600 text-[10px] hover:text-orange-700 flex items-center justify-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Generate New Variants
                    </button>
                  </div>
                )}

                {/* Error message */}
                {logoError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span>{logoError}</span>
                  </div>
                )}

                <div className="mt-1 text-[10px] text-gray-400">
                  {generatedLogos
                    ? 'Select a variant and download as ZIP with all sizes'
                    : `Uses ${logoProviderName} to generate 3 unique logo variants`}
                </div>
              </div>

              {/* Landing Page Generator */}
              <div className="p-2 bg-teal-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-teal-700">Landing Page Generator</span>
                </div>
                {!generatedLandingHtml ? (
                  <button
                    onClick={handleGenerateLanding}
                    disabled={isGeneratingLanding}
                    className="w-full py-1.5 bg-teal-500 text-white text-xs rounded hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {isGeneratingLanding ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                        </svg>
                        Generate Landing Page
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      <button
                        onClick={handlePreviewLanding}
                        className="flex-1 py-1 bg-teal-100 text-teal-700 text-xs rounded hover:bg-teal-200 flex items-center justify-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Preview
                      </button>
                      <button
                        onClick={handleDownloadLanding}
                        className="flex-1 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600 flex items-center justify-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Download
                      </button>
                    </div>
                    <button
                      onClick={handleGenerateLanding}
                      disabled={isGeneratingLanding}
                      className="w-full py-1 text-teal-600 text-[10px] hover:text-teal-700"
                    >
                      Regenerate
                    </button>
                  </div>
                )}
                <div className="mt-1 text-[10px] text-gray-400">
                  AI-generated responsive landing page
                </div>
              </div>

              {/* Business Plan Generator */}
              <div className="p-2 bg-indigo-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-indigo-700">Business Plan Generator</span>
                </div>
                {!generatedPlan ? (
                  <button
                    onClick={handleGeneratePlan}
                    disabled={isGeneratingPlan}
                    className="w-full py-1.5 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {isGeneratingPlan ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        Generate Business Plan
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-2">
                    {/* Plan Preview */}
                    <div className="max-h-32 overflow-y-auto text-[10px] text-gray-600 bg-white rounded p-2">
                      <div className="font-medium text-indigo-700 mb-1">Summary:</div>
                      <p>{generatedPlan.summary}</p>
                      {showPlanPreview && (
                        <div className="mt-2 space-y-2">
                          {generatedPlan.sections.slice(0, 3).map((section: { title: string; content: string }, i: number) => (
                            <div key={i}>
                              <div className="font-medium text-indigo-600">{section.title}</div>
                              <p className="whitespace-pre-line">{section.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowPlanPreview(!showPlanPreview)}
                      className="w-full text-[10px] text-indigo-600 hover:text-indigo-700"
                    >
                      {showPlanPreview ? 'Show Less' : 'Show More'}
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={handleDownloadPlan}
                        className="flex-1 py-1 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600 flex items-center justify-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Download .md
                      </button>
                      <button
                        onClick={handleGeneratePlan}
                        disabled={isGeneratingPlan}
                        className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded hover:bg-indigo-200"
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>
                )}
                <div className="mt-1 text-[10px] text-gray-400">
                  AI-generated startup business plan
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WHOIS Info - Show for taken domains */}
      {status === 'taken' && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          {!whoisInfo ? (
            <button
              onClick={handleFetchWhois}
              disabled={isLoadingWhois}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 flex items-center gap-1"
            >
              {isLoadingWhois ? (
                <>
                  <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Loading WHOIS...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  View WHOIS Info
                </>
              )}
            </button>
          ) : (
            <div className="text-xs space-y-1">
              {whoisInfo.error ? (
                <div className="text-red-500">{whoisInfo.error}</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      getDomainDropStatus(whoisInfo).status === 'expiring' ? 'bg-yellow-100 text-yellow-700' :
                      getDomainDropStatus(whoisInfo).status === 'dropping' ? 'bg-red-100 text-red-700' :
                      getDomainDropStatus(whoisInfo).status === 'available' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {getDomainDropStatus(whoisInfo).message}
                    </span>
                  </div>
                  {whoisInfo.registrar && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Registrar:</span>
                      <span className="text-gray-700 truncate max-w-[150px]">{whoisInfo.registrar}</span>
                    </div>
                  )}
                  {whoisInfo.createdDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created:</span>
                      <span className="text-gray-700">{whoisInfo.createdDate}</span>
                    </div>
                  )}
                  {whoisInfo.expiryDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Expires:</span>
                      <span className={`font-medium ${
                        whoisInfo.isExpiringSoon ? 'text-red-600' : 'text-gray-700'
                      }`}>
                        {whoisInfo.expiryDate}
                        {whoisInfo.daysUntilExpiry !== undefined && (
                          <span className="ml-1 text-[10px]">({whoisInfo.daysUntilExpiry}d)</span>
                        )}
                      </span>
                    </div>
                  )}
                  {whoisInfo.age !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Age:</span>
                      <span className="text-gray-700">{whoisInfo.age} years</span>
                    </div>
                  )}
                  {whoisInfo.nameServers && whoisInfo.nameServers.length > 0 && (
                    <div className="text-[10px] text-gray-400 mt-1">
                      NS: {whoisInfo.nameServers.slice(0, 2).join(', ')}
                    </div>
                  )}
                  {whoisInfo.isExpiringSoon && (
                    <div className="mt-1 p-1.5 bg-yellow-50 rounded text-yellow-700 text-[10px]">
                      ⚠️ Domain expiring soon! Set up monitoring to catch when it drops.
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Trademark & Trends - Show for available domains in details */}
      {status === 'available' && showDetails && (
        <div className="mt-2 space-y-2">
          {/* Trademark Check */}
          <div className="p-2 bg-red-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-red-700">Trademark Check</span>
            </div>
            {!trademarkResult ? (
              <button
                onClick={handleCheckTrademark}
                disabled={isCheckingTrademark}
                className="w-full py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isCheckingTrademark ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    Check Trademark Risk
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Risk Level:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    trademarkResult.overallRisk === 'low' ? 'bg-green-100 text-green-700' :
                    trademarkResult.overallRisk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    trademarkResult.overallRisk === 'high' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {trademarkResult.overallRisk.toUpperCase()}
                  </span>
                </div>
                <div className="text-[10px] text-gray-600 space-y-0.5">
                  {trademarkResult.recommendations.slice(0, 2).map((rec, i) => (
                    <div key={i}>{rec}</div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {trademarkResult.results.map((r) => (
                    <a
                      key={r.region}
                      href={r.searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] hover:bg-red-200"
                    >
                      Search {r.region}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-1 text-[10px] text-gray-400">
              Check USPTO, EUIPO, TURKPATENT, WIPO
            </div>
          </div>

          {/* App Store Check - REAL DATA */}
          <div className="p-2 bg-violet-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-violet-700">App Store Check</span>
              {isSearchingApps && (
                <span className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {isSearchingApps && !appStoreResults && (
              <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                <span className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                Searching App Store & Play Store...
              </div>
            )}

            {appStoreResults && (
              <div className="space-y-2">
                {/* Status */}
                {(() => {
                  const status = getAppAvailabilityStatus(appStoreResults);
                  return (
                    <div className={`flex items-center gap-2 ${status.color}`}>
                      {status.status === 'available' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : status.status === 'taken' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                      )}
                      <span className="text-xs font-medium">{status.message}</span>
                    </div>
                  );
                })()}

                {/* Store Links */}
                <div className="grid grid-cols-2 gap-2">
                  {/* iOS App Store */}
                  <a
                    href={appStoreResults.ios.searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 p-2 rounded text-xs transition-colors ${
                      appStoreResults.ios.exactMatch
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : appStoreResults.ios.found
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    <div className="flex-1">
                      <div className="font-medium">App Store</div>
                      <div className="text-[10px] opacity-75">
                        {appStoreResults.ios.error
                          ? 'Check manually'
                          : appStoreResults.ios.exactMatch
                            ? 'Exact match!'
                            : `${appStoreResults.ios.count} apps found`}
                      </div>
                    </div>
                  </a>

                  {/* Google Play Store */}
                  <a
                    href={appStoreResults.android.searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 p-2 rounded text-xs transition-colors ${
                      appStoreResults.android.exactMatch
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : appStoreResults.android.found
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : appStoreResults.android.error
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                    <div className="flex-1">
                      <div className="font-medium">Play Store</div>
                      <div className="text-[10px] opacity-75">
                        {appStoreResults.android.error
                          ? 'Check manually'
                          : appStoreResults.android.exactMatch
                            ? 'Exact match!'
                            : `${appStoreResults.android.count} apps found`}
                      </div>
                    </div>
                  </a>
                </div>

                {/* Top iOS Apps */}
                {appStoreResults.ios.apps.length > 0 && (
                  <div className="mt-1">
                    <div className="text-[10px] text-gray-500 mb-1">Top results on App Store:</div>
                    <div className="space-y-1">
                      {appStoreResults.ios.apps.slice(0, 2).map((app, i) => (
                        <a
                          key={i}
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-1 bg-white rounded hover:bg-gray-50"
                        >
                          {app.icon && (
                            <img src={app.icon} alt="" className="w-6 h-6 rounded" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-medium truncate">{app.name}</div>
                            <div className="text-[9px] text-gray-400 truncate">{app.developer}</div>
                          </div>
                          <div className="text-[9px] text-gray-500">{app.price}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-gray-400 pt-1 border-t border-violet-100">
                  Real-time data from iTunes API & Play Store
                </div>
              </div>
            )}

            {!appStoreResults && !isSearchingApps && (
              <div className="text-xs text-gray-500 py-2">
                Click Details to check app stores
              </div>
            )}
          </div>

          {/* Brand Awareness - REAL DATA from APIs */}
          <div className="p-2 bg-cyan-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-cyan-700">Brand Awareness</span>
              {isCheckingAwareness && (
                <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {isCheckingAwareness && !brandAwareness && (
              <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                Fetching REAL data from HN, GitHub, Reddit, Wikipedia...
              </div>
            )}

            {brandAwareness && (
              <div className="space-y-2">
                {/* Score Display */}
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-gray-200"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={getScoreBgColor(brandAwareness.score).replace('bg-', 'text-')}
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${brandAwareness.score}, 100`}
                        strokeLinecap="round"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-sm font-bold ${getScoreColor(brandAwareness.score)}`}>
                        {brandAwareness.score}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${getScoreColor(brandAwareness.score)}`}>
                      {getScoreLabel(brandAwareness.score)}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {formatCount(brandAwareness.totalMentions)} total mentions
                    </div>
                  </div>
                </div>

                {/* Source Breakdown */}
                <div className="grid grid-cols-2 gap-1">
                  {brandAwareness.sources.map((source) => (
                    <a
                      key={source.source}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-between px-2 py-1 rounded text-[10px] transition-colors ${
                        source.error
                          ? 'bg-gray-100 text-gray-400'
                          : source.count > 0
                            ? 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <span className="font-medium truncate">{source.source}</span>
                      <span className={`ml-1 ${source.count > 0 ? 'font-bold' : ''}`}>
                        {source.error ? '?' : formatCount(source.count)}
                      </span>
                    </a>
                  ))}
                </div>

                <div className="text-[10px] text-gray-400 pt-1 border-t border-cyan-100">
                  Real-time data from public APIs (no estimation)
                </div>
              </div>
            )}

            {!brandAwareness && !isCheckingAwareness && (
              <div className="text-xs text-gray-500 py-2">
                Click Details to load brand awareness data
              </div>
            )}
          </div>

          {/* Google Trends - Direct Link Only */}
          <div className="p-2 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-green-700">Google Trends</span>
            </div>
            <a
              href={getTrendsUrl(domain)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 flex items-center justify-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
              View "{domain}" on Google Trends
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
            <div className="mt-1 text-[10px] text-gray-400">
              Check real search interest on Google Trends
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Pricing & Registrar Links - only show for available domains */}
      {status === 'available' && (
        <div className="mt-2 pt-2">
          {/* Real-time scraped prices (shown when Details is open) */}
          {showDetails && (scrapedPricing || isScrapingPrices) ? (
            <div className="space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-green-600">Real-Time Prices</span>
                  {isScrapingPrices && (
                    <span className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin ml-1" />
                  )}
                </div>
                {scrapedPricing && (
                  <span className="text-[10px] text-gray-400">
                    Updated: {scrapedPricing.fetchedAt.toLocaleTimeString()}
                  </span>
                )}
              </div>

              {isScrapingPrices && !scrapedPricing && (
                <div className="flex items-center gap-2 text-xs text-gray-500 p-2 bg-gray-50 rounded">
                  <span className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                  Fetching real prices from registrars...
                </div>
              )}

              {scrapedPricing && (
                <>
                  {/* Cheapest real price */}
                  {scrapedPricing.cheapest && scrapedPricing.cheapest.price !== null && (
                    <a
                      href={scrapedPricing.cheapest.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <span className="text-[10px] text-green-600 font-medium">Best Real Price:</span>
                      <span className="text-sm font-bold text-green-700">
                        {formatScrapedPrice(scrapedPricing.cheapest)}
                      </span>
                      <span className="text-[10px] text-green-600">
                        @ {scrapedPricing.cheapest.registrar}
                        {scrapedPricing.cheapest.isLocal && (
                          <span className="ml-1 px-1 py-0.5 bg-green-200 rounded text-[8px]">LOCAL</span>
                        )}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 ml-auto">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  )}

                  {/* All scraped prices */}
                  <div className="flex flex-wrap gap-1">
                    {scrapedPricing.prices
                      .filter(p => p.price !== null)
                      .sort((a, b) => (a.price || 999) - (b.price || 999))
                      .map((price, index) => (
                        <a
                          key={price.registrar}
                          href={price.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                            index === 0
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : price.isLocal
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title={price.registrar}
                        >
                          <span className="font-medium">{formatScrapedPrice(price)}</span>
                          <span className="text-[10px] opacity-75">{price.registrar}</span>
                          {price.isLocal && index !== 0 && (
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                          )}
                        </a>
                      ))}
                  </div>

                  {/* Registrars without prices (can't scrape or failed) */}
                  {scrapedPricing.prices.filter(p => p.price === null).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] text-gray-400 w-full">Check prices:</span>
                      {scrapedPricing.prices
                        .filter(p => p.price === null)
                        .map((price) => (
                          <a
                            key={price.registrar}
                            href={price.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] px-2 py-1 rounded bg-gray-50 text-gray-500 hover:bg-gray-100 flex items-center gap-1"
                            title={price.canScrape ? `Failed to fetch from ${price.registrar}` : `Check price on ${price.registrar}`}
                          >
                            {price.registrar}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-2.5 h-2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </a>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : registrarLinks && registrarLinks.length > 0 ? (
            // Show registrar links only (no fake estimated prices)
            <div className="space-y-1">
              <div className="text-[10px] text-gray-500">Check prices:</div>
              <div className="flex flex-wrap gap-1">
                {registrarLinks.slice(0, 4).map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1"
                  >
                    {link.name}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-2.5 h-2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
