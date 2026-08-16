import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  widthClass?: string;
};

export default function Modal({ open, onClose, title, subtitle, children, widthClass = "max-w-3xl" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[85vh] w-full ${widthClass} flex-col rounded-lg border border-border-bright bg-bg-card shadow-[0_0_40px_var(--accent-glow)]`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-text-primary">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-text-tertiary">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-accent"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
