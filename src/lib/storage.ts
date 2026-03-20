/**
 * Supabase Storage image transform utilities.
 * Converts raw storage URLs to the image render API endpoint which
 * applies on-the-fly resizing, quality reduction, and WebP conversion.
 *
 * Original:  .../storage/v1/object/public/bucket/path
 * Optimized: .../storage/v1/render/image/public/bucket/path?width=W&quality=Q&format=webp
 */

/**
 * Returns an optimized image URL using Supabase's built-in image transforms.
 * Falls back to the original URL if it doesn't look like a Supabase storage URL.
 *
 * @param url    - Original storage URL
 * @param width  - Target width in pixels
 * @param quality - JPEG/WebP quality 1–100 (default 80)
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number,
  quality = 80,
): string {
  if (!url) return '';
  if (!url.includes('/storage/v1/object/public/')) return url;
  return (
    url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
    `?width=${width}&quality=${quality}&format=webp`
  );
}
