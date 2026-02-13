import type { ImageAIProvider } from '../types';
import { IMAGE_AI_PROVIDERS } from '../types';
import { getAPIKey, getDefaultProviderSettings } from './storage';

// Get selected logo provider name for UI display
export async function getSelectedLogoProviderName(): Promise<string> {
  const settings = await getDefaultProviderSettings();
  const provider = settings.logoGeneration.provider;
  const providerConfig = IMAGE_AI_PROVIDERS.find(p => p.id === provider);
  return providerConfig?.name || 'AI';
}

export interface LogoVariant {
  id: string;
  imageUrl: string; // Base64 data URL or URL
  style: string;
  colors: string[];
  prompt: string;
}

export interface GeneratedLogos {
  variants: LogoVariant[];
  brandName: string;
  generatedAt: string;
}

export interface LogoGenerationParams {
  brandName: string;
  style: 'minimal' | 'modern' | 'vintage' | 'playful' | 'luxury' | 'tech';
  industry?: string;
  description?: string;
}

// Style descriptions for AI prompts
const STYLE_PROMPTS: Record<string, string> = {
  minimal: 'minimalist, clean lines, simple geometric shapes, monochrome or limited colors, modern simplicity, flat design',
  modern: 'contemporary, gradient colors, rounded corners, sleek, professional, tech-forward, vibrant',
  vintage: 'retro, classic, serif typography, muted colors, nostalgic, badge-style, timeless elegance',
  playful: 'fun, colorful, rounded shapes, friendly, approachable, cartoon-style, cheerful',
  luxury: 'elegant, gold accents, sophisticated, premium, serif fonts, dark backgrounds, refined',
  tech: 'futuristic, neon colors, geometric, digital, circuit-like patterns, innovative, cutting-edge',
};

// Color schemes by style
const STYLE_COLORS: Record<string, string[][]> = {
  minimal: [
    ['#000000', '#FFFFFF'],
    ['#1a1a1a', '#f5f5f5'],
    ['#2d3748', '#edf2f7'],
  ],
  modern: [
    ['#6366f1', '#ec4899', '#f59e0b'],
    ['#3b82f6', '#10b981', '#8b5cf6'],
    ['#0ea5e9', '#22c55e', '#f43f5e'],
  ],
  vintage: [
    ['#92400e', '#fef3c7', '#1e3a5f'],
    ['#7c2d12', '#fef9c3', '#1e40af'],
    ['#78350f', '#fdf4ff', '#4c1d95'],
  ],
  playful: [
    ['#f472b6', '#c084fc', '#60a5fa'],
    ['#fb7185', '#a78bfa', '#34d399'],
    ['#facc15', '#fb923c', '#f87171'],
  ],
  luxury: [
    ['#d4af37', '#1a1a1a', '#ffffff'],
    ['#c9a227', '#0a0a0a', '#f5f5f5'],
    ['#b8860b', '#000000', '#ffd700'],
  ],
  tech: [
    ['#00ff88', '#0a0a0a', '#00d4ff'],
    ['#7c3aed', '#1e1e2e', '#06b6d4'],
    ['#10b981', '#111827', '#3b82f6'],
  ],
};

// Generate 3 different logo variants using AI
export async function generateLogoVariants(
  params: LogoGenerationParams,
  providerOverride?: ImageAIProvider
): Promise<GeneratedLogos> {
  // Get default provider from settings if not overridden
  let provider = providerOverride;
  if (!provider) {
    const settings = await getDefaultProviderSettings();
    provider = settings.logoGeneration.provider;
  }

  // Get the appropriate API key
  const apiKeyField = provider === 'openai' ? 'openai' : provider;
  const apiKey = await getAPIKey(apiKeyField);
  if (!apiKey) throw new Error(`${provider} API key not configured`);

  const { brandName, style, industry, description } = params;
  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.modern;
  const colorPalettes = STYLE_COLORS[style] || STYLE_COLORS.modern;

  // Generate 3 different prompts for variety
  const prompts = [
    `Create a ${stylePrompt} logo icon for "${brandName}"${industry ? ` in the ${industry} industry` : ''}. ${description || ''} The logo should be a simple, iconic symbol that works at small sizes. Use the first letter "${brandName.charAt(0).toUpperCase()}" creatively. Style: abstract geometric.`,
    `Design a ${stylePrompt} brand mark for "${brandName}"${industry ? `, a ${industry} company` : ''}. ${description || ''} Create a memorable icon that represents innovation and trust. Style: lettermark with creative typography.`,
    `Generate a ${stylePrompt} logo for "${brandName}"${industry ? ` (${industry})` : ''}. ${description || ''} The logo should be unique, professional, and instantly recognizable. Style: symbol-based with optional text.`,
  ];

  const variants: LogoVariant[] = [];

  if (provider === 'openai') {
    // Use DALL-E 3 for image generation
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: `${prompts[i]} White or transparent background. No text except the brand name. High quality, vector-style illustration suitable for a logo. Square format.`,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
            response_format: 'b64_json',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('DALL-E error:', errorData);
          // Fallback to SVG if DALL-E fails
          variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
          continue;
        }

        const data = await response.json();
        const imageData = data.data[0]?.b64_json;

        if (imageData) {
          variants.push({
            id: `logo-${i}-${Date.now()}`,
            imageUrl: `data:image/png;base64,${imageData}`,
            style,
            colors: colorPalettes[i],
            prompt: prompts[i],
          });
        } else {
          variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
        }
      } catch (error) {
        console.error(`Failed to generate logo variant ${i}:`, error);
        variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
      }
    }
  } else if (provider === 'stability') {
    // Use Stability AI (Stable Diffusion)
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            text_prompts: [
              {
                text: `${prompts[i]} White or transparent background. No text except the brand name. High quality, vector-style illustration suitable for a logo. Square format. Professional logo design.`,
                weight: 1,
              },
              {
                text: 'blurry, low quality, distorted, ugly, bad proportions',
                weight: -1,
              },
            ],
            cfg_scale: 7,
            width: 1024,
            height: 1024,
            samples: 1,
            steps: 30,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Stability AI error:', errorData);
          variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
          continue;
        }

        const data = await response.json();
        const imageData = data.artifacts?.[0]?.base64;

        if (imageData) {
          variants.push({
            id: `logo-stability-${i}-${Date.now()}`,
            imageUrl: `data:image/png;base64,${imageData}`,
            style,
            colors: colorPalettes[i],
            prompt: prompts[i],
          });
        } else {
          variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
        }
      } catch (error) {
        console.error(`Failed to generate logo variant ${i} with Stability:`, error);
        variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
      }
    }
  } else if (provider === 'replicate') {
    // Use Replicate (Flux)
    for (let i = 0; i < 3; i++) {
      try {
        // Start the prediction
        const startResponse = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${apiKey}`,
          },
          body: JSON.stringify({
            version: 'black-forest-labs/flux-schnell',
            input: {
              prompt: `${prompts[i]} White or transparent background. No text except the brand name. High quality, vector-style illustration suitable for a logo. Square format. Professional logo design.`,
              aspect_ratio: '1:1',
              output_format: 'png',
              output_quality: 90,
            },
          }),
        });

        if (!startResponse.ok) {
          const errorData = await startResponse.json();
          console.error('Replicate start error:', errorData);
          variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
          continue;
        }

        const prediction = await startResponse.json();

        // Poll for completion (max 60 seconds)
        let result = prediction;
        let attempts = 0;
        while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const pollResponse = await fetch(result.urls.get, {
            headers: { 'Authorization': `Token ${apiKey}` },
          });
          result = await pollResponse.json();
          attempts++;
        }

        if (result.status === 'succeeded' && result.output?.[0]) {
          // Fetch the image and convert to base64
          const imageResponse = await fetch(result.output[0]);
          const imageBlob = await imageResponse.blob();
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(imageBlob);
          });

          variants.push({
            id: `logo-replicate-${i}-${Date.now()}`,
            imageUrl: base64,
            style,
            colors: colorPalettes[i],
            prompt: prompts[i],
          });
        } else {
          variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
        }
      } catch (error) {
        console.error(`Failed to generate logo variant ${i} with Replicate:`, error);
        variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
      }
    }
  } else if (provider === 'leonardo') {
    // Use Leonardo AI
    for (let i = 0; i < 3; i++) {
      try {
        // Start the generation
        const startResponse = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            prompt: `${prompts[i]} White or transparent background. No text except the brand name. High quality, vector-style illustration suitable for a logo. Square format. Professional logo design.`,
            modelId: '6bef9f1b-29cb-40c7-b9df-32b51c1f67d3', // Leonardo Diffusion XL
            width: 1024,
            height: 1024,
            num_images: 1,
          }),
        });

        if (!startResponse.ok) {
          const errorData = await startResponse.json();
          console.error('Leonardo start error:', errorData);
          variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
          continue;
        }

        const startData = await startResponse.json();
        const generationId = startData.sdGenerationJob?.generationId;

        if (!generationId) {
          variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
          continue;
        }

        // Poll for completion
        let imageUrl = null;
        let attempts = 0;
        while (!imageUrl && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const pollResponse = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });
          const pollData = await pollResponse.json();

          if (pollData.generations_by_pk?.status === 'COMPLETE') {
            imageUrl = pollData.generations_by_pk.generated_images?.[0]?.url;
          }
          attempts++;
        }

        if (imageUrl) {
          // Fetch and convert to base64
          const imageResponse = await fetch(imageUrl);
          const imageBlob = await imageResponse.blob();
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(imageBlob);
          });

          variants.push({
            id: `logo-leonardo-${i}-${Date.now()}`,
            imageUrl: base64,
            style,
            colors: colorPalettes[i],
            prompt: prompts[i],
          });
        } else {
          variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
        }
      } catch (error) {
        console.error(`Failed to generate logo variant ${i} with Leonardo:`, error);
        variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
      }
    }
  } else if (provider === 'fal') {
    // Use Fal.ai (Fast Flux)
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${apiKey}`,
          },
          body: JSON.stringify({
            prompt: `${prompts[i]} White or transparent background. No text except the brand name. High quality, vector-style illustration suitable for a logo. Square format. Professional logo design.`,
            image_size: 'square',
            num_inference_steps: 4,
            num_images: 1,
            enable_safety_checker: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Fal.ai error:', errorData);
          variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
          continue;
        }

        const data = await response.json();
        const imageUrl = data.images?.[0]?.url;

        if (imageUrl) {
          // Fetch and convert to base64
          const imageResponse = await fetch(imageUrl);
          const imageBlob = await imageResponse.blob();
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(imageBlob);
          });

          variants.push({
            id: `logo-fal-${i}-${Date.now()}`,
            imageUrl: base64,
            style,
            colors: colorPalettes[i],
            prompt: prompts[i],
          });
        } else {
          variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
        }
      } catch (error) {
        console.error(`Failed to generate logo variant ${i} with Fal.ai:`, error);
        variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
      }
    }
  } else if (provider === 'gemini') {
    // Use Google Gemini Imagen 3
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instances: [{
              prompt: `${prompts[i]} White or transparent background. No text except the brand name. High quality, vector-style illustration suitable for a logo. Square format. Professional logo design.`,
            }],
            parameters: {
              sampleCount: 1,
              aspectRatio: '1:1',
              outputMimeType: 'image/png',
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Gemini Imagen error:', errorData);
          variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
          continue;
        }

        const data = await response.json();
        const imageData = data.predictions?.[0]?.bytesBase64Encoded;

        if (imageData) {
          variants.push({
            id: `logo-gemini-${i}-${Date.now()}`,
            imageUrl: `data:image/png;base64,${imageData}`,
            style,
            colors: colorPalettes[i],
            prompt: prompts[i],
          });
        } else {
          variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
        }
      } catch (error) {
        console.error(`Failed to generate logo variant ${i} with Gemini Imagen:`, error);
        variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
      }
    }
  } else if (provider === 'together') {
    // Use Together AI
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetch('https://api.together.xyz/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'black-forest-labs/FLUX.1-schnell-Free',
            prompt: `${prompts[i]} White or transparent background. No text except the brand name. High quality, vector-style illustration suitable for a logo. Square format. Professional logo design.`,
            width: 1024,
            height: 1024,
            steps: 4,
            n: 1,
            response_format: 'b64_json',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Together AI error:', errorData);
          variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
          continue;
        }

        const data = await response.json();
        const imageData = data.data?.[0]?.b64_json;

        if (imageData) {
          variants.push({
            id: `logo-together-${i}-${Date.now()}`,
            imageUrl: `data:image/png;base64,${imageData}`,
            style,
            colors: colorPalettes[i],
            prompt: prompts[i],
          });
        } else {
          variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
        }
      } catch (error) {
        console.error(`Failed to generate logo variant ${i} with Together AI:`, error);
        variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
      }
    }
  } else {
    // Unknown provider, use SVG fallback
    for (let i = 0; i < 3; i++) {
      variants.push(generateSVGFallback(brandName, style, colorPalettes[i], i));
    }
  }

  return {
    variants,
    brandName,
    generatedAt: new Date().toISOString(),
  };
}

// Generate SVG fallback when AI generation fails
function generateSVGFallback(
  brandName: string,
  style: string,
  colors: string[],
  variantIndex: number
): LogoVariant {
  const firstLetter = brandName.charAt(0).toUpperCase();
  const primary = colors[0];
  const secondary = colors[1] || '#ffffff';
  const accent = colors[2] || primary;

  // Different SVG designs based on variant index
  const svgDesigns = [
    // Variant 0: Circle with letter
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="grad0" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primary}"/>
          <stop offset="100%" style="stop-color:${accent}"/>
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="${secondary}"/>
      <circle cx="100" cy="100" r="80" fill="url(#grad0)"/>
      <text x="100" y="130" font-family="Arial, sans-serif" font-size="90" font-weight="bold" fill="${secondary}" text-anchor="middle">${firstLetter}</text>
    </svg>`,

    // Variant 1: Rounded square with letter
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="${secondary}"/>
      <rect x="20" y="20" width="160" height="160" rx="30" fill="${primary}"/>
      <text x="100" y="130" font-family="Arial, sans-serif" font-size="90" font-weight="bold" fill="${secondary}" text-anchor="middle">${firstLetter}</text>
    </svg>`,

    // Variant 2: Hexagon with letter
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primary}"/>
          <stop offset="100%" style="stop-color:${accent}"/>
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill="${secondary}"/>
      <polygon points="100,10 180,55 180,145 100,190 20,145 20,55" fill="url(#grad2)"/>
      <text x="100" y="125" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="${secondary}" text-anchor="middle">${firstLetter}</text>
    </svg>`,
  ];

  const svg = svgDesigns[variantIndex] || svgDesigns[0];
  const svgBase64 = btoa(unescape(encodeURIComponent(svg)));

  return {
    id: `logo-svg-${variantIndex}-${Date.now()}`,
    imageUrl: `data:image/svg+xml;base64,${svgBase64}`,
    style,
    colors,
    prompt: 'SVG fallback design',
  };
}

// Download selected logo as ZIP with all sizes
export async function downloadLogoAsZip(
  logo: LogoVariant,
  brandName: string
): Promise<void> {
  // Since we can't use JSZip in this environment, we'll create a multi-file download
  // or a comprehensive package file

  const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
  const cleanBrandName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Check if it's SVG or raster image
  const isSvg = logo.imageUrl.startsWith('data:image/svg+xml');

  if (isSvg) {
    // For SVG, we can resize by modifying viewBox
    const svgContent = atob(logo.imageUrl.split(',')[1]);

    // Create a comprehensive download with all sizes info
    let packageContent = `# ${brandName} Brand Logo Kit
Generated: ${new Date().toISOString()}
Style: ${logo.style}
Colors: ${logo.colors.join(', ')}

## Included Sizes
${sizes.map(s => `- ${s}x${s}px`).join('\n')}

## Main Logo (SVG - Scalable)
${svgContent}

## Usage Instructions
1. The SVG above can be scaled to any size without quality loss
2. For web favicons, use 16x16, 32x32, or 48x48
3. For app icons, use 512x512 or 1024x1024
4. For social media, use 256x256 or 512x512

## Color Palette
Primary: ${logo.colors[0]}
Secondary: ${logo.colors[1] || '#ffffff'}
Accent: ${logo.colors[2] || logo.colors[0]}
`;

    // Download as text file with SVG embedded
    downloadFile(packageContent, `${cleanBrandName}-brand-kit.txt`, 'text/plain');

    // Also download the SVG separately
    downloadFile(svgContent, `${cleanBrandName}-logo.svg`, 'image/svg+xml');

  } else {
    // For raster images (PNG from DALL-E)
    // Download the main image
    const link = document.createElement('a');
    link.href = logo.imageUrl;
    link.download = `${cleanBrandName}-logo-1024.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Create resized versions using canvas
    await downloadResizedImages(logo.imageUrl, cleanBrandName, sizes);
  }
}

// Helper to download file
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Resize and download images
async function downloadResizedImages(
  imageUrl: string,
  brandName: string,
  sizes: number[]
): Promise<void> {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  return new Promise((resolve) => {
    img.onload = async () => {
      // Download each size
      for (const size of sizes.slice(0, 4)) { // Only download first 4 sizes to avoid spam
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/png');

          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `${brandName}-logo-${size}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Small delay between downloads
          await new Promise(r => setTimeout(r, 300));
        }
      }
      resolve();
    };

    img.onerror = () => {
      console.error('Failed to load image for resizing');
      resolve();
    };

    img.src = imageUrl;
  });
}

// Download single logo image
export function downloadSingleLogo(logo: LogoVariant, brandName: string, size?: number): void {
  const cleanBrandName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (logo.imageUrl.startsWith('data:image/svg+xml')) {
    const svgContent = atob(logo.imageUrl.split(',')[1]);
    downloadFile(svgContent, `${cleanBrandName}-logo.svg`, 'image/svg+xml');
  } else {
    const link = document.createElement('a');
    link.href = logo.imageUrl;
    link.download = `${cleanBrandName}-logo${size ? `-${size}` : ''}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Legacy function for backward compatibility
export async function downloadBrandKit(
  brandName: string,
  style: 'minimal' | 'modern' | 'vintage' | 'playful' | 'luxury' | 'tech',
  industry?: string
): Promise<void> {
  const logos = await generateLogoVariants({ brandName, style, industry });
  if (logos.variants.length > 0) {
    await downloadLogoAsZip(logos.variants[0], brandName);
  }
}

// Generate brand kit (legacy)
export async function generateBrandKit(params: LogoGenerationParams): Promise<{
  logos: { size: string; svg: string }[];
  colors: string[];
  style: string;
  brandName: string;
}> {
  const colorPalettes = STYLE_COLORS[params.style] || STYLE_COLORS.modern;
  const fallback = generateSVGFallback(params.brandName, params.style, colorPalettes[0], 0);

  const sizes = ['16x16', '32x32', '48x48', '64x64', '128x128', '256x256', '512x512'];

  return {
    logos: sizes.map(size => ({ size, svg: fallback.imageUrl })),
    colors: colorPalettes[0],
    style: params.style,
    brandName: params.brandName,
  };
}
