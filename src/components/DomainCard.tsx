import React from 'react';
import type { DomainResult } from '../types';

interface DomainCardProps {
  result: DomainResult;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  showOnlyAvailable?: boolean;
}

export const DomainCard: React.FC<DomainCardProps> = ({
  result,
  isFavorite,
  onToggleFavorite,
  showOnlyAvailable = false,
}) => {
  const { domain, tld, fullDomain, status, registrarLinks } = result;

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

      {/* Registrar links - only show for available domains */}
      {status === 'available' && registrarLinks && registrarLinks.length > 0 && (
        <div className="mt-2 pt-2 border-t border-green-200 flex flex-wrap gap-1">
          {registrarLinks.slice(0, 3).map((link) => (
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
    </div>
  );
};
