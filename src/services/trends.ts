// Google Trends integration service
// Note: Google Trends doesn't have a public API, so we provide links and estimation

export interface TrendData {
  keyword: string;
  trendScore: number; // 0-100 estimated
  trendDirection: 'rising' | 'stable' | 'declining' | 'unknown';
  searchVolume: 'high' | 'medium' | 'low' | 'unknown';
  competitionLevel: 'high' | 'medium' | 'low' | 'unknown';
  relatedKeywords: string[];
  trendsUrl: string;
  lastUpdated: string;
}

export interface TrendAnalysis {
  brandName: string;
  domain: string;
  overallScore: number;
  trends: TrendData[];
  insights: string[];
  opportunities: string[];
}

// Trending tech/startup keywords (simulated data based on industry knowledge)
const TRENDING_KEYWORDS: Record<string, { score: number; direction: 'rising' | 'stable' | 'declining' }> = {
  // AI/Tech
  'ai': { score: 95, direction: 'rising' },
  'gpt': { score: 90, direction: 'rising' },
  'llm': { score: 85, direction: 'rising' },
  'ml': { score: 80, direction: 'stable' },
  'bot': { score: 75, direction: 'stable' },
  'auto': { score: 70, direction: 'stable' },
  'smart': { score: 65, direction: 'stable' },
  'neural': { score: 60, direction: 'rising' },
  'data': { score: 75, direction: 'stable' },

  // Crypto/Web3
  'crypto': { score: 60, direction: 'declining' },
  'nft': { score: 40, direction: 'declining' },
  'web3': { score: 55, direction: 'stable' },
  'defi': { score: 50, direction: 'stable' },
  'chain': { score: 55, direction: 'stable' },
  'token': { score: 45, direction: 'declining' },
  'meta': { score: 60, direction: 'stable' },
  'verse': { score: 50, direction: 'declining' },

  // Cloud/SaaS
  'cloud': { score: 80, direction: 'stable' },
  'saas': { score: 75, direction: 'stable' },
  'hub': { score: 70, direction: 'stable' },
  'sync': { score: 65, direction: 'stable' },
  'flow': { score: 70, direction: 'rising' },
  'stack': { score: 60, direction: 'stable' },

  // Health/Wellness
  'health': { score: 80, direction: 'rising' },
  'fit': { score: 75, direction: 'stable' },
  'well': { score: 70, direction: 'rising' },
  'care': { score: 75, direction: 'rising' },
  'med': { score: 70, direction: 'stable' },

  // Finance
  'pay': { score: 75, direction: 'stable' },
  'fund': { score: 65, direction: 'stable' },
  'invest': { score: 70, direction: 'stable' },
  'bank': { score: 60, direction: 'stable' },
  'fin': { score: 65, direction: 'stable' },

  // General positive
  'pro': { score: 60, direction: 'stable' },
  'go': { score: 55, direction: 'stable' },
  'fast': { score: 50, direction: 'stable' },
  'easy': { score: 55, direction: 'stable' },
  'quick': { score: 50, direction: 'stable' },
};

// Generate Google Trends URL
export function getTrendsUrl(keyword: string, geo?: string): string {
  const params = new URLSearchParams({
    q: keyword,
    geo: geo || '',
  });
  return `https://trends.google.com/trends/explore?${params.toString()}`;
}

// Generate Google Trends comparison URL
export function getTrendsCompareUrl(keywords: string[]): string {
  const q = keywords.slice(0, 5).join(','); // Max 5 keywords
  return `https://trends.google.com/trends/explore?q=${encodeURIComponent(q)}`;
}

// Analyze keyword trends
function analyzeKeyword(keyword: string): TrendData {
  const lowerKeyword = keyword.toLowerCase();
  let trendScore = 50; // Default middle score
  let trendDirection: 'rising' | 'stable' | 'declining' | 'unknown' = 'unknown';

  // Check if keyword contains any trending terms
  for (const [term, data] of Object.entries(TRENDING_KEYWORDS)) {
    if (lowerKeyword.includes(term)) {
      trendScore = Math.max(trendScore, data.score);
      if (trendDirection === 'unknown' || data.score > 70) {
        trendDirection = data.direction;
      }
    }
  }

  // Estimate search volume based on score
  let searchVolume: 'high' | 'medium' | 'low' | 'unknown' = 'unknown';
  if (trendScore >= 80) searchVolume = 'high';
  else if (trendScore >= 50) searchVolume = 'medium';
  else searchVolume = 'low';

  // Estimate competition
  let competitionLevel: 'high' | 'medium' | 'low' | 'unknown' = 'unknown';
  if (trendScore >= 70) competitionLevel = 'high';
  else if (trendScore >= 40) competitionLevel = 'medium';
  else competitionLevel = 'low';

  // Generate related keywords
  const relatedKeywords = generateRelatedKeywords(lowerKeyword);

  return {
    keyword,
    trendScore,
    trendDirection,
    searchVolume,
    competitionLevel,
    relatedKeywords,
    trendsUrl: getTrendsUrl(keyword),
    lastUpdated: new Date().toISOString(),
  };
}

// Generate related keywords
function generateRelatedKeywords(keyword: string): string[] {
  const related: string[] = [];
  const lowerKeyword = keyword.toLowerCase();

  // Add industry-related keywords
  if (lowerKeyword.includes('ai') || lowerKeyword.includes('tech')) {
    related.push('artificial intelligence', 'machine learning', 'automation', 'startup');
  }
  if (lowerKeyword.includes('shop') || lowerKeyword.includes('store')) {
    related.push('ecommerce', 'online shopping', 'retail', 'marketplace');
  }
  if (lowerKeyword.includes('health') || lowerKeyword.includes('fit')) {
    related.push('wellness', 'fitness', 'healthcare', 'medical');
  }
  if (lowerKeyword.includes('fin') || lowerKeyword.includes('pay')) {
    related.push('fintech', 'payment', 'banking', 'investment');
  }

  // Add generic related terms
  related.push(`${keyword} app`, `${keyword} software`, `${keyword} platform`);

  return [...new Set(related)].slice(0, 8);
}

// Main trend analysis function
export function analyzeTrends(brandName: string, domain: string): TrendAnalysis {
  const insights: string[] = [];
  const opportunities: string[] = [];

  // Analyze the brand name
  const brandTrend = analyzeKeyword(brandName);

  // Extract keywords from domain
  const domainParts = domain.replace(/[-_]/g, ' ').split(/(?=[A-Z])/).join(' ').toLowerCase().split(' ');
  const keywordTrends = domainParts.filter(p => p.length > 2).map(k => analyzeKeyword(k));

  // Calculate overall score
  const scores = [brandTrend.trendScore, ...keywordTrends.map(t => t.trendScore)];
  const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  // Generate insights
  if (overallScore >= 70) {
    insights.push('✅ Brand name contains trending keywords with high search interest');
    insights.push('💡 Good potential for organic discovery and SEO');
  } else if (overallScore >= 50) {
    insights.push('📊 Brand name has moderate trend appeal');
    insights.push('💡 Consider adding trending keywords to marketing content');
  } else {
    insights.push('📉 Brand name may have limited organic search potential');
    insights.push('💡 Focus on paid marketing and direct brand building');
  }

  // Add direction-based insights
  const risingKeywords = keywordTrends.filter(t => t.trendDirection === 'rising');
  const decliningKeywords = keywordTrends.filter(t => t.trendDirection === 'declining');

  if (risingKeywords.length > 0) {
    insights.push(`📈 Rising trend keywords detected: ${risingKeywords.map(k => k.keyword).join(', ')}`);
  }

  if (decliningKeywords.length > 0) {
    insights.push(`📉 Declining trend keywords: ${decliningKeywords.map(k => k.keyword).join(', ')}`);
  }

  // Generate opportunities
  if (brandTrend.competitionLevel === 'low') {
    opportunities.push('Low competition - good opportunity for market entry');
  }
  if (brandTrend.trendDirection === 'rising') {
    opportunities.push('Rising trend - capitalize on growing interest');
  }

  // Suggest related keywords to target
  const allRelated = [...new Set(keywordTrends.flatMap(t => t.relatedKeywords))].slice(0, 5);
  if (allRelated.length > 0) {
    opportunities.push(`Consider targeting related keywords: ${allRelated.join(', ')}`);
  }

  // SEO opportunity
  opportunities.push('Use Google Trends to validate seasonal patterns');
  opportunities.push('Monitor competitor brand trends for market positioning');

  return {
    brandName,
    domain,
    overallScore,
    trends: [brandTrend, ...keywordTrends],
    insights,
    opportunities,
  };
}

// Get trending keywords by industry
export function getTrendingByIndustry(industry: string): string[] {
  const industryKeywords: Record<string, string[]> = {
    'ai-tech': ['AI', 'GPT', 'LLM', 'automation', 'neural network', 'machine learning'],
    'ecommerce': ['online shopping', 'marketplace', 'dropshipping', 'D2C', 'retail tech'],
    'finance': ['fintech', 'neobank', 'cryptocurrency', 'DeFi', 'payment solution'],
    'health': ['telehealth', 'mental health', 'fitness app', 'wellness', 'healthtech'],
    'education': ['edtech', 'online learning', 'e-learning', 'upskilling', 'bootcamp'],
    'gaming': ['mobile gaming', 'esports', 'game streaming', 'metaverse', 'VR gaming'],
    'saas': ['B2B SaaS', 'workflow automation', 'no-code', 'productivity tool', 'collaboration'],
    'crypto': ['Web3', 'blockchain', 'DeFi', 'NFT marketplace', 'crypto wallet'],
    'social': ['creator economy', 'community platform', 'social commerce', 'influencer'],
    'media': ['streaming', 'podcast', 'newsletter', 'content creator', 'video platform'],
  };

  return industryKeywords[industry] || industryKeywords['ai-tech'];
}

// Get Google Trends embed URL (for iframe if needed)
export function getTrendsEmbedUrl(keyword: string): string {
  return `https://trends.google.com/trends/embed/explore/TIMESERIES?req=%7B%22comparisonItem%22%3A%5B%7B%22keyword%22%3A%22${encodeURIComponent(keyword)}%22%2C%22geo%22%3A%22%22%2C%22time%22%3A%22today%2012-m%22%7D%5D%2C%22category%22%3A0%2C%22property%22%3A%22%22%7D`;
}
