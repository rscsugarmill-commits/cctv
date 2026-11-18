export interface ProcessedImage {
  fileName: string;
  mimeType: string;
  base64Data: string;
  previewUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_RAW_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB raw limit
const MAX_DIMENSION = 1600;

export async function processImageFile(file: File): Promise<ProcessedImage> {
  if (!ALLOWED_TYPES.has(file.type.toLowerCase())) {
    throw new Error('รองรับเฉพาะไฟล์ภาพ JPG, JPEG, PNG และ WEBP เท่านั้น');
  }
  if (file.size > MAX_RAW_SIZE_BYTES) {
    throw new Error('ขนาดไฟล์ภาพต้นฉบับต้องไม่เกิน 20 MB');
  }

  const bitmap = await createImageBitmap(file);
  let targetWidth = bitmap.width;
  let targetHeight = bitmap.height;

  if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
    if (targetWidth >= targetHeight) {
      targetHeight = Math.round((targetHeight * MAX_DIMENSION) / targetWidth);
      targetWidth = MAX_DIMENSION;
    } else {
      targetWidth = Math.round((targetWidth * MAX_DIMENSION) / targetHeight);
      targetHeight = MAX_DIMENSION;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('ไม่สามารถประมวลผลรูปภาพบนเบราว์เซอร์นี้ได้');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  const outputMime = file.type.toLowerCase() === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const quality = 0.82;
  const dataUrl = canvas.toDataURL(outputMime, quality);
  const base64Data = dataUrl.split(',')[1] || '';
  const compressedSizeBytes = Math.round((base64Data.length * 3) / 4);

  const ext = outputMime === 'image/webp' ? 'webp' : 'jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '');

  return {
    fileName: `${baseName}.${ext}`,
    mimeType: outputMime,
    base64Data,
    previewUrl: dataUrl,
    originalSizeBytes: file.size,
    compressedSizeBytes,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatThaiDate(isoOrYmd: string): string {
  if (!isoOrYmd) return '-';
  const d = new Date(isoOrYmd.length === 10 ? `${isoOrYmd}T00:00:00` : isoOrYmd);
  if (Number.isNaN(d.getTime())) return isoOrYmd;
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatThaiDateTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function getTodayYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
