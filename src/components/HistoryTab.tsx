import React from 'react';
import { useHistory } from '../hooks/useHistory';
import type { SearchRecord } from '../types';

interface HistoryTabProps {
  onSelectSearch?: (record: SearchRecord) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ onSelectSearch }) => {
  const { history, isLoading, error, refresh } = useHistory();

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(date).toLocaleDateString();
  };

  const getInputTypeIcon = (inputType: string) => {
    switch (inputType) {
      case 'keyword':
        return (
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
        );
      case 'content':
        return (
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
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        );
      case 'url':
        return (
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
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
          <button
            onClick={() => refresh()}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
          className="w-12 h-12 mb-3 text-gray-300"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm">No search history yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Your searches will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {history.length} recent search{history.length !== 1 ? 'es' : ''}
        </span>
        <button
          onClick={() => refresh()}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          Refresh
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {history.map((record) => {
          const availableCount = record.results?.filter(
            (r) => r.status === 'available'
          ).length || 0;
          const totalCount = record.results?.length || 0;

          return (
            <button
              key={record.id}
              onClick={() => onSelectSearch?.(record)}
              className="w-full card hover:border-primary-300 transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                  {getInputTypeIcon(record.params.inputType)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {record.params.inputText.substring(0, 50)}
                    {record.params.inputText.length > 50 ? '...' : ''}
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    {/* TLDs */}
                    <div className="flex gap-0.5">
                      {record.params.tlds.slice(0, 3).map((tld) => (
                        <span
                          key={tld}
                          className="text-xs text-gray-500 bg-gray-100 px-1 rounded"
                        >
                          {tld}
                        </span>
                      ))}
                      {record.params.tlds.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{record.params.tlds.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Style */}
                    <span className="text-xs text-gray-400">
                      {record.params.style}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">
                      {formatDate(record.createdAt)}
                    </span>

                    {totalCount > 0 && (
                      <span className="text-xs">
                        <span className="text-green-600 font-medium">
                          {availableCount}
                        </span>
                        <span className="text-gray-400">
                          /{totalCount} available
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
