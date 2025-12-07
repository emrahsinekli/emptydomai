import type {
  LogoGenerationParams,
  GeneratedLogo,
  LogoVariant,
  LogoStyle,
  LogoShape,
} from '../types';
import { getAPIKey } from './storage';

// JSZip for creating downloadable zip files
// Will be loaded dynamically when needed
let JSZip: typeof import('jszip') | null = null;

async function loadJSZip() {
  if (!JSZip) {
    // Dynamic import for JSZip
    JSZip = (await import('jszip')).default;
  }
  return JSZip;
}

// ============================================
// LOGO GENERATION
// ============================================

/**
 * Generate logo using AI (OpenAI DALL-E)
 */
export async function generateLogo(params: LogoGenerationParams): Promise<GeneratedLogo> {
  const apiKey = await getAPIKey('openai');

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = buildLogoPrompt(params);

  try {
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
      throw new Error(error.error?.message || 'Failed to generate logo');
    }

    const data = await response.json();
    const imageData = data.data[0];

    const logo: GeneratedLogo = {
      id: `logo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalUrl: imageData.url || '',
      originalBase64: imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : undefined,
      prompt: prompt,
      style: params.style,
      shape: params.shape,
      createdAt: new Date(),
    };

    return logo;
  } catch (error) {
    console.error('Logo generation error:', error);
    throw error;
  }
}

/**
 * Build AI prompt for logo generation
 */
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
// LOGO RESIZING
// ============================================

/**
 * Resize logo to multiple sizes for different platforms
 */
export async function resizeLogo(
  originalBase64: string,
  sizes: number[] = [16, 24, 32, 48, 64, 128, 256, 512]
): Promise<LogoVariant[]> {
  const variants: LogoVariant[] = [];

  // Load the original image
  const img = await loadImage(originalBase64);

  for (const size of sizes) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      // Enable high-quality image scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the image scaled to the target size
      ctx.drawImage(img, 0, 0, size, size);

      // Get the resized image as base64
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

/**
 * Generate all platform-specific logo sizes
 */
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

/**
 * Generate ICO file for favicon
 */
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

  // Create ICO file format
  return createIcoBlob(images);
}

/**
 * Create ICO blob from multiple image sizes
 */
function createIcoBlob(images: ImageData[]): Blob {
  const iconDir = new ArrayBuffer(6 + images.length * 16);
  const iconDirView = new DataView(iconDir);

  // ICONDIR header
  iconDirView.setUint16(0, 0, true); // Reserved
  iconDirView.setUint16(2, 1, true); // Type (1 = ICO)
  iconDirView.setUint16(4, images.length, true); // Number of images

  const imageDataArrays: Uint8Array[] = [];
  let offset = 6 + images.length * 16;

  images.forEach((img, index) => {
    const bmpData = createBmpData(img);
    imageDataArrays.push(bmpData);

    const entryOffset = 6 + index * 16;

    // ICONDIRENTRY
    iconDirView.setUint8(entryOffset, img.width >= 256 ? 0 : img.width); // Width
    iconDirView.setUint8(entryOffset + 1, img.height >= 256 ? 0 : img.height); // Height
    iconDirView.setUint8(entryOffset + 2, 0); // Color palette
    iconDirView.setUint8(entryOffset + 3, 0); // Reserved
    iconDirView.setUint16(entryOffset + 4, 1, true); // Color planes
    iconDirView.setUint16(entryOffset + 6, 32, true); // Bits per pixel
    iconDirView.setUint32(entryOffset + 8, bmpData.length, true); // Size
    iconDirView.setUint32(entryOffset + 12, offset, true); // Offset

    offset += bmpData.length;
  });

  // Combine all parts
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

/**
 * Create BMP data for ICO file
 */
function createBmpData(imageData: ImageData): Uint8Array {
  const width = imageData.width;
  const height = imageData.height;
  const pixels = imageData.data;

  // BITMAPINFOHEADER + pixel data
  const headerSize = 40;
  const pixelDataSize = width * height * 4;
  const maskSize = Math.ceil(width / 32) * 4 * height;

  const buffer = new ArrayBuffer(headerSize + pixelDataSize + maskSize);
  const view = new DataView(buffer);

  // BITMAPINFOHEADER
  view.setUint32(0, 40, true); // biSize
  view.setInt32(4, width, true); // biWidth
  view.setInt32(8, height * 2, true); // biHeight (doubled for XOR + AND masks)
  view.setUint16(12, 1, true); // biPlanes
  view.setUint16(14, 32, true); // biBitCount
  view.setUint32(16, 0, true); // biCompression (BI_RGB)
  view.setUint32(20, pixelDataSize + maskSize, true); // biSizeImage
  view.setInt32(24, 0, true); // biXPelsPerMeter
  view.setInt32(28, 0, true); // biYPelsPerMeter
  view.setUint32(32, 0, true); // biClrUsed
  view.setUint32(36, 0, true); // biClrImportant

  // Pixel data (BGRA, bottom-up)
  const uint8 = new Uint8Array(buffer);
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const destIdx = headerSize + ((height - 1 - y) * width + x) * 4;

      uint8[destIdx] = pixels[srcIdx + 2]; // B
      uint8[destIdx + 1] = pixels[srcIdx + 1]; // G
      uint8[destIdx + 2] = pixels[srcIdx]; // R
      uint8[destIdx + 3] = pixels[srcIdx + 3]; // A
    }
  }

  return new Uint8Array(buffer);
}

// ============================================
// ZIP DOWNLOAD
// ============================================

/**
 * Create a ZIP file with all logo sizes
 */
export async function createLogoZip(
  originalBase64: string,
  brandName: string
): Promise<Blob> {
  const JSZipClass = await loadJSZip();
  const zip = new JSZipClass();

  // Generate all sizes
  const allSizes = await generateAllLogoSizes(originalBase64);

  // Create folder structure
  const faviconFolder = zip.folder('favicon');
  const appleFolder = zip.folder('apple-touch-icons');
  const androidFolder = zip.folder('android');
  const windowsFolder = zip.folder('windows');
  const socialFolder = zip.folder('social-media');
  const standardFolder = zip.folder('standard');

  // Add favicon files
  for (const variant of allSizes.favicon) {
    if (variant.blob) {
      faviconFolder?.file(`favicon-${variant.size}x${variant.size}.png`, variant.blob);
    }
  }

  // Add ICO file
  try {
    const icoBlob = await generateIcoFile(originalBase64);
    faviconFolder?.file('favicon.ico', icoBlob);
  } catch (e) {
    console.error('Error generating ICO:', e);
  }

  // Add Apple touch icons
  for (const variant of allSizes.apple) {
    if (variant.blob) {
      appleFolder?.file(`apple-touch-icon-${variant.size}x${variant.size}.png`, variant.blob);
    }
  }

  // Add Android icons
  for (const variant of allSizes.android) {
    if (variant.blob) {
      androidFolder?.file(`android-icon-${variant.size}x${variant.size}.png`, variant.blob);
    }
  }

  // Add Windows tiles
  for (const variant of allSizes.windows) {
    if (variant.blob) {
      windowsFolder?.file(`ms-icon-${variant.size}x${variant.size}.png`, variant.blob);
    }
  }

  // Add social media sizes
  for (const variant of allSizes.social) {
    if (variant.blob) {
      socialFolder?.file(`${brandName}-${variant.size}x${variant.size}.png`, variant.blob);
    }
  }

  // Add standard sizes
  for (const variant of allSizes.standard) {
    if (variant.blob) {
      standardFolder?.file(`${brandName}-${variant.size}x${variant.size}.png`, variant.blob);
    }
  }

  // Add original high-res logo
  const originalBlob = base64ToBlob(originalBase64, 'image/png');
  zip.file(`${brandName}-original-1024x1024.png`, originalBlob);

  // Add README with usage instructions
  const readme = generateReadme(brandName);
  zip.file('README.md', readme);

  // Add HTML snippet for favicon usage
  const htmlSnippet = generateHtmlSnippet(brandName);
  zip.file('favicon-html-snippet.html', htmlSnippet);

  // Generate ZIP
  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/**
 * Download logo ZIP file
 */
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

/**
 * Download single logo size
 */
export function downloadSingleLogo(base64: string, filename: string): void {
  const link = document.createElement('a');
  link.href = base64;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Load image from base64 string
 */
function loadImage(base64: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = base64;
  });
}

/**
 * Convert canvas to blob
 */
function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), type);
  });
}

/**
 * Convert base64 to blob
 */
function base64ToBlob(base64: string, type: string): Blob {
  const byteString = atob(base64.split(',')[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  return new Blob([arrayBuffer], { type });
}

/**
 * Generate README content for the logo pack
 */
function generateReadme(brandName: string): string {
  return `# ${brandName} Logo Pack

This logo pack was generated by EmptyDomai.

## Contents

### /favicon
- favicon-16x16.png
- favicon-32x32.png
- favicon-48x48.png
- favicon.ico (multi-size ICO file)

### /apple-touch-icons
Apple touch icons for iOS devices:
- 57x57, 60x60, 72x72, 76x76 (iPhone/iPad)
- 114x114, 120x120, 144x144, 152x152, 180x180 (Retina)

### /android
Android adaptive icons:
- 36x36, 48x48, 72x72, 96x96, 144x144, 192x192, 512x512

### /windows
Windows tile icons:
- 70x70, 150x150, 310x310

### /social-media
Social media profile and cover images:
- 200x200, 400x400, 800x800, 1200x1200

### /standard
Standard sizes for general use:
- 16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256, 512x512

## Usage

See \`favicon-html-snippet.html\` for HTML code to add favicons to your website.

## License

This logo was generated using AI and is provided for your use with your ${brandName} brand.

---
Generated with EmptyDomai - AI Domain Generator & Logo Creator
`;
}

/**
 * Generate HTML snippet for favicon implementation
 */
function generateHtmlSnippet(brandName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>${brandName} - Favicon Implementation</title>

  <!-- Add these lines to your HTML <head> section -->

  <!-- Standard Favicons -->
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon/favicon-48x48.png">
  <link rel="shortcut icon" href="/favicon/favicon.ico">

  <!-- Apple Touch Icons -->
  <link rel="apple-touch-icon" sizes="57x57" href="/apple-touch-icons/apple-touch-icon-57x57.png">
  <link rel="apple-touch-icon" sizes="60x60" href="/apple-touch-icons/apple-touch-icon-60x60.png">
  <link rel="apple-touch-icon" sizes="72x72" href="/apple-touch-icons/apple-touch-icon-72x72.png">
  <link rel="apple-touch-icon" sizes="76x76" href="/apple-touch-icons/apple-touch-icon-76x76.png">
  <link rel="apple-touch-icon" sizes="114x114" href="/apple-touch-icons/apple-touch-icon-114x114.png">
  <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icons/apple-touch-icon-120x120.png">
  <link rel="apple-touch-icon" sizes="144x144" href="/apple-touch-icons/apple-touch-icon-144x144.png">
  <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icons/apple-touch-icon-152x152.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icons/apple-touch-icon-180x180.png">

  <!-- Android Chrome -->
  <link rel="icon" type="image/png" sizes="192x192" href="/android/android-icon-192x192.png">
  <link rel="icon" type="image/png" sizes="512x512" href="/android/android-icon-512x512.png">

  <!-- Windows Tiles -->
  <meta name="msapplication-TileColor" content="#ffffff">
  <meta name="msapplication-TileImage" content="/windows/ms-icon-144x144.png">
  <meta name="msapplication-square70x70logo" content="/windows/ms-icon-70x70.png">
  <meta name="msapplication-square150x150logo" content="/windows/ms-icon-150x150.png">
  <meta name="msapplication-square310x310logo" content="/windows/ms-icon-310x310.png">

  <!-- Theme Color -->
  <meta name="theme-color" content="#ffffff">

</head>
<body>
  <h1>${brandName}</h1>
  <p>Copy the &lt;link&gt; and &lt;meta&gt; tags from the &lt;head&gt; section above into your website.</p>
</body>
</html>
`;
}

// ============================================
// LOGO STYLE OPTIONS
// ============================================

export const LOGO_STYLE_OPTIONS: { value: LogoStyle; label: string; description: string }[] = [
  { value: 'minimal', label: 'Minimal', description: 'Clean, simple, flat design' },
  { value: 'modern', label: 'Modern', description: 'Contemporary, sleek gradients' },
  { value: 'vintage', label: 'Vintage', description: 'Retro, classic aesthetic' },
  { value: 'playful', label: 'Playful', description: 'Fun, colorful, friendly' },
  { value: 'corporate', label: 'Corporate', description: 'Professional business look' },
  { value: 'tech', label: 'Tech', description: 'Futuristic, digital style' },
  { value: 'luxury', label: 'Luxury', description: 'Elegant, premium design' },
  { value: 'handdrawn', label: 'Hand-drawn', description: 'Artistic, organic feel' },
];

export const LOGO_SHAPE_OPTIONS: { value: LogoShape; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'circle', label: 'Circle' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'abstract', label: 'Abstract' },
];

export const INDUSTRY_OPTIONS = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'E-commerce',
  'Food & Beverage',
  'Fashion',
  'Real Estate',
  'Travel',
  'Entertainment',
  'Sports',
  'Automotive',
  'Non-profit',
  'Agency',
  'SaaS',
  'Mobile App',
  'AI/ML',
  'Gaming',
  'Photography',
  'Music',
];
