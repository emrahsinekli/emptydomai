// Real-time price scraping service
// Fetches actual prices from registrar websites when user clicks "Details"

export interface ScrapedPrice {
  registrar: string;
  price: number | null;
  currency: string;
  url: string;
  isLocal: boolean;
  error?: string;
  renewalPrice?: number | null;
  canScrape: boolean; // Whether we can actually scrape this registrar
}

export interface ScrapedPricingResult {
  domain: string;
  tld: string;
  prices: ScrapedPrice[];
  cheapest: ScrapedPrice | null;
  fetchedAt: Date;
  isLoading: boolean;
}

// Registrar configurations for scraping
export interface RegistrarScraperConfig {
  name: string;
  searchUrl: (domain: string) => string;
  // For POST requests
  method?: 'GET' | 'POST';
  // POST endpoint (different from search URL for display)
  apiEndpoint?: (domain: string) => string;
  // Form data builder for POST requests
  formData?: (domain: string) => Record<string, string>;
  // Whether we can actually scrape (false = just show link)
  canScrape: boolean;
  isLocal?: boolean;
  country?: string;
}

// Global registrars - these block scraping, just provide links
const GLOBAL_SCRAPERS: RegistrarScraperConfig[] = [
  {
    name: 'Namecheap',
    searchUrl: (d) => `https://www.namecheap.com/domains/registration/results/?domain=${d}`,
    canScrape: false, // Requires API key with approval
  },
  {
    name: 'Porkbun',
    searchUrl: (d) => `https://porkbun.com/checkout/search?q=${d}`,
    canScrape: false, // Uses complex JavaScript hashing
  },
  {
    name: 'GoDaddy',
    searchUrl: (d) => `https://www.godaddy.com/domainsearch/find?domainToCheck=${d}`,
    canScrape: false, // Requires API key with 50+ domains
  },
  {
    name: 'Cloudflare',
    searchUrl: (d) => `https://dash.cloudflare.com/?to=/:account/domains/register/${d}`,
    canScrape: false, // Requires login
  },
];

// Turkish local registrars - these can be scraped with POST requests
const TR_SCRAPERS: RegistrarScraperConfig[] = [
  {
    name: 'İsimTescil',
    searchUrl: (d) => `https://www.isimtescil.net/domain/${d}`,
    method: 'POST',
    apiEndpoint: () => 'https://www.isimtescil.net/domain/domain-sorgula',
    formData: (d) => ({ 'domain': d.split('.')[0], 'extension': '.' + d.split('.').slice(1).join('.') }),
    canScrape: true,
    isLocal: true,
    country: 'TR',
  },
  {
    name: 'Natro',
    searchUrl: (d) => `https://www.natro.com/domain-sorgulama?domain=${d}`,
    method: 'POST',
    apiEndpoint: () => 'https://www.natro.com/domain-sorgulama/sonuc',
    formData: (d) => ({ 'domain-text': d.split('.')[0] }),
    canScrape: true,
    isLocal: true,
    country: 'TR',
  },
];

// German local registrars
const DE_SCRAPERS: RegistrarScraperConfig[] = [
  {
    name: 'IONOS',
    searchUrl: (d) => `https://www.ionos.de/domains/domain-check?domain=${d}`,
    canScrape: false, // Uses complex JavaScript
    isLocal: true,
    country: 'DE',
  },
];

// Country-specific scrapers map
const COUNTRY_SCRAPERS: Record<string, RegistrarScraperConfig[]> = {
  TR: TR_SCRAPERS,
  DE: DE_SCRAPERS,
};

// Get scrapers for a country
export function getScrapersForCountry(countryCode: string): RegistrarScraperConfig[] {
  const localScrapers = COUNTRY_SCRAPERS[countryCode] || [];
  return [...localScrapers, ...GLOBAL_SCRAPERS];
}

// Request price scraping via background script
export async function scrapeRealPrices(
  domain: string,
  tld: string,
  countryCode: string = 'US'
): Promise<ScrapedPricingResult> {
  const fullDomain = domain + tld;
  const scrapers = getScrapersForCountry(countryCode);

  try {
    // Send message to background script to do the scraping
    const response = await chrome.runtime.sendMessage({
      type: 'SCRAPE_PRICES',
      payload: {
        domain: fullDomain,
        tld,
        countryCode,
        registrars: scrapers.map(s => ({
          name: s.name,
          url: s.searchUrl(fullDomain),
          isLocal: s.isLocal || false,
          canScrape: s.canScrape,
          method: s.method || 'GET',
          apiEndpoint: s.apiEndpoint ? s.apiEndpoint(fullDomain) : null,
          formData: s.formData ? s.formData(fullDomain) : null,
        })),
      },
    });

    if (response && response.success && response.data) {
      const prices = response.data as ScrapedPrice[];
      const validPrices = prices.filter(p => p.price !== null && !p.error);
      validPrices.sort((a, b) => (a.price || 999) - (b.price || 999));

      return {
        domain,
        tld,
        prices,
        cheapest: validPrices.length > 0 ? validPrices[0] : null,
        fetchedAt: new Date(),
        isLoading: false,
      };
    }

    throw new Error(response?.error || 'Failed to scrape prices');
  } catch (error) {
    console.error('Price scraping failed:', error);

    // Return empty result with error
    return {
      domain,
      tld,
      prices: scrapers.map(s => ({
        registrar: s.name,
        price: null,
        currency: 'USD',
        url: s.searchUrl(fullDomain),
        isLocal: s.isLocal || false,
        canScrape: s.canScrape,
        error: 'Failed to fetch',
      })),
      cheapest: null,
      fetchedAt: new Date(),
      isLoading: false,
    };
  }
}

// Format scraped price for display
export function formatScrapedPrice(price: ScrapedPrice): string {
  if (price.error || price.price === null) {
    return 'Check price →';
  }

  const symbol = price.currency === 'TRY' ? '₺' :
                 price.currency === 'EUR' ? '€' :
                 price.currency === 'GBP' ? '£' : '$';

  return `${symbol}${price.price.toFixed(2)}`;
}
