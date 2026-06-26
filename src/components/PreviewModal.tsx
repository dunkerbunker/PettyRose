import { Download, Minus, Plus, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { GeneratedAgreement } from "../types/agreement";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type PreviewModalProps = {
  agreement: GeneratedAgreement;
  zoom: number;
  fallback: boolean;
  onZoom: (zoom: number) => void;
  onClose: () => void;
  onShare: () => void;
};

export function PreviewModal({ agreement, zoom, fallback, onZoom, onClose, onShare }: PreviewModalProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [renderError, setRenderError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      setRenderError("");
      setPages([]);
      try {
        const data = await agreement.blob.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const nextPages: string[] = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.55 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas is unavailable.");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: context, viewport }).promise;
          nextPages.push(canvas.toDataURL("image/png"));
        }

        if (!cancelled) setPages(nextPages);
      } catch {
        if (!cancelled) setRenderError("Preview could not render. The PDF is still available to share or download.");
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [agreement]);

  return (
    <div className="preview" role="dialog" aria-modal="true" aria-label="PDF preview">
      <header className="preview__header">
        <button className="icon-button icon-button--inverse" type="button" aria-label="Close preview" onClick={onClose}>
          <X size={21} />
        </button>
        <div className="preview__title">
          <span>PDF Preview</span>
          <strong>{agreement.filename}</strong>
        </div>
        <a className="icon-button icon-button--inverse" aria-label="Download PDF" href={agreement.url} download={agreement.filename}>
          <Download size={20} />
        </a>
      </header>
      <div className="preview__tools">
        <button className="tool-button" type="button" onClick={() => onZoom(Math.max(0.75, zoom - 0.15))}>
          <Minus size={18} />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button className="tool-button" type="button" onClick={() => onZoom(Math.min(2, zoom + 0.15))}>
          <Plus size={18} />
        </button>
      </div>
      <main className="preview__stage">
        {renderError && <div className="preview-message">{renderError}</div>}
        {!renderError && !pages.length && <div className="preview-message">Rendering PDF preview</div>}
        <div className="pdf-pages" style={{ width: `${Math.max(100, zoom * 100)}%` }}>
          {pages.map((page, index) => (
            <img alt={`Agreement page ${index + 1}`} key={page} src={page} />
          ))}
        </div>
      </main>
      <div className="action-bar action-bar--preview">
        <button className="primary-action primary-action--light" type="button" onClick={onShare}>
          {fallback ? <Download size={20} /> : <Share2 size={20} />}
          <span>{fallback ? "Download PDF" : "Share PDF"}</span>
        </button>
      </div>
    </div>
  );
}
