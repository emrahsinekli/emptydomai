// Content script for EmptyDomai extension
// Handles communication between the page and the extension

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_SELECTED_TEXT') {
    const selectedText = window.getSelection()?.toString().trim() || '';
    sendResponse({ text: selectedText });
    return true;
  }

  if (message.type === 'GET_PAGE_CONTENT') {
    const content = extractPageContent();
    sendResponse({ content });
    return true;
  }

  return false;
});

// Extract relevant content from the page
function extractPageContent(): string {
  const parts: string[] = [];

  // Get title
  const title = document.title;
  if (title) {
    parts.push(`Title: ${title}`);
  }

  // Get meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    const content = metaDescription.getAttribute('content');
    if (content) {
      parts.push(`Description: ${content}`);
    }
  }

  // Get meta keywords
  const metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metaKeywords) {
    const content = metaKeywords.getAttribute('content');
    if (content) {
      parts.push(`Keywords: ${content}`);
    }
  }

  // Get Open Graph data
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogTitle) {
    const content = ogTitle.getAttribute('content');
    if (content && content !== title) {
      parts.push(`OG Title: ${content}`);
    }
  }
  if (ogDescription) {
    const content = ogDescription.getAttribute('content');
    if (content) {
      parts.push(`OG Description: ${content}`);
    }
  }

  // Get headings
  const headings = document.querySelectorAll('h1, h2');
  const headingTexts: string[] = [];
  headings.forEach((h) => {
    const text = h.textContent?.trim();
    if (text && text.length < 200) {
      headingTexts.push(text);
    }
  });
  if (headingTexts.length > 0) {
    parts.push(`Headings: ${headingTexts.slice(0, 5).join(', ')}`);
  }

  // Get main content (simplified)
  const mainContent = getMainContent();
  if (mainContent) {
    parts.push(`Content: ${mainContent}`);
  }

  return parts.join('\n\n');
}

// Try to extract main content from the page
function getMainContent(): string {
  // Try common main content selectors
  const selectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '.main-content',
    '#content',
    '#main',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = cleanText(element.textContent || '');
      if (text.length > 50) {
        return text.substring(0, 1500);
      }
    }
  }

  // Fallback: get body text
  const bodyText = cleanText(document.body.textContent || '');
  return bodyText.substring(0, 1500);
}

// Clean and normalize text
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

// Notify that content script is loaded
console.log('EmptyDomai content script loaded');
