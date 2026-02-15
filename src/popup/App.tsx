import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { GenerateTab } from '../components/GenerateTab';
import { FavoritesTab } from '../components/FavoritesTab';
import { MyDomainsTab } from '../components/MyDomainsTab';
import { SettingsTab } from '../components/SettingsTab';
import { createCheckoutSession } from '../services/lemonsqueezy';

type Tab = 'generate' | 'favorites' | 'mydomains' | 'settings';

export const App: React.FC = () => {
  const { user, isLoading: authLoading, login, logout, startPlanPolling, refresh: refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string>('');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [showRefreshBanner, setShowRefreshBanner] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-hide refresh banner when plan becomes lifetime
  useEffect(() => {
    if (user?.plan === 'lifetime' && showRefreshBanner) {
      setShowRefreshBanner(false);
    }
  }, [user?.plan, showRefreshBanner]);

  // Global upgrade handler - can be called from any component
  const handleShowUpgrade = useCallback((reason?: string) => {
    setUpgradeReason(reason || '');
    setShowUpgradeModal(true);
  }, []);

  const handleCheckout = async () => {
    setIsProcessingCheckout(true);
    try {
      const { success, checkoutUrl, error } = await createCheckoutSession({
        email: user?.email,
        name: user?.displayName || undefined,
        customData: {
          firebaseUid: user?.uid || '',
          userId: user?.email || 'anonymous',
          source: 'chrome-extension',
        },
      });

      if (success && checkoutUrl) {
        window.open(checkoutUrl, '_blank');
        setShowUpgradeModal(false);
        setShowRefreshBanner(true);
        // Start polling for plan update after checkout
        startPlanPolling();
      } else {
        alert(`Failed to create checkout: ${error}`);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to open checkout. Please try again.');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'generate',
      label: 'Generate',
      icon: (
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
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
          />
        </svg>
      ),
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: (
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
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      ),
    },
    {
      id: 'mydomains',
      label: 'My Domains',
      icon: (
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
            d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"
          />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
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
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Global Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Upgrade to Lifetime</h2>
                    <p className="text-sm text-gray-500">One-time payment, unlimited forever</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Reason Banner */}
            {upgradeReason && (
              <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium">{upgradeReason}</p>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Unlimited Features */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-green-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Unlimited Access
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">Unlimited Bulk Checks</p>
                      <p className="text-sm text-gray-600">Check as many domains as you want, every day</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">Unlimited Favorites</p>
                      <p className="text-sm text-gray-600">Save as many favorite domains as you want</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">Unlimited My Domains</p>
                      <p className="text-sm text-gray-600">Track and manage unlimited domains in your portfolio</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Free vs Lifetime Comparison */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Free vs Lifetime</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="font-medium text-gray-700 mb-2">Free Plan</p>
                    <ul className="space-y-1 text-gray-600">
                      <li>30 bulk checks/day</li>
                      <li>3 favorites max</li>
                      <li>3 domains max</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg border border-primary-200">
                    <p className="font-medium text-primary-900 mb-2">Lifetime</p>
                    <ul className="space-y-1 text-primary-700">
                      <li>Unlimited checks</li>
                      <li>Unlimited favorites</li>
                      <li>Unlimited domains</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleCheckout}
                disabled={isProcessingCheckout}
                className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-semibold text-base hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingCheckout ? 'Opening checkout...' : 'Get Lifetime Access — $29'}
              </button>
              <p className="text-xs text-center text-gray-500">
                One-time payment. Lifetime access. No subscription.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Banner - shown after checkout */}
      {showRefreshBanner && user?.plan !== 'lifetime' && (
        <div className="flex-none bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-amber-800">Completed payment? Tap to activate your plan.</p>
            <button
              onClick={async () => {
                setIsRefreshing(true);
                await refreshUser();
                setIsRefreshing(false);
              }}
              disabled={isRefreshing}
              className="px-3 py-1 text-xs font-semibold bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {isRefreshing ? 'Checking...' : 'Refresh'}
            </button>
          </div>
        </div>
      )}
      {/* Header - FIXED */}
      <header className="flex-none bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={chrome.runtime.getURL('icons/icon48.png')}
              alt="EmptyDomai"
              className="w-7 h-7 rounded-lg"
            />
            <h1 className="font-semibold text-gray-900">EmptyDomai</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Upgrade badge for free users */}
            {user && user.plan !== 'lifetime' && (
              <button
                onClick={() => handleShowUpgrade()}
                className="px-2 py-1 text-[10px] font-bold bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full hover:from-primary-600 hover:to-primary-700 transition-all shadow-sm"
              >
                UPGRADE
              </button>
            )}
            {user && (
              <>
                {user.plan === 'lifetime' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full">
                    LIFETIME
                  </span>
                )}
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-xs text-primary-600 font-medium">
                      {(user.displayName || user.email)?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Tab Content - SCROLLABLE AREA */}
      {/* Using CSS to hide/show tabs instead of unmounting to preserve state */}
      <main className="flex-1 min-h-0 overflow-hidden relative">
        <div className={`absolute inset-0 ${activeTab === 'generate' ? '' : 'hidden'}`}>
          <GenerateTab onUpgrade={handleShowUpgrade} />
        </div>
        <div className={`absolute inset-0 ${activeTab === 'favorites' ? '' : 'hidden'}`}>
          <FavoritesTab onUpgrade={handleShowUpgrade} />
        </div>
        <div className={`absolute inset-0 ${activeTab === 'mydomains' ? '' : 'hidden'}`}>
          <MyDomainsTab onUpgrade={handleShowUpgrade} />
        </div>
        <div className={`absolute inset-0 ${activeTab === 'settings' ? '' : 'hidden'}`}>
          <SettingsTab onLogout={logout} onLogin={login} user={user} isAuthLoading={authLoading} onUpgrade={handleShowUpgrade} />
        </div>
      </main>

      {/* Tab Bar - FIXED */}
      <nav className="flex-none bg-white border-t border-gray-200">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
