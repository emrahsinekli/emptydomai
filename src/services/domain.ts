import type { DomainResult, DomainStatus } from '../types';
import { getRegistrarLinks } from '../types';

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerSecond: 5,
  minDelayMs: 200,
};

// Queue for domain checks
let checkQueue: Promise<void> = Promise.resolve();
let lastRequestTime = 0;

// Throttle function to respect rate limits
async function throttle(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT.minDelayMs) {
    await new Promise(resolve =>
      setTimeout(resolve, RATE_LIMIT.minDelayMs - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
}

// Check domain availability using multiple methods
export async function checkDomainAvailability(
  domain: string,
  tld: string
): Promise<DomainStatus> {
  const fullDomain = `${domain}${tld}`;

  try {
    await throttle();

    // Method 1: DNS-based check using public DNS resolver
    // This is a simple heuristic - domains with DNS records are likely taken
    const isAvailable = await dnsCheck(fullDomain);
    return isAvailable ? 'available' : 'taken';
  } catch {
    // If DNS check fails, try alternative method
    try {
      const isAvailable = await rdapCheck(fullDomain);
      return isAvailable ? 'available' : 'taken';
    } catch {
      return 'error';
    }
  }
}

// DNS-based availability check
async function dnsCheck(domain: string): Promise<boolean> {
  try {
    // Using Cloudflare's DNS over HTTPS API
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=A`,
      {
        headers: {
          Accept: 'application/dns-json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('DNS query failed');
    }

    const data = await response.json();

    // If we get NXDOMAIN (Status 3) or no Answer, domain might be available
    // Status 0 = NOERROR, Status 3 = NXDOMAIN
    if (data.Status === 3) {
      return true; // Likely available
    }

    // If there are answers, domain is likely taken
    if (data.Answer && data.Answer.length > 0) {
      return false; // Taken
    }

    // No records but no NXDOMAIN - might still be registered but not configured
    return true; // Consider available for user to verify
  } catch {
    throw new Error('DNS check failed');
  }
}

// RDAP (Registration Data Access Protocol) check - fallback method
async function rdapCheck(domain: string): Promise<boolean> {
  try {
    // Extract TLD for RDAP server lookup
    const tld = domain.split('.').pop();

    // Known RDAP servers for common TLDs
    const rdapServers: Record<string, string> = {
      com: 'https://rdap.verisign.com/com/v1/domain/',
      net: 'https://rdap.verisign.com/net/v1/domain/',
      org: 'https://rdap.publicinterestregistry.org/rdap/domain/',
      io: 'https://rdap.nic.io/domain/',
      ai: 'https://rdap.nic.ai/domain/',
      co: 'https://rdap.nic.co/domain/',
    };

    const server = rdapServers[tld || ''];
    if (!server) {
      // For unknown TLDs, assume we can't check
      throw new Error('RDAP server not known for this TLD');
    }

    const response = await fetch(`${server}${domain}`, {
      method: 'HEAD', // Just check if resource exists
    });

    // 404 = domain not found = available
    // 200 = domain found = taken
    return response.status === 404;
  } catch {
    throw new Error('RDAP check failed');
  }
}

// Batch check multiple domains
export async function checkDomainsAvailability(
  domains: string[],
  tlds: string[],
  onProgress?: (result: DomainResult, index: number, total: number) => void
): Promise<DomainResult[]> {
  const results: DomainResult[] = [];
  const total = domains.length * tlds.length;
  let index = 0;

  for (const domain of domains) {
    for (const tld of tlds) {
      const fullDomain = `${domain}${tld}`;

      // Create initial result with checking status
      const result: DomainResult = {
        domain,
        tld,
        fullDomain,
        status: 'checking',
        registrarLinks: getRegistrarLinks(fullDomain),
      };

      // Report checking status
      if (onProgress) {
        onProgress({ ...result }, index, total);
      }

      // Queue the check
      checkQueue = checkQueue.then(async () => {
        const status = await checkDomainAvailability(domain, tld);
        result.status = status;

        // Report final status
        if (onProgress) {
          onProgress({ ...result }, index, total);
        }
      });

      await checkQueue;
      results.push(result);
      index++;
    }
  }

  return results;
}

// Single domain full check (with all specified TLDs)
export async function checkSingleDomain(
  domain: string,
  tlds: string[]
): Promise<DomainResult[]> {
  const results: DomainResult[] = [];

  for (const tld of tlds) {
    const fullDomain = `${domain}${tld}`;
    const status = await checkDomainAvailability(domain, tld);

    results.push({
      domain,
      tld,
      fullDomain,
      status,
      registrarLinks: getRegistrarLinks(fullDomain),
    });
  }

  return results;
}

// Parse domain from full domain string
export function parseDomain(fullDomain: string): { domain: string; tld: string } | null {
  const tldPattern = /\.(com|io|ai|co|net|org|app|dev|tech|xyz|me|info|biz|us|cc|so)$/i;
  const match = fullDomain.match(tldPattern);

  if (!match) return null;

  const tld = match[0].toLowerCase();
  const domain = fullDomain.slice(0, -tld.length).toLowerCase();

  return { domain, tld };
}

// Validate domain name format
export function isValidDomainName(domain: string): boolean {
  // Domain name rules:
  // - 1-63 characters
  // - Only alphanumeric and hyphens
  // - Cannot start or end with hyphen
  // - Cannot have consecutive hyphens at positions 3-4 (for IDN)
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return domainRegex.test(domain) && !domain.includes('--');
}

// Clean and normalize domain name
export function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9-]/g, '');
}
