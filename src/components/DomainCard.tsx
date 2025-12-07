import React, { useState } from 'react';
import type { DomainResult, SocialMention } from '../types';
import { getMarketplaceLinks } from '../services/domainResearch';

interface DomainCardProps {
  result: DomainResult;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onDeepResearch?: (result: DomainResult) => void;
  showOnlyAvailable?: boolean;
  isResearching?: boolean;
}

export const DomainCard: React.FC<DomainCardProps> = ({
  result,
  isFavorite,
  onToggleFavorite,
  onDeepResearch,
  showOnlyAvailable = false,
  isResearching = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const {
    domain,
    tld,
    fullDomain,
    status,
    registrarLinks,
    backlinks,
    forSale,
    alternativeTlds,
    socialMentions,
    whoisData,
    researchStatus,
  } = result;

  // Hide taken domains if showOnlyAvailable is true
  if (showOnlyAvailable && status === 'taken') {
    return null;
  }

  const statusConfig = {
    available: {
      className: 'domain-available border',
      icon: '✓',
      label: 'Available',
      bgColor: 'bg-green-500',
    },
    taken: {
      className: 'domain-taken border',
      icon: '✗',
      label: 'Taken',
      bgColor: 'bg-gray-400',
    },
    checking: {
      className: 'domain-checking border',
      icon: '...',
      label: 'Checking',
      bgColor: 'bg-yellow-500',
    },
    error: {
      className: 'bg-red-50 border border-red-200 text-red-600',
      icon: '!',
      label: 'Error',
      bgColor: 'bg-red-500',
    },
  };

  const config = statusConfig[status];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullDomain);
  };

  const hasResearchData =
    backlinks || forSale || alternativeTlds?.length || socialMentions?.length || whoisData;

  const availableAlternatives = alternativeTlds?.filter(a => a.status === 'available') || [];

  return (
    <div
      className={`rounded-lg p-3 transition-all duration-200 ${config.className}`}
    >
      {/* Main Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Status indicator */}
          <span
            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${config.bgColor} text-white ${
              status === 'checking' ? 'animate-pulse' : ''
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

        {/* Quick badges */}
        <div className="flex items-center gap-1 mr-2">
          {/* For Sale badge */}
          {forSale?.isForSale && (
            <span className="px-1.5 py-0.5 text-xs rounded bg-orange-100 text-orange-700 font-medium">
              For Sale
            </span>
          )}

          {/* Backlinks badge */}
          {backlinks && backlinks.totalBacklinks > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700 font-medium">
              {backlinks.totalBacklinks} BL
            </span>
          )}

          {/* Alternative available badge */}
          {status === 'taken' && availableAlternatives.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700 font-medium">
              {availableAlternatives.length} Alt
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Research button */}
          {onDeepResearch && !researchStatus && (
            <button
              onClick={() => onDeepResearch(result)}
              disabled={isResearching}
              className={`p-1.5 rounded-lg transition-colors ${
                isResearching
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-400 hover:bg-purple-100 hover:text-purple-600'
              }`}
              title="Deep research this domain"
            >
              {isResearching ? (
                <span className="w-4 h-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin block" />
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
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              )}
            </button>
          )}

          {/* Expand button */}
          {hasResearchData && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title={expanded ? 'Collapse' : 'Expand details'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          )}

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

      {/* Registrar links - only show for available domains */}
      {status === 'available' && registrarLinks && registrarLinks.length > 0 && (
        <div className="mt-2 pt-2 border-t border-green-200 flex flex-wrap gap-1">
          {registrarLinks.slice(0, 4).map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
            >
              {link.name}
            </a>
          ))}
        </div>
      )}

      {/* Expanded Details Section */}
      {expanded && hasResearchData && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3 text-sm">
          {/* Backlink Info */}
          {backlinks && (
            <div className="bg-blue-50 rounded-lg p-2">
              <h4 className="font-medium text-blue-800 text-xs mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Backlinks
              </h4>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div>
                  <span className="text-blue-600">Total:</span>{' '}
                  <span className="font-medium">{backlinks.totalBacklinks}</span>
                </div>
                <div>
                  <span className="text-blue-600">Domains:</span>{' '}
                  <span className="font-medium">{backlinks.referringDomains}</span>
                </div>
                {backlinks.domainAuthority && (
                  <div>
                    <span className="text-blue-600">DA:</span>{' '}
                    <span className="font-medium">{backlinks.domainAuthority}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* For Sale Info */}
          {forSale?.isForSale && (
            <div className="bg-orange-50 rounded-lg p-2">
              <h4 className="font-medium text-orange-800 text-xs mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                For Sale
              </h4>
              <div className="text-xs">
                {forSale.marketplace && (
                  <span className="text-orange-700">on {forSale.marketplace}</span>
                )}
                {forSale.price && (
                  <span className="font-medium ml-1">
                    {forSale.currency || '$'}{forSale.price}
                  </span>
                )}
                {forSale.url && (
                  <a
                    href={forSale.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-orange-600 hover:underline"
                  >
                    View listing
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Marketplace Links for taken domains */}
          {status === 'taken' && !forSale?.isForSale && (
            <div className="bg-gray-50 rounded-lg p-2">
              <h4 className="font-medium text-gray-700 text-xs mb-1">Check Marketplaces</h4>
              <div className="flex flex-wrap gap-1">
                {getMarketplaceLinks(fullDomain).slice(0, 4).map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Alternative TLDs */}
          {alternativeTlds && alternativeTlds.length > 0 && (
            <div className="bg-green-50 rounded-lg p-2">
              <h4 className="font-medium text-green-800 text-xs mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Alternative TLDs
              </h4>
              <div className="flex flex-wrap gap-1">
                {alternativeTlds.map((alt) => (
                  <span
                    key={alt.tld}
                    className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${
                      alt.status === 'available'
                        ? 'bg-green-200 text-green-800'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {alt.fullDomain}
                    {alt.status === 'available' && (
                      <span className="text-green-600 font-medium">✓</span>
                    )}
                    {alt.price && (
                      <span className="text-gray-500 text-[10px]">{alt.price}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* WHOIS Data */}
          {whoisData && (whoisData.registrar || whoisData.expiresDate) && (
            <div className="bg-purple-50 rounded-lg p-2">
              <h4 className="font-medium text-purple-800 text-xs mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                WHOIS
              </h4>
              <div className="text-xs space-y-0.5 text-purple-700">
                {whoisData.registrar && <div>Registrar: {whoisData.registrar}</div>}
                {whoisData.createdDate && (
                  <div>Created: {new Date(whoisData.createdDate).toLocaleDateString()}</div>
                )}
                {whoisData.expiresDate && (
                  <div>Expires: {new Date(whoisData.expiresDate).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          )}

          {/* Social Mentions */}
          {socialMentions && socialMentions.length > 0 && (
            <div className="bg-indigo-50 rounded-lg p-2">
              <h4 className="font-medium text-indigo-800 text-xs mb-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Social Mentions ({socialMentions.length})
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {socialMentions.slice(0, 5).map((mention, idx) => (
                  <SocialMentionItem key={idx} mention={mention} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Social Mention Item Component
const SocialMentionItem: React.FC<{ mention: SocialMention }> = ({ mention }) => {
  const platformConfig = {
    reddit: { icon: 'R', color: 'text-orange-500', bg: 'bg-orange-100' },
    twitter: { icon: 'X', color: 'text-black', bg: 'bg-gray-100' },
    hackernews: { icon: 'Y', color: 'text-orange-600', bg: 'bg-orange-50' },
    producthunt: { icon: 'P', color: 'text-orange-500', bg: 'bg-orange-100' },
  };

  const config = platformConfig[mention.platform];

  return (
    <a
      href={mention.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 p-1 rounded hover:bg-indigo-100 transition-colors"
    >
      <span className={`flex-shrink-0 w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center ${config.bg} ${config.color}`}>
        {config.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-indigo-900 line-clamp-1">{mention.title}</div>
        {mention.score !== undefined && (
          <div className="text-[10px] text-indigo-600">
            {mention.score} points
            {mention.comments !== undefined && ` • ${mention.comments} comments`}
          </div>
        )}
      </div>
    </a>
  );
};
