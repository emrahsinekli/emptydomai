import type { AIProvider, BrandAnalysis } from '../types';
import { getAPIKey } from './storage';

interface BusinessPlanParams {
  brandName: string;
  domain: string;
  industry?: string;
  brandAnalysis?: BrandAnalysis;
  businessIdea: string;
}

export interface GeneratedBusinessPlan {
  summary: string;
  sections: {
    title: string;
    content: string;
  }[];
  fullText: string;
}

// Generate business plan using AI
export async function generateBusinessPlan(
  params: BusinessPlanParams,
  provider: AIProvider = 'openai',
  model?: string
): Promise<GeneratedBusinessPlan> {
  const apiKey = await getAPIKey(provider);
  if (!apiKey) throw new Error(`${provider} API key not configured`);

  const { brandName, domain, industry, brandAnalysis, businessIdea } = params;

  const prompt = `Generate a concise startup business plan outline.

Business: ${brandName}
Domain: ${domain}
Idea: ${businessIdea}
${industry ? `Industry: ${industry}` : ''}
${brandAnalysis?.description ? `Brand Description: ${brandAnalysis.description}` : ''}
${brandAnalysis?.targetAudience ? `Target Audience: ${brandAnalysis.targetAudience}` : ''}

Create a brief business plan with these sections:
1. Executive Summary (2-3 sentences)
2. Problem & Solution
3. Target Market
4. Revenue Model
5. Marketing Strategy
6. Competitive Advantage
7. Key Metrics to Track
8. Next Steps (First 3 months)

For each section, provide 2-4 bullet points. Be specific to this business idea.

Format as JSON:
{
  "summary": "Brief executive summary",
  "sections": [
    {"title": "Section Name", "content": "Bullet points separated by \\n"}
  ]
}

Output ONLY valid JSON:`;

  try {
    let response: string;

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
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate business plan');
      const data = await res.json();
      response = data.choices[0]?.message?.content || '';
    } else if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) throw new Error('Failed to generate business plan');
      const data = await res.json();
      response = data.content[0]?.text || '';
    } else {
      // Fallback to template
      return generateTemplatePlan(params);
    }

    // Parse JSON response
    const cleanedResponse = response
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();

    try {
      const parsed = JSON.parse(cleanedResponse);
      return {
        summary: parsed.summary || '',
        sections: parsed.sections || [],
        fullText: formatBusinessPlan(parsed),
      };
    } catch {
      // If JSON parsing fails, return template
      console.error('Failed to parse business plan JSON');
      return generateTemplatePlan(params);
    }
  } catch (error) {
    console.error('AI generation failed:', error);
    return generateTemplatePlan(params);
  }
}

// Format business plan as readable text
function formatBusinessPlan(plan: { summary: string; sections: { title: string; content: string }[] }): string {
  let text = `BUSINESS PLAN\n${'='.repeat(50)}\n\n`;
  text += `EXECUTIVE SUMMARY\n${plan.summary}\n\n`;

  for (const section of plan.sections) {
    text += `${section.title.toUpperCase()}\n${'-'.repeat(30)}\n${section.content}\n\n`;
  }

  return text;
}

// Generate template business plan
function generateTemplatePlan(params: BusinessPlanParams): GeneratedBusinessPlan {
  const { brandName, businessIdea, brandAnalysis } = params;

  const sections = [
    {
      title: 'Problem & Solution',
      content: `• Identified problem: ${businessIdea}\n• Our solution: ${brandName} provides an innovative approach\n• Key differentiator: User-centric design and simplicity`,
    },
    {
      title: 'Target Market',
      content: `• Primary audience: ${brandAnalysis?.targetAudience || 'Early adopters and tech-savvy users'}\n• Market size: Growing segment with significant potential\n• Geographic focus: Initially English-speaking markets`,
    },
    {
      title: 'Revenue Model',
      content: `• Freemium model with premium features\n• Subscription tiers: Free, Pro ($9/mo), Enterprise (custom)\n• Additional revenue: Partnerships and integrations`,
    },
    {
      title: 'Marketing Strategy',
      content: `• Content marketing and SEO\n• Social media presence (focus on LinkedIn, Twitter)\n• Community building and referral program\n• Strategic partnerships with complementary services`,
    },
    {
      title: 'Competitive Advantage',
      content: `• First-mover advantage in specific niche\n• Superior user experience\n• Strong brand identity: ${brandAnalysis?.slogan || brandName}\n• Scalable technology architecture`,
    },
    {
      title: 'Key Metrics',
      content: `• Monthly Active Users (MAU)\n• Customer Acquisition Cost (CAC)\n• Lifetime Value (LTV)\n• Net Promoter Score (NPS)\n• Monthly Recurring Revenue (MRR)`,
    },
    {
      title: 'Next Steps (First 3 Months)',
      content: `Month 1: MVP development and beta testing\nMonth 2: Launch, initial marketing push\nMonth 3: Gather feedback, iterate, expand features`,
    },
  ];

  const summary = `${brandName} aims to solve ${businessIdea}. With a focus on user experience and innovative technology, we plan to capture market share through a freemium model and strategic marketing.`;

  return {
    summary,
    sections,
    fullText: formatBusinessPlan({ summary, sections }),
  };
}

// Download business plan as text file
export function downloadBusinessPlan(plan: GeneratedBusinessPlan, brandName: string): void {
  const blob = new Blob([plan.fullText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${brandName.toLowerCase().replace(/\s+/g, '-')}-business-plan.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download as markdown
export function downloadBusinessPlanMarkdown(plan: GeneratedBusinessPlan, brandName: string): void {
  let markdown = `# ${brandName} Business Plan\n\n`;
  markdown += `## Executive Summary\n${plan.summary}\n\n`;

  for (const section of plan.sections) {
    markdown += `## ${section.title}\n${section.content.replace(/•/g, '-')}\n\n`;
  }

  markdown += `---\n*Generated with EmptyDomai*`;

  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${brandName.toLowerCase().replace(/\s+/g, '-')}-business-plan.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
