import React from 'react';
import { AlertTriangle, Trash2, UserX, X, HelpCircle, ShieldAlert } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  iconType?: 'trash' | 'user_remove' | 'warning' | 'shield';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  iconType = 'trash',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  const renderIcon = () => {
    switch (iconType) {
      case 'user_remove':
        return <UserX className="w-6 h-6 text-rose-400" />;
      case 'trash':
        return <Trash2 className="w-6 h-6 text-rose-400" />;
      case 'shield':
        return <ShieldAlert className="w-6 h-6 text-amber-400" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 font-sans">
      <div 
        className="bg-slate-900 border border-white/15 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col scale-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isDanger 
                ? 'bg-rose-500/10 border-rose-500/30' 
                : 'bg-amber-500/10 border-amber-500/30'
            }`}>
              {renderIcon()}
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <h3 className="text-base font-bold text-white leading-tight">
                {title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {message}
              </p>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-950/80 border-t border-white/10 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer flex items-center gap-1.5 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25'
            }`}
          >
            {renderIcon()}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
