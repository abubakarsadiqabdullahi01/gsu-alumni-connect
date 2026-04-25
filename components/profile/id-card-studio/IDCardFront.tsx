"use client";

import Image from "next/image";
import QRCode from "react-qr-code";
import { AlumniCardData } from "./types";
import { cardVectors, CARD_WIDTH, CARD_HEIGHT } from "./cardVectors";
import {
  GuillochePattern,
  GuillocheLayer,
  WatermarkLayer,
  MicroprintBorder,
  HologramSticker,
  SmartChip,
  QRFrame,
  PrintRegistrationMarks,
} from "./SecurityPrimitives";

const { front: F } = cardVectors;

function DetailField({
  label,
  value,
  x,
  y,
  accent,
  labelFontSize = 11,
  valueFontSize = 14,
  labelOffset = 20,
}: {
  label: string;
  value: string;
  x: number;
  y: number;
  accent?: boolean;
  labelFontSize?: number;
  valueFontSize?: number;
  labelOffset?: number;
}) {
  return (
    <>
      <text
        x={x}
        y={y - labelOffset}
        fontSize={labelFontSize}
        fontFamily="Inter, sans-serif"
        fontWeight="700"
        fill="#4b5563"
        letterSpacing={1.2}
        textAnchor="start"
      >
        {label}
      </text>
      <text
        x={x}
        y={y}
        fontSize={accent ? Math.max(valueFontSize, 16) : valueFontSize}
        fontFamily="Inter, sans-serif"
        fontWeight={accent ? "800" : "600"}
        fill={accent ? "#0a9396" : "#333333"}
        textAnchor="start"
        dominantBaseline="middle"
      >
        {value}
      </text>
    </>
  );
}

interface IDCardFrontProps {
  data: AlumniCardData;
  showMarks?: boolean;
}

export function IDCardFront({ data, showMarks = false }: IDCardFrontProps) {
  const aspectRatio = (CARD_HEIGHT / CARD_WIDTH) * 100;
  const defaultPhoto = "/images/developer.jpeg";
  const defaultSignature = "/images/Signature.png";

  return (
    <div className="relative w-full" style={{ maxWidth: `${CARD_WIDTH}px`, margin: "0 auto" }}>
      <div className="relative" style={{ paddingBottom: `${aspectRatio.toFixed(1)}%` }}>
        <Image src="/images/id-card-template/Front-ID.png" alt="ID Card Front background" fill className="object-cover" priority />
        <div
          className="absolute flex items-center justify-center overflow-hidden rounded-full"
          style={{
            left: `${(F.photoX / CARD_WIDTH) * 100}%`,
            top: `${(F.photoY / CARD_HEIGHT) * 100}%`,
            width: `${((F.photoRadius * 2) / CARD_WIDTH) * 100}%`,
            aspectRatio: "1 / 1",
            zIndex: 2,
          }}
        >
          <img
            src={data.photo || defaultPhoto}
            alt={data.fullName}
            className="h-full w-full object-cover"
            style={{ objectPosition: "center center" }}
            onError={(event) => {
              event.currentTarget.src = defaultPhoto;
            }}
          />
        </div>

        <svg className="absolute inset-0" viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`} preserveAspectRatio="none" aria-label={`GSU Alumni ID Card — ${data.fullName}`}>
          <GuillochePattern id="front_g" />
          <defs>
            <mask id="photo_mask">
              <circle cx={F.photoX + F.photoRadius} cy={F.photoY + F.photoRadius} r={F.photoRadius} fill="white" />
            </mask>
          </defs>

          <GuillocheLayer id="front_g" />
          <WatermarkLayer />

          <rect x={0} y={0} width={CARD_WIDTH} height={18} fill="url(#top_bar)" />
          <defs>
            <linearGradient id="top_bar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1a5c3a" />
              <stop offset="30%" stopColor="#2e7d52" />
              <stop offset="50%" stopColor="#0a9396" />
              <stop offset="70%" stopColor="#2e7d52" />
              <stop offset="100%" stopColor="#1a5c3a" />
            </linearGradient>
          </defs>

          <rect x={0} y={CARD_HEIGHT - 24} width={CARD_WIDTH} height={24} fill="#1a5c3a" />
          <text x={CARD_WIDTH / 2} y={CARD_HEIGHT - 8} textAnchor="middle" fontSize={7} fontFamily="monospace" fill="rgba(255,255,255,0.55)" letterSpacing={3}>
            GSU ALUMNI ASSOCIATION • PRIMUS INTERPARES • UPLIFTING THE IDEAS OF GSU • AUTHORIZED MEMBER
          </text>

          <MicroprintBorder inset={F.borderInset} />

          <circle cx={F.photoX + F.photoRadius} cy={F.photoY + F.photoRadius} r={F.photoRadius + 2} fill="none" stroke="#1a5c3a" strokeWidth={3} />
          <circle cx={F.photoX + F.photoRadius} cy={F.photoY + F.photoRadius} r={F.photoRadius + 7} fill="none" stroke="#c9a84c" strokeWidth={1} opacity={0.6} />

          {/*<rect x={F.rankPill.x} y={F.rankPill.y - F.rankPill.paddingV - 9} width={170} height={30} rx={15} fill={rankStyle.bg} stroke={rankStyle.border} strokeWidth={2} />*/}
          {/*<text x={F.rankPill.x + 85} y={F.rankPill.y} fontSize={F.rankPill.fontSize} fontFamily="Inter, sans-serif" fontWeight="800" fill={rankStyle.text} textAnchor="middle" dominantBaseline="middle" letterSpacing={1.5}>*/}
          {/*  {rankStyle.label}*/}
          {/*</text>*/}

          <SmartChip x={F.chip.x} y={F.chip.y} w={F.chip.width} h={F.chip.height} />

          <text
            x={F.fullName.x}
            y={F.fullName.y}
            fontSize={F.fullName.fontSize}
            fontFamily="Oswald, sans-serif"
            fontWeight={F.fullName.fontWeight}
            fill="#1a5c3a"
            textAnchor="start"
            dominantBaseline="middle"
            textLength={F.fullName.maxWidth}
            lengthAdjust="spacingAndGlyphs"
          >
            {data.fullName.toUpperCase()}
          </text>

          <DetailField
            label={F.alumniNo.label}
            value={data.alumniNo}
            x={F.alumniNo.x}
            y={F.alumniNo.y}
            valueFontSize={F.alumniNo.fontSize}
            labelFontSize={15}
            labelOffset={25}
            accent
          />
          <DetailField
            label={F.graduationYear.label}
            value={data.graduationYear}
            x={F.graduationYear.x}
            y={F.graduationYear.y}
            valueFontSize={F.graduationYear.fontSize}
            labelFontSize={15}
            labelOffset={25}
          />
          <DetailField
            label={F.discipline.label}
            value={data.discipline}
            x={F.discipline.x}
            y={F.discipline.y}
            valueFontSize={F.discipline.fontSize}
            labelFontSize={15}
            labelOffset={25}
          />
          <DetailField
            label={F.gender.label}
            value={data.gender}
            x={F.gender.x}
            y={F.gender.y}
            valueFontSize={F.gender.fontSize}
            labelFontSize={15}
            labelOffset={25}
          />

          <HologramSticker cx={F.holoX} cy={F.holoY + 28} r={F.holoR} />
          <QRFrame x={F.qrX} y={F.qrY} size={F.qrSize} />

          {/* Cardholder signature block on front (position via cardVectors.front.cardholderSig) */}
          <line
            x1={F.cardholderSig.x1}
            y1={F.cardholderSig.y1}
            x2={F.cardholderSig.x2}
            y2={F.cardholderSig.y2}
            stroke="#1a5c3a"
            strokeWidth={0.9}
          />
          <text
            x={F.cardholderSig.labelX}
            y={F.cardholderSig.labelY}
            textAnchor="middle"
            fontSize={8}
            fontFamily="Inter, sans-serif"
            fill="#6b7280"
            letterSpacing={1.5}
          >
            HOLDER&apos;S SIGNATURE
          </text>

          {F.cornerSquares.map((sq, i) => (
            <rect key={i} x={sq.x} y={sq.y} width={sq.size} height={sq.size} fill="none" stroke="#1a5c3a" strokeWidth={1.5} rx={2} opacity={0.45 + (i % 2) * 0.15} />
          ))}

          {showMarks ? <PrintRegistrationMarks /> : null}
        </svg>

        <div
          className="absolute"
          style={{
            left: `${(F.cardholderSig.x1 / CARD_WIDTH) * 100}%`,
            top: `${((F.cardholderSig.y1 - F.cardholderSig.imageOffsetY) / CARD_HEIGHT) * 100}%`,
            width: `${(((F.cardholderSig.x2 - F.cardholderSig.x1) / CARD_WIDTH) * 100).toFixed(4)}%`,
            height: `${((F.cardholderSig.imageHeight / CARD_HEIGHT) * 100).toFixed(4)}%`,
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          <img
            src={data.signature || defaultSignature}
            alt="Cardholder signature"
            className="h-full w-full object-contain"
            onError={(event) => {
              event.currentTarget.src = defaultSignature;
            }}
          />
        </div>

        <div
          className="absolute"
          style={{
            left: `${(F.qrX / CARD_WIDTH) * 100}%`,
            top: `${(F.qrY / CARD_HEIGHT) * 100}%`,
            width: `${(F.qrSize / CARD_WIDTH) * 100}%`,
            aspectRatio: "1",
          }}
        >
          <QRCode value={data.qrValue} size={F.qrSize} level="M" bgColor="#ffffff" fgColor="#1a5c3a" className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
