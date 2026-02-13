import type { SocialMediaAvailability } from '../types';

interface SocialCheckResult {
  platform: keyof SocialMediaAvailability;
  status: 'available' | 'taken' | 'unknown';
}

// Check if a username is available on various social media platforms
export async function checkSocialMediaAvailability(
  username: string
): Promise<SocialMediaAvailability> {
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

  if (cleanUsername.length < 3) {
    return {
      instagram: 'unknown',
      twitter: 'unknown',
      tiktok: 'unknown',
      youtube: 'unknown',
      github: 'unknown',
      discord: 'unknown',
      facebook: 'unknown',
      linkedin: 'unknown',
    };
  }

  // Check platforms in parallel with timeout protection
  const results = await Promise.allSettled([
    withTimeout(checkGitHub(cleanUsername), 5000),
    withTimeout(checkTwitterEstimate(cleanUsername), 100),
    withTimeout(checkInstagramEstimate(cleanUsername), 100),
    withTimeout(checkTikTokEstimate(cleanUsername), 100),
    withTimeout(checkYouTubeEstimate(cleanUsername), 100),
    withTimeout(estimateAvailability(cleanUsername, 'discord'), 100),
    withTimeout(estimateAvailability(cleanUsername, 'facebook'), 100),
    withTimeout(estimateAvailability(cleanUsername, 'linkedin'), 100),
  ]);

  const availability: SocialMediaAvailability = {
    github: 'unknown',
    twitter: 'unknown',
    instagram: 'unknown',
    tiktok: 'unknown',
    youtube: 'unknown',
    discord: 'unknown',
    facebook: 'unknown',
    linkedin: 'unknown',
  };

  // Map results back to platforms
  const platforms: (keyof SocialMediaAvailability)[] = [
    'github', 'twitter', 'instagram', 'tiktok', 'youtube', 'discord', 'facebook', 'linkedin'
  ];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      availability[platforms[index]] = result.value.status;
    }
  });

  return availability;
}

// Helper to add timeout to promises
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    ),
  ]);
}

// Check GitHub username availability (public API)
async function checkGitHub(username: string): Promise<SocialCheckResult> {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (response.status === 404) {
      return { platform: 'github', status: 'available' };
    } else if (response.status === 200) {
      return { platform: 'github', status: 'taken' };
    } else if (response.status === 403) {
      // Rate limited - estimate based on username
      return estimateGitHubAvailability(username);
    }
    return { platform: 'github', status: 'unknown' };
  } catch (error) {
    console.log('GitHub check failed:', error);
    return estimateGitHubAvailability(username);
  }
}

// Estimate GitHub availability when API fails
function estimateGitHubAvailability(username: string): SocialCheckResult {
  if (username.length <= 3) {
    return { platform: 'github', status: 'taken' };
  }
  const commonGitHubNames = ['app', 'web', 'api', 'dev', 'code', 'tech', 'data', 'cloud', 'ai', 'ml', 'bot', 'test'];
  if (commonGitHubNames.includes(username)) {
    return { platform: 'github', status: 'taken' };
  }
  // Longer unique names might be available
  if (username.length >= 8) {
    return { platform: 'github', status: 'unknown' };
  }
  return { platform: 'github', status: 'unknown' };
}

// Estimate Twitter/X availability
async function checkTwitterEstimate(username: string): Promise<SocialCheckResult> {
  // Twitter doesn't have a public API - estimate based on patterns
  if (username.length <= 4) {
    return { platform: 'twitter', status: 'taken' };
  }
  const commonWords = ['app', 'web', 'tech', 'ai', 'cloud', 'data', 'shop', 'store', 'pay', 'game', 'news', 'music'];
  if (commonWords.includes(username)) {
    return { platform: 'twitter', status: 'taken' };
  }
  // Brandable longer names might be available
  if (username.length >= 7 && /[aeiou]/.test(username)) {
    return { platform: 'twitter', status: 'unknown' };
  }
  return { platform: 'twitter', status: 'unknown' };
}

// Estimate Instagram availability
async function checkInstagramEstimate(username: string): Promise<SocialCheckResult> {
  // Instagram usernames under 5 chars are almost all taken
  if (username.length <= 4) {
    return { platform: 'instagram', status: 'taken' };
  }
  const commonWords = ['photo', 'pics', 'style', 'fashion', 'beauty', 'food', 'travel', 'life', 'love', 'art'];
  if (commonWords.includes(username)) {
    return { platform: 'instagram', status: 'taken' };
  }
  // Unique brandable names might be available
  if (username.length >= 8) {
    return { platform: 'instagram', status: 'unknown' };
  }
  return { platform: 'instagram', status: 'unknown' };
}

// Estimate TikTok availability
async function checkTikTokEstimate(username: string): Promise<SocialCheckResult> {
  if (username.length <= 4) {
    return { platform: 'tiktok', status: 'taken' };
  }
  const commonWords = ['video', 'viral', 'trend', 'dance', 'music', 'funny', 'clips', 'content'];
  if (commonWords.includes(username)) {
    return { platform: 'tiktok', status: 'taken' };
  }
  // TikTok is newer, more names might be available
  if (username.length >= 6) {
    return { platform: 'tiktok', status: 'unknown' };
  }
  return { platform: 'tiktok', status: 'unknown' };
}

// Estimate YouTube availability
async function checkYouTubeEstimate(username: string): Promise<SocialCheckResult> {
  if (username.length <= 3) {
    return { platform: 'youtube', status: 'taken' };
  }
  const commonWords = ['tv', 'channel', 'video', 'watch', 'stream', 'live', 'gaming', 'music', 'vlog'];
  if (commonWords.includes(username)) {
    return { platform: 'youtube', status: 'taken' };
  }
  // YouTube handles are relatively new, more might be available
  if (username.length >= 6) {
    return { platform: 'youtube', status: 'unknown' };
  }
  return { platform: 'youtube', status: 'unknown' };
}

// Estimate availability based on username characteristics
function estimateAvailability(
  username: string,
  platform: keyof SocialMediaAvailability
): Promise<SocialCheckResult> {
  return new Promise((resolve) => {
    // Very short usernames are almost always taken
    if (username.length <= 3) {
      resolve({ platform, status: 'taken' });
      return;
    }

    // Common words are likely taken
    const commonWords = [
      'app', 'web', 'tech', 'ai', 'cloud', 'data', 'shop', 'store', 'pay',
      'game', 'music', 'video', 'photo', 'social', 'news', 'food', 'travel',
      'health', 'fitness', 'style', 'beauty', 'home', 'work', 'life', 'love'
    ];

    if (commonWords.includes(username)) {
      resolve({ platform, status: 'taken' });
      return;
    }

    // Usernames with 4-6 characters have low availability
    if (username.length <= 6) {
      resolve({ platform, status: 'taken' });
      return;
    }

    // Longer, unique usernames are more likely available
    const hasVowels = /[aeiou]/.test(username);
    const hasConsonants = /[bcdfghjklmnpqrstvwxyz]/.test(username);
    const isPronounceAble = hasVowels && hasConsonants;

    if (isPronounceAble && username.length >= 7) {
      resolve({ platform, status: 'unknown' });
    } else {
      resolve({ platform, status: 'unknown' });
    }
  });
}

// Get social media profile URLs
export function getSocialMediaUrls(username: string): Record<string, string> {
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

  return {
    instagram: `https://instagram.com/${cleanUsername}`,
    twitter: `https://x.com/${cleanUsername}`,
    tiktok: `https://tiktok.com/@${cleanUsername}`,
    youtube: `https://youtube.com/@${cleanUsername}`,
    github: `https://github.com/${cleanUsername}`,
    discord: `https://discord.gg/${cleanUsername}`,
    facebook: `https://facebook.com/${cleanUsername}`,
    linkedin: `https://linkedin.com/company/${cleanUsername}`,
  };
}

// Check multiple usernames at once
export async function checkMultipleSocialMedia(
  usernames: string[]
): Promise<Map<string, SocialMediaAvailability>> {
  const results = new Map<string, SocialMediaAvailability>();

  // Process in batches to avoid rate limiting
  const batchSize = 3;
  for (let i = 0; i < usernames.length; i += batchSize) {
    const batch = usernames.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (username) => ({
        username,
        availability: await checkSocialMediaAvailability(username),
      }))
    );

    batchResults.forEach(({ username, availability }) => {
      results.set(username, availability);
    });

    // Small delay between batches
    if (i + batchSize < usernames.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results;
}
