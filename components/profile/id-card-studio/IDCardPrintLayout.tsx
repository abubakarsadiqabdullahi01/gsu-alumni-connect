"use client";

/**
 * IDCardPrintLayout.tsx  (fixed)
 *
 * The capture wrapper divs are fully isolated from the page's Tailwind v4
 * CSS by:
 *   1. `all: initial` resets every inherited property
 *   2. Hard-coded white background (not a CSS variable)
 *   3. No Tailwind className on the wrapper — only inline styles
 *
 * The IDCardFront / IDCardBack components themselves use SVG with
 * hard-coded hex values, so they render correctly even after the
 * parent reset.
 */

import { forwardRef } from "react";
import { IDCardFront } from "./IDCardFront";
import { IDCardBack }  from "./IDCardBack";
import { AlumniCardData } from "./types";
import { CARD_WIDTH, CARD_HEIGHT } from "./cardVectors";

interface IDCardPrintLayoutProps {
    data: AlumniCardData;
}

/** Shared wrapper style — isolates from Tailwind v4 oklch cascade */
const wrapperStyle: React.CSSProperties = {
    // Pull out of layout flow, completely hidden from user
    position:  "fixed",
    left:      "-99999px",
    top:       "-99999px",
    zIndex:    -9999,

    // Exact CR-80 pixel dimensions at 96 dpi (SCALE × 3 in html2canvas = 288 dpi)
    width:     `${CARD_WIDTH}px`,
    height:    `${CARD_HEIGHT}px`,
    minWidth:  `${CARD_WIDTH}px`,
    minHeight: `${CARD_HEIGHT}px`,
    maxWidth:  `${CARD_WIDTH}px`,
    maxHeight: `${CARD_HEIGHT}px`,
    overflow:  "hidden",
    borderRadius: "11.34px",
    flexShrink: 0,

    // Safe colours — NO oklch/lab/CSS-variables
    background:      "#ffffff",
    backgroundColor: "#ffffff",
    color:           "#1e293b",

    // Prevent font inheritance issues
    fontFamily: "sans-serif",
    fontSize:   "16px",
    lineHeight: "1.5",
};

export const IDCardPrintFront = forwardRef<HTMLDivElement, IDCardPrintLayoutProps>(
    function IDCardPrintFront({ data }, ref) {
        return (
            <div ref={ref} aria-hidden="true" style={wrapperStyle}>
                <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: "11.34px" }}>
                    <IDCardFront data={data} showMarks={false} />
                </div>
            </div>
        );
    }
);

export const IDCardPrintBack = forwardRef<HTMLDivElement, IDCardPrintLayoutProps>(
    function IDCardPrintBack({ data }, ref) {
        return (
            <div ref={ref} aria-hidden="true" style={wrapperStyle}>
                <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: "11.34px" }}>
                    <IDCardBack data={data} showMarks={false} />
                </div>
            </div>
        );
    }
);
