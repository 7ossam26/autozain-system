import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'تأكيد',
  cancelLabel  = 'إلغاء',
  danger       = false,
  loading      = false,
}) {
  const confirmRef = useRef(null);

  // Focus confirm button when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => confirmRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div className="relative bg-surface rounded-lg shadow-xl w-full max-w-sm p-6 z-10">
        <div className="flex items-start justify-between mb-3">
          <h2 id="confirm-title" className="text-lg font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onCancel}
            className="text-text-muted hover:text-text-primary transition-colors mr-2"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {message && (
          <p className="text-text-secondary text-sm mb-6 leading-relaxed">{message}</p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm border border-border-muted rounded-sm hover:bg-background disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm rounded-sm text-white disabled:opacity-60 transition-colors
              ${danger
                ? 'bg-error hover:bg-red-600'
                : 'bg-primary hover:bg-primary-dark'
              }`}
          >
            {loading ? 'جاري…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
