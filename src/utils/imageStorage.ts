// IndexedDB Storage & Image Optimization utility for Campusly Profile Photos

const DB_NAME = 'campusly_student_db';
const DB_VERSION = 1;
const STORE_NAME = 'user_media';
const PHOTO_KEY = 'profile_avatar';
const LOCAL_STORAGE_BACKUP_KEY = 'campusly_avatar_photo';

// Open IndexedDB instance safely with Promise wrapper
export function openImageDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB database'));
    };
  });
}

/**
 * Save profile avatar data URL to IndexedDB and fallback to localStorage
 */
export async function saveAvatarToDB(dataUrl: string): Promise<void> {
  try {
    // 1. Save to IndexedDB
    const db = await openImageDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putRequest = store.put({
        key: PHOTO_KEY,
        dataUrl,
        updatedAt: new Date().toISOString(),
      });

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    });
  } catch (err) {
    console.warn('IndexedDB write failed, falling back solely to localStorage:', err);
  }

  // 2. Also cache in localStorage for instant synchronous startup
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, dataUrl);
    }
  } catch (err) {
    console.warn('localStorage avatar cache write failed (quota limit):', err);
  }
}

/**
 * Retrieve profile avatar data URL from IndexedDB (or localStorage fallback)
 */
export async function getAvatarFromDB(): Promise<string | null> {
  try {
    const db = await openImageDB();
    const result = await new Promise<{ key: string; dataUrl: string } | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(PHOTO_KEY);

      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    });

    if (result && result.dataUrl) {
      return result.dataUrl;
    }
  } catch (err) {
    console.warn('IndexedDB read error, falling back to localStorage:', err);
  }

  // Fallback to localStorage
  if (typeof window !== 'undefined') {
    const fallback = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
    if (fallback) return fallback;
  }

  return null;
}

/**
 * Remove avatar from IndexedDB and localStorage
 */
export async function removeAvatarFromDB(): Promise<void> {
  try {
    const db = await openImageDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const delRequest = store.delete(PHOTO_KEY);

      delRequest.onsuccess = () => resolve();
      delRequest.onerror = () => reject(delRequest.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete error:', err);
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_BACKUP_KEY);
  }
}

/**
 * Validate image file format and sanity
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const extensionMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];

  const hasValidType = validTypes.includes(file.type.toLowerCase()) || validExtensions.includes(extension);

  if (!hasValidType) {
    return {
      valid: false,
      error: 'Unsupported image format. Please upload a JPG, JPEG, PNG, or WEBP image.',
    };
  }

  // Check file size (limit raw upload to 12MB before client-side downscaling)
  const MAX_RAW_SIZE_MB = 12;
  if (file.size > MAX_RAW_SIZE_MB * 1024 * 1024) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum limit of ${MAX_RAW_SIZE_MB}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Load a File into an HTMLImageElement safely
 */
export function loadFileToImage(file: File): Promise<{ image: HTMLImageElement; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();

      img.onload = () => {
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          reject(new Error('Corrupted or invalid image file.'));
          return;
        }
        resolve({ image: img, dataUrl });
      };

      img.onerror = () => {
        reject(new Error('Failed to decode image. The file may be corrupted.'));
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file from disk.'));
    };

    reader.readAsDataURL(file);
  });
}

export interface CropSettings {
  x: number; // Center offset X in normalized or pixel units
  y: number; // Center offset Y in normalized or pixel units
  zoom: number; // 1.0 to 3.0
  rotation: number; // in degrees (0, 90, 180, 270)
  targetSize?: number; // output square dimension (default 384px)
}

/**
 * Crop & optimize an image to a high-resolution, compressed square avatar data URL
 */
export function cropAndOptimizeAvatar(
  img: HTMLImageElement,
  settings: CropSettings
): string {
  const targetSize = settings.targetSize || 384;
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Could not obtain 2D canvas rendering context.');
  }

  // Smooth image scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill canvas with white background (in case of transparent PNGs)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetSize, targetSize);

  ctx.save();

  // Move origin to center of canvas
  ctx.translate(targetSize / 2, targetSize / 2);

  // Apply rotation
  if (settings.rotation) {
    ctx.rotate((settings.rotation * Math.PI) / 180);
  }

  // Calculate base scale to fill square (cover)
  const minDim = Math.min(img.naturalWidth, img.naturalHeight);
  const baseScale = targetSize / minDim;
  const totalScale = baseScale * (settings.zoom || 1);

  // Scale
  ctx.scale(totalScale, totalScale);

  // Apply user pan offset (scaled)
  const offsetX = (settings.x || 0) / (settings.zoom || 1);
  const offsetY = (settings.y || 0) / (settings.zoom || 1);

  // Draw image centered
  ctx.drawImage(
    img,
    -img.naturalWidth / 2 + offsetX,
    -img.naturalHeight / 2 + offsetY,
    img.naturalWidth,
    img.naturalHeight
  );

  ctx.restore();

  // Export as WebP if supported, fallback to JPEG
  try {
    const webpUrl = canvas.toDataURL('image/webp', 0.88);
    if (webpUrl.startsWith('data:image/webp')) {
      return webpUrl;
    }
  } catch {
    // Fallback
  }

  return canvas.toDataURL('image/jpeg', 0.88);
}
