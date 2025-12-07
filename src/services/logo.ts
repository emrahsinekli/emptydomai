import type {
  LogoGenerationParams,
  GeneratedLogo,
  LogoVariant,
  LogoStyle,
  LogoShape,
} from '../types';
import { getAPIKey } from './storage';

// JSZip for creating downloadable zip files
let JSZip: typeof import('jszip') | null = null;

async function loadJSZip() {
  if (!JSZip) {
    JSZip = (await import('jszip')).default;
  }
  return JSZip;
}

// ============================================
// AI PROVIDER TYPES
// ============================================

export type LogoAIProvider =
  | 'openai'      // DALL-E 3
  | 'stability'   // Stable Diffusion
  | 'gemini'      // Google Gemini Imagen
  | 'replicate';  // Replicate (multiple models)

export interface LogoAIProviderConfig {
  id: LogoAIProvider;
  name: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyName: 'openai' | 'stability' | 'gemini' | 'replicate';
  models?: { id: string; name: string }[];
}

export const LOGO_AI_PROVIDERS: LogoAIProviderConfig[] = [
  {
    id: 'openai',
    name: 'DALL-E 3',
    description: 'OpenAI - High quality, creative logos',
    requiresApiKey: true,
    apiKeyName: 'openai',
  },
  {
    id: 'stability',
    name: 'Stable Diffusion',
    description: 'Stability AI - Fast, detailed generation',
    requiresApiKey: true,
    apiKeyName: 'stability',
    models: [
      { id: 'stable-diffusion-xl-1024-v1-0', name: 'SDXL 1.0' },
      { id: 'stable-diffusion-v1-6', name: 'SD 1.6' },
      { id: 'stable-diffusion-xl-beta-v2-2-2', name: 'SDXL Beta' },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Imagen',
    description: 'Google AI - Photorealistic results',
    requiresApiKey: true,
    apiKeyName: 'gemini',
  },
  {
    id: 'replicate',
    name: 'Replicate',
    description: 'Multiple open-source models',
    requiresApiKey: true,
    apiKeyName: 'replicate',
    models: [
      { id: 'stability-ai/sdxl', name: 'SDXL' },
      { id: 'black-forest-labs/flux-schnell', name: 'FLUX Schnell' },
      { id: 'black-forest-labs/flux-dev', name: 'FLUX Dev' },
      { id: 'ideogram-ai/ideogram-v2', name: 'Ideogram V2' },
    ],
  },
];

// Extended params with provider
export interface ExtendedLogoParams extends LogoGenerationParams {
  provider: LogoAIProvider;
  model?: string;
}

// ============================================
// MAIN LOGO GENERATION
// ============================================

/**
 * Generate logo using selected AI provider
 */
export async function generateLogo(
  params: LogoGenerationParams,
  provider: LogoAIProvider = 'openai',
  model?: string
): Promise<GeneratedLogo> {
  const prompt = buildLogoPrompt(params);

  switch (provider) {
    case 'openai':
      return generateWithOpenAI(params, prompt);
    case 'stability':
      return generateWithStability(params, prompt, model);
    case 'gemini':
      return generateWithGemini(params, prompt);
    case 'replicate':
      return generateWithReplicate(params, prompt, model);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ============================================
// OPENAI DALL-E 3
// ============================================

async function generateWithOpenAI(
  params: LogoGenerationParams,
  prompt: string
): Promise<GeneratedLogo> {
  const apiKey = await getAPIKey('openai');
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Go to Settings to add it.');
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
      response_format: 'b64_json',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'DALL-E generation failed');
  }

  const data = await response.json();
  const imageData = data.data[0];

  return {
    id: `logo_dalle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    originalUrl: imageData.url || '',
    originalBase64: imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : undefined,
    prompt,
    style: params.style,
    shape: params.shape,
    createdAt: new Date(),
  };
}

// ============================================
// STABILITY AI (STABLE DIFFUSION)
// ============================================

async function generateWithStability(
  params: LogoGenerationParams,
  prompt: string,
  model: string = 'stable-diffusion-xl-1024-v1-0'
): Promise<GeneratedLogo> {
  const apiKey = await getAPIKey('stability');
  if (!apiKey) {
    throw new Error('Stability AI API key not configured. Go to Settings to add it.');
  }

  const engineId = model || 'stable-diffusion-xl-1024-v1-0';

  const response = await fetch(
    `https://api.stability.ai/v1/generation/${engineId}/text-to-image`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: prompt,
            weight: 1,
          },
          {
            text: 'blurry, bad quality, distorted, ugly, text, watermark',
            weight: -1,
          },
        ],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        steps: 30,
        samples: 1,
        style_preset: 'digital-art',
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Stable Diffusion generation failed');
  }

  const data = await response.json();
  const artifact = data.artifacts[0];

  return {
    id: `logo_sd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    originalUrl: '',
    originalBase64: `data:image/png;base64,${artifact.base64}`,
    prompt,
    style: params.style,
    shape: params.shape,
    createdAt: new Date(),
  };
}

// ============================================
// GOOGLE GEMINI IMAGEN
// ============================================

async function generateWithGemini(
  params: LogoGenerationParams,
  prompt: string
): Promise<GeneratedLogo> {
  const apiKey = await getAPIKey('gemini');
  if (!apiKey) {
    throw new Error('Google Gemini API key not configured. Go to Settings to add it.');
  }

  // Gemini Imagen API endpoint
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        number_of_images: 1,
        aspect_ratio: '1:1',
        safety_filter_level: 'block_only_high',
        person_generation: 'dont_allow',
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    // Fallback to alternative endpoint if Imagen not available
    if (error.error?.code === 404 || error.error?.code === 400) {
      return generateWithGeminiFallback(params, prompt, apiKey);
    }
    throw new Error(error.error?.message || 'Gemini Imagen generation failed');
  }

  const data = await response.json();
  const image = data.generated_images?.[0];

  if (!image) {
    throw new Error('No image generated from Gemini');
  }

  return {
    id: `logo_gemini_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    originalUrl: '',
    originalBase64: image.image?.image_bytes
      ? `data:image/png;base64,${image.image.image_bytes}`
      : undefined,
    prompt,
    style: params.style,
    shape: params.shape,
    createdAt: new Date(),
  };
}

// Fallback using Gemini text model with image generation
async function generateWithGeminiFallback(
  params: LogoGenerationParams,
  prompt: string,
  apiKey: string
): Promise<GeneratedLogo> {
  // Try alternative Gemini vision/generation endpoint
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Generate a logo image based on this description: ${prompt}. Return the image.`
          }]
        }],
        generationConfig: {
          responseModalities: ['image', 'text'],
          responseMimeType: 'image/png',
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini fallback generation failed. Make sure your API key has image generation access.');
  }

  const data = await response.json();
  const imagePart = data.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: { data: string } }) => p.inlineData?.data
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error('No image generated from Gemini. Your API plan may not support image generation.');
  }

  return {
    id: `logo_gemini_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    originalUrl: '',
    originalBase64: `data:image/png;base64,${imagePart.inlineData.data}`,
    prompt,
    style: params.style,
    shape: params.shape,
    createdAt: new Date(),
  };
}

// ============================================
// REPLICATE (MULTIPLE MODELS)
// ============================================

async function generateWithReplicate(
  params: LogoGenerationParams,
  prompt: string,
  model: string = 'stability-ai/sdxl'
): Promise<GeneratedLogo> {
  const apiKey = await getAPIKey('replicate');
  if (!apiKey) {
    throw new Error('Replicate API key not configured. Go to Settings to add it.');
  }

  // Model-specific configurations
  const modelConfigs: Record<string, object> = {
    'stability-ai/sdxl': {
      width: 1024,
      height: 1024,
      num_outputs: 1,
      scheduler: 'K_EULER',
      num_inference_steps: 25,
      guidance_scale: 7.5,
      negative_prompt: 'blurry, bad quality, distorted, ugly, text, watermark',
    },
    'black-forest-labs/flux-schnell': {
      num_outputs: 1,
      aspect_ratio: '1:1',
      output_format: 'png',
      output_quality: 90,
    },
    'black-forest-labs/flux-dev': {
      num_outputs: 1,
      aspect_ratio: '1:1',
      output_format: 'png',
      guidance: 3.5,
      num_inference_steps: 28,
    },
    'ideogram-ai/ideogram-v2': {
      aspect_ratio: '1:1',
      style_type: 'Design',
      magic_prompt_option: 'Auto',
    },
  };

  const modelConfig = modelConfigs[model] || modelConfigs['stability-ai/sdxl'];

  // Create prediction
  const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      input: {
        prompt: prompt,
        ...modelConfig,
      },
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.json();
    throw new Error(error.detail || 'Replicate prediction creation failed');
  }

  const prediction = await createResponse.json();

  // Poll for completion
  let result = prediction;
  const maxAttempts = 60; // 60 seconds max
  let attempts = 0;

  while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pollResponse = await fetch(result.urls.get, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    result = await pollResponse.json();
    attempts++;
  }

  if (result.status === 'failed') {
    throw new Error(result.error || 'Replicate generation failed');
  }

  if (result.status !== 'succeeded') {
    throw new Error('Replicate generation timed out');
  }

  // Get the output image URL
  const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;

  // Fetch and convert to base64
  const imageResponse = await fetch(outputUrl);
  const imageBlob = await imageResponse.blob();
  const base64 = await blobToBase64(imageBlob);

  return {
    id: `logo_replicate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    originalUrl: outputUrl,
    originalBase64: base64,
    prompt,
    style: params.style,
    shape: params.shape,
    createdAt: new Date(),
  };
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildLogoPrompt(params: LogoGenerationParams): string {
  const styleDescriptions: Record<LogoStyle, string> = {
    minimal: 'minimalist, clean lines, simple geometric shapes, flat design, modern minimal aesthetic',
    modern: 'contemporary, sleek, gradient colors, professional modern design, 2024 design trends',
    vintage: 'retro, classic, hand-crafted feel, nostalgic, timeless vintage aesthetic',
    playful: 'fun, colorful, friendly, approachable, whimsical design elements',
    corporate: 'professional, trustworthy, business-oriented, established corporate identity',
    tech: 'futuristic, digital, innovative, tech startup aesthetic, circuit-inspired elements',
    luxury: 'elegant, premium, sophisticated, high-end, luxurious gold/black accents',
    handdrawn: 'hand-drawn, artistic, unique, organic shapes, artisanal feel',
  };

  const shapeDescriptions: Record<LogoShape, string> = {
    square: 'square format, contained within a square boundary',
    circle: 'circular, contained within a circle, round design',
    rounded: 'rounded corners, soft edges, smooth rectangular shape',
    abstract: 'abstract shape, creative form, unique silhouette',
  };

  const colorInstructions = params.primaryColor
    ? `Primary color: ${params.primaryColor}${params.secondaryColor ? `, secondary color: ${params.secondaryColor}` : ''}.`
    : 'Use appropriate colors for the brand.';

  const industryContext = params.industry
    ? `This is for a ${params.industry} business.`
    : '';

  const keywordContext = params.keywords?.length
    ? `Keywords to incorporate: ${params.keywords.join(', ')}.`
    : '';

  return `Design a professional logo for a brand called "${params.brandName}"${params.tagline ? ` with tagline "${params.tagline}"` : ''}.

Style: ${styleDescriptions[params.style]}
Shape: ${shapeDescriptions[params.shape]}
${colorInstructions}
${industryContext}
${keywordContext}

Requirements:
- Clean, scalable vector-style design
- Works well at small sizes (favicon) and large sizes (print)
- Professional quality suitable for business use
- Clear brand identity
- White or transparent-friendly background
- NO text unless the brand name is very short (3-4 letters)
- Focus on a memorable symbol or icon

Create a single, centered logo design on a clean background.`;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), type);
  });
}

function base64ToBlob(base64: string, type: string): Blob {
  const byteString = atob(base64.split(',')[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  return new Blob([arrayBuffer], { type });
}

// ============================================
// LOGO RESIZING
// ============================================

export async function resizeLogo(
  originalBase64: string,
  sizes: number[] = [16, 24, 32, 48, 64, 128, 256, 512]
): Promise<LogoVariant[]> {
  const variants: LogoVariant[] = [];
  const img = await loadImage(originalBase64);

  for (const size of sizes) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, size, size);

      const base64 = canvas.toDataURL('image/png');
      const blob = await canvasToBlob(canvas, 'image/png');

      variants.push({
        size,
        width: size,
        height: size,
        format: 'png',
        base64,
        blob: blob || undefined,
      });
    } catch (error) {
      console.error(`Error resizing to ${size}:`, error);
    }
  }

  return variants;
}

export async function generateAllLogoSizes(
  originalBase64: string
): Promise<{
  favicon: LogoVariant[];
  apple: LogoVariant[];
  android: LogoVariant[];
  windows: LogoVariant[];
  social: LogoVariant[];
  standard: LogoVariant[];
}> {
  const img = await loadImage(originalBase64);

  const generateForSizes = async (sizes: readonly number[]): Promise<LogoVariant[]> => {
    const variants: LogoVariant[] = [];

    for (const size of sizes) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, size, size);

      const base64 = canvas.toDataURL('image/png');
      const blob = await canvasToBlob(canvas, 'image/png');

      variants.push({
        size,
        width: size,
        height: size,
        format: 'png',
        base64,
        blob: blob || undefined,
      });
    }

    return variants;
  };

  const SIZES = {
    favicon: [16, 32, 48] as const,
    apple: [57, 60, 72, 76, 114, 120, 144, 152, 180] as const,
    android: [36, 48, 72, 96, 144, 192, 512] as const,
    windows: [70, 150, 310] as const,
    social: [200, 400, 800, 1200] as const,
    standard: [16, 24, 32, 48, 64, 128, 256, 512] as const,
  };

  return {
    favicon: await generateForSizes(SIZES.favicon),
    apple: await generateForSizes(SIZES.apple),
    android: await generateForSizes(SIZES.android),
    windows: await generateForSizes(SIZES.windows),
    social: await generateForSizes(SIZES.social),
    standard: await generateForSizes(SIZES.standard),
  };
}

// ============================================
// ICO GENERATION
// ============================================

export async function generateIcoFile(originalBase64: string): Promise<Blob> {
  const sizes = [16, 32, 48];
  const images: ImageData[] = [];
  const img = await loadImage(originalBase64);

  for (const size of sizes) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    images.push(imageData);
  }

  return createIcoBlob(images);
}

function createIcoBlob(images: ImageData[]): Blob {
  const iconDir = new ArrayBuffer(6 + images.length * 16);
  const iconDirView = new DataView(iconDir);

  iconDirView.setUint16(0, 0, true);
  iconDirView.setUint16(2, 1, true);
  iconDirView.setUint16(4, images.length, true);

  const imageDataArrays: Uint8Array[] = [];
  let offset = 6 + images.length * 16;

  images.forEach((img, index) => {
    const bmpData = createBmpData(img);
    imageDataArrays.push(bmpData);

    const entryOffset = 6 + index * 16;

    iconDirView.setUint8(entryOffset, img.width >= 256 ? 0 : img.width);
    iconDirView.setUint8(entryOffset + 1, img.height >= 256 ? 0 : img.height);
    iconDirView.setUint8(entryOffset + 2, 0);
    iconDirView.setUint8(entryOffset + 3, 0);
    iconDirView.setUint16(entryOffset + 4, 1, true);
    iconDirView.setUint16(entryOffset + 6, 32, true);
    iconDirView.setUint32(entryOffset + 8, bmpData.length, true);
    iconDirView.setUint32(entryOffset + 12, offset, true);

    offset += bmpData.length;
  });

  const totalSize = 6 + images.length * 16 + imageDataArrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalSize);

  result.set(new Uint8Array(iconDir), 0);

  let currentOffset = 6 + images.length * 16;
  for (const arr of imageDataArrays) {
    result.set(arr, currentOffset);
    currentOffset += arr.length;
  }

  return new Blob([result], { type: 'image/x-icon' });
}

function createBmpData(imageData: ImageData): Uint8Array {
  const width = imageData.width;
  const height = imageData.height;
  const pixels = imageData.data;

  const headerSize = 40;
  const pixelDataSize = width * height * 4;
  const maskSize = Math.ceil(width / 32) * 4 * height;

  const buffer = new ArrayBuffer(headerSize + pixelDataSize + maskSize);
  const view = new DataView(buffer);

  view.setUint32(0, 40, true);
  view.setInt32(4, width, true);
  view.setInt32(8, height * 2, true);
  view.setUint16(12, 1, true);
  view.setUint16(14, 32, true);
  view.setUint32(16, 0, true);
  view.setUint32(20, pixelDataSize + maskSize, true);
  view.setInt32(24, 0, true);
  view.setInt32(28, 0, true);
  view.setUint32(32, 0, true);
  view.setUint32(36, 0, true);

  const uint8 = new Uint8Array(buffer);
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const destIdx = headerSize + ((height - 1 - y) * width + x) * 4;

      uint8[destIdx] = pixels[srcIdx + 2];
      uint8[destIdx + 1] = pixels[srcIdx + 1];
      uint8[destIdx + 2] = pixels[srcIdx];
      uint8[destIdx + 3] = pixels[srcIdx + 3];
    }
  }

  return new Uint8Array(buffer);
}

// ============================================
// ZIP DOWNLOAD
// ============================================

export async function createLogoZip(
  originalBase64: string,
  brandName: string
): Promise<Blob> {
  const JSZipClass = await loadJSZip();
  const zip = new JSZipClass();

  const allSizes = await generateAllLogoSizes(originalBase64);

  const faviconFolder = zip.folder('favicon');
  const appleFolder = zip.folder('apple-touch-icons');
  const androidFolder = zip.folder('android');
  const windowsFolder = zip.folder('windows');
  const socialFolder = zip.folder('social-media');
  const standardFolder = zip.folder('standard');

  for (const variant of allSizes.favicon) {
    if (variant.blob) {
      faviconFolder?.file(`favicon-${variant.size}x${variant.size}.png`, variant.blob);
    }
  }

  try {
    const icoBlob = await generateIcoFile(originalBase64);
    faviconFolder?.file('favicon.ico', icoBlob);
  } catch (e) {
    console.error('Error generating ICO:', e);
  }

  for (const variant of allSizes.apple) {
    if (variant.blob) {
      appleFolder?.file(`apple-touch-icon-${variant.size}x${variant.size}.png`, variant.blob);
    }
  }

  for (const variant of allSizes.android) {
    if (variant.blob) {
      androidFolder?.file(`android-icon-${variant.size}x${variant.size}.png`, variant.blob);
    }
  }

  for (const variant of allSizes.windows) {
    if (variant.blob) {
      windowsFolder?.file(`ms-icon-${variant.size}x${variant.size}.png`, variant.blob);
    }
  }

  for (const variant of allSizes.social) {
    if (variant.blob) {
      socialFolder?.file(`${brandName}-${variant.size}x${variant.size}.png`, variant.blob);
    }
  }

  for (const variant of allSizes.standard) {
    if (variant.blob) {
      standardFolder?.file(`${brandName}-${variant.size}x${variant.size}.png`, variant.blob);
    }
  }

  const originalBlob = base64ToBlob(originalBase64, 'image/png');
  zip.file(`${brandName}-original-1024x1024.png`, originalBlob);

  const readme = generateReadme(brandName);
  zip.file('README.md', readme);

  const htmlSnippet = generateHtmlSnippet(brandName);
  zip.file('favicon-html-snippet.html', htmlSnippet);

  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export async function downloadLogoZip(
  originalBase64: string,
  brandName: string
): Promise<void> {
  const zipBlob = await createLogoZip(originalBase64, brandName);

  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${brandName.toLowerCase().replace(/\s+/g, '-')}-logo-pack.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSingleLogo(base64: string, filename: string): void {
  const link = document.createElement('a');
  link.href = base64;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================
// README & HTML GENERATORS
// ============================================

function generateReadme(brandName: string): string {
  return `# ${brandName} Logo Pack

Generated by EmptyDomai - AI Logo Generator

## Contents

### /favicon
- favicon-16x16.png, favicon-32x32.png, favicon-48x48.png
- favicon.ico (multi-size)

### /apple-touch-icons
- 57x57 to 180x180 (all retina sizes)

### /android
- 36x36 to 512x512 (adaptive icons)

### /windows
- 70x70, 150x150, 310x310 (tiles)

### /social-media
- 200x200 to 1200x1200

### /standard
- 16x16 to 512x512

## Usage
See \`favicon-html-snippet.html\` for HTML implementation.

---
Generated with EmptyDomai
`;
}

function generateHtmlSnippet(brandName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>${brandName} - Favicon Implementation</title>

  <!-- Favicons -->
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon/favicon-48x48.png">
  <link rel="shortcut icon" href="/favicon/favicon.ico">

  <!-- Apple Touch Icons -->
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icons/apple-touch-icon-180x180.png">

  <!-- Android -->
  <link rel="icon" type="image/png" sizes="192x192" href="/android/android-icon-192x192.png">
  <link rel="icon" type="image/png" sizes="512x512" href="/android/android-icon-512x512.png">

  <!-- Windows -->
  <meta name="msapplication-TileImage" content="/windows/ms-icon-144x144.png">

  <meta name="theme-color" content="#ffffff">
</head>
<body>
  <h1>${brandName}</h1>
</body>
</html>
`;
}

// ============================================
// EXPORTS
// ============================================

export const LOGO_STYLE_OPTIONS: { value: LogoStyle; label: string; description: string }[] = [
  { value: 'minimal', label: 'Minimal', description: 'Clean, simple, flat' },
  { value: 'modern', label: 'Modern', description: 'Sleek, gradients' },
  { value: 'vintage', label: 'Vintage', description: 'Retro, classic' },
  { value: 'playful', label: 'Playful', description: 'Fun, colorful' },
  { value: 'corporate', label: 'Corporate', description: 'Professional' },
  { value: 'tech', label: 'Tech', description: 'Futuristic' },
  { value: 'luxury', label: 'Luxury', description: 'Elegant, premium' },
  { value: 'handdrawn', label: 'Hand-drawn', description: 'Artistic' },
];

export const LOGO_SHAPE_OPTIONS: { value: LogoShape; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'circle', label: 'Circle' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'abstract', label: 'Abstract' },
];

export const INDUSTRY_OPTIONS = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'E-commerce',
  'Food & Beverage', 'Fashion', 'Real Estate', 'Travel', 'Entertainment',
  'Sports', 'Automotive', 'Non-profit', 'Agency', 'SaaS', 'Mobile App',
  'AI/ML', 'Gaming', 'Photography', 'Music',
];
