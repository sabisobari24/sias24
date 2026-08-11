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
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 800;
        const maxHeight = 800;
        let width = img.width;
        let height = img.height;

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

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string); // fallback to original if context fails
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG at 0.70 quality to dramatically reduce size (~25KB-50KB)
        const compressedB64 = canvas.toDataURL('image/jpeg', 0.70);
        resolve(compressedB64);
      };
      img.onerror = (err) => {
        reject(err);
      };
    };
    reader.onerror = (error) => reject(error);
  });
}
