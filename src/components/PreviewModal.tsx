import { Download, Loader2, Minus, Plus, Share2, X } from "lucide-react";
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
  const [renderProgress, setRenderProgress] = useState({ current: 0, total: 0 });
  const [renderError, setRenderError] = useState<string>("");
  const [renderComplete, setRenderComplete] = useState(false);
  const isRendering = !renderError && !renderComplete;

  useEffect(() => {
    let cancelled = false;
    const pageUrls: string[] = [];

    const getPreviewScale = () => {
      const isCompactViewport = window.matchMedia("(max-width: 680px)").matches;
      const isAndroid = /Android/i.test(navigator.userAgent);
      const deviceNavigator = navigator as Navigator & { deviceMemory?: number };
      const memory = typeof deviceNavigator.deviceMemory === "number" ? deviceNavigator.deviceMemory : undefined;
      const isLowerMemory = typeof memory === "number" && memory <= 4;

      if (isAndroid || isLowerMemory) return 1.15;
      if (isCompactViewport) return 1.25;
      return 1.55;
    };

    const canvasToObjectUrl = (canvas: HTMLCanvasElement) =>
      new Promise<string>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas export failed."));
              return;
            }
            resolve(URL.createObjectURL(blob));
          },
          "image/jpeg",
          0.88,
        );
      });

    const render = async () => {
      setRenderError("");
      setPages([]);
      setRenderComplete(false);
      setRenderProgress({ current: 0, total: 0 });
      let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

      try {
        const data = await agreement.blob.arrayBuffer();
        loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        const scale = getPreviewScale();
        if (!cancelled) setRenderProgress({ current: 0, total: pdf.numPages });

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) throw new Error("Canvas is unavailable.");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: context, viewport }).promise;
          const pageUrl = await canvasToObjectUrl(canvas);
          pageUrls.push(pageUrl);
          canvas.width = 0;
          canvas.height = 0;

          if (cancelled) {
            URL.revokeObjectURL(pageUrl);
            break;
          }

          setPages((current) => [...current, pageUrl]);
          if (!cancelled) setRenderProgress({ current: pageNumber, total: pdf.numPages });
        }

        if (!cancelled) setRenderComplete(true);
      } catch {
        if (!cancelled) {
          setRenderError(
            pageUrls.length
              ? "Some pages could not render on this browser. The PDF is still available to share or download."
              : "Preview could not render on this browser. The PDF is still available to share or download.",
          );
        }
      } finally {
        void loadingTask?.destroy();
      }
    };

    render();

    return () => {
      cancelled = true;
      pageUrls.forEach((url) => URL.revokeObjectURL(url));
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
        {isRendering && (
          <div className="preview-loader" aria-live="polite" aria-busy="true">
            <div className="preview-loader__copy">
              <Loader2 className="motion-spin" size={20} />
              <span>{renderProgress.total ? `Rendering page ${renderProgress.current || 1} of ${renderProgress.total}` : "Opening PDF preview"}</span>
            </div>
            <div className="preview-loader__pages" aria-hidden="true">
              <div className="page-skeleton" />
              <div className="page-skeleton page-skeleton--short" />
            </div>
          </div>
        )}
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
