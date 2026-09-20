import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Entry } from "../../lib/api";

type Flip = {
  loadFromHTML: (pages: HTMLElement[]) => void;
  destroy: () => void;
  on: (event: string, callback: (event: { data: number }) => void) => void;
  getCurrentPageIndex: () => number;
  getState: () => string;
  flipNext: (corner: string) => void;
  turnToPage: (index: number) => void;
  getBoundsRect: () => { left: number };
  getFlipController: () => { flip: (point: { x: number; y: number }) => void };
};
declare global {
  interface Window {
    St?: {
      PageFlip: new (
        root: HTMLElement,
        settings: Record<string, unknown>,
      ) => Flip;
    };
  }
}

// The same StPageFlip version and settings as HappyEnglish. Portals keep React
// ownership of each page's content while the library positions its outer node.
export function FlipBook({
  items,
  kind,
  render,
  initial = 0,
  onFlip,
}: {
  items: Entry[];
  kind: "kids" | "math" | "note";
  render: (item: Entry, index: number) => ReactNode;
  initial?: number;
  onFlip?: (index: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const book = useRef<Flip | null>(null);
  const startPage = Math.max(0, Math.min(initial, items.length - 1));
  const [index, setIndex] = useState(startPage);
  const callback = useRef(onFlip);
  useEffect(() => {
    callback.current = onFlip;
  }, [onFlip]);
  const [pages] = useState(() =>
    items.map((item) => {
      const page = document.createElement(kind === "kids" ? "div" : "article");
      page.className =
        kind === "kids"
          ? "carousel-slide"
          : kind === "math"
            ? "math-card"
            : item.item_type === "knowledge"
              ? "card knowledge-card"
              : "card";
      return page;
    }),
  );
  useLayoutEffect(() => {
    const root = document.createElement("div");
    root.className =
      kind === "kids"
        ? "kids-card-grid"
        : kind === "math"
          ? "math-card-book"
          : "carousel";
    host.current?.append(root);
    pages.forEach((page) => root.append(page));
    if (!window.St) return () => root.remove();
    const height = kind === "kids" ? 1180 : kind === "math" ? 980 : 900;
    const flip = new window.St.PageFlip(root, {
      width: 760,
      height,
      size: "stretch",
      minWidth: 381,
      maxWidth: 760,
      minHeight: kind === "kids" ? 520 : kind === "math" ? 500 : 400,
      maxHeight: height,
      drawShadow: true,
      maxShadowOpacity: 0.7,
      flippingTime: 1320,
      usePortrait: true,
      startZIndex: 10,
      autoSize: true,
      startPage,
      mobileScrollSupport: true,
      swipeDistance: 40,
      clickEventForward: true,
      useMouseEvents: true,
      disableFlipByClick: true,
    });
    book.current = flip;
    flip.on("flip", (event) => {
      setIndex(event.data);
      callback.current?.(event.data);
    });
    flip.loadFromHTML(pages);
    return () => {
      book.current = null;
      flip.destroy();
    };
  }, [pages, kind, startPage]);
  function move(direction: number) {
    const flip = book.current;
    if (!flip || flip.getState() !== "read") return;
    if (direction > 0) flip.flipNext("top");
    else
      flip
        .getFlipController()
        .flip({ x: flip.getBoundsRect().left + 10, y: 1 });
  }
  const control =
    kind === "kids"
      ? "carousel-control carousel"
      : kind === "math"
        ? "math-carousel-control math-carousel"
        : "note-carousel-control note-carousel";
  return (
    <div
      className={
        kind === "kids"
          ? "cards-carousel"
          : kind === "math"
            ? "math-card-carousel"
            : "note-carousel-shell"
      }
    >
      <button
        className={`${control}-prev`}
        type="button"
        aria-label="Previous card"
        disabled={index <= 0}
        onClick={() => move(-1)}
      >
        ←
      </button>
      <div
        className={
          kind === "kids"
            ? "kids-card-viewport"
            : kind === "math"
              ? "math-card-viewport"
              : "carousel-wrap"
        }
        ref={host}
        tabIndex={0}
        aria-label="学习卡片，可左右拖动或使用方向键翻页"
        onKeyDown={(e) => {
          if ((e.target as HTMLElement).closest("input,textarea,select,button"))
            return;
          if (e.key === "ArrowRight" && index < items.length - 1) {
            e.preventDefault();
            move(1);
          }
          if (e.key === "ArrowLeft" && index > 0) {
            e.preventDefault();
            move(-1);
          }
        }}
      />
      <button
        className={`${control}-next`}
        type="button"
        aria-label="Next card"
        disabled={index >= items.length - 1}
        onClick={() => move(1)}
      >
        →
      </button>
      {pages.map((page, i) =>
        createPortal(render(items[i], i), page, String(items[i].id)),
      )}
    </div>
  );
}
