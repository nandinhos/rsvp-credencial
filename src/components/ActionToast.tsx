import React from 'react';
import {
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  X,
  Info
} from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  undoAction?: () => void;
  undoLabel?: string;
}

interface ActionToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ActionToastContainer: React.FC<ActionToastProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-[#0B2A4A] text-white p-3.5 rounded-lg shadow-xl border border-sky-400/30 flex items-start justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : toast.type === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <RotateCcw className="w-5 h-5 text-sky-300 shrink-0 mt-0.5" />
            )}

            <div className="min-w-0 text-xs">
              <h4 className="font-bold text-white leading-tight">{toast.title}</h4>
              <p className="text-sky-100/90 mt-0.5 text-[11px] leading-snug">{toast.message}</p>

              {toast.undoAction && (
                <button
                  onClick={() => {
                    toast.undoAction!();
                    onDismiss(toast.id);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-sky-50 text-[#0B2A4A] rounded text-[11px] font-bold shadow-xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#1C4E80]" />
                  <span>{toast.undoLabel || 'Desfazer Ação'}</span>
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-sky-300/80 hover:text-white p-1 shrink-0"
            title="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
