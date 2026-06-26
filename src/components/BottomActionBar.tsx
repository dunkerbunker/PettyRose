import { FileText, Share2 } from "lucide-react";

type BottomActionBarProps = {
  mode: "edit" | "preview";
  disabled?: boolean;
  onPrimary: () => void;
  fallback?: boolean;
};

export function BottomActionBar({ mode, disabled, onPrimary, fallback }: BottomActionBarProps) {
  return (
    <div className="action-bar">
      <button className="primary-action" type="button" disabled={disabled} onClick={onPrimary}>
        {mode === "edit" ? <FileText size={20} /> : <Share2 size={20} />}
        <span>{mode === "edit" ? "Generate preview" : fallback ? "Download PDF" : "Share PDF"}</span>
      </button>
    </div>
  );
}
