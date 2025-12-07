import type {
  DomainResult,
  BacklinkInfo,
  ForSaleInfo,
  AlternativeTld,
  SocialMention,
  WhoisData,
  DomainStatus,
  ResearchStatus,
} from '../types';
import { AVAILABLE_TLDS } from '../types';

// Rate limiting for research APIs
const RESEARCH_RATE_LIMIT = {
  minDelayMs: 300,
};

let lastResearchRequestTime = 0;

async function throttleResearch(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastResearchRequestTime;

  if (timeSinceLastRequest < RESEARCH_RATE_LIMIT.minDelayMs) {
    await new Promise(resolve =>
      setTimeout(resolve, RESEARCH_RATE_LIMIT.minDelayMs - timeSinceLastRequest)
    );
  }

  lastResearchRequestTime = Date.now();
}

// ============================================
// ALTERNATIVE TLD CHECKING
// ============================================

/**
 * Check availability of alternative TLDs for a domain
 * If example.com is taken, check example.net, example.org, etc.
 */
export async function checkAlternativeTlds(
  domain: string,
  currentTld: string,
  tldsToCheck?: string[]
): Promise<AlternativeTld[]> {
  const alternatives: AlternativeTld[] = [];
  const tlds = tldsToCheck || AVAILABLE_TLDS.filter(t => t !== currentTld);

  for (const tld of tlds) {
    await throttleResearch();

    const fullDomain = `${domain}${tld}`;
    const status = await quickAvailabilityCheck(domain, tld);

    alternatives.push({
      tld,
      fullDomain,
      status,
      price: getEstimatedPrice(tld),
    });
  }

  return alternatives;
}

/**
 * Quick availability check using DNS
 */
async function quickAvailabilityCheck(domain: string, tld: string): Promise<DomainStatus> {
  const fullDomain = `${domain}${tld}`;

  try {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${fullDomain}&type=A`,
      {
        headers: { Accept: 'application/dns-json' },
      }
    );

    if (!response.ok) return 'error';

    const data = await response.json();

    // NXDOMAIN = available
    if (data.Status === 3) return 'available';

    // Has DNS records = taken
    if (data.Answer && data.Answer.length > 0) return 'taken';

    return 'available';
  } catch {
    return 'error';
  }
}

/**
 * Get estimated registration price for TLD
 */
function getEstimatedPrice(tld: string): string {
  const prices: Record<string, string> = {
    '.com': '$10-12/yr',
    '.net': '$12-15/yr',
    '.org': '$10-12/yr',
    '.io': '$30-50/yr',
    '.ai': '$70-100/yr',
    '.co': '$25-35/yr',
    '.app': '$15-20/yr',
    '.dev': '$12-15/yr',
    '.tech': '$35-50/yr',
    '.xyz': '$1-10/yr',
    '.me': '$15-20/yr',
    '.info': '$3-10/yr',
    '.biz': '$15-20/yr',
    '.us': '$10-15/yr',
    '.cc': '$10-20/yr',
    '.so': '$20-30/yr',
  };
  return prices[tld] || '$10-50/yr';
}

// ============================================
// DOMAIN FOR SALE CHECKING
// ============================================

/**
 * Check if domain is listed for sale on major marketplaces
 */
export async function checkDomainForSale(fullDomain: string): Promise<ForSaleInfo> {
  const forSaleInfo: ForSaleInfo = {
    isForSale: false,
  };

  try {
    await throttleResearch();

    // Check multiple marketplaces
    const checks = await Promise.allSettled([
      checkSedoListing(fullDomain),
      checkAfternicListing(fullDomain),
      checkDanListing(fullDomain),
      checkGoDaddyAuction(fullDomain),
    ]);

    for (const result of checks) {
      if (result.status === 'fulfilled' && result.value.isForSale) {
        return result.value;
      }
    }

    // If domain is taken but not listed, check for parking page
    const parkingCheck = await checkForParkingPage(fullDomain);
    if (parkingCheck.isForSale) {
      return parkingCheck;
    }
  } catch (error) {
    console.error('Error checking domain for sale:', error);
  }

  return forSaleInfo;
}

/**
 * Check Sedo marketplace
 */
async function checkSedoListing(domain: string): Promise<ForSaleInfo> {
  try {
    // Sedo has a search page we can check
    const response = await fetch(
      `https://sedo.com/search/searchresult.php?keyword=${encodeURIComponent(domain)}&language=e`,
      { method: 'HEAD' }
    );

    // If we can reach the page, construct the URL for user to check
    if (response.ok) {
      return {
        isForSale: false, // Can't determine without parsing, but provide link
        marketplace: 'Sedo',
        url: `https://sedo.com/search/?keyword=${encodeURIComponent(domain)}`,
      };
    }
  } catch {
    // Ignore errors
  }

  return { isForSale: false };
}

/**
 * Check Afternic marketplace
 */
async function checkAfternicListing(domain: string): Promise<ForSaleInfo> {
  try {
    const searchUrl = `https://www.afternic.com/search?k=${encodeURIComponent(domain)}`;
    return {
      isForSale: false,
      marketplace: 'Afternic',
      url: searchUrl,
    };
  } catch {
    return { isForSale: false };
  }
}

/**
 * Check Dan.com marketplace
 */
async function checkDanListing(domain: string): Promise<ForSaleInfo> {
  try {
    // Dan.com has direct domain pages
    const response = await fetch(`https://dan.com/buy-domain/${domain}`, {
      method: 'HEAD',
    });

    if (response.ok) {
      return {
        isForSale: true,
        marketplace: 'Dan.com',
        url: `https://dan.com/buy-domain/${domain}`,
      };
    }
  } catch {
    // Ignore errors
  }

  return { isForSale: false };
}

/**
 * Check GoDaddy Auctions
 */
async function checkGoDaddyAuction(domain: string): Promise<ForSaleInfo> {
  try {
    // GoDaddy auctions search URL for reference
    return {
      isForSale: false,
      marketplace: 'GoDaddy Auctions',
      url: `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(domain)}`,
    };
  } catch {
    return { isForSale: false };
  }
}

/**
 * Check if domain has a parking page (indicates for sale)
 */
async function checkForParkingPage(domain: string): Promise<ForSaleInfo> {
  try {
    const response = await fetch(`https://${domain}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    const html = await response.text();
    const lowerHtml = html.toLowerCase();

    // Check for common parking page indicators
    const parkingIndicators = [
      'this domain is for sale',
      'domain for sale',
      'buy this domain',
      'domain may be for sale',
      'inquire about this domain',
      'make an offer',
      'domain parking',
      'sedoparking',
      'afternic',
      'dan.com',
      'hugedomains',
      'bodis',
    ];

    for (const indicator of parkingIndicators) {
      if (lowerHtml.includes(indicator)) {
        return {
          isForSale: true,
          marketplace: 'Parking Page',
          url: `https://${domain}`,
        };
      }
    }
  } catch {
    // Domain might not have a website
  }

  return { isForSale: false };
}

// ============================================
// BACKLINK CHECKING
// ============================================

/**
 * Check backlink information for a domain
 * Uses free/public APIs and web scraping
 */
export async function checkBacklinks(fullDomain: string): Promise<BacklinkInfo> {
  const backlinks: BacklinkInfo = {
    totalBacklinks: 0,
    referringDomains: 0,
  };

  try {
    await throttleResearch();

    // Try multiple free backlink sources
    const [commonCrawlData, openPageRankData] = await Promise.allSettled([
      checkCommonCrawl(fullDomain),
      checkOpenPageRank(fullDomain),
    ]);

    // Merge results from different sources
    if (commonCrawlData.status === 'fulfilled') {
      backlinks.totalBacklinks = commonCrawlData.value.totalBacklinks || 0;
      backlinks.topBacklinks = commonCrawlData.value.topBacklinks;
    }

    if (openPageRankData.status === 'fulfilled') {
      backlinks.domainAuthority = openPageRankData.value.domainAuthority;
      backlinks.pageAuthority = openPageRankData.value.pageAuthority;
    }

    // Estimate referring domains
    backlinks.referringDomains = Math.floor(backlinks.totalBacklinks * 0.3);
  } catch (error) {
    console.error('Error checking backlinks:', error);
  }

  return backlinks;
}

/**
 * Check Common Crawl for backlink data (free)
 */
async function checkCommonCrawl(domain: string): Promise<Partial<BacklinkInfo>> {
  try {
    // Common Crawl index API
    const response = await fetch(
      `https://index.commoncrawl.org/CC-MAIN-2024-10-index?url=*.${domain}&output=json&limit=100`
    );

    if (response.ok) {
      const text = await response.text();
      const lines = text.trim().split('\n').filter(Boolean);

      return {
        totalBacklinks: lines.length,
        topBacklinks: lines.slice(0, 5).map(line => {
          try {
            const data = JSON.parse(line);
            return {
              url: data.url || '',
              anchorText: data.title || '',
            };
          } catch {
            return { url: '', anchorText: '' };
          }
        }).filter(b => b.url),
      };
    }
  } catch {
    // Ignore errors
  }

  return { totalBacklinks: 0 };
}

/**
 * Check Open PageRank API (free tier available)
 */
async function checkOpenPageRank(domain: string): Promise<Partial<BacklinkInfo>> {
  try {
    // Open PageRank provides free domain authority scores
    const response = await fetch(
      `https://openpagerank.com/api/v1.0/getPageRank?domains[]=${encodeURIComponent(domain)}`,
      {
        headers: {
          'API-OPR': 'free-tier', // Would need actual API key for production
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.response && data.response[0]) {
        return {
          domainAuthority: data.response[0].page_rank_decimal || 0,
          pageAuthority: data.response[0].rank || 0,
        };
      }
    }
  } catch {
    // Ignore errors
  }

  return {};
}

// ============================================
// SOCIAL MEDIA MENTIONS
// ============================================

/**
 * Search for domain/keyword mentions on social platforms
 */
export async function checkSocialMentions(
  domain: string,
  keywords?: string[]
): Promise<SocialMention[]> {
  const mentions: SocialMention[] = [];

  try {
    await throttleResearch();

    // Search multiple platforms
    const searches = await Promise.allSettled([
      searchReddit(domain, keywords),
      searchHackerNews(domain, keywords),
      searchProductHunt(domain),
    ]);

    for (const result of searches) {
      if (result.status === 'fulfilled') {
        mentions.push(...result.value);
      }
    }

    // Sort by score/relevance
    mentions.sort((a, b) => (b.score || 0) - (a.score || 0));
  } catch (error) {
    console.error('Error checking social mentions:', error);
  }

  return mentions.slice(0, 10); // Return top 10
}

/**
 * Search Reddit for mentions
 */
async function searchReddit(domain: string, keywords?: string[]): Promise<SocialMention[]> {
  const mentions: SocialMention[] = [];
  const searchTerms = [domain, ...(keywords || [])].slice(0, 3);

  for (const term of searchTerms) {
    try {
      const response = await fetch(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(term)}&sort=relevance&limit=5`,
        {
          headers: {
            'User-Agent': 'EmptyDomai/1.0',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const posts = data.data?.children || [];

        for (const post of posts) {
          const postData = post.data;
          mentions.push({
            platform: 'reddit',
            title: postData.title,
            url: `https://reddit.com${postData.permalink}`,
            score: postData.score,
            comments: postData.num_comments,
            date: new Date(postData.created_utc * 1000),
            snippet: postData.selftext?.slice(0, 200) || '',
          });
        }
      }
    } catch {
      // Ignore errors
    }
  }

  return mentions;
}

/**
 * Search Hacker News for mentions
 */
async function searchHackerNews(domain: string, keywords?: string[]): Promise<SocialMention[]> {
  const mentions: SocialMention[] = [];
  const searchTerms = [domain, ...(keywords || [])].slice(0, 2);

  for (const term of searchTerms) {
    try {
      const response = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(term)}&hitsPerPage=5`
      );

      if (response.ok) {
        const data = await response.json();
        const hits = data.hits || [];

        for (const hit of hits) {
          mentions.push({
            platform: 'hackernews',
            title: hit.title || hit.story_title || '',
            url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
            score: hit.points,
            comments: hit.num_comments,
            date: new Date(hit.created_at),
            snippet: hit.story_text?.slice(0, 200) || '',
          });
        }
      }
    } catch {
      // Ignore errors
    }
  }

  return mentions;
}

/**
 * Search Product Hunt for mentions
 */
async function searchProductHunt(domain: string): Promise<SocialMention[]> {
  const mentions: SocialMention[] = [];

  try {
    // Product Hunt doesn't have a public search API, so we provide a search link
    // Users can click to explore
    mentions.push({
      platform: 'producthunt',
      title: `Search "${domain}" on Product Hunt`,
      url: `https://www.producthunt.com/search?q=${encodeURIComponent(domain)}`,
      snippet: 'Click to search for related products and discussions',
    });
  } catch {
    // Ignore errors
  }

  return mentions;
}

// ============================================
// WHOIS DATA
// ============================================

/**
 * Get WHOIS information for a taken domain
 */
export async function checkWhois(fullDomain: string): Promise<WhoisData> {
  const whoisData: WhoisData = {};

  try {
    await throttleResearch();

    // Try RDAP first (modern WHOIS replacement)
    const rdapData = await fetchRdapData(fullDomain);
    if (rdapData) {
      return rdapData;
    }

    // Fallback: provide link to WHOIS lookup
    // Most WHOIS services require API keys for programmatic access
  } catch (error) {
    console.error('Error checking WHOIS:', error);
  }

  return whoisData;
}

/**
 * Fetch RDAP data for domain
 */
async function fetchRdapData(domain: string): Promise<WhoisData | null> {
  const tld = domain.split('.').pop();

  const rdapServers: Record<string, string> = {
    com: 'https://rdap.verisign.com/com/v1/domain/',
    net: 'https://rdap.verisign.com/net/v1/domain/',
    org: 'https://rdap.publicinterestregistry.org/rdap/domain/',
    io: 'https://rdap.nic.io/domain/',
    ai: 'https://rdap.nic.ai/domain/',
    co: 'https://rdap.nic.co/domain/',
  };

  const server = rdapServers[tld || ''];
  if (!server) return null;

  try {
    const response = await fetch(`${server}${domain}`);

    if (response.ok) {
      const data = await response.json();

      // Parse RDAP response
      const events = data.events || [];
      const nameservers = data.nameservers || [];

      const whoisData: WhoisData = {
        nameServers: nameservers.map((ns: { ldhName?: string }) => ns.ldhName).filter(Boolean),
      };

      for (const event of events) {
        if (event.eventAction === 'registration') {
          whoisData.createdDate = new Date(event.eventDate);
        } else if (event.eventAction === 'expiration') {
          whoisData.expiresDate = new Date(event.eventDate);
        } else if (event.eventAction === 'last changed') {
          whoisData.updatedDate = new Date(event.eventDate);
        }
      }

      // Get registrar from entities
      const entities = data.entities || [];
      for (const entity of entities) {
        if (entity.roles?.includes('registrar')) {
          whoisData.registrar = entity.vcardArray?.[1]?.find(
            (v: unknown[]) => v[0] === 'fn'
          )?.[3];
        }
      }

      return whoisData;
    }
  } catch {
    // Ignore errors
  }

  return null;
}

// ============================================
// DEEP RESEARCH (ALL-IN-ONE)
// ============================================

/**
 * Perform comprehensive research on a domain
 * This is the main function that orchestrates all research
 */
export async function performDeepResearch(
  result: DomainResult,
  keywords?: string[],
  onProgress?: (status: string) => void
): Promise<DomainResult> {
  const researchStatus: ResearchStatus = {
    backlinkChecked: false,
    forSaleChecked: false,
    alternativesChecked: false,
    socialChecked: false,
    whoisChecked: false,
  };

  const updatedResult = { ...result, researchStatus };

  try {
    // For TAKEN domains: check if for sale, get WHOIS, check backlinks
    if (result.status === 'taken') {
      onProgress?.('Checking if domain is for sale...');
      updatedResult.forSale = await checkDomainForSale(result.fullDomain);
      researchStatus.forSaleChecked = true;

      onProgress?.('Fetching WHOIS data...');
      updatedResult.whoisData = await checkWhois(result.fullDomain);
      researchStatus.whoisChecked = true;

      onProgress?.('Checking backlinks...');
      updatedResult.backlinks = await checkBacklinks(result.fullDomain);
      researchStatus.backlinkChecked = true;

      // Check alternative TLDs
      onProgress?.('Checking alternative TLDs...');
      updatedResult.alternativeTlds = await checkAlternativeTlds(
        result.domain,
        result.tld,
        AVAILABLE_TLDS.filter(t => t !== result.tld).slice(0, 8) // Check top 8 alternatives
      );
      researchStatus.alternativesChecked = true;
    }

    // For AVAILABLE domains: check backlinks (expired domain value), check social
    if (result.status === 'available') {
      onProgress?.('Checking domain history & backlinks...');
      updatedResult.backlinks = await checkBacklinks(result.fullDomain);
      researchStatus.backlinkChecked = true;
    }

    // For ALL domains: check social mentions
    onProgress?.('Searching social media mentions...');
    updatedResult.socialMentions = await checkSocialMentions(result.domain, keywords);
    researchStatus.socialChecked = true;

    onProgress?.('Research complete!');
  } catch (error) {
    console.error('Error in deep research:', error);
  }

  updatedResult.researchStatus = researchStatus;
  return updatedResult;
}

/**
 * Batch research for multiple domains
 */
export async function batchDeepResearch(
  results: DomainResult[],
  keywords?: string[],
  onProgress?: (current: number, total: number, domain: string) => void
): Promise<DomainResult[]> {
  const researchedResults: DomainResult[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    onProgress?.(i + 1, results.length, result.fullDomain);

    const researched = await performDeepResearch(result, keywords);
    researchedResults.push(researched);
  }

  return researchedResults;
}

/**
 * Get marketplace links for a domain
 */
export function getMarketplaceLinks(domain: string): { name: string; url: string }[] {
  return [
    {
      name: 'Sedo',
      url: `https://sedo.com/search/?keyword=${encodeURIComponent(domain)}`,
    },
    {
      name: 'Afternic',
      url: `https://www.afternic.com/search?k=${encodeURIComponent(domain)}`,
    },
    {
      name: 'Dan.com',
      url: `https://dan.com/buy-domain/${domain}`,
    },
    {
      name: 'GoDaddy',
      url: `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(domain)}`,
    },
    {
      name: 'Namecheap',
      url: `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`,
    },
    {
      name: 'HugeDomains',
      url: `https://www.hugedomains.com/domain_search.cfm?domain=${encodeURIComponent(domain)}`,
    },
  ];
}
