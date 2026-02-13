import type {
  AIProvider,
  SearchParams,
  AdvancedDomainSettings,
  BrandAnalysis,
  IndustryNiche,
  CountryConfig,
} from '../types';
import { INDUSTRY_OPTIONS, COUNTRY_CONFIGS, detectLanguage } from '../types';
import { getAPIKey } from './storage';

interface GenerateDomainParams {
  keywords: string;
  style: string;
  length: string;
  language: string;
  tlds: string[];
  maxSuggestions: number;
  advanced?: AdvancedDomainSettings;
  excludeDomains?: string[];
  industry?: IndustryNiche;
  includeBrandAnalysis?: boolean;
  detectedLanguage?: string;
  countryConfig?: CountryConfig;
}

// Language-specific naming guidance
const LANGUAGE_NAMING_GUIDE: Record<string, { examples: string[]; tips: string[]; suffixes: string[] }> = {
  turkish: {
    examples: ['taksim', 'yemeksepeti', 'hepsiburada', 'sahibinden', 'gittigidiyor', 'n11', 'trendyol', 'getir', 'iyzico', 'paraşüt'],
    tips: [
      'Use Turkish words that are easy to spell: kolay, hızlı, güzel, yeni, iyi, en, bir',
      'Combine Turkish words creatively: al+ver=alver, gel=getir, yemek+sepet=yemeksepeti',
      'Turkish businesses love compound words: hepsi+burada, sahibi+nden',
      'Action verbs work well: git, gel, al, ver, bul, ara, yap',
    ],
    suffixes: ['im', 'in', 'ci', 'cu', 'lik', 'ler', 'lar', 'al', 'ol']
  },
  german: {
    examples: ['zalando', 'trivago', 'flixbus', 'lieferando', 'check24', 'aboutyou', 'idealo'],
    tips: [
      'German compound words are powerful: zusammen, schnell, gut, neu',
      'Use German action words: finden, kaufen, sparen, vergleichen',
    ],
    suffixes: ['heit', 'keit', 'ung', 'er', 'chen']
  },
  french: {
    examples: ['blablacar', 'doctolib', 'leboncoin', 'veepee', 'vente-privee', 'deezer'],
    tips: [
      'French elegance works: bon, beau, chic, vite, facile',
      'Combine with tech: le+bon+coin, vente+privee',
    ],
    suffixes: ['ment', 'tion', 'eur', 'eux']
  },
  spanish: {
    examples: ['mercadolibre', 'cabify', 'glovo', 'rappi', 'despegar', 'linio', 'cornershop'],
    tips: [
      'Spanish action words: compra, vende, busca, encuentra, viaja',
      'Combine descriptive words: mercado+libre, fácil, rápido',
    ],
    suffixes: ['ito', 'ero', 'ando', 'mente']
  },
  portuguese: {
    examples: ['mercadolivre', 'nubank', 'ifood', 'magazineluiza', 'americanas', 'submarino'],
    tips: [
      'Brazilian style: fácil, rápido, melhor, novo, grande',
      'Combine words: mercado+livre, magazine+nome',
    ],
    suffixes: ['inho', 'ão', 'mente', 'eiro']
  },
  arabic: {
    examples: ['souq', 'careem', 'fetchr', 'noon', 'talabat', 'jahez', 'hungerstation'],
    tips: [
      'Arabic-friendly: souq, talabat, sahel, sareea',
      'Mix Arabic meaning with Latin letters: noon, careem',
    ],
    suffixes: []
  },
  russian: {
    examples: ['yandex', 'ozon', 'wildberries', 'lamoda', 'avito', 'cian', 'dns'],
    tips: [
      'Transliterated Russian or international style',
      'Short memorable names work well',
    ],
    suffixes: []
  },
  japanese: {
    examples: ['rakuten', 'mercari', 'zozo', 'paypay', 'linepay', 'gojek'],
    tips: [
      'Japanese style: simple, memorable, often doubled syllables',
      'Romanized Japanese words that sound good internationally',
    ],
    suffixes: []
  },
  chinese: {
    examples: ['alibaba', 'baidu', 'tencent', 'xiaomi', 'huawei', 'didi', 'meituan', 'pinduoduo'],
    tips: [
      'Pinyin-based names that work globally',
      'Doubled words: didi, momo, duoduo',
      'Meaningful combinations in Chinese culture',
    ],
    suffixes: []
  },
  korean: {
    examples: ['coupang', 'kakao', 'naver', 'baemin', 'toss', 'karrot', 'musinsa'],
    tips: [
      'Korean-style: short, punchy, easy to pronounce',
      'Mix Korean meaning with global appeal',
    ],
    suffixes: []
  },
  english: {
    examples: ['stripe', 'notion', 'figma', 'canva', 'slack', 'zoom', 'dropbox', 'airbnb'],
    tips: [
      'Short, memorable, easy to spell',
      'Combine words creatively',
      'Tech suffixes: -ly, -ify, -io, -ai',
    ],
    suffixes: ['ly', 'ify', 'er', 'io', 'ai', 'hub', 'lab', 'box', 'app']
  }
};

// Build the enhanced prompt
function buildPrompt(params: GenerateDomainParams): string {
  const lengthGuidance: Record<string, string> = {
    short: '4-7 characters',
    medium: '8-12 characters',
    long: '13-18 characters',
  };

  const styleGuidance: Record<string, string> = {
    brandable: 'invented/made-up words that sound good (like Spotify, Vimeo, Hulu)',
    descriptive: 'clear names that directly describe what the product does',
    techy: 'modern tech names with suffixes like -ly, -io, -ify, -hub, -ai, -app',
    playful: 'fun, creative, friendly names',
    luxury: 'premium, elegant names',
    minimal: 'ultra-short, clean names',
    professional: 'business-appropriate, trustworthy names',
  };

  let advancedConstraints = '';
  if (params.advanced) {
    const adv = params.advanced;
    const constraints: string[] = [];

    if (adv.minLength) constraints.push(`minimum ${adv.minLength} characters`);
    if (adv.maxLength) constraints.push(`maximum ${adv.maxLength} characters`);
    if (adv.mustInclude) constraints.push(`MUST contain "${adv.mustInclude}"`);
    if (adv.mustNotInclude) constraints.push(`must NOT contain "${adv.mustNotInclude}"`);
    if (adv.startsWith) constraints.push(`must START with "${adv.startsWith}"`);
    if (adv.endsWith) constraints.push(`must END with "${adv.endsWith}"`);
    if (adv.noNumbers) constraints.push('no numbers');
    if (adv.noHyphens) constraints.push('no hyphens');

    if (constraints.length > 0) {
      advancedConstraints = `\nCONSTRAINTS: ${constraints.join(', ')}`;
    }
  }

  let excludeList = '';
  if (params.excludeDomains && params.excludeDomains.length > 0) {
    excludeList = `\n\n⚠️ CRITICAL - DO NOT USE THESE NAMES (already generated):
${params.excludeDomains.slice(0, 50).join(', ')}

You MUST generate COMPLETELY DIFFERENT names. Not variations, not similar - ENTIRELY NEW concepts!`;
  }

  // Get industry-specific guidance
  let industryGuidance = '';
  if (params.industry && params.industry !== 'general') {
    const industryConfig = INDUSTRY_OPTIONS.find(i => i.value === params.industry);
    if (industryConfig) {
      industryGuidance = `\nINDUSTRY: ${industryConfig.label}
INDUSTRY KEYWORDS TO CONSIDER: ${industryConfig.keywords.join(', ')}`;
    }
  }

  // Get language-specific guidance
  const detectedLang = params.detectedLanguage || params.language;
  const langGuide = LANGUAGE_NAMING_GUIDE[detectedLang] || LANGUAGE_NAMING_GUIDE['english'];
  const countryConfig = params.countryConfig;

  // Build localization section
  let localizationSection = '';
  if (detectedLang !== 'english' && detectedLang !== 'global') {
    localizationSection = `
🌍 LOCALIZATION - THIS IS CRITICAL:
The user's input is in ${detectedLang.toUpperCase()}. You MUST generate domain names that:
1. Are relevant to ${detectedLang.toUpperCase()}-speaking markets
2. Use ${detectedLang} words, phrases, or culturally relevant terms
3. Are easy to spell and pronounce for ${detectedLang} speakers
4. Reflect local naming conventions and preferences

SUCCESSFUL ${detectedLang.toUpperCase()} DOMAIN EXAMPLES:
${langGuide.examples.join(', ')}

${detectedLang.toUpperCase()} NAMING TIPS:
${langGuide.tips.map(t => `- ${t}`).join('\n')}

${langGuide.suffixes.length > 0 ? `COMMON ${detectedLang.toUpperCase()} SUFFIXES: ${langGuide.suffixes.join(', ')}` : ''}
${countryConfig ? `\nCOUNTRY-SPECIFIC TLDs available: ${countryConfig.tlds.join(', ')}` : ''}
${countryConfig ? `LOCAL KEYWORDS to consider: ${countryConfig.keywords.join(', ')}` : ''}

IMPORTANT: Generate names that a ${detectedLang} speaker would naturally choose, NOT English names!
`;
  }

  return `You are a startup naming expert specialized in creating domain names for LOCAL markets.

BUSINESS IDEA: ${params.keywords}
${industryGuidance}
${localizationSection}

CRITICAL RULES:
1. Names MUST be relevant to the business/product described above
2. Names should be real words, word combinations, or clever portmanteaus that MAKE SENSE
3. A person hearing the name should be able to guess what the business does
4. NO random letter combinations or nonsense words like "domainerd", "zyvox", "brixlo"
5. Consider LOCAL market preferences and naming conventions
6. Mix of local language names AND globally appealing names is ideal

STYLE: ${styleGuidance[params.style] || params.style}
LENGTH: ${lengthGuidance[params.length] || params.length}
TARGET LANGUAGE/MARKET: ${detectedLang !== 'english' ? detectedLang.toUpperCase() : 'Global/English'}${advancedConstraints}${excludeList}

Generate ${params.maxSuggestions} domain names. Include:
- 60% names using ${detectedLang !== 'english' ? detectedLang + ' words/style' : 'creative English'}
- 40% globally appealing brandable names

Output ONLY the names, one per line, lowercase, no TLD, no numbers, no explanations:`;
}

// Build prompt for brand analysis
function buildBrandAnalysisPrompt(domains: string[], businessIdea: string): string {
  return `Analyze these domain names for brand potential. Business idea: "${businessIdea}"

Domains to analyze:
${domains.join('\n')}

For EACH domain, provide analysis in this EXACT JSON format (one JSON object per line):
{"domain":"domainname","slogan":"short catchy slogan","description":"one sentence brand description","sentiment":"positive|neutral|professional|playful|luxury","targetAudience":"who this appeals to","industryFit":["industry1","industry2"],"brandScore":85,"memorability":8,"pronounceability":9,"uniqueness":7}

Rules:
- brandScore: 1-100 overall brand quality
- memorability, pronounceability, uniqueness: 1-10 scale
- sentiment: choose ONE from positive, neutral, professional, playful, luxury
- industryFit: 1-3 relevant industries
- Keep slogan under 50 characters
- Keep description under 100 characters

Output ONLY valid JSON lines, no other text:`;
}

// Parse domain list from AI response
function parseDomainList(content: string, advanced?: AdvancedDomainSettings): string[] {
  const lines = content.split('\n');
  const domains: string[] = [];

  for (const line of lines) {
    let domain = line
      .trim()
      .toLowerCase()
      .replace(/^\d+[\.\)\-\s]+/, '')
      .replace(/\.(com|io|ai|co|net|org|app|dev|tech|xyz|me|info|biz|us|cc|so)$/i, '')
      .replace(/[^a-z0-9\-]/g, '')
      .trim();

    // Validate domain
    if (domain.length < 2 || domain.length > 63 || domain.startsWith('-') || domain.endsWith('-')) {
      continue;
    }

    // Apply advanced filters
    if (advanced) {
      if (advanced.minLength && domain.length < advanced.minLength) continue;
      if (advanced.maxLength && domain.length > advanced.maxLength) continue;
      if (advanced.mustInclude && !domain.includes(advanced.mustInclude.toLowerCase())) continue;
      if (advanced.mustNotInclude && domain.includes(advanced.mustNotInclude.toLowerCase())) continue;
      if (advanced.startsWith && !domain.startsWith(advanced.startsWith.toLowerCase())) continue;
      if (advanced.endsWith && !domain.endsWith(advanced.endsWith.toLowerCase())) continue;
      if (advanced.noNumbers && /\d/.test(domain)) continue;
      if (advanced.noHyphens && domain.includes('-')) continue;
    }

    domains.push(domain);
  }

  return [...new Set(domains)];
}

// OpenAI API call
async function callOpenAI(prompt: string, model: string = 'gpt-4o-mini'): Promise<string> {
  const apiKey = await getAPIKey('openai');
  if (!apiKey) throw new Error('OpenAI API key not configured. Please add it in Settings.');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API request failed');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Anthropic API call
async function callAnthropic(prompt: string, model: string = 'claude-3-5-sonnet-20241022'): Promise<string> {
  const apiKey = await getAPIKey('anthropic');
  if (!apiKey) throw new Error('Anthropic API key not configured. Please add it in Settings.');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Anthropic API request failed');
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

// Gemini API call
async function callGemini(prompt: string, model: string = 'gemini-1.5-flash'): Promise<string> {
  const apiKey = await getAPIKey('gemini');
  if (!apiKey) throw new Error('Gemini API key not configured. Please add it in Settings.');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 1500,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API request failed');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Groq API call
async function callGroq(prompt: string, model: string = 'llama-3.3-70b-versatile'): Promise<string> {
  const apiKey = await getAPIKey('groq');
  if (!apiKey) throw new Error('Groq API key not configured. Please add it in Settings.');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Groq API request failed');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Helper function to call AI provider
async function callAIProvider(
  prompt: string,
  provider: AIProvider,
  model?: string
): Promise<string> {
  switch (provider) {
    case 'openai':
      return await callOpenAI(prompt, model || 'gpt-4o-mini');
    case 'anthropic':
      return await callAnthropic(prompt, model || 'claude-3-5-sonnet-20241022');
    case 'gemini':
      return await callGemini(prompt, model || 'gemini-1.5-flash');
    case 'groq':
      return await callGroq(prompt, model || 'llama-3.3-70b-versatile');
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

// Main function to generate domains
export async function generateDomains(
  params: SearchParams,
  provider: AIProvider = 'openai',
  model?: string
): Promise<string[]> {
  // Auto-detect language from input if set to 'auto' or not specified
  let detectedLang = params.language;
  if (!params.language || params.language === 'auto' || params.language === 'english') {
    const detected = detectLanguage(params.inputText);
    if (detected !== 'english') {
      detectedLang = detected;
    }
  }

  // Find matching country config for the detected language
  const countryConfig = COUNTRY_CONFIGS.find(c => c.language === detectedLang);

  const generateParams: GenerateDomainParams = {
    keywords: params.inputText,
    style: params.style,
    length: params.length,
    language: params.language,
    tlds: params.tlds,
    maxSuggestions: params.maxSuggestions,
    advanced: params.advanced,
    excludeDomains: params.excludeDomains,
    industry: params.industry,
    detectedLanguage: detectedLang,
    countryConfig: countryConfig,
  };

  const prompt = buildPrompt(generateParams);
  const content = await callAIProvider(prompt, provider, model);
  let domains = parseDomainList(content, params.advanced);

  // Double-check: filter out any excluded domains that AI might have still returned
  if (params.excludeDomains && params.excludeDomains.length > 0) {
    const excludeSet = new Set(params.excludeDomains.map(d => d.toLowerCase()));
    domains = domains.filter(d => !excludeSet.has(d.toLowerCase()));
  }

  return domains;
}

// Get detected language from text (exported for UI use)
export function getDetectedLanguage(text: string): string {
  return detectLanguage(text);
}

// Get country config for a language
export function getCountryConfigForLanguage(language: string): CountryConfig | undefined {
  return COUNTRY_CONFIGS.find(c => c.language === language);
}

// Generate brand analysis for domains
export async function generateBrandAnalysis(
  domains: string[],
  businessIdea: string,
  provider: AIProvider = 'openai',
  model?: string
): Promise<Map<string, BrandAnalysis>> {
  const prompt = buildBrandAnalysisPrompt(domains, businessIdea);
  const content = await callAIProvider(prompt, provider, model);

  const analysisMap = new Map<string, BrandAnalysis>();
  const lines = content.split('\n').filter(line => line.trim());

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line.trim());
      if (parsed.domain) {
        analysisMap.set(parsed.domain.toLowerCase(), {
          slogan: parsed.slogan || '',
          description: parsed.description || '',
          sentiment: parsed.sentiment || 'neutral',
          targetAudience: parsed.targetAudience || '',
          industryFit: parsed.industryFit || [],
          brandScore: Math.min(100, Math.max(1, parsed.brandScore || 50)),
          memorability: Math.min(10, Math.max(1, parsed.memorability || 5)),
          pronounceability: Math.min(10, Math.max(1, parsed.pronounceability || 5)),
          uniqueness: Math.min(10, Math.max(1, parsed.uniqueness || 5)),
        });
      }
    } catch {
      // Skip invalid JSON lines
      continue;
    }
  }

  return analysisMap;
}

// Calculate domain valuation
export function calculateDomainValuation(domain: string, tld: string): {
  estimatedValue: number;
  investmentScore: number;
  factors: {
    length: number;
    keywords: number;
    tldValue: number;
    brandability: number;
  };
} {
  // Length score (shorter = higher value)
  const lengthScore = domain.length <= 4 ? 10 :
    domain.length <= 6 ? 8 :
    domain.length <= 8 ? 6 :
    domain.length <= 10 ? 4 :
    domain.length <= 12 ? 3 : 2;

  // TLD value score
  const tldScores: Record<string, number> = {
    '.com': 10, '.ai': 9, '.io': 8, '.co': 7, '.net': 6,
    '.org': 6, '.app': 7, '.dev': 7, '.tech': 5, '.me': 5,
    '.xyz': 3, '.info': 3, '.biz': 3, '.us': 4, '.cc': 4, '.so': 4,
  };
  const tldScore = tldScores[tld] || 3;

  // Brandability score (no hyphens, no numbers, pronounceable)
  const hasHyphen = domain.includes('-');
  const hasNumber = /\d/.test(domain);
  const vowelRatio = (domain.match(/[aeiou]/gi) || []).length / domain.length;
  const isPronounceable = vowelRatio >= 0.2 && vowelRatio <= 0.6;

  let brandabilityScore = 10;
  if (hasHyphen) brandabilityScore -= 3;
  if (hasNumber) brandabilityScore -= 2;
  if (!isPronounceable) brandabilityScore -= 2;

  // Keyword score (common valuable words)
  const valuableKeywords = ['ai', 'app', 'tech', 'cloud', 'pay', 'shop', 'buy', 'sell', 'get', 'go', 'hub', 'lab', 'pro'];
  const hasKeyword = valuableKeywords.some(kw => domain.includes(kw));
  const keywordScore = hasKeyword ? 8 : 5;

  // Calculate investment score (1-10)
  const investmentScore = Math.round(
    (lengthScore * 0.3 + tldScore * 0.3 + brandabilityScore * 0.25 + keywordScore * 0.15)
  );

  // Estimate value based on scores
  const baseValue = {
    '.com': 500, '.ai': 400, '.io': 300, '.co': 200, '.net': 150,
    '.org': 150, '.app': 200, '.dev': 200, '.tech': 100, '.me': 100,
  }[tld] || 50;

  const lengthMultiplier = domain.length <= 4 ? 20 :
    domain.length <= 6 ? 10 :
    domain.length <= 8 ? 5 :
    domain.length <= 10 ? 2 : 1;

  const estimatedValue = Math.round(baseValue * lengthMultiplier * (investmentScore / 5));

  return {
    estimatedValue,
    investmentScore: Math.min(10, Math.max(1, investmentScore)),
    factors: {
      length: lengthScore,
      keywords: keywordScore,
      tldValue: tldScore,
      brandability: brandabilityScore,
    },
  };
}

// Generate domains from content/context
export async function generateDomainsFromContent(
  content: string,
  provider: AIProvider = 'openai',
  model?: string
): Promise<string[]> {
  const prompt = `Analyze this content and extract the main themes, keywords, and concepts. Then generate 20 creative, memorable domain name suggestions based on what you find.

CONTENT:
${content.substring(0, 2000)}

Generate 20 unique domain names (without TLD extensions), one per line, no numbering:`;

  const response = await callAIProvider(prompt, provider, model);
  return parseDomainList(response);
}

// Check if API key is configured for a provider
export async function isProviderConfigured(provider: AIProvider): Promise<boolean> {
  const key = await getAPIKey(provider);
  return !!key && key.trim().length > 0;
}

// Get first available provider
export async function getFirstAvailableProvider(): Promise<AIProvider | null> {
  const providers: AIProvider[] = ['openai', 'anthropic', 'gemini', 'groq'];
  for (const provider of providers) {
    if (await isProviderConfigured(provider)) {
      return provider;
    }
  }
  return null;
}
