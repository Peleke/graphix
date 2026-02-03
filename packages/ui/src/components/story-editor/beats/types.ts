/**
 * Beat type definitions for story beat CRUD operations
 */

export type BeatType =
  | "setup"
  | "inciting"
  | "rising"
  | "midpoint"
  | "complication"
  | "crisis"
  | "climax"
  | "resolution"
  | "denouement";

export type CameraAngle =
  | "wide"
  | "medium"
  | "close-up"
  | "extreme close-up"
  | "over-the-shoulder"
  | "bird's eye"
  | "low angle"
  | "dutch angle";

export interface Beat {
  id: string;
  storyId: string;
  position: number;
  beatType: BeatType | null;
  visualDescription: string;
  emotionalTone: string | null;
  narration: string | null;
  sfx: string | null;
  cameraAngle: CameraAngle | null;
  panelId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBeatInput {
  storyId: string;
  beatType?: BeatType | null;
  visualDescription: string;
  emotionalTone?: string | null;
  narration?: string | null;
  sfx?: string | null;
  cameraAngle?: CameraAngle | null;
  position?: number;
}

export interface UpdateBeatInput {
  id: string;
  beatType?: BeatType | null;
  visualDescription?: string;
  emotionalTone?: string | null;
  narration?: string | null;
  sfx?: string | null;
  cameraAngle?: CameraAngle | null;
}

export interface ReorderBeatsInput {
  storyId: string;
  beatIds: string[];
}

export const BEAT_TYPES: BeatType[] = [
  "setup",
  "inciting",
  "rising",
  "midpoint",
  "complication",
  "crisis",
  "climax",
  "resolution",
  "denouement",
];

export const CAMERA_ANGLES: CameraAngle[] = [
  "wide",
  "medium",
  "close-up",
  "extreme close-up",
  "over-the-shoulder",
  "bird's eye",
  "low angle",
  "dutch angle",
];

export const BEAT_TYPE_LABELS: Record<BeatType, string> = {
  setup: "Setup",
  inciting: "Inciting Incident",
  rising: "Rising Action",
  midpoint: "Midpoint",
  complication: "Complication",
  crisis: "Crisis",
  climax: "Climax",
  resolution: "Resolution",
  denouement: "Denouement",
};

export const CAMERA_ANGLE_LABELS: Record<CameraAngle, string> = {
  wide: "Wide Shot",
  medium: "Medium Shot",
  "close-up": "Close-Up",
  "extreme close-up": "Extreme Close-Up",
  "over-the-shoulder": "Over-the-Shoulder",
  "bird's eye": "Bird's Eye View",
  "low angle": "Low Angle",
  "dutch angle": "Dutch Angle",
};
