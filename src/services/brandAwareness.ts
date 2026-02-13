// Real Brand Awareness Service - NO FAKE DATA
// Uses public APIs and web scraping to get REAL mention counts

export interface BrandMention {
  source: string;
  count: number;
  url: string;
  error?: string;
}

export interface BrandAwarenessResult {
  keyword: string;
  totalMentions: number;
  sources: BrandMention[];
  score: number; // 0-100 based on REAL data
  fetchedAt: Date;
  isLoading: boolean;
}

// Hacker News Algolia API - FREE, NO API KEY
async function searchHackerNews(keyword: string): Promise<BrandMention> {
  try {
    const response = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&tags=story&hitsPerPage=0`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const count = data.nbHits || 0;

    return {
      source: 'Hacker News',
      count,
      url: `https://hn.algolia.com/?q=${encodeURIComponent(keyword)}`,
    };
  } catch (error) {
    console.error('Hacker News search failed:', error);
    return {
      source: 'Hacker News',
      count: 0,
      url: `https://hn.algolia.com/?q=${encodeURIComponent(keyword)}`,
      error: 'Failed to fetch',
    };
  }
}

// GitHub Search - FREE, NO API KEY (60 requests/hour)
async function searchGitHub(keyword: string): Promise<BrandMention> {
  try {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(keyword)}&per_page=1`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const count = data.total_count || 0;

    return {
      source: 'GitHub',
      count,
      url: `https://github.com/search?q=${encodeURIComponent(keyword)}&type=repositories`,
    };
  } catch (error) {
    console.error('GitHub search failed:', error);
    return {
      source: 'GitHub',
      count: 0,
      url: `https://github.com/search?q=${encodeURIComponent(keyword)}&type=repositories`,
      error: 'Failed to fetch',
    };
  }
}

// Wikipedia API - FREE, NO API KEY
async function searchWikipedia(keyword: string): Promise<BrandMention> {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(keyword)}&format=json&origin=*`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const count = data.query?.searchinfo?.totalhits || 0;

    return {
      source: 'Wikipedia',
      count,
      url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(keyword)}`,
    };
  } catch (error) {
    console.error('Wikipedia search failed:', error);
    return {
      source: 'Wikipedia',
      count: 0,
      url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(keyword)}`,
      error: 'Failed to fetch',
    };
  }
}

// Reddit Search - via old.reddit.com JSON endpoint (no API key needed)
async function searchReddit(keyword: string): Promise<BrandMention> {
  try {
    // Reddit's public JSON endpoint
    const response = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&limit=1&sort=relevance`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    // Reddit doesn't return total count easily, but we can check if there are results
    const hasResults = data.data?.children?.length > 0;
    // Approximate count from the dist field if available
    const count = data.data?.dist || (hasResults ? 1 : 0);

    return {
      source: 'Reddit',
      count: count > 0 ? count : 0,
      url: `https://www.reddit.com/search/?q=${encodeURIComponent(keyword)}`,
    };
  } catch (error) {
    console.error('Reddit search failed:', error);
    return {
      source: 'Reddit',
      count: 0,
      url: `https://www.reddit.com/search/?q=${encodeURIComponent(keyword)}`,
      error: 'Failed to fetch',
    };
  }
}

// Stack Overflow - via Stack Exchange API (no key needed for basic use)
async function searchStackOverflow(keyword: string): Promise<BrandMention> {
  try {
    const response = await fetch(
      `https://api.stackexchange.com/2.3/search?order=desc&sort=relevance&intitle=${encodeURIComponent(keyword)}&site=stackoverflow&filter=total`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const count = data.total || 0;

    return {
      source: 'Stack Overflow',
      count,
      url: `https://stackoverflow.com/search?q=${encodeURIComponent(keyword)}`,
    };
  } catch (error) {
    console.error('Stack Overflow search failed:', error);
    return {
      source: 'Stack Overflow',
      count: 0,
      url: `https://stackoverflow.com/search?q=${encodeURIComponent(keyword)}`,
      error: 'Failed to fetch',
    };
  }
}

// NPM Registry - check if package exists
async function searchNPM(keyword: string): Promise<BrandMention> {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(keyword)}&size=1`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const count = data.total || 0;

    return {
      source: 'NPM',
      count,
      url: `https://www.npmjs.com/search?q=${encodeURIComponent(keyword)}`,
    };
  } catch (error) {
    console.error('NPM search failed:', error);
    return {
      source: 'NPM',
      count: 0,
      url: `https://www.npmjs.com/search?q=${encodeURIComponent(keyword)}`,
      error: 'Failed to fetch',
    };
  }
}

// Calculate score based on REAL data
function calculateScore(sources: BrandMention[]): number {
  // Weight different sources
  const weights: Record<string, number> = {
    'Wikipedia': 30,      // High weight - established presence
    'GitHub': 20,         // Tech relevance
    'Hacker News': 20,    // Tech community buzz
    'Reddit': 15,         // General community
    'Stack Overflow': 10, // Developer relevance
    'NPM': 5,             // Package existence
  };

  let totalScore = 0;
  let maxPossibleScore = 0;

  for (const source of sources) {
    const weight = weights[source.source] || 10;
    maxPossibleScore += weight;

    if (source.error) continue;

    // Score based on count thresholds
    let sourceScore = 0;
    if (source.count > 0) {
      if (source.source === 'Wikipedia') {
        // Wikipedia: any mention is significant
        sourceScore = source.count >= 10 ? weight : (source.count / 10) * weight;
      } else if (source.source === 'GitHub') {
        // GitHub: repos
        if (source.count >= 1000) sourceScore = weight;
        else if (source.count >= 100) sourceScore = weight * 0.8;
        else if (source.count >= 10) sourceScore = weight * 0.5;
        else sourceScore = weight * 0.2;
      } else if (source.source === 'Hacker News') {
        // HN: stories
        if (source.count >= 100) sourceScore = weight;
        else if (source.count >= 20) sourceScore = weight * 0.7;
        else if (source.count >= 5) sourceScore = weight * 0.4;
        else sourceScore = weight * 0.1;
      } else if (source.source === 'Reddit') {
        // Reddit: posts
        if (source.count >= 100) sourceScore = weight;
        else if (source.count >= 10) sourceScore = weight * 0.6;
        else sourceScore = weight * 0.3;
      } else if (source.source === 'Stack Overflow') {
        // SO: questions
        if (source.count >= 1000) sourceScore = weight;
        else if (source.count >= 100) sourceScore = weight * 0.7;
        else if (source.count >= 10) sourceScore = weight * 0.4;
        else sourceScore = weight * 0.1;
      } else if (source.source === 'NPM') {
        // NPM: packages
        if (source.count >= 100) sourceScore = weight;
        else if (source.count >= 10) sourceScore = weight * 0.6;
        else sourceScore = weight * 0.3;
      }
    }

    totalScore += sourceScore;
  }

  // Normalize to 0-100
  return Math.round((totalScore / maxPossibleScore) * 100);
}

// Main function to check brand awareness
export async function checkBrandAwareness(keyword: string): Promise<BrandAwarenessResult> {
  const cleanKeyword = keyword.toLowerCase().trim();

  // Run all searches in parallel
  const results = await Promise.all([
    searchHackerNews(cleanKeyword),
    searchGitHub(cleanKeyword),
    searchWikipedia(cleanKeyword),
    searchReddit(cleanKeyword),
    searchStackOverflow(cleanKeyword),
    searchNPM(cleanKeyword),
  ]);

  // Calculate totals
  const totalMentions = results.reduce((sum, r) => sum + (r.error ? 0 : r.count), 0);
  const score = calculateScore(results);

  return {
    keyword: cleanKeyword,
    totalMentions,
    sources: results,
    score,
    fetchedAt: new Date(),
    isLoading: false,
  };
}

// Format count for display
export function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

// Get score color class
export function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-yellow-600';
  if (score >= 20) return 'text-orange-600';
  return 'text-gray-500';
}

// Get score background class
export function getScoreBgColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  if (score >= 20) return 'bg-orange-500';
  return 'bg-gray-400';
}

// Get score label
export function getScoreLabel(score: number): string {
  if (score >= 70) return 'Well Known';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Low Awareness';
  if (score > 0) return 'Very Low';
  return 'No Data';
}
