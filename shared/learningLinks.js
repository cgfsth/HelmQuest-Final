export function normalizeLearningLink(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 2048) throw new Error('Enter a video link of 2048 characters or fewer.');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('Enter a complete video URL, such as https://www.youtube.com/watch?v=...'); }
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error('Use an HTTP or HTTPS video link without embedded login details.');
  return url.href;
}
