// LemonSqueezy Payment Integration Service

export interface CheckoutOptions {
  email?: string;
  name?: string;
  customData?: Record<string, any>;
}

export interface CheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
}

// LemonSqueezy Store Configuration
// TODO: Replace with your actual LemonSqueezy credentials
const LEMONSQUEEZY_CONFIG = {
  checkoutId: 'a309c1d4-5316-4e89-a28f-6477e5403c1f',
};

/**
 * Create a checkout session for Lifetime upgrade
 * This generates a LemonSqueezy checkout URL
 */
export async function createCheckoutSession(
  options: CheckoutOptions = {}
): Promise<CheckoutResponse> {
  try {
    const { email, name, customData } = options;

    // Build checkout URL with pre-filled data
    const checkoutUrl = new URL(
      `https://emptydomai.lemonsqueezy.com/checkout/buy/${LEMONSQUEEZY_CONFIG.checkoutId}`
    );

    // Add checkout parameters
    if (email) {
      checkoutUrl.searchParams.append('checkout[email]', email);
    }
    if (name) {
      checkoutUrl.searchParams.append('checkout[name]', name);
    }

    // Add custom data (will be sent to webhook)
    if (customData) {
      Object.entries(customData).forEach(([key, value]) => {
        checkoutUrl.searchParams.append(
          `checkout[custom][${key}]`,
          String(value)
        );
      });
    }

    // Embed mode (optional - for overlay)
    // checkoutUrl.searchParams.append('embed', '1');

    return {
      success: true,
      checkoutUrl: checkoutUrl.toString(),
    };
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Initialize LemonSqueezy Overlay (for in-app checkout)
 * This loads the LemonSqueezy.js SDK for overlay checkout
 */
export function initializeLemonSqueezyOverlay() {
  return new Promise<void>((resolve, reject) => {
    // Check if already loaded
    if (window.LemonSqueezy) {
      window.LemonSqueezy.Setup({
        eventHandler: (event: any) => {
          if (event.event === 'Checkout.Success') {
            handleCheckoutSuccess(event.data);
          }
        },
      });
      resolve();
      return;
    }

    // Load LemonSqueezy.js script
    const script = document.createElement('script');
    script.src = 'https://app.lemonsqueezy.com/js/lemon.js';
    script.async = true;
    script.onload = () => {
      if (window.LemonSqueezy) {
        window.LemonSqueezy.Setup({
          eventHandler: (event: any) => {
            if (event.event === 'Checkout.Success') {
              handleCheckoutSuccess(event.data);
            }
          },
        });
        resolve();
      } else {
        reject(new Error('LemonSqueezy failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load LemonSqueezy script'));
    document.head.appendChild(script);
  });
}

/**
 * Open checkout in overlay mode
 */
export async function openCheckoutOverlay(options: CheckoutOptions = {}) {
  try {
    // Ensure LemonSqueezy is loaded
    await initializeLemonSqueezyOverlay();

    const { checkoutUrl } = await createCheckoutSession(options);

    if (!checkoutUrl) {
      throw new Error('Failed to create checkout URL');
    }

    // Open overlay
    if (window.LemonSqueezy) {
      window.LemonSqueezy.Url.Open(checkoutUrl);
    } else {
      // Fallback: open in new tab
      window.open(checkoutUrl, '_blank');
    }
  } catch (error) {
    console.error('Failed to open checkout overlay:', error);
    throw error;
  }
}

/**
 * Handle successful checkout
 * Called when payment is completed
 */
function handleCheckoutSuccess(data: any) {
  console.log('Checkout successful!', data);

  // Store purchase info locally
  const purchaseInfo = {
    orderId: data.order_id,
    email: data.customer_email,
    purchasedAt: new Date().toISOString(),
  };

  chrome.storage.local.set({ lifetimePurchase: purchaseInfo });

  // Update user plan to lifetime
  chrome.storage.local.set({ USER_PLAN: 'lifetime' });

  // Show success message
  alert('🎉 Purchase successful! You now have lifetime access.');

  // Reload to update UI
  window.location.reload();
}

/**
 * Verify if user has lifetime access
 * This checks local storage for purchase record
 * In production, you should verify with your backend/webhook
 */
export async function verifyLifetimeAccess(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['lifetimePurchase', 'USER_PLAN'], (result) => {
      const hasLocalPurchase = !!result.lifetimePurchase;
      const isPlanLifetime = result.USER_PLAN === 'lifetime';
      resolve(hasLocalPurchase || isPlanLifetime);
    });
  });
}

/**
 * Get purchase details
 */
export async function getPurchaseDetails() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['lifetimePurchase'], (result) => {
      resolve(result.lifetimePurchase || null);
    });
  });
}

// TypeScript declarations
declare global {
  interface Window {
    LemonSqueezy?: {
      Setup: (config: { eventHandler: (event: any) => void }) => void;
      Url: {
        Open: (url: string) => void;
        Close: () => void;
      };
    };
  }
}
