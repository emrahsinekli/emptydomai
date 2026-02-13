import type { AIProvider } from '../types';
import { getAPIKey } from './storage';

export interface WhoisInfo {
  domainName: string;
  registrar?: string;
  createdDate?: string;
  expiryDate?: string;
  updatedDate?: string;
  nameServers?: string[];
  status?: string[];
  registrantOrg?: string;
  registrantCountry?: string;
  dnssec?: string;
  age?: number; // Domain age in years
  daysUntilExpiry?: number;
  isExpiringSoon?: boolean; // < 30 days
  error?: string;
}

// RDAP servers for different TLDs
const RDAP_SERVERS: Record<string, string> = {
  'com': 'https://rdap.verisign.com/com/v1/domain/',
  'net': 'https://rdap.verisign.com/net/v1/domain/',
  'org': 'https://rdap.publicinterestregistry.org/rdap/domain/',
  'io': 'https://rdap.identitydigital.services/rdap/v1/domain/',
  'ai': 'https://rdap.identitydigital.services/rdap/v1/domain/',
  'co': 'https://rdap.identitydigital.services/rdap/v1/domain/',
  'dev': 'https://rdap.nic.google/domain/',
  'app': 'https://rdap.nic.google/domain/',
  'xyz': 'https://rdap.centralnic.com/xyz/domain/',
  'me': 'https://rdap.identitydigital.services/rdap/v1/domain/',
  'tech': 'https://rdap.centralnic.com/tech/domain/',
  'info': 'https://rdap.identitydigital.services/rdap/v1/domain/',
  'biz': 'https://rdap.identitydigital.services/rdap/v1/domain/',
  'cc': 'https://rdap.verisign.com/cc/v1/domain/',
  'tv': 'https://rdap.verisign.com/tv/v1/domain/',
};

// Parse RDAP response to WhoisInfo
function parseRdapResponse(data: Record<string, unknown>, domain: string): WhoisInfo {
  const info: WhoisInfo = {
    domainName: domain,
  };

  try {
    // Get domain name
    if (data.ldhName) {
      info.domainName = data.ldhName as string;
    }

    // Get events (dates)
    if (Array.isArray(data.events)) {
      for (const event of data.events) {
        const eventObj = event as Record<string, unknown>;
        if (eventObj.eventAction === 'registration') {
          info.createdDate = formatDate(eventObj.eventDate as string);
        } else if (eventObj.eventAction === 'expiration') {
          info.expiryDate = formatDate(eventObj.eventDate as string);
          // Calculate days until expiry
          const expiryDate = new Date(eventObj.eventDate as string);
          const now = new Date();
          const diffTime = expiryDate.getTime() - now.getTime();
          info.daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          info.isExpiringSoon = info.daysUntilExpiry <= 30;
        } else if (eventObj.eventAction === 'last changed') {
          info.updatedDate = formatDate(eventObj.eventDate as string);
        }
      }
    }

    // Calculate domain age
    if (info.createdDate) {
      const created = new Date(info.createdDate);
      const now = new Date();
      info.age = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 365));
    }

    // Get nameservers
    if (Array.isArray(data.nameservers)) {
      info.nameServers = data.nameservers.map((ns: Record<string, unknown>) =>
        (ns.ldhName as string || '').toLowerCase()
      );
    }

    // Get status
    if (Array.isArray(data.status)) {
      info.status = data.status as string[];
    }

    // Get registrar from entities
    if (Array.isArray(data.entities)) {
      for (const entity of data.entities) {
        const entityObj = entity as Record<string, unknown>;
        if (Array.isArray(entityObj.roles) && entityObj.roles.includes('registrar')) {
          const vcardArray = entityObj.vcardArray as unknown[];
          if (Array.isArray(vcardArray) && vcardArray.length > 1) {
            const vcard = vcardArray[1] as unknown[][];
            for (const item of vcard) {
              if (item[0] === 'fn') {
                info.registrar = item[3] as string;
              }
            }
          }
          // Also check publicIds for registrar name
          if (Array.isArray(entityObj.publicIds)) {
            for (const pubId of entityObj.publicIds) {
              const pubIdObj = pubId as Record<string, unknown>;
              if (pubIdObj.type === 'IANA Registrar ID') {
                // Try to get registrar name from handle
                if (entityObj.handle && !info.registrar) {
                  info.registrar = entityObj.handle as string;
                }
              }
            }
          }
        }
        // Get registrant info
        if (Array.isArray(entityObj.roles) && entityObj.roles.includes('registrant')) {
          const vcardArray = entityObj.vcardArray as unknown[];
          if (Array.isArray(vcardArray) && vcardArray.length > 1) {
            const vcard = vcardArray[1] as unknown[][];
            for (const item of vcard) {
              if (item[0] === 'org') {
                info.registrantOrg = item[3] as string;
              }
              if (item[0] === 'adr' && Array.isArray(item[3])) {
                const adr = item[3] as string[];
                info.registrantCountry = adr[6] || undefined;
              }
            }
          }
        }
      }
    }

    // Get DNSSEC
    if (data.secureDNS) {
      const secureDNS = data.secureDNS as Record<string, unknown>;
      info.dnssec = secureDNS.delegationSigned ? 'signed' : 'unsigned';
    }

  } catch (error) {
    console.error('Error parsing RDAP response:', error);
  }

  return info;
}

// Format date to readable format
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// Fallback RDAP bootstrap URL
const RDAP_BOOTSTRAP = 'https://rdap.org/domain/';

// Fetch WHOIS info using RDAP protocol
export async function fetchWhoisInfo(domain: string): Promise<WhoisInfo> {
  const parts = domain.split('.');
  const tld = parts[parts.length - 1].toLowerCase();
  const rdapServer = RDAP_SERVERS[tld];

  // Try specific RDAP server first, then fallback to bootstrap
  const serversToTry = rdapServer
    ? [rdapServer + domain, RDAP_BOOTSTRAP + domain]
    : [RDAP_BOOTSTRAP + domain];

  for (const url of serversToTry) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/rdap+json',
        },
      });

      if (response.status === 404) {
        return {
          domainName: domain,
          error: 'Domain not registered',
        };
      }

      if (!response.ok) {
        console.warn(`RDAP request to ${url} failed: ${response.status}`);
        continue; // Try next server
      }

      const data = await response.json();
      return parseRdapResponse(data, domain);
    } catch (error) {
      console.warn(`RDAP fetch from ${url} error:`, error);
      continue; // Try next server
    }
  }

  // All servers failed, return fallback info
  return {
    domainName: domain,
    error: 'Could not fetch WHOIS info. The domain registry may not support RDAP queries.',
  };
}

// Get registrar purchase link
export function getRegistrarPurchaseLink(domain: string, registrar?: string): string {
  const encodedDomain = encodeURIComponent(domain);

  // Map common registrars to their purchase URLs
  const registrarLinks: Record<string, string> = {
    'godaddy': `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodedDomain}`,
    'namecheap': `https://www.namecheap.com/domains/registration/results/?domain=${encodedDomain}`,
    'google': `https://domains.google.com/registrar/search?searchTerm=${encodedDomain}`,
    'cloudflare': `https://www.cloudflare.com/products/registrar/`,
    'porkbun': `https://porkbun.com/checkout/search?q=${encodedDomain}`,
  };

  if (registrar) {
    const registrarLower = registrar.toLowerCase();
    for (const [key, url] of Object.entries(registrarLinks)) {
      if (registrarLower.includes(key)) {
        return url;
      }
    }
  }

  // Default to Namecheap
  return `https://www.namecheap.com/domains/registration/results/?domain=${encodedDomain}`;
}

// AI-powered WHOIS analysis
export async function analyzeWhoisWithAI(
  whoisInfo: WhoisInfo,
  provider: AIProvider = 'openai',
  model?: string
): Promise<string> {
  const apiKey = await getAPIKey(provider);
  if (!apiKey) return '';

  const prompt = `Analyze this domain WHOIS data and provide brief insights (2-3 sentences):

Domain: ${whoisInfo.domainName}
Age: ${whoisInfo.age ? `${whoisInfo.age} years` : 'Unknown'}
Registrar: ${whoisInfo.registrar || 'Unknown'}
Expiry: ${whoisInfo.expiryDate || 'Unknown'}
Days until expiry: ${whoisInfo.daysUntilExpiry || 'Unknown'}
Status: ${whoisInfo.status?.join(', ') || 'Unknown'}
DNSSEC: ${whoisInfo.dnssec || 'Unknown'}

Provide insights about: domain maturity, potential availability, investment perspective.
Keep response under 100 words. Output only the analysis:`;

  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (!res.ok) return '';
      const data = await res.json();
      return data.choices[0]?.message?.content || '';
    }
  } catch (error) {
    console.error('AI WHOIS analysis failed:', error);
  }

  return '';
}

// Check if domain is dropping soon (useful for domain investors)
export function getDomainDropStatus(whoisInfo: WhoisInfo): {
  status: 'active' | 'expiring' | 'dropping' | 'available';
  message: string;
} {
  if (whoisInfo.error === 'Domain not registered') {
    return { status: 'available', message: 'Domain is available for registration' };
  }

  if (whoisInfo.daysUntilExpiry === undefined) {
    return { status: 'active', message: 'Domain is registered' };
  }

  if (whoisInfo.daysUntilExpiry <= 0) {
    return { status: 'dropping', message: 'Domain may be dropping soon' };
  }

  if (whoisInfo.daysUntilExpiry <= 30) {
    return { status: 'expiring', message: `Expires in ${whoisInfo.daysUntilExpiry} days` };
  }

  if (whoisInfo.daysUntilExpiry <= 90) {
    return { status: 'expiring', message: `Expires in ${Math.floor(whoisInfo.daysUntilExpiry / 30)} months` };
  }

  return { status: 'active', message: `Registered until ${whoisInfo.expiryDate}` };
}
