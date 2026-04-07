"use client";

import { useCallback, useRef, useState } from "react";
import { IDCardFront } from "./IDCardFront";
import { IDCardBack } from "./IDCardBack";
import { IDCardPrintFront, IDCardPrintBack } from "./IDCardPrintLayout";
import { AlumniCardData, RankTier } from "./types";
import { RANK_STYLES } from "./cardVectors";

type TabType = "front" | "back";

const SECURITY_TAGS = [
  "Guilloche Pattern",
  "UV Watermark",
  "Microprint Border",
  "Holographic Seal",
  "Smart Chip (ISO 7816)",
  "Magnetic Strip (ISO 7811)",
  "QR Verification",
  "Formatted Serial + Checksum",
  "Rank Status Badge",
  "Print Registration Marks",
];

interface IDCardPreviewPageProps {
  data: AlumniCardData;
}

async function triggerPDF(
  frontEl: HTMLElement,
  backEl: HTMLElement,
  memberName: string,
  alumniNo: string,
  cropMarks: boolean
): Promise<void> {
  const [{ generateCardPDF, buildPDFFilename }] = await Promise.all([import("@/lib/generateCardPDF")]);
  await generateCardPDF({
    frontEl,
    backEl,
    filename: buildPDFFilename(memberName, alumniNo),
    memberName,
    showCropMarks: cropMarks,
  });
}

export function IDCardPreviewPage({ data }: IDCardPreviewPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("front");
  const [isFlipped, setIsFlipped] = useState(false);
  const [showMarks, setShowMarks] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const frontCaptureRef = useRef<HTMLDivElement>(null);
  const backCaptureRef = useRef<HTMLDivElement>(null);

  const rankStyle = RANK_STYLES[data.rank as RankTier] ?? RANK_STYLES["Full Member"];

  function handleTabChange(tab: TabType) {
    setActiveTab(tab);
    if (tab === "back" && !isFlipped) setIsFlipped(true);
    if (tab === "front" && isFlipped) setIsFlipped(false);
  }

  const handleDownloadPDF = useCallback(async () => {
    if (!frontCaptureRef.current || !backCaptureRef.current) {
      setPdfError("Card not ready. Please wait and try again.");
      return;
    }
    setIsGenerating(true);
    setPdfError(null);
    try {
      await triggerPDF(frontCaptureRef.current, backCaptureRef.current, data.fullName, data.alumniNo, showMarks);
    } catch (error) {
      console.error("[IDCardPreviewPage] PDF generation failed:", error);
      const message = error instanceof Error ? error.message : "PDF generation failed. Please try again.";
      setPdfError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [data, showMarks]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;700;900&family=Inter:wght@400;500;600;700;800&display=swap');

        @media print {
          @page { size: A4 portrait; margin: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          body { background: white !important; margin: 0; }

          body * {
            visibility: hidden !important;
          }

          .print-only,
          .print-only * {
            visibility: visible !important;
          }

          .no-print { display: none !important; }
          .print-only {
            display: block !important;
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: auto !important;
            height: auto !important;
          }

          .print-layout {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 210mm;
            height: 297mm;
            background: white;
            position: fixed;
            inset: 0;
            z-index: 99999;
            margin: 0 auto;
            box-sizing: border-box;
          }
          .print-header {
            position: absolute;
            top: 8mm;
            left: 0;
            right: 0;
            width: 100%;
            border-bottom: 0.2mm solid #cbd5e1;
            padding-bottom: 2mm;
            font-size: 8pt;
            color: #4b5563;
            text-align: center;
          }
          .print-card-stack {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12mm;
          }
          .print-card-face {
            width: 85.6mm;
            overflow: hidden;
            border-radius: 3mm;
          }
          .print-footer {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 8mm;
            text-align: center;
            border-top: 0.2mm solid #cbd5e1;
            padding-top: 2mm;
            font-size: 7pt;
            color: #6b7280;
          }

          .print-card-face,
          .print-card-face * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          .print-card-face svg,
          .print-card-face svg * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }

        .print-only {
          position: fixed;
          left: -9999px;
          top: -9999px;
          display: block;
        }
        .studio-bg { background: radial-gradient(ellipse at 30% 20%, #0d2414 0%, #060e06 60%, #020802 100%); }
        .flip-scene { perspective: 1200px; }
        .flip-card { transform-style: preserve-3d; transition: transform 0.65s cubic-bezier(0.4, 0, 0.2, 1); position: relative; }
        .flip-card.flipped { transform: rotateY(180deg); }
        .flip-face { backface-visibility: hidden; position: absolute; inset: 0; }
        .flip-back { transform: rotateY(180deg); }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        .status-dot { animation: pulse 2s ease-in-out infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin .8s linear infinite;
          display: inline-block;
        }
      `}</style>

      <IDCardPrintFront ref={frontCaptureRef} data={data} />
      <IDCardPrintBack ref={backCaptureRef} data={data} />

      <div className="print-only print-layout">
        <div className="print-header">GSU Alumni Member Identity Card - {data.fullName}</div>
        <div className="print-card-stack">
          <div className="print-card-face">
            <IDCardFront data={data} showMarks={showMarks} />
          </div>
          <div className="print-card-face">
            <IDCardBack data={data} showMarks={showMarks} />
          </div>
        </div>
        <div className="print-footer">Gombe State University Alumni Association • alumni.gsu.edu.ng</div>
      </div>

      <div className="studio-bg no-print min-h-screen px-4 py-10" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <div
              className="mb-4 inline-flex items-center gap-2"
              style={{
                background: "rgba(26,92,58,0.2)",
                border: "1px solid rgba(76,175,80,0.25)",
                borderRadius: 20,
                padding: "5px 16px",
                fontSize: 11,
                letterSpacing: "0.18em",
                color: "#81c784",
                textTransform: "uppercase",
              }}
            >
              <span className="status-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#4caf50", display: "inline-block" }} />
              ID Card Template Engine v2.0 • GSU Alumni Association
            </div>
            <h1
              style={{
                fontSize: "clamp(22px, 4vw, 36px)",
                fontWeight: 800,
                fontFamily: "'Oswald', sans-serif",
                background: "linear-gradient(135deg, #66bb6a, #c8e6c9, #a5d6a7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "0.04em",
                marginBottom: 6,
              }}
            >
              ALUMNI MEMBER ID CARD
            </h1>
            <p style={{ color: "#558b5c", fontSize: 14 }}>
              Premium security-grade credential • Print-ready CR-80 format
            </p>
            <div style={{ marginTop: 12 }}>
              <a
                href="/profile"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(76,175,80,0.3)",
                  background: "rgba(26,92,58,0.2)",
                  color: "#81c784",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textDecoration: "none",
                }}
              >
                Back to Profile
              </a>
            </div>
          </div>

          <div className="flex flex-col items-start justify-center gap-8 lg:flex-row">
            <div className="min-w-0 flex-1">
              <div
                className="mb-6 flex gap-0"
                style={{
                  border: "1px solid rgba(76,175,80,0.2)",
                  borderRadius: 10,
                  overflow: "hidden",
                  display: "inline-flex",
                }}
              >
                {(["front", "back"] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    style={{
                      padding: "9px 28px",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      background: activeTab === tab ? "#1a5c3a" : "transparent",
                      color: activeTab === tab ? "#fff" : "#558b5c",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {tab === "front" ? "Front" : "Back"}
                  </button>
                ))}
              </div>

              <div style={{ position: "relative", padding: showMarks ? "24px" : "0" }}>
                <div className="flip-scene" onClick={() => setIsFlipped(!isFlipped)} style={{ cursor: "pointer" }}>
                  <div style={{ position: "relative", paddingBottom: "63.1%" }}>
                    <div className={`flip-card ${isFlipped ? "flipped" : ""}`} style={{ position: "absolute", inset: 0 }}>
                      <div
                        className="flip-face"
                        style={{
                          borderRadius: 16,
                          overflow: "hidden",
                          boxShadow: "0 0 0 1px rgba(76,175,80,.2),0 24px 80px rgba(0,0,0,.7)",
                        }}
                      >
                        <IDCardFront data={data} showMarks={showMarks} />
                      </div>
                      <div
                        className="flip-face flip-back"
                        style={{
                          borderRadius: 16,
                          overflow: "hidden",
                          boxShadow: "0 0 0 1px rgba(76,175,80,.2),0 24px 80px rgba(0,0,0,.7)",
                        }}
                      >
                        <IDCardBack data={data} showMarks={showMarks} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <span style={{ fontSize: 11, color: "#558b5c", display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: "1px solid #558b5c",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                    }}
                  >
                    ↺
                  </span>
                  Click card to flip
                </span>

                <div className="flex flex-wrap items-center gap-3">
                  <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 12, color: "#558b5c" }}>
                    <input type="checkbox" checked={showMarks} onChange={(e) => setShowMarks(e.target.checked)} style={{ accentColor: "#1a5c3a" }} />
                    Crop marks
                  </label>

                  <button
                    onClick={() => window.print()}
                    style={{
                      padding: "8px 18px",
                      fontSize: 12,
                      fontWeight: 600,
                      background: "transparent",
                      color: "#81c784",
                      border: "1px solid rgba(76,175,80,0.3)",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Print
                  </button>

                  <button
                    onClick={handleDownloadPDF}
                    disabled={isGenerating}
                    style={{
                      padding: "9px 22px",
                      fontSize: 13,
                      fontWeight: 700,
                      background: isGenerating ? "#0f3d26" : "#1a5c3a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: isGenerating ? "not-allowed" : "pointer",
                      letterSpacing: "0.04em",
                      boxShadow: isGenerating ? "none" : "0 4px 16px rgba(26,92,58,.5)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {isGenerating ? (
                      <>
                        <span className="spinner" /> Generating PDF...
                      </>
                    ) : (
                      "Download PDF"
                    )}
                  </button>
                </div>
              </div>

              {pdfError ? (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 14px",
                    background: "rgba(180,30,30,0.15)",
                    border: "1px solid rgba(200,50,50,0.3)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#ef9a9a",
                  }}
                >
                  {pdfError}
                </div>
              ) : null}

              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 10, color: "#558b5c", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>
                  Security Features
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SECURITY_TAGS.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.06em",
                        color: "#558b5c",
                        background: "rgba(26,92,58,0.2)",
                        border: "1px solid rgba(76,175,80,0.18)",
                        borderRadius: 4,
                        padding: "4px 10px",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ width: "100%", maxWidth: 300 }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(76,175,80,0.18)",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "rgba(26,92,58,0.3)",
                    borderBottom: "1px solid rgba(76,175,80,0.15)",
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="status-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#4caf50", display: "inline-block" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#81c784", textTransform: "uppercase" }}>
                      Active Record
                    </span>
                  </div>
                  <button onClick={() => setShowDetails(!showDetails)} style={{ background: "none", border: "none", cursor: "pointer", color: "#558b5c", fontSize: 14 }}>
                    {showDetails ? "▲" : "▼"}
                  </button>
                </div>

                {showDetails ? (
                  <div style={{ padding: 18 }}>
                    <div
                      style={{
                        background: rankStyle.bg,
                        border: `1px solid ${rankStyle.border}`,
                        borderRadius: 8,
                        padding: "10px 14px",
                        marginBottom: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        boxShadow: "0 0 16px rgba(26,92,58,.4)",
                      }}
                    >
                      <span style={{ fontSize: 18 }}>✦</span>
                      <div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                          Membership Rank
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: rankStyle.text, letterSpacing: "0.08em" }}>{rankStyle.label}</div>
                      </div>
                    </div>

                    {[
                      { label: "Full Name", value: data.fullName },
                      { label: "Membership Number", value: data.alumniNo, mono: true },
                      { label: "Discipline", value: data.discipline },
                      { label: "Year of Graduation", value: data.graduationYear },
                      { label: "State of Origin", value: data.stateOfOrigin },
                      { label: "Gender", value: data.gender },
                      { label: "Serial Number", value: data.serialNumber, mono: true },
                      { label: "Issued / Expires", value: `${data.issuedYear} / ${data.expiryLabel}` },
                    ].map(({ label, value, mono }) => (
                      <div
                        key={label}
                        style={{
                          padding: "9px 0",
                          borderBottom: "1px solid rgba(76,175,80,0.08)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                        }}
                      >
                        <span style={{ fontSize: 10, color: "#558b5c", letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</span>
                        <span
                          style={{
                            fontSize: mono ? 12 : 14,
                            fontFamily: mono ? "monospace" : "inherit",
                            color: mono ? "#80cbc4" : "#c8e6c9",
                            fontWeight: 500,
                            letterSpacing: mono ? "0.05em" : 0,
                            wordBreak: "break-all",
                          }}
                        >
                          {value}
                        </span>
                      </div>
                    ))}

                    <button
                      onClick={handleDownloadPDF}
                      disabled={isGenerating}
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: 14,
                        padding: "9px 0",
                        textAlign: "center",
                        background: "#1a5c3a",
                        border: "1px solid rgba(76,175,80,0.3)",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#fff",
                        cursor: isGenerating ? "not-allowed" : "pointer",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {isGenerating ? "Generating..." : "Download PDF"}
                    </button>

                    <a
                      href={data.qrValue}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "block",
                        marginTop: 8,
                        textAlign: "center",
                        padding: "9px 0",
                        background: "rgba(26,92,58,0.2)",
                        border: "1px solid rgba(76,175,80,0.15)",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#81c784",
                        textDecoration: "none",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Verify Online
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
