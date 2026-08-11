/**
 * Helper to extract YouTube video embed URL from various YouTube link formats
 * (watch?v=, youtu.be/, embed/, etc.)
 */
export function getYouTubeEmbedUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Match standard YouTube URLs
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);

  if (match && match[2] && match[2].length === 11) {
    const videoId = match[2];
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0`;
  }

  return null;
}

/**
 * Check if string is a YouTube URL
 */
export function isYouTubeUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return getYouTubeEmbedUrl(url) !== null;
}

/**
 * Check if string is a direct video (data URI or mp4/webm/etc)
 */
export function isDirectVideoUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('data:video/') ||
    trimmed.startsWith('blob:') ||
    /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed)
  );
}
