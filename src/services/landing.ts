import type { AIProvider, BrandAnalysis } from '../types';
import { getAPIKey } from './storage';

interface LandingPageParams {
  brandName: string;
  domain: string;
  industry?: string;
  brandAnalysis?: BrandAnalysis;
  style?: 'minimal' | 'modern' | 'bold' | 'elegant';
}

interface GeneratedLandingPage {
  html: string;
  css: string;
  description: string;
}

// Generate landing page HTML/CSS using AI
export async function generateLandingPage(
  params: LandingPageParams,
  provider: AIProvider = 'openai',
  model?: string
): Promise<GeneratedLandingPage> {
  const apiKey = await getAPIKey(provider);
  if (!apiKey) throw new Error(`${provider} API key not configured`);

  const { brandName, domain, industry, brandAnalysis, style = 'modern' } = params;

  const prompt = `Generate a simple, professional landing page for a startup.

Brand: ${brandName}
Domain: ${domain}
${industry ? `Industry: ${industry}` : ''}
${brandAnalysis?.slogan ? `Slogan: ${brandAnalysis.slogan}` : ''}
${brandAnalysis?.description ? `Description: ${brandAnalysis.description}` : ''}
Style: ${style}

Generate a complete HTML landing page with inline CSS. Include:
1. Hero section with brand name and tagline
2. Brief description/value proposition
3. Call-to-action button (Coming Soon or Notify Me)
4. Simple footer

Requirements:
- Single HTML file with inline styles
- Mobile responsive using CSS media queries
- Clean, professional design
- Use CSS variables for colors
- Include a simple animation on the CTA button

Output ONLY the HTML code, no explanation:`;

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

      if (!res.ok) throw new Error('Failed to generate landing page');
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

      if (!res.ok) throw new Error('Failed to generate landing page');
      const data = await res.json();
      response = data.content[0]?.text || '';
    } else {
      // Fallback to template
      response = generateTemplateHTML(params);
    }

    // Clean up the response
    const cleanedHtml = cleanHtmlResponse(response);

    return {
      html: cleanedHtml,
      css: '', // CSS is inline in HTML
      description: `Landing page for ${brandName}`,
    };
  } catch (error) {
    // Fallback to template if AI fails
    console.error('AI generation failed, using template:', error);
    return {
      html: generateTemplateHTML(params),
      css: '',
      description: `Template landing page for ${brandName}`,
    };
  }
}

// Clean up HTML response from AI
function cleanHtmlResponse(html: string): string {
  // Remove markdown code blocks if present
  let cleaned = html.replace(/```html\n?/gi, '').replace(/```\n?/gi, '');

  // Ensure it starts with proper HTML
  if (!cleaned.trim().startsWith('<!DOCTYPE') && !cleaned.trim().startsWith('<html')) {
    if (cleaned.includes('<body')) {
      cleaned = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Landing Page</title>\n</head>\n${cleaned}`;
    }
  }

  return cleaned.trim();
}

// Generate a template landing page
function generateTemplateHTML(params: LandingPageParams): string {
  const { brandName, domain, brandAnalysis, style = 'modern' } = params;
  const slogan = brandAnalysis?.slogan || 'Coming Soon';
  const description = brandAnalysis?.description || 'Something amazing is on its way. Stay tuned!';

  const colorSchemes: Record<string, { primary: string; secondary: string; bg: string; text: string }> = {
    minimal: { primary: '#000000', secondary: '#666666', bg: '#ffffff', text: '#1a1a1a' },
    modern: { primary: '#6366f1', secondary: '#818cf8', bg: '#f8fafc', text: '#1e293b' },
    bold: { primary: '#ef4444', secondary: '#f97316', bg: '#0f172a', text: '#f8fafc' },
    elegant: { primary: '#b8860b', secondary: '#d4af37', bg: '#1a1a1a', text: '#f5f5f5' },
  };

  const colors = colorSchemes[style] || colorSchemes.modern;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${brandName} - ${slogan}</title>
    <style>
        :root {
            --primary: ${colors.primary};
            --secondary: ${colors.secondary};
            --bg: ${colors.bg};
            --text: ${colors.text};
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .hero {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 2rem;
        }

        .logo {
            font-size: 4rem;
            font-weight: 800;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 1rem;
        }

        .tagline {
            font-size: 1.5rem;
            opacity: 0.8;
            margin-bottom: 2rem;
        }

        .description {
            max-width: 600px;
            line-height: 1.6;
            opacity: 0.7;
            margin-bottom: 2rem;
        }

        .cta {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            border: none;
            padding: 1rem 2rem;
            font-size: 1.1rem;
            border-radius: 50px;
            cursor: pointer;
            transition: transform 0.3s, box-shadow 0.3s;
        }

        .cta:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .domain {
            margin-top: 2rem;
            font-size: 0.9rem;
            opacity: 0.5;
        }

        footer {
            text-align: center;
            padding: 1rem;
            opacity: 0.5;
            font-size: 0.85rem;
        }

        @media (max-width: 768px) {
            .logo { font-size: 2.5rem; }
            .tagline { font-size: 1.2rem; }
        }
    </style>
</head>
<body>
    <main class="hero">
        <h1 class="logo">${brandName}</h1>
        <p class="tagline">${slogan}</p>
        <p class="description">${description}</p>
        <button class="cta">Notify Me</button>
        <p class="domain">${domain}</p>
    </main>
    <footer>
        &copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.
    </footer>
</body>
</html>`;
}

// Download landing page as HTML file
export function downloadLandingPage(html: string, brandName: string): void {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${brandName.toLowerCase().replace(/\s+/g, '-')}-landing.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Preview landing page in new window
export function previewLandingPage(html: string): void {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  // Note: URL will be revoked after some time by browser
}
