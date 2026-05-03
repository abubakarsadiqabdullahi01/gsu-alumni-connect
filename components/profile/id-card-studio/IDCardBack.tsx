"use client";

import Image from "next/image";
import { AlumniCardData } from "./types";
import { cardVectors, CARD_WIDTH, CARD_HEIGHT } from "./cardVectors";
import {
  GuillochePattern,
  GuillocheLayer,
  WatermarkLayer,
  MicroprintBorder,
  HologramSticker,
  PrintRegistrationMarks,
} from "./SecurityPrimitives";

const { back: B } = cardVectors;

interface IDCardBackProps {
  data: AlumniCardData;
  showMarks?: boolean;
}

export function IDCardBack({ data, showMarks = false }: IDCardBackProps) {
  const aspectRatio = (CARD_HEIGHT / CARD_WIDTH) * 100;

  return (
    <div className="relative w-full" style={{ maxWidth: `${CARD_WIDTH}px`, margin: "0 auto" }}>
      <div className="relative" style={{ paddingBottom: `${aspectRatio.toFixed(1)}%` }}>
        <Image src="/images/id-card-template/Back-ID.png" alt="ID Card Back background" fill className="object-cover" priority />

        <svg className="absolute inset-0" viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`} preserveAspectRatio="none">
          <GuillochePattern id="back_g" />
          <GuillocheLayer id="back_g" />
          <WatermarkLayer />
          <MicroprintBorder inset={10} />

          <rect x={0} y={0} width={CARD_WIDTH} height={22} fill="url(#top_bar_back)" />
          <defs>
            <linearGradient id="top_bar_back" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1a5c3a" />
              <stop offset="50%" stopColor="#0a9396" />
              <stop offset="100%" stopColor="#1a5c3a" />
            </linearGradient>
          </defs>
          <rect x={0} y={CARD_HEIGHT - 24} width={CARD_WIDTH} height={24} fill="#1a5c3a" />
          <text x={CARD_WIDTH / 2} y={CARD_HEIGHT - 8} textAnchor="middle" fontSize={5.5} fontFamily="monospace" fill="rgba(255,255,255,0.55)" letterSpacing={2.5}>
            THIS CARD REMAINS THE PROPERTY OF GSU ALUMNI ASSOCIATION • IF FOUND PLEASE RETURN TO THE NEAREST GSU OFFICE
          </text>

          {/*<rect x={0} y={B.magStripe.y} width={CARD_WIDTH} height={B.magStripe.height} fill="url(#mag_grad)" />*/}
          <defs>
            <linearGradient id="mag_grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="45%" stopColor="#0d0d0d" />
              <stop offset="100%" stopColor="#1a1a1a" />
            </linearGradient>
          </defs>

          <defs>
            <linearGradient id="sig_grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f7f7f7" />
              <stop offset="100%" stopColor="#ededed" />
            </linearGradient>
          </defs>
          <text
            x={B.sigText.x}
            y={B.sigText.y}
            fontSize={B.sigText.fontSize}
            fontFamily="Oswald, sans-serif"
            fontWeight={B.sigText.fontWeight}
            fill="#0f5132"
            textAnchor="middle"
            dominantBaseline="middle"
            letterSpacing={B.sigText.letterSpacing}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={0.2}
          >
            {data.serialNumber}
          </text>

          {/* Professional legal/emergency note panel */}

          <text x={B.noteBlock.textX} y={B.noteBlock.textY} fontSize={B.noteBlock.bodyFontSize} fontFamily="Inter, sans-serif" fontWeight={B.noteBlock.bodyWeight} fill="#334155">
            <tspan x={B.noteBlock.textX} dy="8" fontSize={B.noteBlock.headingFontSize} fontWeight={B.noteBlock.headingWeight}>
              Emergency NOK: 08131381023
            </tspan>
            <tspan x={B.noteBlock.textX} dy={55} fontWeight={B.noteBlock.emphasisWeight}>
              This card is personal and non-transferable. Alteration, erasure, or misuse renders it invalid.
            </tspan>
            <tspan x={B.noteBlock.textX} dy={B.noteBlock.lineGap}>
              Loss should be reported immediately to GSU Alumni National Secretariat:
            </tspan>
            <tspan x={B.noteBlock.textX} dy={B.noteBlock.lineGap} fontWeight={B.noteBlock.emphasisWeight}>
              08163667912, 08052495302, or nearest Police Station.
            </tspan>
          </text>

          <text x={B.stateOfOrigin.x} y={B.stateOfOrigin.y - 14} fontSize={B.stateOfOrigin.labelFontSize} fontFamily="Inter, sans-serif" fill="#8a8a8a" letterSpacing={1.8}>
            {B.stateOfOrigin.label}
          </text>
          <text x={B.stateOfOrigin.x} y={B.stateOfOrigin.y} fontSize={B.stateOfOrigin.valueFontSize} fontFamily="Inter, sans-serif" fontWeight="600" fill="#333333" dominantBaseline="middle">
            {data.stateOfOrigin}
          </text>

          <HologramSticker cx={500} cy={530} r={30} />
          {B.cornerSquares.map((sq, i) => (
            <rect key={i} x={sq.x} y={sq.y} width={sq.size} height={sq.size} fill="none" stroke="#1a5c3a" strokeWidth={1.5} rx={2} opacity={0.4} />
          ))}
          {showMarks ? <PrintRegistrationMarks /> : null}
        </svg>
      </div>
    </div>
  );
}
