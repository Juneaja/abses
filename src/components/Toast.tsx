import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  toasts: ToastItem[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, toasts }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none no-print">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastNode key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastNode: React.FC<{ toast: ToastItem; onClose: () => void }> = ({ toast, onClose }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-slate-400 shrink-0" />,
  };

  const bgColors = {
    success: 'bg-slate-900/95 border-emerald-500/30 text-slate-100',
    error: 'bg-slate-900/95 border-red-500/30 text-slate-100',
    warning: 'bg-slate-900/95 border-amber-500/30 text-slate-100',
    info: 'bg-slate-900/95 border-slate-700/50 text-slate-100',
  };

  const borderAccents = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-slate-500',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95, x: 20 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: 30, transition: { duration: 0.2 } }}
      className={`pointer-events-auto flex items-stretch border rounded-xl shadow-xl backdrop-blur-md overflow-hidden ${bgColors[toast.type]}`}
    >
      {/* Dynamic left color stripe accent */}
      <div className={`w-1.5 shrink-0 ${borderAccents[toast.type]}`} />
      
      <div className="p-4 flex items-start gap-3 flex-1 min-w-0">
        {icons[toast.type]}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium leading-relaxed font-sans block whitespace-pre-line">
            {toast.message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-0.5 rounded-lg hover:bg-slate-800 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
