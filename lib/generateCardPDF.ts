/**
 * Captures front and back card DOM nodes and exports a single A4 PDF.
 * Layout is aligned with the print preview composition in IDCardPreviewPage.
 */

export interface GenerateCardPDFOptions {
  frontEl: HTMLElement;
  backEl: HTMLElement;
  filename?: string;
  memberName?: string;
  showCropMarks?: boolean;
}

const A4_W = 210;
const A4_H = 297;
const MARGIN = 14;
const CARD_W_MM = 85.6;
const CARD_H_MM = 53.98;
const GAP_MM = 12;
const SCALE = 3;

const HEADER_TEXT_Y = 8;
const HEADER_LINE_Y = 10;
const FOOTER_LINE_Y = A4_H - 14;
const FOOTER_TEXT_Y = A4_H - 11;
const CONTENT_TOP_SAFE_Y = 20;
const CONTENT_BOTTOM_SAFE_Y = A4_H - 24;

const UNSUPPORTED_COLOR_RE = /(?:oklch|oklab|lab|lch|color-mix|color)\s*\(/i;

const FALLBACK: Record<string, string> = {
  background: "#ffffff",
  "background-color": "#ffffff",
  color: "#1e293b",
  "border-color": "#e2e8f0",
  "border-top-color": "#e2e8f0",
  "border-right-color": "#e2e8f0",
  "border-bottom-color": "#e2e8f0",
  "border-left-color": "#e2e8f0",
  "outline-color": "#e2e8f0",
  fill: "none",
  stroke: "#1e293b",
};

function rewriteUnsupportedColors(clonedDoc: Document): void {
  const props = Object.keys(FALLBACK);

  clonedDoc.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const computed = getComputedStyle(el);

    props.forEach((prop) => {
      const value = computed.getPropertyValue(prop);
      if (value && UNSUPPORTED_COLOR_RE.test(value)) {
        el.style.setProperty(prop, FALLBACK[prop] ?? "transparent", "important");
      }
    });

    const inlineStyle = el.getAttribute("style") ?? "";
    if (UNSUPPORTED_COLOR_RE.test(inlineStyle)) {
      const cleaned = inlineStyle.replace(
        /:\s*(?:oklch|oklab|lab|lch|color-mix|color)\s*\([^)]*\)/gi,
        ": transparent"
      );
      el.setAttribute("style", cleaned);
    }
  });

  clonedDoc.querySelectorAll<HTMLStyleElement>("style").forEach((styleEl) => {
    if (UNSUPPORTED_COLOR_RE.test(styleEl.textContent ?? "")) {
      styleEl.textContent = (styleEl.textContent ?? "").replace(
        /(?:oklch|oklab|lab|lch|color-mix|color)\s*\([^;{}]*/gi,
        "#1e293b"
      );
    }
  });
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const htmlImages = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    htmlImages.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    })
  );
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to convert image to data URL."));
    };
    reader.onerror = () => reject(new Error("Image read failed."));
    reader.readAsDataURL(blob);
  });
}

async function inlineExternalImagesForCapture(root: HTMLElement): Promise<() => void> {
  const images = Array.from(root.querySelectorAll("img"));
  const restorers: Array<() => void> = [];

  for (const image of images) {
    const src = image.getAttribute("src");
    if (!src || src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("/")) continue;
    if (!/^https?:\/\//i.test(src)) continue;

    try {
      const proxied = await fetch(`/api/id-cards/image-proxy?src=${encodeURIComponent(src)}`, {
        cache: "force-cache",
      });
      if (!proxied.ok) continue;
      const blob = await proxied.blob();
      const dataUrl = await blobToDataUrl(blob);
      const previous = image.src;
      image.src = dataUrl;
      restorers.push(() => {
        image.src = previous;
      });
    } catch {
      // keep original source if proxy/inlining fails
    }
  }

  return () => {
    restorers.forEach((restore) => restore());
  };
}

export async function generateCardPDF(options: GenerateCardPDFOptions): Promise<void> {
  const {
    frontEl,
    backEl,
    filename = "GSU-Alumni-ID-Card.pdf",
    memberName = "",
    showCropMarks = false,
  } = options;

  const [{ default: html2canvas }, jsPdfModule] = await Promise.all([import("html2canvas"), import("jspdf")]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const JsPDFCtor: any = (jsPdfModule as any).jsPDF ?? (jsPdfModule as any).default?.jsPDF ?? (jsPdfModule as any).default;
  if (typeof JsPDFCtor !== "function") {
    throw new Error("Could not resolve jsPDF constructor. Check your jspdf version.");
  }

  const captureOptions = {
    scale: SCALE,
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
    logging: false,
    foreignObjectRendering: false,
    onclone: (clonedDoc: Document) => {
      rewriteUnsupportedColors(clonedDoc);
    },
  };

  let frontCanvas: HTMLCanvasElement;
  let backCanvas: HTMLCanvasElement;
  let restoreFrontImages = () => {};
  let restoreBackImages = () => {};
  try {
    [restoreFrontImages, restoreBackImages] = await Promise.all([
      inlineExternalImagesForCapture(frontEl),
      inlineExternalImagesForCapture(backEl),
    ]);
    await Promise.all([waitForImages(frontEl), waitForImages(backEl)]);
    [frontCanvas, backCanvas] = await Promise.all([html2canvas(frontEl, captureOptions), html2canvas(backEl, captureOptions)]);
  } catch (error) {
    console.error("[generateCardPDF] html2canvas capture failed:", error);
    throw new Error("Failed while capturing card images. See console for details.");
  } finally {
    restoreFrontImages();
    restoreBackImages();
  }

  const pdf = new JsPDFCtor({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  pdf.setProperties({
    title: `GSU Alumni Identity Card - ${memberName}`,
    subject: "Gombe State University Alumni Association Member Identity Card",
    author: "GSU Alumni Connect",
    creator: "GSU Alumni Connect Platform",
  });

  const dateStr = new Date().toLocaleString("en-NG", {
    day: "2-digit",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  pdf.setFontSize(8);
  pdf.setTextColor(80, 80, 80);
  pdf.text(dateStr, MARGIN, HEADER_TEXT_Y);
  pdf.text("GSU Alumni Member Identity Card", A4_W / 2, HEADER_TEXT_Y, { align: "center" });
  pdf.text(dateStr, A4_W - MARGIN, HEADER_TEXT_Y, { align: "right" });
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.2);
  pdf.line(MARGIN, HEADER_LINE_Y, A4_W - MARGIN, HEADER_LINE_Y);

  const stackHeight = CARD_H_MM * 2 + GAP_MM;
  const centeredFrontY = (A4_H - stackHeight) / 2;
  const maxFrontY = CONTENT_BOTTOM_SAFE_Y - stackHeight;
  const frontY = Math.max(CONTENT_TOP_SAFE_Y, Math.min(maxFrontY, centeredFrontY));
  const backY = frontY + CARD_H_MM + GAP_MM;
  const cardX = (A4_W - CARD_W_MM) / 2;

  if (showCropMarks) {
    pdf.setDrawColor(150, 150, 150);
    pdf.setLineWidth(0.15);
    const cm = 3;
    ([[cardX, frontY], [cardX, backY]] as [number, number][]).forEach(([cx, cy]) => {
      ([
        [cx - cm, cy, cx, cy],
        [cx, cy - cm, cx, cy],
        [cx + CARD_W_MM, cy - cm, cx + CARD_W_MM, cy],
        [cx + CARD_W_MM, cy, cx + CARD_W_MM + cm, cy],
        [cx - cm, cy + CARD_H_MM, cx, cy + CARD_H_MM],
        [cx, cy + CARD_H_MM, cx, cy + CARD_H_MM + cm],
        [cx + CARD_W_MM, cy + CARD_H_MM, cx + CARD_W_MM, cy + CARD_H_MM + cm],
        [cx + CARD_W_MM, cy + CARD_H_MM, cx + CARD_W_MM + cm, cy + CARD_H_MM],
      ] as [number, number, number, number][]).forEach(([x1, y1, x2, y2]) => {
        pdf.line(x1, y1, x2, y2);
      });
    });
  }

  let frontImgData: string;
  let backImgData: string;
  try {
    frontImgData = frontCanvas.toDataURL("image/png");
    backImgData = backCanvas.toDataURL("image/png");
  } catch (error) {
    console.error("[generateCardPDF] canvas.toDataURL failed:", error);
    throw new Error("Failed while exporting card images. The card may contain cross-origin resources.");
  }

  pdf.addImage(frontImgData, "PNG", cardX, frontY, CARD_W_MM, CARD_H_MM, "front", "FAST");

  const midY = frontY + CARD_H_MM + GAP_MM / 2;
  pdf.setFontSize(6.5);
  pdf.setTextColor(160, 160, 160);
  pdf.text("FRONT SIDE", cardX + 2, midY - 0.5);
  pdf.text("BACK SIDE", cardX + 2, midY + 2.5);

  pdf.addImage(backImgData, "PNG", cardX, backY, CARD_W_MM, CARD_H_MM, "back", "FAST");

  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.2);
  pdf.line(MARGIN, FOOTER_LINE_Y, A4_W - MARGIN, FOOTER_LINE_Y);
  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text("Gombe State University Alumni Association  |  alumni.gsu.edu.ng", A4_W / 2, FOOTER_TEXT_Y, { align: "center" });
  pdf.text("Page 1/1", A4_W - MARGIN, FOOTER_TEXT_Y, { align: "right" });

  pdf.save(filename);
}

export function buildPDFFilename(fullName: string, alumniNo: string): string {
  const safeName = fullName.replace(/[^a-zA-Z\s]/g, "").trim().replace(/\s+/g, "-");
  const safeNo = alumniNo.replace(/[^a-zA-Z0-9]/g, "-");
  return `GSU-Alumni-ID-${safeName}-${safeNo}.pdf`;
}
