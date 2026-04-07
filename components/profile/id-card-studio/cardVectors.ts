export type RankTier =
  | "Fellow"
  | "Associate Fellow"
  | "Full Member"
  | "Associate Member"
  | "Executive Member"
  | "Student Member";

export const CARD_WIDTH = 1011;
export const CARD_HEIGHT = 635;

export const RANK_STYLES: Record<RankTier, { bg: string; text: string; border: string; label: string }> = {
  Fellow: { bg: "#7b1a1a", text: "#fff", border: "#c9a84c", label: "FELLOW" },
  "Associate Fellow": { bg: "#6b4c11", text: "#fff", border: "#c9a84c", label: "ASSOC. FELLOW" },
  "Executive Member": { bg: "#0a4d8b", text: "#fff", border: "#64b5f6", label: "EXECUTIVE MEMBER" },
  "Full Member": { bg: "#1a5c3a", text: "#fff", border: "#81c784", label: "FULL MEMBER" },
  "Associate Member": { bg: "#0a9396", text: "#fff", border: "#4dd0e1", label: "ASSOCIATE MEMBER" },
  "Student Member": { bg: "#455a64", text: "#fff", border: "#90a4ae", label: "STUDENT MEMBER" },
};

export const cardVectors = {
  cardWidth: CARD_WIDTH,
  cardHeight: CARD_HEIGHT,
  front: {
    idBadge: { x: 830, y: 60, fontSize: 10, paddingH: 14, paddingV: 7 },
    photoX: 93,
    photoY: 295,
    photoRadius: 105,
    rankPill: { x: 108, y: 545, fontSize: 18, paddingH: 8, paddingV: 8 },
    chip: { x: 870, y: 270, width: 75, height: 55 },
    fullName: { x: 390, y: 300, fontSize: 28, fontWeight: 700, maxWidth: 390 },
    nameDivider: { x1: 330, y1: 310, x2: 800, y2: 310 },
    alumniNo: { x: 335, y: 382, fontSize: 20, label: "MEMBERSHIP NUMBER"},
    graduationYear: { x: 700, y: 382, fontSize: 20, label: "YEAR OF GRADUATION" },
    discipline: { x: 335, y: 478, fontSize: 20, label: "DISCIPLINE" },
    gender: { x: 700, y: 478, fontSize: 20, label: "GENDER" },
    qrX: 800,
    qrY: 450,
    qrSize: 110,
    holoX: 550,
    holoY: 530,
    holoR: 32,
    cardholderSig: { x1: 90, y1: 580, x2: 320, y2: 580, labelX: 200, labelY: 595, imageHeight: 60, imageOffsetY: 65 },
    borderInset: 10,
    cornerSquares: [
      { x: 40, y: 480, size: 14 },
      { x: 68, y: 480, size: 10 },
      { x: 40, y: 500, size: 10 },
      { x: 960, y: 480, size: 14 },
      { x: 946, y: 480, size: 10 },
      { x: 960, y: 500, size: 10 },
    ],
  },
  back: {
    magStripe: { y: 510, height: 55 },
    sigText: { x: 510, y: 605, fontSize: 13, letterSpacing: 2, fontWeight: 700 },
    stateOfOrigin: { x: 310, y: 550, labelFontSize: 9, valueFontSize: 15, label: "STATE OF ORIGIN" },
    issuedExpiry: { x: 690, y: 550, labelFontSize: 9, valueFontSize: 14, label: "ISSUED / EXPIRES" },
    noteBlock: {
      x: 120,
      y: 300,
      width: 580,
      height: 180,
      textX: 120,
      textY: 310,
      lineGap: 35,
      headingFontSize: 23,
      bodyFontSize: 17,
      headingWeight: 800,
      bodyWeight: 600,
      emphasisWeight: 700,
    },
    divider1: { x1: 80, y1: 410, x2: 930, y2: 410 },
    divider2: { x1: 80, y1: 420, x2: 930, y2: 420 },
    authorisedSig: { x1: 580, y1: 530, x2: 930, y2: 530, labelX: 755, labelY: 548 },
    cornerSquares: [
      { x: 100, y: 35, size: 14 },
      { x: 138, y: 55, size: 10 },
      { x: 140, y: 85, size: 14 },
      { x: 80, y: 55, size: 10 },
    ],
  },
} as const;
