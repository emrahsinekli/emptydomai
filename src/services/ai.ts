import type {
  AIProvider,
  DomainStyle,
  DomainLength,
  SearchParams,
} from '../types';
import { getAPIKey } from './storage';

// AI Provider interface for future extensibility
interface AIProviderHandler {
  generateDomains: (params: GenerateDomainParams) => Promise<string[]>;
}

interface GenerateDomainParams {
  keywords: string;
  style: DomainStyle;
  length: DomainLength;
  language: string;
  tlds: string[];
  maxSuggestions: number;
  context?: string; // For content-based generation
}

// OpenAI implementation
const openAIHandler: AIProviderHandler = {
  async generateDomains(params: GenerateDomainParams): Promise<string[]> {
    const apiKey = await getAPIKey('openai');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = buildPrompt(params);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a domain name generator expert. Generate creative, memorable, and available-sounding domain names based on user requirements.

Rules:
- Only output domain names without TLDs (extensions)
- One domain name per line
- No explanations, numbering, or additional text
- Domain names should be lowercase
- No hyphens unless specifically requested
- Names should be easy to spell and remember
- Consider SEO and branding potential`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate domains');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return parseDomainList(content);
  },
};

// Build the prompt based on parameters
function buildPrompt(params: GenerateDomainParams): string {
  const lengthGuidance = {
    short: '3-6 characters',
    medium: '7-10 characters',
    long: '11-15 characters',
  };

  const styleGuidance = {
    brandable: 'unique, invented words that are memorable and distinct',
    descriptive: 'clear, keyword-based names that describe the business',
    techy: 'modern, tech-focused names with prefixes/suffixes like -ly, -io, -ify',
    playful: 'fun, creative, whimsical names',
    luxury: 'premium, elegant, sophisticated names',
    minimal: 'short, clean, simple names',
    professional: 'business-appropriate, trustworthy names',
  };

  let prompt = `Generate ${params.maxSuggestions} domain name ideas.

Keywords/Topic: ${params.keywords}
${params.context ? `Context: ${params.context}` : ''}

Requirements:
- Style: ${styleGuidance[params.style]}
- Length: ${lengthGuidance[params.length]}
- Language: ${params.language === 'global' ? 'Can mix languages, focus on global appeal' : params.language}
- Target TLDs: ${params.tlds.join(', ')} (generate names that would work well with these extensions)

Generate exactly ${params.maxSuggestions} unique domain names, one per line, without numbering or TLD extensions.`;

  return prompt;
}

// Parse the AI response into a clean list of domains
function parseDomainList(content: string): string[] {
  const lines = content.split('\n');
  const domains: string[] = [];

  for (const line of lines) {
    // Clean the line
    let domain = line
      .trim()
      .toLowerCase()
      // Remove numbering (1., 1), etc.)
      .replace(/^\d+[\.\)\-\s]+/, '')
      // Remove any TLD that might have been included
      .replace(/\.(com|io|ai|co|net|org|app|dev|tech|xyz|me|info|biz|us|cc|so)$/i, '')
      // Remove special characters except allowed ones
      .replace(/[^a-z0-9\-]/g, '')
      .trim();

    // Validate domain
    if (domain.length >= 2 && domain.length <= 63 && !domain.startsWith('-') && !domain.endsWith('-')) {
      domains.push(domain);
    }
  }

  // Remove duplicates
  return [...new Set(domains)];
}

// Provider registry
const providers: Record<AIProvider, AIProviderHandler> = {
  openai: openAIHandler,
  anthropic: openAIHandler, // TODO: Implement Anthropic handler
  gemini: openAIHandler, // TODO: Implement Gemini handler
};

// Main function to generate domains
export async function generateDomains(
  params: SearchParams,
  provider: AIProvider = 'openai'
): Promise<string[]> {
  const handler = providers[provider];
  if (!handler) {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  const generateParams: GenerateDomainParams = {
    keywords: params.inputText,
    style: params.style,
    length: params.length,
    language: params.language,
    tlds: params.tlds,
    maxSuggestions: params.maxSuggestions,
    context: params.inputType === 'content' ? params.inputText : undefined,
  };

  return handler.generateDomains(generateParams);
}

// Generate domains from content/context
export async function generateDomainsFromContent(
  content: string,
  _provider: AIProvider = 'openai'
): Promise<string[]> {
  const apiKey = await getAPIKey('openai');
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a domain name generator expert. Analyze the provided content and generate creative, memorable domain name suggestions that capture the essence of the content.

Rules:
- Only output domain names without TLDs (extensions)
- One domain name per line
- No explanations, numbering, or additional text
- Domain names should be lowercase
- No hyphens unless the content suggests them
- Names should be easy to spell and remember
- Consider the main themes, topics, and keywords in the content`,
        },
        {
          role: 'user',
          content: `Analyze this content and generate 20 creative domain name suggestions based on its themes and keywords:

${content.substring(0, 2000)}

Generate 20 unique domain names, one per line, without numbering or TLD extensions.`,
        },
      ],
      max_tokens: 500,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate domains from content');
  }

  const data = await response.json();
  const responseContent = data.choices[0]?.message?.content || '';

  return parseDomainList(responseContent);
}

// Check if API key is configured for a provider
export async function isProviderConfigured(provider: AIProvider): Promise<boolean> {
  const key = await getAPIKey(provider);
  return !!key && key.trim().length > 0;
}
