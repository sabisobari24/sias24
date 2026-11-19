/**
 * Utility functions for high-clarity image URL conversions, file uploads, and lossless-priority optimization
 */

/**
 * Automatically converts Google Drive sharing links to direct image preview links
 */
export function convertGoogleDriveLink(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Pattern 1: /file/d/FILE_ID/view or /file/d/FILE_ID/...
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_\-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileDMatch[1]}`;
  }

  // Pattern 2: ?id=FILE_ID or &id=FILE_ID or uc?id=FILE_ID or open?id=FILE_ID
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_\-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${idParamMatch[1]}`;
  }

  // Pattern 3: docs.google.com/file/d/FILE_ID/edit
  const docsDMatch = trimmed.match(/docs\.google\.com\/file\/d\/([a-zA-Z0-9_\-]+)/);
  if (docsDMatch && docsDMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${docsDMatch[1]}`;
  }

  // Pattern 4: drive.google.com/thumbnail?id=FILE_ID
  const thumbMatch = trimmed.match(/drive\.google\.com\/thumbnail\?id=([a-zA-Z0-9_\-]+)/);
  if (thumbMatch && thumbMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${thumbMatch[1]}`;
  }

  return trimmed;
}

/**
 * Ensures Google Drive (lh3.googleusercontent.com/d/{id}) and stock photo URLs load at high resolution
 * instead of low-resolution default thumbnails, preventing blurry banners or avatars.
 */
export function getHighResMediaUrl(url: string, width: number = 1920): string {
  if (!url) return '';
  const trimmed = convertGoogleDriveLink(url.trim());
  if (trimmed.startsWith('data:') || trimmed.startsWith('/')) return trimmed;

  // Googleusercontent Drive links without explicit width/size suffix default to small thumbnails
  if (/^https:\/\/lh3\.googleusercontent\.com\/d\/[a-zA-Z0-9_\-]+$/i.test(trimmed)) {
    return `${trimmed}=w${width}`;
  }

  // Upgrade existing lh3 =w... or =s... params if smaller than requested
  const lh3Match = trimmed.match(/^(https:\/\/lh3\.googleusercontent\.com\/d\/[a-zA-Z0-9_\-]+)=([ws])(\d+)(.*)$/i);
  if (lh3Match) {
    const existingSize = parseInt(lh3Match[3], 10);
    if (!Number.isNaN(existingSize) && existingSize < width) {
      return `${lh3Match[1]}=w${width}${lh3Match[4] || ''}`;
    }
  }

  return trimmed;
}

/**
 * Multi-step high-quality bicubic downscaling.
 * Prevents aliasing, moiré, and jagged ("pecah") edges when shrinking large camera photos (> 2x).
 */
function renderHighQualityCanvas(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  preserveAlpha: boolean
): HTMLCanvasElement | null {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (srcW <= 0 || srcH <= 0) return null;

  let currentCanvas = document.createElement('canvas');
  let currW = srcW;
  let currH = srcH;

  // If reducing by more than 2x, step down smoothly in halves first
  if (srcW > targetWidth * 2 || srcH > targetHeight * 2) {
    const firstW = Math.max(targetWidth, Math.round(srcW * 0.5));
    const firstH = Math.max(targetHeight, Math.round(srcH * 0.5));
    currentCanvas.width = firstW;
    currentCanvas.height = firstH;
    const stepCtx = currentCanvas.getContext('2d', { alpha: preserveAlpha });
    if (!stepCtx) return null;
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(img, 0, 0, firstW, firstH);
    currW = firstW;
    currH = firstH;

    while (currW * 0.5 > targetWidth * 1.4 || currH * 0.5 > targetHeight * 1.4) {
      const nextW = Math.max(targetWidth, Math.round(currW * 0.5));
      const nextH = Math.max(targetHeight, Math.round(currH * 0.5));
      const nextCanvas = document.createElement('canvas');
      nextCanvas.width = nextW;
      nextCanvas.height = nextH;
      const nCtx = nextCanvas.getContext('2d', { alpha: preserveAlpha });
      if (!nCtx) break;
      nCtx.imageSmoothingEnabled = true;
      nCtx.imageSmoothingQuality = 'high';
      nCtx.drawImage(currentCanvas, 0, 0, currW, currH, 0, 0, nextW, nextH);
      currentCanvas = nextCanvas;
      currW = nextW;
      currH = nextH;
    }

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;
    const fCtx = finalCanvas.getContext('2d', { alpha: preserveAlpha });
    if (!fCtx) return currentCanvas;
    fCtx.imageSmoothingEnabled = true;
    fCtx.imageSmoothingQuality = 'high';
    fCtx.drawImage(currentCanvas, 0, 0, currW, currH, 0, 0, targetWidth, targetHeight);
    return finalCanvas;
  }

  currentCanvas.width = targetWidth;
  currentCanvas.height = targetHeight;
  const ctx = currentCanvas.getContext('2d', { alpha: preserveAlpha });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  return currentCanvas;
}

/**
 * Gentle edge sharpening filter used only when explicitly requested via autoEnhanceImageBase64.
 */
function applySharpenAndClarityFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sharpenStrength: number = 0.12
): void {
  try {
    if (width <= 2 || height <= 2) return;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const output = new Uint8ClampedArray(data.length);
    output.set(data);

    const k = Math.max(0.04, Math.min(0.25, sharpenStrength));
    const centerWeight = 1 + 4 * k;
    const neighborWeight = -k;
    const rowBytes = width * 4;

    for (let y = 1; y < height - 1; y++) {
      const rowOffset = y * rowBytes;
      const prevRowOffset = (y - 1) * rowBytes;
      const nextRowOffset = (y + 1) * rowBytes;

      for (let x = 1; x < width - 1; x++) {
        const idx = rowOffset + x * 4;
        const topIdx = prevRowOffset + x * 4;
        const btmIdx = nextRowOffset + x * 4;
        const lftIdx = rowOffset + (x - 1) * 4;
        const rgtIdx = rowOffset + (x + 1) * 4;

        output[idx] = Math.min(255, Math.max(0,
          data[idx] * centerWeight + (data[topIdx] + data[btmIdx] + data[lftIdx] + data[rgtIdx]) * neighborWeight
        ));
        output[idx + 1] = Math.min(255, Math.max(0,
          data[idx + 1] * centerWeight + (data[topIdx + 1] + data[btmIdx + 1] + data[lftIdx + 1] + data[rgtIdx + 1]) * neighborWeight
        ));
        output[idx + 2] = Math.min(255, Math.max(0,
          data[idx + 2] * centerWeight + (data[topIdx + 2] + data[btmIdx + 2] + data[lftIdx + 2] + data[rgtIdx + 2]) * neighborWeight
        ));
        output[idx + 3] = data[idx + 3];
      }
    }

    ctx.putImageData(new ImageData(output, width, height), 0, 0);
  } catch (err) {
    console.warn('Auto-enhancement canvas filter skipped:', err);
  }
}

/**
 * Encodes a canvas crisply (WebP high-quality first when beneficial, PNG for transparent graphics, JPEG fallback)
 * while strictly keeping quality >= minQuality so photos never turn muddy, blurry, or pixelated.
 */
function encodeCrispCanvas(
  canvas: HTMLCanvasElement,
  hasAlpha: boolean,
  preferredQuality: number,
  targetMaxBytes: number,
  minQuality: number = 0.80
): string {
  // For PNG/alpha images, try lossless PNG first if within generous size budget
  if (hasAlpha) {
    try {
      const pngUrl = canvas.toDataURL('image/png');
      if (pngUrl.length <= targetMaxBytes) {
        return pngUrl;
      }
    } catch (_) {}
  }

  // Try crisp WebP (supports both alpha & photographic detail with superior clarity per byte)
  let bestWebp = '';
  try {
    let q = preferredQuality;
    let webp = canvas.toDataURL('image/webp', q);
    if (webp.startsWith('data:image/webp')) {
      bestWebp = webp;
      while (webp.length > targetMaxBytes && q > minQuality) {
        q = Math.max(minQuality, Number((q - 0.03).toFixed(2)));
        webp = canvas.toDataURL('image/webp', q);
        bestWebp = webp;
        if (q === minQuality) break;
      }
      if (bestWebp.length <= targetMaxBytes * 1.35) {
        return bestWebp;
      }
    }
  } catch (_) {}

  // JPEG fallback (flatten onto clean white canvas if source had alpha)
  const jpegCanvas = hasAlpha ? (() => {
    const flat = document.createElement('canvas');
    flat.width = canvas.width;
    flat.height = canvas.height;
    const fCtx = flat.getContext('2d');
    if (fCtx) {
      fCtx.fillStyle = '#ffffff';
      fCtx.fillRect(0, 0, flat.width, flat.height);
      fCtx.drawImage(canvas, 0, 0);
      return flat;
    }
    return canvas;
  })() : canvas;

  let q = preferredQuality;
  let jpeg = jpegCanvas.toDataURL('image/jpeg', q);
  while (jpeg.length > targetMaxBytes && q > minQuality) {
    q = Math.max(minQuality, Number((q - 0.03).toFixed(2)));
    jpeg = jpegCanvas.toDataURL('image/jpeg', q);
    if (q === minQuality) break;
  }

  if (bestWebp && bestWebp.length < jpeg.length) {
    return bestWebp;
  }
  return jpeg;
}

/**
 * Optimizes banner, slider, gallery, and header photos at crisp Full HD resolution (up to 1920x1080).
 * Preserves original file/dataURL bytes when already crisp and within bounds to avoid re-encoding blur.
 */
export function enhanceAndCompressBannerImage(
  source: File | string,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.91,
  forceEnhance: boolean = false
): Promise<string> {
  return new Promise((resolve) => {
    if (!source) {
      resolve('');
      return;
    }

    const TARGET_MAX_BYTES = 560 * 1024; // ~410KB binary -> razor-sharp Full HD banners

    const processImageElement = (img: HTMLImageElement, rawDataUrl?: string, mimeType?: string) => {
      try {
        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;

        if (natW <= 0 || natH <= 0) {
          resolve(rawDataUrl || (typeof source === 'string' ? source : ''));
          return;
        }

        const withinBounds = natW <= maxWidth && natH <= maxHeight;
        if (!forceEnhance && rawDataUrl && withinBounds && rawDataUrl.length <= TARGET_MAX_BYTES) {
          // Zero generation loss: keep original uploaded image verbatim
          resolve(rawDataUrl);
          return;
        }

        let width = natW;
        let height = natH;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const hasAlpha = Boolean(
          (mimeType && (mimeType.includes('png') || mimeType.includes('webp'))) ||
          (rawDataUrl && /^data:image\/(png|webp)/i.test(rawDataUrl))
        );

        const canvas = renderHighQualityCanvas(img, width, height, hasAlpha);
        if (!canvas) {
          resolve(rawDataUrl || (typeof source === 'string' ? source : ''));
          return;
        }

        if (forceEnhance) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            applySharpenAndClarityFilter(ctx, width, height, 0.12);
          }
        }

        const encoded = encodeCrispCanvas(
          canvas,
          hasAlpha,
          Math.max(quality, 0.90),
          TARGET_MAX_BYTES,
          0.82
        );
        resolve(encoded);
      } catch (err) {
        console.warn('Failed in enhanceAndCompressBannerImage:', err);
        resolve(rawDataUrl || (typeof source === 'string' ? source : ''));
      }
    };

    if (source instanceof File) {
      if (source.type === 'image/svg+xml' && source.size <= 250 * 1024) {
        const svgReader = new FileReader();
        svgReader.onload = (e) => resolve((e.target?.result as string) || '');
        svgReader.onerror = () => resolve('');
        svgReader.readAsDataURL(source);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const raw = (e.target?.result as string) || '';
        if (!raw) {
          resolve('');
          return;
        }
        const img = new Image();
        img.onload = () => processImageElement(img, raw, source.type);
        img.onerror = () => resolve(raw);
        img.src = raw;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(source);
    } else {
      const trimmed = source.trim();
      if (!trimmed.startsWith('data:image/') && !forceEnhance) {
        resolve(getHighResMediaUrl(trimmed, maxWidth));
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => processImageElement(img, trimmed.startsWith('data:image/') ? trimmed : undefined);
      img.onerror = () => resolve(source);
      img.src = trimmed;
    }
  });
}

/**
 * Optimizes general photos, logos, certificates, and document images with HD clarity.
 * Preserves original bytes verbatim if already within resolution and size thresholds.
 */
export function compressImageFile(
  file: File,
  maxWidth: number = 1440,
  maxHeight: number = 1440,
  quality: number = 0.91
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }

    const TARGET_MAX_BYTES = 460 * 1024; // ~335KB binary -> crisp HD images & transparent PNG logos

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawResult = (event.target?.result as string) || '';
      if (!rawResult) {
        resolve('');
        return;
      }

      // Preserve vector SVG verbatim
      if (file.type === 'image/svg+xml' && file.size <= 250 * 1024) {
        resolve(rawResult);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const natW = img.naturalWidth || img.width;
          const natH = img.naturalHeight || img.height;

          if (natW <= 0 || natH <= 0) {
            resolve(rawResult);
            return;
          }

          if (natW <= maxWidth && natH <= maxHeight && rawResult.length <= TARGET_MAX_BYTES) {
            resolve(rawResult);
            return;
          }

          let width = natW;
          let height = natH;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }

          const hasAlpha = file.type === 'image/png' || file.type === 'image/webp' || /^data:image\/(png|webp)/i.test(rawResult);
          const canvas = renderHighQualityCanvas(img, width, height, hasAlpha);
          if (!canvas) {
            resolve(rawResult);
            return;
          }

          const encoded = encodeCrispCanvas(
            canvas,
            hasAlpha,
            Math.max(quality, 0.90),
            TARGET_MAX_BYTES,
            0.82
          );
          resolve(encoded);
        } catch (canvasErr) {
          console.warn('Canvas compression error:', canvasErr);
          resolve(rawResult);
        }
      };
      img.onerror = () => resolve(rawResult);
      img.src = rawResult;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes an existing base64 image data URL only when it exceeds HD thresholds.
 */
export function compressBase64Image(
  dataUrl: string,
  maxWidth: number = 1440,
  maxHeight: number = 1440,
  quality: number = 0.91
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }

    const TARGET_MAX_BYTES = 460 * 1024;
    if (dataUrl.length <= TARGET_MAX_BYTES) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;
        if (natW <= 0 || natH <= 0) {
          resolve(dataUrl);
          return;
        }

        let width = natW;
        let height = natH;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const hasAlpha = /^data:image\/(png|webp)/i.test(dataUrl);
        const canvas = renderHighQualityCanvas(img, width, height, hasAlpha);
        if (!canvas) {
          resolve(dataUrl);
          return;
        }

        resolve(encodeCrispCanvas(canvas, hasAlpha, Math.max(quality, 0.90), TARGET_MAX_BYTES, 0.82));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Converts an uploaded local image file into a crisp base64 data URL string.
 */
export function fileToBase64(
  file: File,
  maxWidth: number = 1440,
  maxHeight: number = 1440,
  quality: number = 0.91
): Promise<string> {
  return compressImageFile(file, maxWidth, maxHeight, quality);
}

/**
 * Enhances clarity on demand when the user explicitly clicks "Perbaiki Kualitas".
 */
export function autoEnhanceImageBase64(dataUrl: string): Promise<string> {
  return enhanceAndCompressBannerImage(dataUrl, 1920, 1080, 0.92, true);
}

/**
 * Optimizes profile & portrait photos (Kepala Sekolah, Waka, Staf, Guru, Siswa) at crisp Retina resolution (up to 800x1000).
 * Keeps portrait clarity sharp without blocky 38KB micro-compression.
 */
export function compressAvatarImage(
  source: File | string,
  maxWidth: number = 800,
  maxHeight: number = 1000,
  quality: number = 0.90
): Promise<string> {
  return new Promise((resolve) => {
    if (!source) {
      resolve('');
      return;
    }

    if (typeof source === 'string' && !source.startsWith('data:image/')) {
      resolve(getHighResMediaUrl(source, Math.max(maxWidth, 900)));
      return;
    }

    const TARGET_MAX_BYTES = 280 * 1024; // ~205KB binary -> crisp Retina portrait photos

    const processAvatarElement = (img: HTMLImageElement, rawDataUrl?: string, mimeType?: string) => {
      try {
        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;

        if (natW <= 0 || natH <= 0) {
          resolve(rawDataUrl || (typeof source === 'string' ? source : ''));
          return;
        }

        if (rawDataUrl && natW <= maxWidth && natH <= maxHeight && rawDataUrl.length <= TARGET_MAX_BYTES) {
          resolve(rawDataUrl);
          return;
        }

        let width = natW;
        let height = natH;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const hasAlpha = Boolean(
          (mimeType && (mimeType.includes('png') || mimeType.includes('webp'))) ||
          (rawDataUrl && /^data:image\/(png|webp)/i.test(rawDataUrl))
        );
        const canvas = renderHighQualityCanvas(img, width, height, hasAlpha);
        if (!canvas) {
          resolve(rawDataUrl || (typeof source === 'string' ? source : ''));
          return;
        }

        resolve(encodeCrispCanvas(canvas, hasAlpha, Math.max(quality, 0.88), TARGET_MAX_BYTES, 0.80));
      } catch (err) {
        console.warn('Failed in compressAvatarImage:', err);
        resolve(rawDataUrl || (typeof source === 'string' ? source : ''));
      }
    };

    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const raw = (e.target?.result as string) || '';
        if (!raw) {
          resolve('');
          return;
        }
        const img = new Image();
        img.onload = () => processAvatarElement(img, raw, source.type);
        img.onerror = () => resolve(raw);
        img.src = raw;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(source);
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => processAvatarElement(img, source);
      img.onerror = () => resolve(source);
      img.src = source;
    }
  });
}
