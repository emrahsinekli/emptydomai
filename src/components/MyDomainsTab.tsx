import React, { useState, useEffect } from 'react';
import type { MyDomain } from '../types';
import { DOMAIN_REGISTRARS, HOSTING_PROVIDERS, DNS_PROVIDERS } from '../types';
import {
  getMyDomains,
  addMyDomain,
  updateMyDomain,
  deleteMyDomain,
  getExpiryStatus,
  getDaysUntilExpiry,
  canAddMyDomain,
  isProUser,
} from '../services/storage';

type SortOption = 'expiry' | 'name' | 'registrar' | 'recent';
type ViewMode = 'list' | 'form';

interface DomainFormData {
  domain: string;
  registrar: string;
  customRegistrar: string; // For "Other" option
  purchaseDate: string;
  expiryDate: string;
  autoRenew: boolean;
  registrationEmail: string;
  registrationPhone: string;
  domainEmail: string;
  dnsProvider: string;
  customDnsProvider: string; // For "Other" option
  hostingProvider: string;
  customHostingProvider: string; // For "Other" option
  notes: string;
}

const initialFormData: DomainFormData = {
  domain: '',
  registrar: '',
  customRegistrar: '',
  purchaseDate: '',
  expiryDate: '',
  autoRenew: false,
  registrationEmail: '',
  registrationPhone: '',
  domainEmail: '',
  dnsProvider: '',
  customDnsProvider: '',
  hostingProvider: '',
  customHostingProvider: '',
  notes: '',
};

interface MyDomainsTabProps {
  onUpgrade?: (reason?: string) => void;
}

export const MyDomainsTab: React.FC<MyDomainsTabProps> = ({ onUpgrade }) => {
  const [domains, setDomains] = useState<MyDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingDomain, setEditingDomain] = useState<MyDomain | null>(null);
  const [formData, setFormData] = useState<DomainFormData>(initialFormData);
  const [sortBy, setSortBy] = useState<SortOption>('expiry');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);

  // Load domains on mount
  useEffect(() => {
    loadDomains();
    isProUser().then(setIsPro);
  }, []);

  const loadDomains = async () => {
    setIsLoading(true);
    const data = await getMyDomains();
    setDomains(data);
    setIsLoading(false);
  };

  // Sort domains
  const sortedDomains = [...domains].sort((a, b) => {
    switch (sortBy) {
      case 'expiry':
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      case 'name':
        return a.domain.localeCompare(b.domain);
      case 'registrar':
        return a.registrar.localeCompare(b.registrar);
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  // Filter domains by search
  const filteredDomains = sortedDomains.filter(d =>
    d.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.registrar.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Expiring soon count
  const expiringSoonCount = domains.filter(d => getDaysUntilExpiry(d.expiryDate) <= 30).length;

  const handleAddClick = async () => {
    // Check limit before showing form (only for new domains, not edits)
    if (!editingDomain) {
      const limitCheck = await canAddMyDomain();
      if (!limitCheck.allowed) {
        onUpgrade?.('You\'ve reached the free plan limit of 3 domains. Upgrade to Lifetime to manage unlimited domains!');
        return;
      }
    }
    setLimitError(null);
    setViewMode('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check limit again on submit (for new domains)
    if (!editingDomain) {
      const limitCheck = await canAddMyDomain();
      if (!limitCheck.allowed) {
        onUpgrade?.('You\'ve reached the free plan limit of 3 domains. Upgrade to Lifetime to manage unlimited domains!');
        return;
      }
    }

    // Use custom values if "Other" is selected
    const finalRegistrar = formData.registrar === 'Other' && formData.customRegistrar.trim()
      ? formData.customRegistrar.trim()
      : formData.registrar;
    const finalDnsProvider = formData.dnsProvider === 'Other' && formData.customDnsProvider.trim()
      ? formData.customDnsProvider.trim()
      : formData.dnsProvider;
    const finalHostingProvider = formData.hostingProvider === 'Other' && formData.customHostingProvider.trim()
      ? formData.customHostingProvider.trim()
      : formData.hostingProvider;

    const domainData = {
      domain: formData.domain.toLowerCase().trim(),
      registrar: finalRegistrar,
      purchaseDate: formData.purchaseDate,
      expiryDate: formData.expiryDate,
      autoRenew: formData.autoRenew,
      registrationEmail: formData.registrationEmail || undefined,
      registrationPhone: formData.registrationPhone || undefined,
      domainEmail: formData.domainEmail || undefined,
      dnsProvider: finalDnsProvider || undefined,
      hostingProvider: finalHostingProvider || undefined,
      notes: formData.notes || undefined,
    };

    if (editingDomain) {
      await updateMyDomain(editingDomain.id, domainData);
    } else {
      await addMyDomain(domainData);
    }

    setFormData(initialFormData);
    setEditingDomain(null);
    setViewMode('list');
    loadDomains();
  };

  const handleEdit = (domain: MyDomain) => {
    setEditingDomain(domain);

    // Check if stored value is in the predefined lists, otherwise it's a custom value
    const isKnownRegistrar = DOMAIN_REGISTRARS.includes(domain.registrar as typeof DOMAIN_REGISTRARS[number]);
    const isKnownDns = DNS_PROVIDERS.includes(domain.dnsProvider as typeof DNS_PROVIDERS[number]);
    const isKnownHosting = HOSTING_PROVIDERS.includes(domain.hostingProvider as typeof HOSTING_PROVIDERS[number]);

    setFormData({
      domain: domain.domain,
      registrar: isKnownRegistrar ? domain.registrar : 'Other',
      customRegistrar: isKnownRegistrar ? '' : domain.registrar,
      purchaseDate: domain.purchaseDate,
      expiryDate: domain.expiryDate,
      autoRenew: domain.autoRenew,
      registrationEmail: domain.registrationEmail || '',
      registrationPhone: domain.registrationPhone || '',
      domainEmail: domain.domainEmail || '',
      dnsProvider: domain.dnsProvider ? (isKnownDns ? domain.dnsProvider : 'Other') : '',
      customDnsProvider: domain.dnsProvider && !isKnownDns ? domain.dnsProvider : '',
      hostingProvider: domain.hostingProvider ? (isKnownHosting ? domain.hostingProvider : 'Other') : '',
      customHostingProvider: domain.hostingProvider && !isKnownHosting ? domain.hostingProvider : '',
      notes: domain.notes || '',
    });
    setViewMode('form');
  };

  const handleDelete = async (id: string) => {
    await deleteMyDomain(id);
    setDeleteConfirmId(null);
    loadDomains();
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    setEditingDomain(null);
    setViewMode('list');
  };

  const handleBulkDownload = () => {
    if (domains.length === 0) return;

    // Prepare CSV content
    const headers = [
      'Domain',
      'Registrar',
      'Purchase Date',
      'Expiry Date',
      'Auto Renew',
      'Registration Email',
      'Registration Phone',
      'Domain Email',
      'DNS Provider',
      'Hosting Provider',
      'Notes',
    ];

    const rows = domains.map((d) => [
      d.domain,
      d.registrar,
      d.purchaseDate,
      d.expiryDate,
      d.autoRenew ? 'Yes' : 'No',
      d.registrationEmail || '',
      d.registrationPhone || '',
      d.domainEmail || '',
      d.dnsProvider || '',
      d.hostingProvider || '',
      d.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          // Escape commas and quotes in cell content
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ),
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my-domains-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-2 spinner" />
          <p className="text-sm text-gray-500">Loading domains...</p>
        </div>
      </div>
    );
  }

  // Form view
  if (viewMode === 'form') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-none px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h2 className="font-semibold text-gray-900">
              {editingDomain ? 'Edit Domain' : 'Add Domain'}
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Domain Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Domain Name *
            </label>
            <input
              type="text"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              placeholder="example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          {/* Registrar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registrar *
            </label>
            <select
              value={formData.registrar}
              onChange={(e) => setFormData({ ...formData, registrar: e.target.value, customRegistrar: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Select registrar...</option>
              {DOMAIN_REGISTRARS.map((reg) => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
            {/* Custom registrar input when "Other" is selected */}
            {formData.registrar === 'Other' && (
              <input
                type="text"
                value={formData.customRegistrar}
                onChange={(e) => setFormData({ ...formData, customRegistrar: e.target.value })}
                placeholder="Enter registrar name..."
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date *
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
          </div>

          {/* Auto Renew */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRenew"
              checked={formData.autoRenew}
              onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="autoRenew" className="text-sm text-gray-700">
              Auto-renew enabled
            </label>
          </div>

          {/* Registration Contact */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Registration Contact</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.registrationEmail}
                  onChange={(e) => setFormData({ ...formData, registrationEmail: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.registrationPhone}
                  onChange={(e) => setFormData({ ...formData, registrationPhone: e.target.value })}
                  placeholder="+1 234 567 8900"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Domain Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Domain Email
            </label>
            <input
              type="email"
              value={formData.domainEmail}
              onChange={(e) => setFormData({ ...formData, domainEmail: e.target.value })}
              placeholder="contact@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="mt-1 text-xs text-gray-500">Email address for this domain</p>
          </div>

          {/* Providers */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Service Providers</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">DNS Provider</label>
                <select
                  value={formData.dnsProvider}
                  onChange={(e) => setFormData({ ...formData, dnsProvider: e.target.value, customDnsProvider: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select DNS provider...</option>
                  {DNS_PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {/* Custom DNS provider input when "Other" is selected */}
                {formData.dnsProvider === 'Other' && (
                  <input
                    type="text"
                    value={formData.customDnsProvider}
                    onChange={(e) => setFormData({ ...formData, customDnsProvider: e.target.value })}
                    placeholder="Enter DNS provider name..."
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hosting Provider</label>
                <select
                  value={formData.hostingProvider}
                  onChange={(e) => setFormData({ ...formData, hostingProvider: e.target.value, customHostingProvider: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select hosting provider...</option>
                  {HOSTING_PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {/* Custom hosting provider input when "Other" is selected */}
                {formData.hostingProvider === 'Other' && (
                  <input
                    type="text"
                    value={formData.customHostingProvider}
                    onChange={(e) => setFormData({ ...formData, customHostingProvider: e.target.value })}
                    placeholder="Enter hosting provider name..."
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              {editingDomain ? 'Update' : 'Add Domain'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // List view
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-gray-900">My Domains</h2>
            <p className="text-xs text-gray-500">
              {domains.length} domain{domains.length !== 1 ? 's' : ''}
              {isPro
                ? <span className="text-green-500 ml-1">/ Unlimited</span>
                : <span className="text-gray-400"> / 3 max</span>
              }
              {expiringSoonCount > 0 && (
                <span className="ml-2 text-yellow-600">
                  • {expiringSoonCount} expiring soon
                </span>
              )}
            </p>
            {limitError && (
              <p className="text-xs text-amber-600 mt-1">{limitError}</p>
            )}
          </div>
          <div className="flex gap-2">
            {domains.length > 0 && (
              <button
                onClick={handleBulkDownload}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                title="Download as CSV"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export
              </button>
            )}
            <button
              onClick={handleAddClick}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add
            </button>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search domains..."
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="expiry">Expiry</option>
            <option value="name">Name</option>
            <option value="registrar">Registrar</option>
            <option value="recent">Recent</option>
          </select>
        </div>
      </div>

      {/* Domain List */}
      <div className="flex-1 overflow-y-auto">
        {filteredDomains.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No domains yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchQuery ? 'No domains match your search' : 'Add your first domain to start tracking'}
            </p>
            {limitError && (
              <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs text-center">
                {limitError}
              </div>
            )}
            {!searchQuery && (
              <button
                onClick={handleAddClick}
                className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Domain
              </button>
            )}
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {filteredDomains.map((domain) => {
              const expiry = getExpiryStatus(domain.expiryDate);
              const isExpanded = expandedId === domain.id;

              return (
                <div
                  key={domain.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  {/* Domain Header */}
                  <div
                    className="p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedId(isExpanded ? null : domain.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {domain.domain}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {domain.registrar}
                          {domain.autoRenew && (
                            <span className="ml-2 text-green-600">• Auto-renew</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${expiry.color}`}>
                          {expiry.label}
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-3 bg-gray-50">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-xs text-gray-500">Purchase Date</span>
                          <p className="text-gray-900">{new Date(domain.purchaseDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Expiry Date</span>
                          <p className="text-gray-900">{new Date(domain.expiryDate).toLocaleDateString()}</p>
                        </div>
                        {domain.registrationEmail && (
                          <div>
                            <span className="text-xs text-gray-500">Registration Email</span>
                            <p className="text-gray-900 truncate">{domain.registrationEmail}</p>
                          </div>
                        )}
                        {domain.registrationPhone && (
                          <div>
                            <span className="text-xs text-gray-500">Registration Phone</span>
                            <p className="text-gray-900">{domain.registrationPhone}</p>
                          </div>
                        )}
                        {domain.domainEmail && (
                          <div className="col-span-2">
                            <span className="text-xs text-gray-500">Domain Email</span>
                            <p className="text-gray-900">{domain.domainEmail}</p>
                          </div>
                        )}
                        {domain.dnsProvider && (
                          <div>
                            <span className="text-xs text-gray-500">DNS</span>
                            <p className="text-gray-900">{domain.dnsProvider}</p>
                          </div>
                        )}
                        {domain.hostingProvider && (
                          <div>
                            <span className="text-xs text-gray-500">Hosting</span>
                            <p className="text-gray-900">{domain.hostingProvider}</p>
                          </div>
                        )}
                        {domain.notes && (
                          <div className="col-span-2">
                            <span className="text-xs text-gray-500">Notes</span>
                            <p className="text-gray-700 text-sm whitespace-pre-wrap">{domain.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handleEdit(domain)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                          Edit
                        </button>
                        {deleteConfirmId === domain.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(domain.id)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(domain.id)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
