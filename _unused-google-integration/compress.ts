/**
 * Attachment compression helpers.
 *
 * Images are genuinely compressible: we resize oversized images and
 * step the encoder quality down until the output fits under the target
 * size. Documents (PDF, Office, ZIP…) are already-compressed binary
 * formats that cannot be losslessly shrunk in-process, so those are only
 * size-checked by the caller, not passed through here.
 */

import sharp from 'sharp';

/** Hard ceiling for any stored attachment. */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB

/** Largest dimension (px) we keep for an image; bigger images are scaled down. */
const MAX_IMAGE_DIMENSION = 1920;

/** Quality ladder tried in order until the encoded image fits the target. */
const QUALITY_STEPS = [80, 65, 50, 38, 28];

export interface CompressedImage {
  buffer: Buffer;
  contentType: string;
  /** File extension (with leading dot) matching contentType. */
  ext: string;
}

/**
 * Compress an image to at most `maxBytes`. Animated GIFs are passed
 * through untouched (re-encoding would drop the animation); if they are
 * already under the limit nothing else is needed, otherwise the caller
 * enforces the size check.
 *
 * Returns the smallest encoding produced, even if it could not get under
 * the target (the caller decides whether to reject an over-limit result).
 */
export async function compressImage(
  input: Buffer,
  mime: string,
  maxBytes: number = MAX_ATTACHMENT_BYTES,
): Promise<CompressedImage> {
  // Leave GIFs alone to preserve animation.
  if (mime === 'image/gif') {
    return { buffer: input, contentType: 'image/gif', ext: '.gif' };
  }

  // Already small enough → keep the original bytes/format, no re-encode.
  if (input.length <= maxBytes) {
    return { buffer: input, contentType: mime, ext: extForMime(mime) };
  }

  const base = sharp(input, { failOn: 'none' }).rotate(); // honor EXIF orientation
  const meta = await base.metadata();
  const needsResize = (meta.width ?? 0) > MAX_IMAGE_DIMENSION || (meta.height ?? 0) > MAX_IMAGE_DIMENSION;

  let best: Buffer | null = null;
  for (const quality of QUALITY_STEPS) {
    let pipeline = sharp(input, { failOn: 'none' }).rotate();
    if (needsResize) {
      pipeline = pipeline.resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    const out = await pipeline.webp({ quality }).toBuffer();
    best = out;
    if (out.length <= maxBytes) break;
  }

  return { buffer: best ?? input, contentType: 'image/webp', ext: '.webp' };
}

function extForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg': return '.jpg';
    case 'image/png': return '.png';
    case 'image/webp': return '.webp';
    case 'image/gif': return '.gif';
    default: return '.img';
  }
}
