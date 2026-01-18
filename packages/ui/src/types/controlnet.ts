export type ControlNetType =
  | "canny"
  | "depth"
  | "openpose"
  | "lineart"
  | "scribble"
  | "softedge"
  | "normalbae"
  | "mlsd"
  | "shuffle"
  | "tile"
  | "blur"
  | "inpaint"
  | "ip2p"
  | "semantic_seg"
  | "qrcode"
  | "reference";

export interface ControlNetPreprocessorOptions {
  lowThreshold?: number;
  highThreshold?: number;
  detectBody?: boolean;
  detectFace?: boolean;
  detectHands?: boolean;
  depthType?: "midas" | "zoe" | "leres";
  coarse?: boolean;
  valueThreshold?: number;
  distanceThreshold?: number;
}

export interface ControlNetCondition {
  type: ControlNetType;
  image: string;
  strength?: number;
  startPercent?: number;
  endPercent?: number;
  preprocess?: boolean;
  preprocessorOptions?: ControlNetPreprocessorOptions;
  controlnetModel?: string;
}

export interface ControlNetPreviewResponse {
  success: boolean;
  controlType: ControlNetType;
  previewPath?: string;
  signedUrl?: string;
  error?: string;
}
