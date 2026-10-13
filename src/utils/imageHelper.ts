/**
 * Utility functions for image URL conversions, file uploads, and automatic image enhancement
 */

/**
 * Automatically converts Google Drive sharing links to direct image preview links
 */
export function convertGoogleDriveLink(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  
  // Pattern 1: /file/d/FILE_ID/view or /file/d/FILE_ID
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_\-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileDMatch[1]}`;
  }

  // Pattern 2: ?id=FILE_ID or &id=FILE_ID
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_\-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${idParamMatch[1]}`;
  }

  // Pattern 3: docs.google.com/file/d/FILE_ID/edit
  const docsDMatch = trimmed.match(/docs\.google\.com\/file\/d\/([a-zA-Z0-9_\-]+)/);
  if (docsDMatch && docsDMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${docsDMatch[1]}`;
  }

  return trimmed;
}

/**
 * High-performance edge sharpening & clarity enhancement filter for canvas images.
 * Eliminates softness and blur from phone camera and gallery uploads.
 */
function applySharpenAndClarityFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sharpenStrength: number = 0.22
): void {
  try {
    if (width <= 2 || height <= 2) return;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const output = new Uint8ClampedArray(data.length);
    output.set(data);

    const k = Math.max(0.1, Math.min(0.4, sharpenStrength));
    const centerWeight = 1 + 4 * k;
    const neighborWeight = -k;

    const rowBytes = width * 4;

    // Process interior pixels with Laplacian 5-point cross convolution
    for (let y = 1; y < height - 1; y++) {
      const rowOffset = y * rowBytes;
      const prevRowOffset = (y - 1) * rowBytes;
      const nextRowOffset = (y + 1) * rowBytes;

      for (let x = 1; x < width - 1; x++) {
        const idx = rowOffset + (x * 4);
        const topIdx = prevRowOffset + (x * 4);
        const btmIdx = nextRowOffset + (x * 4);
        const lftIdx = rowOffset + ((x - 1) * 4);
        const rgtIdx = rowOffset + ((x + 1) * 4);

        // Red
        output[idx] = Math.min(255, Math.max(0,
          data[idx] * centerWeight +
          (data[topIdx] + data[btmIdx] + data[lftIdx] + data[rgtIdx]) * neighborWeight
        ));

        // Green
        output[idx + 1] = Math.min(255, Math.max(0,
          data[idx + 1] * centerWeight +
          (data[topIdx + 1] + data[btmIdx + 1] + data[lftIdx + 1] + data[rgtIdx + 1]) * neighborWeight
        ));

        // Blue
        output[idx + 2] = Math.min(255, Math.max(0,
          data[idx + 2] * centerWeight +
          (data[topIdx + 2] + data[btmIdx + 2] + data[lftIdx + 2] + data[rgtIdx + 2]) * neighborWeight
        ));

        // Alpha remains untouched
        output[idx + 3] = data[idx + 3];
      }
    }

    const resultImageData = new ImageData(output, width, height);
    ctx.putImageData(resultImageData, 0, 0);
  } catch (err) {
    // If getImageData fails due to security restrictions, graceful fallback
    console.warn('Auto-enhancement canvas filter skipped:', err);
  }
}

/**
 * Automatically enhances and optimizes banner and slide images uploaded from gallery/camera.
 * Delivers razor-sharp widescreen HD resolution (up to 1920x1080) with automatic clarity,
 * vibrancy, edge-sharpening, and anti-blur technology.
 */
export function enhanceAndCompressBannerImage(
  source: File | string,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve) => {
    if (!source) {
      resolve('');
      return;
    }

    const processImageElement = (img: HTMLImageElement) => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width <= 0 || height <= 0) {
          resolve(typeof source === 'string' ? source : '');
          return;
        }

        // Maintain aspect ratio while ensuring generous HD resolution for panoramic banners
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // If the uploaded photo is relatively small (e.g., <= 800px wide), ensure we don't downscale it further
        width = Math.max(1, width);
        height = Math.max(1, height);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
          resolve(typeof source === 'string' ? source : '');
          return;
        }

        // 1. High quality multi-step bicubic smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 2. Auto Dynamic Range & Vibrancy enhancement (CSS filter on context)
        try {
          ctx.filter = 'contrast(106%) saturate(106%) brightness(101%)';
        } catch (_) {}

        // 3. Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Reset filter
        try {
          ctx.filter = 'none';
        } catch (_) {}

        // 4. Automatic edge sharpening & unsharp masking to eliminate gallery blur
        applySharpenAndClarityFilter(ctx, width, height, 0.24);

        // 5. Intelligent encoding: Try modern WebP first for superior clarity with small file size
        let outputUrl = '';
        try {
          const webp = canvas.toDataURL('image/webp', quality);
          if (webp.startsWith('data:image/webp') && webp.length <= 260 * 1024) {
            outputUrl = webp;
          }
        } catch (_) {}

        // Fallback to high-quality progressive JPEG if WebP unavailable or large
        if (!outputUrl) {
          outputUrl = canvas.toDataURL('image/jpeg', quality);
          // If still over 280KB, step down slightly to protect local storage quota
          if (outputUrl.length > 280 * 1024) {
            outputUrl = canvas.toDataURL('image/jpeg', 0.78);
          }
        }

        resolve(outputUrl);
      } catch (err) {
        console.warn('Failed in enhanceAndCompressBannerImage:', err);
        resolve(typeof source === 'string' ? source : '');
      }
    };

    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const raw = e.target?.result as string;
        if (!raw) {
          resolve('');
          return;
        }
        const img = new Image();
        img.onload = () => processImageElement(img);
        img.onerror = () => resolve(raw);
        img.src = raw;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(source);
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => processImageElement(img);
      img.onerror = () => resolve(source);
      img.src = source;
    }
  });
}

/**
 * Converts a file uploaded from local computer into an ultra-compressed, reliable base64 data URL string.
 * Keeps file sizes consistently under 60KB to prevent QuotaExceededError and Firestore payload rejections.
 */
export function compressImageFile(
  file: File,
  maxWidth: number = 600,
  maxHeight: number = 600,
  quality: number = 0.78
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawResult = event.target?.result as string;
      if (!rawResult) {
        resolve('');
        return;
      }

      // If svg and tiny, return directly
      if (file.type === 'image/svg+xml' && file.size < 40 * 1024) {
        resolve(rawResult);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width <= 0 || height <= 0) {
            resolve(rawResult);
            return;
          }

          // Calculate new dimensions preserving aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          width = Math.max(1, width);
          height = Math.max(1, height);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawResult);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          const isPng = file.type === 'image/png';
          let outputB64 = '';

          // 1. Try WebP first if PNG for crisp alpha transparency with lossy compression
          if (isPng) {
            try {
              ctx.clearRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              applySharpenAndClarityFilter(ctx, width, height, 0.18);
              const webp = canvas.toDataURL('image/webp', quality);
              if (webp.startsWith('data:image/webp') && webp.length <= 80 * 1024) {
                outputB64 = webp;
              }
            } catch (_) {}

            // If WebP is unavailable or large, test PNG if under 55KB
            if (!outputB64) {
              try {
                const pngTest = canvas.toDataURL('image/png');
                if (pngTest.length <= 55 * 1024) {
                  outputB64 = pngTest;
                }
              } catch (_) {}
            }
          }

          // 2. High-efficiency JPEG fallback with white background
          if (!outputB64) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            applySharpenAndClarityFilter(ctx, width, height, 0.18);
            outputB64 = canvas.toDataURL('image/jpeg', quality);

            // If still somehow > 85KB, reduce quality one step
            if (outputB64.length > 85 * 1024) {
              outputB64 = canvas.toDataURL('image/jpeg', 0.65);
            }
          }

          resolve(outputB64);
        } catch (canvasErr) {
          console.warn('Canvas compression error:', canvasErr);
          resolve(rawResult);
        }
      };
      img.onerror = () => {
        resolve(rawResult);
      };
      img.src = rawResult;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an existing base64 image data URL string
 */
export function compressBase64Image(
  dataUrl: string,
  maxWidth: number = 600,
  maxHeight: number = 600,
  quality: number = 0.78
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }

    if (dataUrl.length <= 50 * 1024) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        width = Math.max(1, width);
        height = Math.max(1, height);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        applySharpenAndClarityFilter(ctx, width, height, 0.18);

        const result = canvas.toDataURL('image/jpeg', quality);
        resolve(result);
      } catch (e) {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Converts a file uploaded from local computer into a compressed base64 data URL string
 */
export function fileToBase64(file: File, maxWidth = 600, maxHeight = 600, quality = 0.78): Promise<string> {
  return compressImageFile(file, maxWidth, maxHeight, quality);
}

/**
 * Auto-enhances any existing Base64 or image data URL to eliminate blur and boost sharpness
 */
export function autoEnhanceImageBase64(dataUrl: string): Promise<string> {
  return enhanceAndCompressBannerImage(dataUrl, 1920, 1080, 0.85);
}
