import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    cls: 'bg-success text-white',
    bar: 'bg-green-700',
  },
  error: {
    icon: XCircle,
    cls: 'bg-error text-white',
    bar: 'bg-red-700',
  },
  warning: {
    icon: AlertTriangle,
    cls: 'bg-warning text-white',
    bar: 'bg-amber-600',
  },
  info: {
    icon: Info,
    cls: 'bg-secondary text-white',
    bar: 'bg-blue-900',
  },
};

function Toast({ id, type, message, onRemove }) {
  const cfg = TOAST_CONFIG[type] ?? TOAST_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-md shadow-lg text-sm w-80 sm:w-96 relative overflow-hidden ${cfg.cls}`}
      role="alert"
      dir="rtl"
    >
      <Icon size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
      <p className="flex-1 leading-snug">{message}</p>
      <button
        onClick={() => onRemove(id)}
        className="opacity-70 hover:opacity-100 transition-opacity shrink-0"
        aria-label="إغلاق الإشعار"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', message, duration = 4000 }) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, [removeToast]);

  const toast = {
    success: (msg, opts) => addToast({ type: 'success', message: msg, ...opts }),
    error:   (msg, opts) => addToast({ type: 'error',   message: msg, ...opts }),
    warning: (msg, opts) => addToast({ type: 'warning', message: msg, ...opts }),
    info:    (msg, opts) => addToast({ type: 'info',    message: msg, ...opts }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Position: top-center on mobile, top-right on desktop */}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-[200] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast {...t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
