import React, { useState } from 'react';
import type { LogoStyle, LogoShape, GeneratedLogo, LogoVariant } from '../types';
import {
  generateLogo,
  resizeLogo,
  downloadLogoZip,
  downloadSingleLogo,
  LOGO_STYLE_OPTIONS,
  LOGO_SHAPE_OPTIONS,
  INDUSTRY_OPTIONS,
} from '../services/logo';

export const LogoTab: React.FC = () => {
  // Form state
  const [brandName, setBrandName] = useState('');
  const [tagline, setTagline] = useState('');
  const [style, setStyle] = useState<LogoStyle>('modern');
  const [shape, setShape] = useState<LogoShape>('rounded');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState('#818cf8');
  const [industry, setIndustry] = useState('');
  const [keywords, setKeywords] = useState('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generated logo state
  const [generatedLogo, setGeneratedLogo] = useState<GeneratedLogo | null>(null);
  const [logoVariants, setLogoVariants] = useState<LogoVariant[]>([]);

  // Selected size category for preview
  const [selectedCategory, setSelectedCategory] = useState<'standard' | 'favicon' | 'social'>('standard');

  const handleGenerate = async () => {
    if (!brandName.trim()) {
      setError('Please enter a brand name');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const logo = await generateLogo({
        brandName: brandName.trim(),
        tagline: tagline.trim() || undefined,
        style,
        shape,
        primaryColor,
        secondaryColor,
        industry: industry || undefined,
        keywords: keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : undefined,
      });

      setGeneratedLogo(logo);

      // Auto-resize to standard sizes
      if (logo.originalBase64) {
        setIsResizing(true);
        const variants = await resizeLogo(logo.originalBase64);
        setLogoVariants(variants);
        setIsResizing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate logo');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!generatedLogo?.originalBase64) return;

    try {
      await downloadLogoZip(generatedLogo.originalBase64, brandName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create download');
    }
  };

  const handleDownloadSingle = (variant: LogoVariant) => {
    if (!variant.base64) return;
    downloadSingleLogo(variant.base64, `${brandName.toLowerCase().replace(/\s+/g, '-')}-${variant.size}x${variant.size}.png`);
  };

  const standardSizes = logoVariants.filter(v => [16, 24, 32, 48, 64, 128, 256, 512].includes(v.size));
  const faviconSizes = logoVariants.filter(v => [16, 32, 48].includes(v.size));
  const socialSizes = logoVariants.filter(v => v.size >= 200);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900">Logo Generator</h2>
        <p className="text-xs text-gray-500">Create AI-powered logos for your brand</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Brand Info Section */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Brand Name *
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Enter your brand name"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tagline (optional)
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Your brand tagline"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Style Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Logo Style
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {LOGO_STYLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setStyle(option.value)}
                className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                  style === option.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
                title={option.description}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Shape Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Shape
          </label>
          <div className="flex gap-2">
            {LOGO_SHAPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setShape(option.value)}
                className={`flex-1 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  shape === option.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Secondary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Industry Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Industry (optional)
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Select industry</option>
            {INDUSTRY_OPTIONS.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Keywords (comma-separated, optional)
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="creative, innovative, fast"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !brandName.trim()}
          className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            isGenerating || !brandName.trim()
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {isGenerating ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating Logo...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Generate Logo
            </>
          )}
        </button>

        {/* Generated Logo Display */}
        {generatedLogo && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* Original Logo Preview */}
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Generated Logo</h3>
              <div className="inline-block p-4 bg-gray-100 rounded-xl">
                {generatedLogo.originalBase64 ? (
                  <img
                    src={generatedLogo.originalBase64}
                    alt="Generated logo"
                    className="w-48 h-48 object-contain rounded-lg"
                  />
                ) : generatedLogo.originalUrl ? (
                  <img
                    src={generatedLogo.originalUrl}
                    alt="Generated logo"
                    className="w-48 h-48 object-contain rounded-lg"
                  />
                ) : null}
              </div>
            </div>

            {/* Loading sizes */}
            {isResizing && (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  Generating all sizes...
                </div>
              </div>
            )}

            {/* Size Variants */}
            {logoVariants.length > 0 && (
              <div className="space-y-3">
                {/* Category Tabs */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                  {[
                    { id: 'standard', label: 'Standard' },
                    { id: 'favicon', label: 'Favicon' },
                    { id: 'social', label: 'Social' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id as typeof selectedCategory)}
                      className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Size Grid */}
                <div className="grid grid-cols-4 gap-2">
                  {(selectedCategory === 'standard' ? standardSizes :
                    selectedCategory === 'favicon' ? faviconSizes :
                    socialSizes
                  ).map((variant) => (
                    <button
                      key={variant.size}
                      onClick={() => handleDownloadSingle(variant)}
                      className="flex flex-col items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                      title={`Download ${variant.size}x${variant.size}`}
                    >
                      <div
                        className="bg-white border border-gray-200 rounded flex items-center justify-center mb-1 overflow-hidden"
                        style={{
                          width: Math.min(variant.size, 48),
                          height: Math.min(variant.size, 48),
                        }}
                      >
                        {variant.base64 && (
                          <img
                            src={variant.base64}
                            alt={`${variant.size}px`}
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 group-hover:text-primary-600">
                        {variant.size}x{variant.size}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Download All Button */}
                <button
                  onClick={handleDownloadZip}
                  className="w-full py-3 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download All Sizes (ZIP)
                </button>

                {/* Size Info */}
                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                  <p className="font-medium mb-1">Included in ZIP:</p>
                  <ul className="space-y-0.5">
                    <li>Favicons (16x16, 32x32, 48x48 + ICO)</li>
                    <li>Apple Touch Icons (57-180px)</li>
                    <li>Android Icons (36-512px)</li>
                    <li>Windows Tiles (70-310px)</li>
                    <li>Social Media (200-1200px)</li>
                    <li>Original HD (1024x1024)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
