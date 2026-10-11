import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type DrawerProps = { label: string; title: string; onClose: () => void; children: ReactNode };

export function Drawer({ label, title, onClose, children }: DrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  closeRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current!;
    const trigger = document.activeElement as HTMLElement | null;
    dialog.dataset.keyboard = String(trigger?.matches(":focus-visible") ?? false);
    const scrollY = window.scrollY;
    const previous = { position: document.body.style.position, top: document.body.style.top,
      width: document.body.style.width, overflow: document.body.style.overflow };
    // Native focus containment and inertness; a fixed body also prevents iOS scrolling.
    dialog.showModal();
    Object.assign(document.body.style, { position: "fixed", top: `-${scrollY}px`, width: "100%", overflow: "hidden" });
    const selected = dialog.querySelector<HTMLButtonElement>('[aria-checked="true"]');
    selected?.focus({ preventScroll: true });
    selected?.scrollIntoView({ block: "nearest" });
    return () => {
      dialog.close();
      Object.assign(document.body.style, previous);
      window.scrollTo({ top: scrollY, behavior: "instant" });
      trigger?.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <dialog ref={dialogRef} className="sheet-dialog" aria-label={label} aria-describedby={titleId}
      onCancel={(event) => { event.preventDefault(); closeRef.current(); }}
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), input:not(:disabled), select:not(:disabled)'));
          const first = controls[0]; const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
        if ((event.target as HTMLElement).getAttribute("role") === "radio" && ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const choices = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]'));
          const index = choices.indexOf(event.target as HTMLElement);
          const next = event.key === "Home" ? 0 : event.key === "End" ? choices.length - 1
            : (index + (event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1) + choices.length) % choices.length;
          choices[next]?.focus();
        }
      }}>
      <button className="sheet-backdrop" type="button" tabIndex={-1} aria-label={`Dismiss ${label}`} onClick={onClose} />
      <section className="bottom-sheet drawer-sheet">
        <div className="drawer-handle" aria-hidden="true"><div className="sheet-grabber" /></div>
        <header className="sheet-header">
          <div><p>{label}</p><strong id={titleId}>{title}</strong></div>
          <button className="icon-button" type="button" aria-label={`Close ${label}`} onClick={onClose}><X size={20} /></button>
        </header>
        <div className="drawer-content">{children}</div>
      </section>
    </dialog>, document.body,
  );
}
