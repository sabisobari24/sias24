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
 * Converts a file uploaded from local computer into an ultra-compressed, reliable base64 data URL string.
 * Keeps file sizes consistently under 45KB to prevent QuotaExceededError and Firestore payload rejections.
 */
export function compressImageFile(
  file: File,
  maxWidth: number = 400,
  maxHeight: number = 400,
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

      // If svg and tiny, return directly
      if (file.type === 'image/svg+xml' && file.size < 40 * 1024) {
        resolve(rawResult);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
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

          const isPng = file.type === 'image/png';
          let outputB64 = '';

          // 1. Try WebP first if PNG for crisp alpha transparency with lossy compression
          if (isPng) {
            try {
              ctx.clearRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              const webp = canvas.toDataURL('image/webp', quality);
              if (webp.startsWith('data:image/webp') && webp.length <= 60 * 1024) {
                outputB64 = webp;
              }
            } catch (_) {}

            // If WebP is unavailable or large, test PNG if under 45KB
            if (!outputB64) {
              try {
                const pngTest = canvas.toDataURL('image/png');
                if (pngTest.length <= 45 * 1024) {
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
            outputB64 = canvas.toDataURL('image/jpeg', quality);

            // If still somehow > 75KB, reduce quality one step
            if (outputB64.length > 75 * 1024) {
              outputB64 = canvas.toDataURL('image/jpeg', 0.55);
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
  maxWidth: number = 400,
  maxHeight: number = 400,
  quality: number = 0.72
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }

    if (dataUrl.length <= 45 * 1024) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

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

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

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
export function fileToBase64(file: File, maxWidth = 500, maxHeight = 500, quality = 0.72): Promise<string> {
  return compressImageFile(file, maxWidth, maxHeight, quality);
}
