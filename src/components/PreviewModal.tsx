import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Loader2, Maximize, Minus, Plus, RotateCcw, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFDocumentLoadingTask, PDFPageProxy, PDFWorker, RenderTask } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import type { GeneratedAgreement } from "../types/agreement";
import "./preview.css";

type PreviewModalProps = {
  agreement: GeneratedAgreement;
  fallback: boolean;
  onClose: () => void;
  onShare: () => Promise<void>;
};
type Fit = "width" | "page" | "custom";
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

// Engine/worker failures must never stop the form or PDF actions from loading.
const loadEngine = async () => {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
};
const within = <T,>(promise: Promise<T>, milliseconds: number): Promise<T> => new Promise((resolve, reject) => {
  const timer = window.setTimeout(() => reject(new Error("Preview timed out.")), milliseconds);
  promise.then((result) => { window.clearTimeout(timer); resolve(result); }, (error: unknown) => { window.clearTimeout(timer); reject(error); });
});

export function PreviewModal({ agreement, fallback, onClose, onShare }: PreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState<Fit>(() => window.matchMedia("(max-width: 600px)").matches ? "width" : "page");
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [pageSize, setPageSize] = useState({ width: 595.28, height: 841.89 });
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const fitWidth = Math.max(100, stageSize.width - 32) / pageSize.width;
  const fitPage = Math.min(fitWidth, Math.max(100, stageSize.height - 32) / pageSize.height);
  const scale = fit === "width" ? fitWidth : fit === "page" ? fitPage : zoom;
  const busy = loading || (!imagePreview && rendering);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const resize = () => setStageSize({ width: stage.clientWidth, height: stage.clientHeight });
    resize();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(resize);
      observer.observe(stage);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);

  useEffect(() => {
    let disposed = false;
    let task: PDFDocumentLoadingTask | undefined;
    let worker: Worker | undefined;
    let pdfWorker: PDFWorker | undefined;
    setLoading(true); setError(""); setPdf(null); setImagePreview(false); setPageCount(0);
    setPageNumber(1); setPageInput("1");
    const open = async () => {
      try {
        const engine = await within(loadEngine(), 20_000);
        if (disposed) return;
        const data = await agreement.blob.arrayBuffer();
        if (disposed) return;
        // Own the worker lifecycle. A fresh worker on retry avoids PDF.js
        // caching a failed fake-worker import for the rest of the session.
        worker = new Worker(pdfWorkerUrl, { type: "module" });
        const workerFailure = new Promise<never>((_, reject) => {
          worker!.onerror = (event) => { event.preventDefault(); reject(new Error("PDF worker unavailable.")); };
          worker!.onmessageerror = () => reject(new Error("PDF worker communication failed."));
        });
        pdfWorker = engine.PDFWorker.fromPort({ port: worker });
        task = engine.getDocument({ data: new Uint8Array(data), worker: pdfWorker, isEvalSupported: false });
        const document = await within(Promise.race([task.promise, workerFailure]), 30_000);
        if (disposed) return;
        setPdf(document); setPageCount(document.numPages);
      } catch {
        void task?.destroy().catch(() => undefined);
        pdfWorker?.destroy(); worker?.terminate();
        if (!disposed) {
          if (agreement.previewPages?.length) { setImagePreview(true); setPageCount(agreement.previewPages.length); }
          else setError("The preview could not open. Retry, or open or download the PDF below.");
        }
      } finally { if (!disposed) setLoading(false); }
    };
    void open();
    return () => { disposed = true; void task?.destroy().catch(() => undefined); pdfWorker?.destroy(); worker?.terminate(); };
  }, [agreement, attempt]);

  useEffect(() => {
    if (!pdf || !stageSize.width || imagePreview) return;
    let disposed = false;
    let task: RenderTask | undefined;
    let page: PDFPageProxy | undefined;
    const workingCanvas = document.createElement("canvas");
    setRendering(true); setError("");
    const render = async () => {
      try {
        page = await pdf.getPage(pageNumber);
        if (disposed) return;
        const base = page.getViewport({ scale: 1 });
        if (Math.abs(base.width - pageSize.width) > 0.1 || Math.abs(base.height - pageSize.height) > 0.1) {
          setPageSize({ width: base.width, height: base.height }); return;
        }
        // Bound pixel count and dimensions for Safari and low-memory phones.
        const renderScale = Math.min(scale * Math.min(window.devicePixelRatio || 1, 2),
          Math.sqrt(3_000_000 / (base.width * base.height)), 4096 / Math.max(base.width, base.height));
        const viewport = page.getViewport({ scale: renderScale });
        workingCanvas.width = Math.ceil(viewport.width); workingCanvas.height = Math.ceil(viewport.height);
        const context = workingCanvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas unavailable.");
        task = page.render({ canvasContext: context, viewport, background: "#ffffff" });
        await within(task.promise, 30_000);
        if (disposed) return;
        const canvas = canvasRef.current;
        const destination = canvas?.getContext("2d", { alpha: false });
        if (!canvas || !destination) throw new Error("Canvas unavailable.");
        canvas.width = workingCanvas.width; canvas.height = workingCanvas.height;
        destination.drawImage(workingCanvas, 0, 0);
      } catch {
        task?.cancel();
        if (!disposed) {
          if (agreement.previewPages?.length) setImagePreview(true);
          else setError("This page could not render. Retry, or open or download the PDF below.");
        }
      } finally {
        if (task) await task.promise.catch(() => undefined);
        page?.cleanup();
        workingCanvas.width = 0; workingCanvas.height = 0;
        if (!disposed) setRendering(false);
      }
    };
    void render();
    // Separate working canvases avoid races when paging/zooming rapidly.
    return () => { disposed = true; task?.cancel(); };
  }, [pdf, pageNumber, scale, stageSize.width, pageSize, imagePreview, agreement]);

  const goToPage = (page: number) => {
    const next = Math.max(1, Math.min(pageCount, Math.trunc(page)));
    setPageNumber(next); setPageInput(String(next));
    stageRef.current?.scrollTo({ top: 0, left: 0 });
  };
  const changeZoom = (delta: number) => {
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round((scale + delta) * 100) / 100)));
    setFit("custom");
  };
  const share = async () => {
    setShareError(""); setSharing(true);
    try { await onShare(); }
    catch (reason) {
      if (!(reason instanceof DOMException && reason.name === "AbortError")) setShareError("Sharing failed. You can still download the PDF.");
    } finally { setSharing(false); }
  };

  return (
    <div className="preview" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="preview-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); onClose(); }
        if (event.key === "Tab") {
          const focusable = Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled)') ?? []);
          const first = focusable[0]; const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
        if ((event.target as HTMLElement).matches("input, select, textarea") || !pageCount) return;
        if (event.key === "ArrowLeft") { event.preventDefault(); goToPage(pageNumber - 1); }
        if (event.key === "ArrowRight") { event.preventDefault(); goToPage(pageNumber + 1); }
      }}>
      <header className="preview__header">
        <button ref={closeRef} className="viewer-button" type="button" aria-label="Close preview" title="Close preview (Esc)" onClick={onClose}><X size={21} /></button>
        <div className="preview__title"><strong id="preview-title">Agreement preview</strong><span>{agreement.language === "dv" ? "Dhivehi" : "English"} · {agreement.filename}</span></div>
        <a className="viewer-button" aria-label="Download PDF" title="Download PDF" href={agreement.url} download={agreement.filename}><Download size={20} /></a>
      </header>
      <nav className="preview__tools" aria-label="PDF controls">
        <div className="viewer-control-group">
          <button className="viewer-button" type="button" aria-label="Previous page" title="Previous page" disabled={pageNumber <= 1 || loading} onClick={() => goToPage(pageNumber - 1)}><ChevronLeft size={19} /></button>
          <form className="viewer-page-input" onSubmit={(event) => { event.preventDefault(); goToPage(Number(pageInput) || pageNumber); }}>
            <input aria-label="Page number" type="number" min="1" max={pageCount || 1} disabled={!pageCount} value={pageInput} onChange={(event) => setPageInput(event.target.value)} onBlur={() => goToPage(Number(pageInput) || pageNumber)} />
            <span>of {pageCount || "–"}</span>
          </form>
          <button className="viewer-button" type="button" aria-label="Next page" title="Next page" disabled={!pageCount || pageNumber >= pageCount} onClick={() => goToPage(pageNumber + 1)}><ChevronRight size={19} /></button>
        </div>
        <div className="viewer-control-group">
          <button className="viewer-button" type="button" aria-label="Zoom out" title="Zoom out" disabled={scale <= MIN_ZOOM} onClick={() => changeZoom(-0.25)}><Minus size={18} /></button>
          <output className="viewer-zoom" aria-label="Zoom level">{Math.round(scale * 100)}%</output>
          <button className="viewer-button" type="button" aria-label="Zoom in" title="Zoom in" disabled={scale >= MAX_ZOOM} onClick={() => changeZoom(0.25)}><Plus size={18} /></button>
        </div>
        <div className="viewer-control-group viewer-fit">
          <button className={`viewer-button viewer-button--label ${fit === "width" ? "viewer-button--selected" : ""}`} type="button" aria-label="Fit width" aria-pressed={fit === "width"} onClick={() => setFit("width")}><FileText size={16} /><span>Fit width</span></button>
          <button className={`viewer-button viewer-button--label ${fit === "page" ? "viewer-button--selected" : ""}`} type="button" aria-label="Fit page" aria-pressed={fit === "page"} onClick={() => setFit("page")}><Maximize size={16} /><span>Fit page</span></button>
        </div>
      </nav>
      <div className="preview__stage" ref={stageRef} tabIndex={-1} aria-label="Agreement page" aria-busy={busy}>
        {loading && <div className="viewer-status" role="status"><Loader2 className="motion-spin" size={22} /><span>Opening your agreement…</span></div>}
        {error && <div className="viewer-error" role="alert"><strong>Preview unavailable</strong><p>{error}</p><button className="viewer-button viewer-button--label" type="button" onClick={() => setAttempt((value) => value + 1)}><RotateCcw size={17} />Retry preview</button></div>}
        {!loading && pageCount > 0 && !error && (
          <div className="viewer-page-wrap" style={{ width: Math.ceil(pageSize.width * scale), minWidth: Math.ceil(pageSize.width * scale) }}>
            <div className="viewer-page" style={{ height: Math.ceil(pageSize.height * scale) }}>
              {imagePreview ? <img src={agreement.previewPages?.[pageNumber - 1]} alt={`Dhivehi agreement, page ${pageNumber} of ${pageCount}`} />
                : <canvas ref={canvasRef} role="img" aria-label={`Agreement, page ${pageNumber} of ${pageCount}`} style={{ visibility: rendering ? "hidden" : "visible" }} />}
              {rendering && !imagePreview && <div className="viewer-page-loading" role="status"><Loader2 className="motion-spin" size={22} /><span>Preparing page {pageNumber}…</span></div>}
            </div>
            <p className="viewer-page-caption">Page {pageNumber} of {pageCount}</p>
          </div>
        )}
      </div>
      <footer className="preview__footer">
        <div className="viewer-footer-copy" aria-live="polite">{shareError || (busy ? "Preparing preview…" : pageCount ? `${pageCount} pages · Ready to save` : "Your PDF is ready to save")}</div>
        <div className="viewer-footer-actions">
          <a className="viewer-button viewer-button--label" href={agreement.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={17} /><span>Open PDF</span></a>
          <button className="viewer-save" type="button" disabled={sharing} onClick={() => void share()}>{sharing ? <Loader2 className="motion-spin" size={18} /> : fallback ? <Download size={18} /> : <Share2 size={18} />}{fallback ? "Download PDF" : "Share PDF"}</button>
        </div>
      </footer>
    </div>
  );
}
