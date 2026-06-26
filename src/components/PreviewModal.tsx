import { Download, ExternalLink, Loader2, Minus, Plus, Share2, X } from "lucide-react";
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

type DeviceProfile = {
  documentTimeoutMs: number;
  exportTimeoutMs: number;
  maxPixels: number;
  renderTimeoutMs: number;
  scale: number;
  showExternalViewer: boolean;
};

const nextFrame = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, onTimeout?: () => void): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      onTimeout?.();
      reject(new Error("Timed out."));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });

const getDeviceProfile = (): DeviceProfile => {
  const isCompactViewport = window.matchMedia("(max-width: 680px)").matches;
  const isAndroid = /Android/i.test(navigator.userAgent);
  const deviceNavigator = navigator as Navigator & { deviceMemory?: number };
  const memory = typeof deviceNavigator.deviceMemory === "number" ? deviceNavigator.deviceMemory : undefined;
  const isLowerMemory = typeof memory === "number" && memory <= 4;
  const needsConservativeCanvas = isAndroid || isLowerMemory;

  if (needsConservativeCanvas) {
    return {
      documentTimeoutMs: 6500,
      exportTimeoutMs: 3500,
      maxPixels: 900_000,
      renderTimeoutMs: 4500,
      scale: 0.92,
      showExternalViewer: true,
    };
  }

  return {
    documentTimeoutMs: 10000,
    exportTimeoutMs: 5000,
    maxPixels: isCompactViewport ? 1_700_000 : 3_000_000,
    renderTimeoutMs: 8000,
    scale: isCompactViewport ? 1.25 : 1.55,
    showExternalViewer: false,
  };
};

const getSafeViewport = (page: pdfjsLib.PDFPageProxy, profile: DeviceProfile) => {
  const baseViewport = page.getViewport({ scale: 1 });
  const maxScaleForPixels = Math.sqrt(profile.maxPixels / (baseViewport.width * baseViewport.height));
  return page.getViewport({ scale: Math.min(profile.scale, maxScaleForPixels) });
};

export function PreviewModal({ agreement, zoom, fallback, onZoom, onClose, onShare }: PreviewModalProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [renderProgress, setRenderProgress] = useState({ current: 0, total: 0 });
  const [renderError, setRenderError] = useState<string>("");
  const [renderComplete, setRenderComplete] = useState(false);
  const [showExternalViewer, setShowExternalViewer] = useState(false);
  const isRendering = !renderError && !renderComplete;

  useEffect(() => {
    let cancelled = false;
    const pageUrls: string[] = [];
    const profile = getDeviceProfile();

    const canvasToObjectUrl = (canvas: HTMLCanvasElement) =>
      withTimeout(
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
            0.82,
          );
        }),
        profile.exportTimeoutMs,
      );

    const openPdf = async (data: ArrayBuffer) => {
      const documentOptions = {
        data: new Uint8Array(data.slice(0)),
        isEvalSupported: false,
      };
      const task = pdfjsLib.getDocument(documentOptions);

      try {
        const pdf = await withTimeout(task.promise, profile.documentTimeoutMs, () => {
          void task.destroy();
        });
        return { pdf, task };
      } catch (error) {
        void task.destroy();
        throw error;
      }
    };

    const render = async () => {
      setRenderError("");
      setPages([]);
      setRenderComplete(false);
      setShowExternalViewer(profile.showExternalViewer);
      setRenderProgress({ current: 0, total: 0 });
      let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

      try {
        const data = await agreement.blob.arrayBuffer();
        const opened = await openPdf(data);
        loadingTask = opened.task;
        const pdf = opened.pdf;
        if (!cancelled) setRenderProgress({ current: 0, total: pdf.numPages });

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) break;
          const page = await pdf.getPage(pageNumber);
          const viewport = getSafeViewport(page, profile);
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) throw new Error("Canvas is unavailable.");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          const renderTask = page.render({ canvasContext: context, viewport });
          await withTimeout(renderTask.promise, profile.renderTimeoutMs, () => {
            renderTask.cancel();
          });
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
          await nextFrame();
        }

        if (!cancelled) setRenderComplete(true);
      } catch {
        if (!cancelled) {
          setRenderComplete(true);
          setShowExternalViewer(true);
          setRenderError(
            pageUrls.length
              ? "Some pages could not render on this browser. Open the PDF directly to view the full agreement."
              : "This browser could not render the preview. Open the PDF directly to view the agreement.",
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
        {showExternalViewer && (
          <div className="preview-fallback">
            <div>
              <strong>Use phone PDF viewer</strong>
              <span>Best option for Android Chrome if the in-app preview stays blank.</span>
            </div>
            <a href={agreement.url} target="_blank" rel="noreferrer">
              <ExternalLink size={18} />
              <span>Open PDF</span>
            </a>
            <a href={agreement.url} download={agreement.filename}>
              <Download size={18} />
              <span>Download</span>
            </a>
          </div>
        )}
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
