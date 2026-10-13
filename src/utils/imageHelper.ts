/**
 * Utility functions for image URL conversions and file uploads
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
 * Converts a file uploaded from local computer into a compressed base64 data URL string
 * Supports optional maxWidth, maxHeight, and quality to keep file sizes under 40KB
 */
export function compressImageFile(
  file: File,
  maxWidth: number = 500,
  maxHeight: number = 500,
  quality: number = 0.72
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

      // If svg, return directly if under 100KB
      if (file.type === 'image/svg+xml' && file.size < 100 * 1024) {
        resolve(rawResult);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

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

          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawResult);
            return;
          }

          // If PNG with transparency, keep clean background or transparent PNG
          const isPng = file.type === 'image/png';
          if (!isPng) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          // For small PNG logos (<= 320px), use PNG to preserve crisp transparency; otherwise JPEG
          const exportMime = (isPng && width <= 350 && height <= 350) ? 'image/png' : 'image/jpeg';
          const compressedB64 = canvas.toDataURL(exportMime, quality);
          resolve(compressedB64);
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
  maxWidth: number = 500,
  maxHeight: number = 500,
  quality: number = 0.72
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width <= maxWidth && height <= maxHeight && dataUrl.length < 80 * 1024) {
          resolve(dataUrl);
          return;
        }

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

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        const isPng = dataUrl.startsWith('data:image/png');
        if (!isPng) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);
        const exportMime = (isPng && width <= 350 && height <= 350) ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(exportMime, quality));
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
export function fileToBase64(file: File, maxWidth = 600, maxHeight = 600, quality = 0.72): Promise<string> {
  return compressImageFile(file, maxWidth, maxHeight, quality);
}
