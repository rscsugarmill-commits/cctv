import { useEffect, useState } from 'react';
import { CameraOff, Image as ImageIcon } from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface DriveImageProps {
  fileId?: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  fallbackLabel?: string;
}

const blobCache = new Map<string, string>();

export function clearDriveImageCache() {
  blobCache.forEach((url) => URL.revokeObjectURL(url));
  blobCache.clear();
}

export function DriveImage({
  fileId,
  alt,
  className = '',
  onClick,
  fallbackLabel = 'ไม่มีรูปภาพ',
}: DriveImageProps) {
  const [src, setSrc] = useState<string | null>(() =>
    fileId ? blobCache.get(fileId) || null : null
  );
  const [loading, setLoading] = useState<boolean>(Boolean(fileId && !blobCache.has(fileId)));
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!fileId) {
      setSrc(null);
      setLoading(false);
      setError(false);
      return;
    }

    const cached = blobCache.get(fileId);
    if (cached) {
      setSrc(cached);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    apiClient
      .fetchDriveImageBlobUrl(fileId)
      .then((blobUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        blobCache.set(fileId, blobUrl);
        setSrc(blobUrl);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileId]);

  if (!fileId) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-400 ${className}`}
      >
        <ImageIcon className="h-5 w-5 opacity-60" />
        <span className="mt-1 text-[11px]">{fallbackLabel}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={`animate-pulse rounded-lg border border-slate-200 bg-slate-100 ${className}`}
        aria-label="กำลังโหลดรูปภาพจาก Google Drive"
      />
    );
  }

  if (error || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-2 text-center text-slate-400 ${className}`}
      >
        <CameraOff className="h-5 w-5 text-slate-400" />
        <span className="mt-1 text-[11px]">โหลดรูปไม่สำเร็จ</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onClick={onClick}
      className={`object-cover ${onClick ? 'cursor-zoom-in transition-transform duration-200 hover:scale-[1.02]' : ''} ${className}`}
    />
  );
}
