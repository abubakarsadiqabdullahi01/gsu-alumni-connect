import type { RankTier } from "./cardVectors";

export type { RankTier };

export interface AlumniCardData {
  fullName: string;
  alumniNo: string;
  stateOfOrigin: string;
  graduationYear: string;
  discipline: string;
  gender: "Male" | "Female";
  rank: RankTier;
  photo: string;
  signature?: string;
  qrValue: string;
  serialNumber: string;
  issuedYear: string;
  expiryLabel: "LIFETIME" | string;
}

export interface PrintMarkConfig {
  showMarks: boolean;
  bleedMm: number;
  cropLength: number;
}
