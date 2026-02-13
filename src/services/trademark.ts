// Trademark/Brand registration checking service
// Note: Real trademark checks require paid APIs (USPTO, EUIPO, TURKPATENT)
// This implementation provides estimation and links to official databases

export interface TrademarkResult {
  region: 'US' | 'EU' | 'TR' | 'WIPO';
  regionName: string;
  status: 'clear' | 'potential-conflict' | 'unknown';
  searchUrl: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'unknown';
}

export interface TrademarkCheckResult {
  brandName: string;
  results: TrademarkResult[];
  overallRisk: 'low' | 'medium' | 'high' | 'unknown';
  recommendations: string[];
  checkedAt: string;
}

// Official trademark database URLs
const TRADEMARK_DATABASES = {
  US: {
    name: 'USPTO (United States)',
    searchUrl: (term: string) =>
      `https://tmsearch.uspto.gov/bin/gate.exe?f=searchss&state=4801:1.1.1&p_s_PARA1=&p_taession_key=&BackReference=&p_L=50&p_plural=yes&p_s_PARA2=${encodeURIComponent(term)}&a_search=Submit+Query`,
    directUrl: 'https://tmsearch.uspto.gov/',
  },
  EU: {
    name: 'EUIPO (European Union)',
    searchUrl: (term: string) =>
      `https://euipo.europa.eu/eSearch/#basic/${encodeURIComponent(term)}`,
    directUrl: 'https://euipo.europa.eu/eSearch/',
  },
  TR: {
    name: 'TURKPATENT (Türkiye)',
    searchUrl: (term: string) =>
      `https://online.turkpatent.gov.tr/trademark-search/pub/trademark_search?trademarkName=${encodeURIComponent(term)}`,
    directUrl: 'https://online.turkpatent.gov.tr/trademark-search',
  },
  WIPO: {
    name: 'WIPO Global Brand Database',
    searchUrl: (term: string) =>
      `https://branddb.wipo.int/en/quicksearch?by=brandName&v=${encodeURIComponent(term)}`,
    directUrl: 'https://branddb.wipo.int/',
  },
};

// Common trademark terms that increase conflict risk
const HIGH_RISK_TERMS = [
  'google', 'apple', 'microsoft', 'amazon', 'facebook', 'meta', 'netflix',
  'twitter', 'instagram', 'tiktok', 'uber', 'airbnb', 'spotify', 'paypal',
  'visa', 'mastercard', 'nike', 'adidas', 'coca-cola', 'pepsi', 'mcdonald',
  'starbucks', 'walmart', 'target', 'disney', 'marvel', 'tesla', 'spacex',
  'samsung', 'sony', 'nintendo', 'playstation', 'xbox', 'iphone', 'ipad',
  'macbook', 'windows', 'android', 'youtube', 'linkedin', 'whatsapp',
  'snapchat', 'pinterest', 'reddit', 'slack', 'zoom', 'adobe', 'salesforce',
  'oracle', 'ibm', 'intel', 'amd', 'nvidia', 'stripe', 'square', 'shopify',
];

// Generic terms that are usually safe
const GENERIC_TERMS = [
  'tech', 'digital', 'cloud', 'smart', 'fast', 'quick', 'easy', 'simple',
  'pro', 'plus', 'max', 'lite', 'go', 'hub', 'lab', 'studio', 'works',
  'media', 'solutions', 'services', 'group', 'team', 'network', 'systems',
];

// Analyze brand name for potential trademark conflicts
function analyzeBrandRisk(brandName: string): {
  riskLevel: 'low' | 'medium' | 'high';
  reasons: string[];
} {
  const lowerName = brandName.toLowerCase();
  const reasons: string[] = [];
  let riskScore = 0;

  // Check for exact matches with famous brands
  for (const term of HIGH_RISK_TERMS) {
    if (lowerName === term) {
      riskScore += 100;
      reasons.push(`Exact match with famous brand: ${term}`);
    } else if (lowerName.includes(term)) {
      riskScore += 50;
      reasons.push(`Contains protected brand term: ${term}`);
    }
  }

  // Check for typosquatting patterns
  for (const term of HIGH_RISK_TERMS) {
    const similarity = calculateSimilarity(lowerName, term);
    if (similarity > 0.8 && lowerName !== term) {
      riskScore += 30;
      reasons.push(`Similar to protected brand: ${term}`);
    }
  }

  // Reduce risk for generic terms
  for (const term of GENERIC_TERMS) {
    if (lowerName.includes(term)) {
      riskScore -= 5;
    }
  }

  // Length factor - very short names are harder to trademark
  if (brandName.length <= 3) {
    riskScore -= 10;
    reasons.push('Short names are generally harder to protect');
  }

  // Final risk assessment
  if (riskScore >= 50) {
    return { riskLevel: 'high', reasons };
  } else if (riskScore >= 20) {
    return { riskLevel: 'medium', reasons };
  } else {
    if (reasons.length === 0) {
      reasons.push('No obvious conflicts detected');
    }
    return { riskLevel: 'low', reasons };
  }
}

// Calculate string similarity (Levenshtein-based)
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);

  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

// Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }

  return dp[m][n];
}

// Main trademark check function
export function checkTrademark(brandName: string): TrademarkCheckResult {
  const analysis = analyzeBrandRisk(brandName);
  const results: TrademarkResult[] = [];

  // Generate results for each region
  for (const [region, db] of Object.entries(TRADEMARK_DATABASES)) {
    const regionKey = region as 'US' | 'EU' | 'TR' | 'WIPO';
    results.push({
      region: regionKey,
      regionName: db.name,
      status: analysis.riskLevel === 'high' ? 'potential-conflict' : 'unknown',
      searchUrl: db.searchUrl(brandName),
      description: `Search "${brandName}" in ${db.name}`,
      riskLevel: analysis.riskLevel,
    });
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (analysis.riskLevel === 'high') {
    recommendations.push('⚠️ High risk of trademark conflict - consider alternative names');
    recommendations.push('Consult with a trademark attorney before proceeding');
    recommendations.push('Search all databases thoroughly before using this name');
  } else if (analysis.riskLevel === 'medium') {
    recommendations.push('Moderate risk - perform thorough searches in all regions');
    recommendations.push('Consider trademark monitoring services');
    recommendations.push('Document your first use of the name');
  } else {
    recommendations.push('Low apparent risk, but always verify with official databases');
    recommendations.push('Consider registering your trademark for protection');
    recommendations.push('Monitor for similar marks in your industry');
  }

  // Add specific reasons
  for (const reason of analysis.reasons) {
    if (!recommendations.includes(reason)) {
      recommendations.push(reason);
    }
  }

  return {
    brandName,
    results,
    overallRisk: analysis.riskLevel,
    recommendations,
    checkedAt: new Date().toISOString(),
  };
}

// Get direct link to search in a specific database
export function getTrademarkSearchUrl(brandName: string, region: 'US' | 'EU' | 'TR' | 'WIPO'): string {
  return TRADEMARK_DATABASES[region].searchUrl(brandName);
}

// Get all trademark database info
export function getTrademarkDatabases() {
  return Object.entries(TRADEMARK_DATABASES).map(([region, db]) => ({
    region: region as 'US' | 'EU' | 'TR' | 'WIPO',
    name: db.name,
    directUrl: db.directUrl,
  }));
}

// Check if a name is likely to have trademark issues in a specific industry
export function checkIndustryConflict(
  brandName: string,
  industry: string
): { hasConflict: boolean; conflictingBrands: string[] } {
  const lowerName = brandName.toLowerCase();
  const lowerIndustry = industry.toLowerCase();

  // Industry-specific famous brands
  const industryBrands: Record<string, string[]> = {
    'tech': ['apple', 'google', 'microsoft', 'amazon', 'meta', 'oracle', 'ibm', 'intel', 'nvidia'],
    'ecommerce': ['amazon', 'ebay', 'alibaba', 'shopify', 'etsy', 'walmart', 'target'],
    'social': ['facebook', 'twitter', 'instagram', 'tiktok', 'snapchat', 'linkedin', 'pinterest'],
    'finance': ['paypal', 'stripe', 'square', 'visa', 'mastercard', 'venmo', 'cashapp'],
    'streaming': ['netflix', 'spotify', 'hulu', 'disney', 'hbo', 'amazon', 'apple'],
    'gaming': ['nintendo', 'sony', 'xbox', 'steam', 'epic', 'riot', 'blizzard', 'ea'],
    'food': ['mcdonald', 'starbucks', 'subway', 'domino', 'pizzahut', 'burgerking'],
    'fashion': ['nike', 'adidas', 'gucci', 'prada', 'louis vuitton', 'chanel', 'zara', 'h&m'],
    'automotive': ['tesla', 'ford', 'gm', 'toyota', 'honda', 'bmw', 'mercedes', 'audi'],
  };

  const conflictingBrands: string[] = [];

  // Check industry-specific brands
  for (const [ind, brands] of Object.entries(industryBrands)) {
    if (lowerIndustry.includes(ind) || ind.includes(lowerIndustry)) {
      for (const brand of brands) {
        if (lowerName.includes(brand) || calculateSimilarity(lowerName, brand) > 0.8) {
          conflictingBrands.push(brand);
        }
      }
    }
  }

  // Also check global famous brands
  for (const term of HIGH_RISK_TERMS) {
    if (lowerName.includes(term) && !conflictingBrands.includes(term)) {
      conflictingBrands.push(term);
    }
  }

  return {
    hasConflict: conflictingBrands.length > 0,
    conflictingBrands: [...new Set(conflictingBrands)],
  };
}
