import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastMessage } from '../types/cctv';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="no-print fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const tone =
          toast.type === 'success'
            ? 'border-emerald-200 bg-white text-slate-900'
            : toast.type === 'error'
              ? 'border-red-200 bg-white text-slate-900'
              : toast.type === 'warning'
                ? 'border-amber-200 bg-white text-slate-900'
                : 'border-blue-200 bg-white text-slate-900';

        const iconEl =
          toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          ) : toast.type === 'warning' ? (
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          ) : (
            <Info className="h-5 w-5 shrink-0 text-blue-600" />
          );

        return (
          <div
            key={toast.id}
            role="status"
            className={`flex items-start gap-3 rounded-lg border p-3.5 shadow-lg transition-all ${tone}`}
          >
            {iconEl}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="ปิดการแจ้งเตือน"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
