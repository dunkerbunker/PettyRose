import { Download, ExternalLink, Loader2, Minus, Plus, Share2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
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
  maxPixels: number;
  renderTimeoutMs: number;
  scale: number;
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
      maxPixels: 1_050_000,
      renderTimeoutMs: 4500,
      scale: 1,
    };
  }

  return {
    documentTimeoutMs: 10000,
    maxPixels: isCompactViewport ? 1_700_000 : 3_000_000,
    renderTimeoutMs: 8000,
    scale: isCompactViewport ? 1.25 : 1.55,
  };
};

const getSafeViewport = (page: pdfjsLib.PDFPageProxy, profile: DeviceProfile) => {
  const baseViewport = page.getViewport({ scale: 1 });
  const maxScaleForPixels = Math.sqrt(profile.maxPixels / (baseViewport.width * baseViewport.height));
  return page.getViewport({ scale: Math.min(profile.scale, maxScaleForPixels) });
};

type PdfPageCanvasProps = {
  active: boolean;
  pageNumber: number;
  pdf: pdfjsLib.PDFDocumentProxy;
  profile: DeviceProfile;
  onError: (message: string) => void;
  onRendered: (pageNumber: number) => void;
};

function PdfPageCanvas({ active, pageNumber, pdf, profile, onError, onRendered }: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!active || rendered) return undefined;

    let cancelled = false;
    let renderTask: pdfjsLib.RenderTask | null = null;

    const renderPage = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const page = await withTimeout(pdf.getPage(pageNumber), profile.renderTimeoutMs);
        if (cancelled) return;

        const viewport = getSafeViewport(page, profile);
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas is unavailable.");

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);

        renderTask = page.render({ canvasContext: context, viewport });
        await withTimeout(renderTask.promise, profile.renderTimeoutMs, () => {
          renderTask?.cancel();
        });

        if (!cancelled) {
          setRendered(true);
          onRendered(pageNumber);
        }
      } catch {
        if (!cancelled) onError("This browser could not render the PDF preview. Use the PDF actions below as a fallback.");
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [active, onError, onRendered, pageNumber, pdf, profile, rendered]);

  return <canvas className={`pdf-page-canvas ${rendered ? "pdf-page-canvas--ready" : ""}`} ref={canvasRef} />;
}

export function PreviewModal({ agreement, zoom, fallback, onZoom, onClose, onShare }: PreviewModalProps) {
  const profile = useMemo(getDeviceProfile, []);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [activeRenderPage, setActiveRenderPage] = useState(1);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(() => new Set());
  const [renderProgress, setRenderProgress] = useState({ current: 0, total: 0 });
  const [renderError, setRenderError] = useState<string>("");
  const [showExternalViewer, setShowExternalViewer] = useState(false);
  const isRendering = !renderError && (!pdf || renderedPages.size < numPages);

  const handlePageRendered = useCallback(
    (pageNumber: number) => {
      setRenderedPages((current) => {
        const next = new Set(current);
        next.add(pageNumber);
        setRenderProgress({ current: next.size, total: numPages });
        return next;
      });
      setActiveRenderPage((current) => Math.max(current, pageNumber + 1));
    },
    [numPages],
  );

  const handleRenderError = useCallback((message: string) => {
    setRenderError(message);
    setShowExternalViewer(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

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

    const loadPdf = async () => {
      setRenderError("");
      setShowExternalViewer(false);
      setPdf(null);
      setNumPages(0);
      setActiveRenderPage(1);
      setRenderedPages(new Set());
      setRenderProgress({ current: 0, total: 0 });

      try {
        const data = await agreement.blob.arrayBuffer();
        const opened = await openPdf(data);
        loadingTask = opened.task;
        if (cancelled) return;
        setPdf(opened.pdf);
        setNumPages(opened.pdf.numPages);
        setRenderProgress({ current: 0, total: opened.pdf.numPages });
        await nextFrame();
      } catch {
        if (!cancelled) {
          setShowExternalViewer(true);
          setRenderError("This browser could not open the PDF preview. Use the PDF actions below as a fallback.");
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [agreement, profile]);

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
              <strong>PDF fallback</strong>
              <span>Use this only if the in-app Chrome preview stays blank.</span>
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
          {pdf &&
            Array.from({ length: numPages }, (_, index) => {
              const pageNumber = index + 1;
              return pageNumber <= activeRenderPage ? (
                <PdfPageCanvas
                  active={pageNumber === activeRenderPage || renderedPages.has(pageNumber)}
                  key={pageNumber}
                  onError={handleRenderError}
                  onRendered={handlePageRendered}
                  pageNumber={pageNumber}
                  pdf={pdf}
                  profile={profile}
                />
              ) : (
                <div className="page-skeleton page-skeleton--queued" key={pageNumber} />
              );
            })}
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
