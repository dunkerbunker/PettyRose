import { FileText, Loader2, Share2 } from "lucide-react";

type BottomActionBarProps = {
  mode: "edit" | "preview";
  disabled?: boolean;
  busy?: boolean;
  onPrimary: () => void;
  fallback?: boolean;
};

export function BottomActionBar({ mode, disabled, busy, onPrimary, fallback }: BottomActionBarProps) {
  const label = mode === "edit" ? (busy ? "Preparing PDF" : "Generate preview") : fallback ? "Download PDF" : "Share PDF";

  return (
    <div className="action-bar">
      <button className="primary-action" type="button" disabled={disabled || busy} aria-busy={busy} onClick={onPrimary}>
        {busy ? <Loader2 className="motion-spin" size={20} /> : mode === "edit" ? <FileText size={20} /> : <Share2 size={20} />}
        <span>{label}</span>
      </button>
    </div>
  );
}
