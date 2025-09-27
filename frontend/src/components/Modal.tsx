import { XIcon } from "lucide-react";
import React, { useEffect } from "react";

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "card" | "canvas";
  showHeader?: boolean;
};

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  variant = "card",
  showHeader = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  if (variant === "canvas") {
    return (
      <div
        className="fixed inset-0 z-50 bg-[#0f0f10] text-neutral-100 antialiased"
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Dialog"}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-sm p-2 text-neutral-400 hover:text-neutral-200 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-neutral-700"
          aria-label="Close"
        >
          <XIcon size={18} />
        </button>
        <div className="mx-auto max-w-[640px] pt-10 px-6 h-full overflow-auto">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Dialog"}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-[96vw] max-w-2xl md:max-w-3xl rounded-2xl border border-border/50 bg-card shadow-2xl">
        {showHeader ? (
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Close"
            >
              <XIcon size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 rounded-md p-1.5 text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close"
          >
            <XIcon size={18} />
          </button>
        )}
        <div className="max-h-[75vh] overflow-auto overflow-x-hidden p-6">{children}</div>
        {footer && (
          <div className="border-t px-6 py-4 flex justify-end gap-2 bg-card">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
